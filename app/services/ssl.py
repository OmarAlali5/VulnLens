"""
SSL/TLS certificate inspection service.

Uses the stdlib ``ssl`` and ``socket`` modules plus ``cryptography`` for X.509
parsing. No external shell commands or subprocess calls.
"""

from __future__ import annotations

import asyncio
import socket
import ssl
from dataclasses import asdict, dataclass, field
from datetime import datetime, timezone
from enum import Enum
from typing import Any, Final
from urllib.parse import urlparse

from cryptography import x509
from cryptography.hazmat.backends import default_backend
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.asymmetric import dsa, ec, rsa
from cryptography.x509 import (
    DNSName,
    ExtensionNotFound,
    IPAddress,
    OID_COMMON_NAME,
    OID_ORGANIZATION_NAME,
    SubjectAlternativeName,
)

DEFAULT_PORT: Final[int] = 443
DEFAULT_TIMEOUT: Final[float] = 10.0
EXPIRING_SOON_DAYS: Final[int] = 30
MIN_RSA_KEY_BITS: Final[int] = 2048
MIN_EC_KEY_BITS: Final[int] = 256
WEAK_SIGNATURE_ALGORITHMS: Final[frozenset[str]] = frozenset(
    {"md5", "md5withrsa", "sha1", "sha1withrsa", "ecdsa-with-sha1"}
)
DEPRECATED_TLS_VERSIONS: Final[frozenset[str]] = frozenset(
    {"SSLv2", "SSLv3", "TLSv1", "TLSv1.1"}
)


class FindingSeverity(str, Enum):
    CRITICAL = "critical"
    HIGH = "high"
    MEDIUM = "medium"
    LOW = "low"
    INFO = "info"


class ScanStatus(str, Enum):
    SUCCESS = "success"
    ERROR = "error"


@dataclass(frozen=True, slots=True)
class Target:
    host: str
    port: int


@dataclass(frozen=True, slots=True)
class Finding:
    code: str
    severity: FindingSeverity
    message: str


@dataclass(frozen=True, slots=True)
class PublicKeyInfo:
    algorithm: str
    size_bits: int | None = None
    curve: str | None = None


@dataclass(frozen=True, slots=True)
class DistinguishedName:
    common_name: str | None = None
    organization: str | None = None
    raw: dict[str, str] = field(default_factory=dict)


@dataclass(frozen=True, slots=True)
class CertificateDetails:
    subject: DistinguishedName
    issuer: DistinguishedName
    serial_number: str
    not_valid_before: str
    not_valid_after: str
    days_until_expiry: int
    is_expired: bool
    is_expiring_soon: bool
    san_dns: list[str]
    san_ips: list[str]
    signature_algorithm: str
    public_key: PublicKeyInfo
    fingerprint_sha256: str
    fingerprint_sha1: str
    version: int
    is_self_signed: bool


@dataclass(frozen=True, slots=True)
class TlsInfo:
    version: str
    cipher_name: str
    cipher_bits: int
    cipher_protocol: str


@dataclass(frozen=True, slots=True)
class ChainCertificate:
    position: int
    subject_cn: str | None
    issuer_cn: str | None
    fingerprint_sha256: str
    not_valid_after: str


@dataclass(frozen=True, slots=True)
class ValidationResult:
    trusted: bool
    hostname_match: bool
    errors: list[str]
    warnings: list[str]


@dataclass(frozen=True, slots=True)
class ScanError:
    code: str
    message: str


@dataclass(frozen=True, slots=True)
class SSLScanResult:
    status: ScanStatus
    target: Target
    tls: TlsInfo | None = None
    certificate: CertificateDetails | None = None
    chain: list[ChainCertificate] = field(default_factory=list)
    validation: ValidationResult | None = None
    findings: list[Finding] = field(default_factory=list)
    error: ScanError | None = None

    def to_dict(self) -> dict[str, Any]:
        return _serialize(self)


@dataclass
class _HandshakeResult:
    tls: TlsInfo
    peer_cert_der: bytes
    chain_der: list[bytes]
    validation_errors: list[str]
    hostname_match: bool
    trusted: bool


def inspect_ssl(
    target: str,
    *,
    port: int | None = None,
    timeout: float = DEFAULT_TIMEOUT,
    expiring_soon_days: int = EXPIRING_SOON_DAYS,
) -> dict[str, Any]:
    """
    Inspect the TLS certificate served by *target*.

    *target* may be a bare hostname (``example.com``), host:port
    (``example.com:8443``), or URL (``https://example.com/path``).

    Returns a JSON-serializable dict suitable for persistence in scan results.
    """
    try:
        host, resolved_port = _parse_target(target, port)
    except ValueError as exc:
        return _error_result(
            Target(host=target.strip(), port=port or DEFAULT_PORT),
            code="INVALID_TARGET",
            message=str(exc),
        ).to_dict()

    result = _run_inspection(
        host,
        resolved_port,
        timeout=timeout,
        expiring_soon_days=expiring_soon_days,
    )
    return result.to_dict()


async def inspect_ssl_async(
    target: str,
    *,
    port: int | None = None,
    timeout: float = DEFAULT_TIMEOUT,
    expiring_soon_days: int = EXPIRING_SOON_DAYS,
) -> dict[str, Any]:
    """Non-blocking wrapper around :func:`inspect_ssl` for async callers."""
    return await asyncio.to_thread(
        inspect_ssl,
        target,
        port=port,
        timeout=timeout,
        expiring_soon_days=expiring_soon_days,
    )


def _run_inspection(
    host: str,
    port: int,
    *,
    timeout: float,
    expiring_soon_days: int,
) -> SSLScanResult:
    scan_target = Target(host=host, port=port)

    try:
        strict = _perform_handshake(host, port, timeout=timeout, verify=True)
    except (socket.timeout, TimeoutError):
        return _error_result(
            scan_target,
            code="CONNECTION_TIMEOUT",
            message=f"Connection to {host}:{port} timed out after {timeout}s",
        )
    except socket.gaierror as exc:
        return _error_result(
            scan_target,
            code="DNS_RESOLUTION_FAILED",
            message=f"Could not resolve hostname '{host}': {exc}",
        )
    except ConnectionRefusedError:
        return _error_result(
            scan_target,
            code="CONNECTION_REFUSED",
            message=f"Connection refused by {host}:{port}",
        )
    except OSError as exc:
        return _error_result(
            scan_target,
            code="CONNECTION_FAILED",
            message=f"Network error connecting to {host}:{port}: {exc}",
        )
    except ssl.SSLError as exc:
        # Host may still present a cert on TLS failure — try permissive fetch.
        try:
            permissive = _perform_handshake(
                host, port, timeout=timeout, verify=False
            )
        except Exception as inner:
            return _error_result(
                scan_target,
                code="TLS_HANDSHAKE_FAILED",
                message=f"TLS handshake failed: {exc}; fallback also failed: {inner}",
            )
        return _build_success_result(
            scan_target,
            permissive,
            expected_host=host,
            expiring_soon_days=expiring_soon_days,
            strict_handshake_failed=True,
            strict_error=str(exc),
        )

    return _build_success_result(
        scan_target,
        strict,
        expected_host=host,
        expiring_soon_days=expiring_soon_days,
        strict_handshake_failed=False,
        strict_error=None,
    )


def _build_success_result(
    scan_target: Target,
    handshake: _HandshakeResult,
    *,
    expected_host: str,
    expiring_soon_days: int,
    strict_handshake_failed: bool,
    strict_error: str | None,
) -> SSLScanResult:
    leaf = x509.load_der_x509_certificate(
        handshake.peer_cert_der, default_backend()
    )
    chain_certs = [
        x509.load_der_x509_certificate(der, default_backend())
        for der in handshake.chain_der
    ]

    cert_details = _parse_certificate(leaf, expiring_soon_days=expiring_soon_days)
    chain = _build_chain_summary(chain_certs or [leaf])
    validation = _compose_validation(
        handshake,
        strict_handshake_failed=strict_handshake_failed,
        strict_error=strict_error,
    )
    findings = _derive_findings(
        cert_details,
        handshake.tls,
        validation,
        expected_host=expected_host,
        expiring_soon_days=expiring_soon_days,
    )

    return SSLScanResult(
        status=ScanStatus.SUCCESS,
        target=scan_target,
        tls=handshake.tls,
        certificate=cert_details,
        chain=chain,
        validation=validation,
        findings=findings,
    )


def _perform_handshake(
    host: str,
    port: int,
    *,
    timeout: float,
    verify: bool,
) -> _HandshakeResult:
    context = ssl.create_default_context()
    if verify:
        context.check_hostname = True
        context.verify_mode = ssl.CERT_REQUIRED
    else:
        context.check_hostname = False
        context.verify_mode = ssl.CERT_NONE

    validation_errors: list[str] = []
    peer_der: bytes
    chain_der: list[bytes]
    tls_info: TlsInfo

    with _connect(host, port, timeout=timeout) as sock:
        with context.wrap_socket(sock, server_hostname=host) as tls_sock:
            tls_info = _extract_tls_info(tls_sock)
            peer_der = tls_sock.getpeercert(binary_form=True)
            if not peer_der:
                raise ssl.SSLError("Peer did not present a certificate")

            chain_der = _get_cert_chain_der(tls_sock)
            if not chain_der:
                chain_der = [peer_der]

    cert = x509.load_der_x509_certificate(peer_der, default_backend())
    hostname_match = _hostname_matches_cert(host, cert)

    if verify:
        trusted = True
        if not hostname_match:
            validation_errors.append(
                f"Hostname '{host}' does not match certificate CN or SAN"
            )
    else:
        trusted = False
        validation_errors.append(
            "Certificate chain not verified (permissive handshake only)"
        )
        if not hostname_match:
            validation_errors.append(
                f"Hostname '{host}' does not match certificate CN or SAN"
            )

    return _HandshakeResult(
        tls=tls_info,
        peer_cert_der=peer_der,
        chain_der=chain_der,
        validation_errors=validation_errors,
        hostname_match=hostname_match,
        trusted=trusted and not validation_errors,
    )


def _connect(host: str, port: int, *, timeout: float) -> socket.socket:
    addrinfos = socket.getaddrinfo(
        host,
        port,
        type=socket.SOCK_STREAM,
        proto=socket.IPPROTO_TCP,
    )
    last_error: OSError | None = None
    for family, socktype, proto, _canonname, sockaddr in addrinfos:
        sock = socket.socket(family, socktype, proto)
        try:
            sock.settimeout(timeout)
            sock.connect(sockaddr)
            return sock
        except OSError as exc:
            last_error = exc
            sock.close()
    if last_error is not None:
        raise last_error
    raise OSError(f"No connectable addresses for {host}:{port}")


def _get_cert_chain_der(tls_sock: ssl.SSLSocket) -> list[bytes]:
    get_chain = getattr(tls_sock, "getpeercert_chain", None)
    if callable(get_chain):
        chain = get_chain()
        if chain:
            return list(chain)
    return []


def _extract_tls_info(tls_sock: ssl.SSLSocket) -> TlsInfo:
    cipher = tls_sock.cipher()
    version = tls_sock.version() or "unknown"
    if cipher:
        name, protocol, bits = cipher
        return TlsInfo(
            version=version,
            cipher_name=name,
            cipher_bits=bits,
            cipher_protocol=protocol,
        )
    return TlsInfo(
        version=version,
        cipher_name="unknown",
        cipher_bits=0,
        cipher_protocol="unknown",
    )


def _parse_certificate(
    cert: x509.Certificate, *, expiring_soon_days: int
) -> CertificateDetails:
    now = datetime.now(timezone.utc)
    not_before = _cert_datetime_utc(cert, "not_valid_before")
    not_after = _cert_datetime_utc(cert, "not_valid_after")
    days_until_expiry = (not_after - now).days
    is_expired = now > not_after
    is_expiring_soon = (
        not is_expired and days_until_expiry <= expiring_soon_days
    )

    san_dns, san_ips = _extract_san(cert)
    subject = _parse_dn(cert.subject)
    issuer = _parse_dn(cert.issuer)
    public_key = _parse_public_key(cert)
    sig_alg = _normalize_signature_algorithm(cert)

    return CertificateDetails(
        subject=subject,
        issuer=issuer,
        serial_number=format(cert.serial_number, "x"),
        not_valid_before=not_before.isoformat(),
        not_valid_after=not_after.isoformat(),
        days_until_expiry=days_until_expiry,
        is_expired=is_expired,
        is_expiring_soon=is_expiring_soon,
        san_dns=san_dns,
        san_ips=san_ips,
        signature_algorithm=sig_alg,
        public_key=public_key,
        fingerprint_sha256=cert.fingerprint(hashes.SHA256()).hex(),
        fingerprint_sha1=cert.fingerprint(hashes.SHA1()).hex(),
        version=int(cert.version.value),
        is_self_signed=_is_self_signed(cert),
    )


def _cert_datetime_utc(cert: x509.Certificate, field: str) -> datetime:
    utc_attr = f"{field}_utc"
    if hasattr(cert, utc_attr):
        return getattr(cert, utc_attr)
    value: datetime = getattr(cert, field)
    if value.tzinfo is None:
        return value.replace(tzinfo=timezone.utc)
    return value.astimezone(timezone.utc)


def _parse_dn(name: x509.Name) -> DistinguishedName:
    raw: dict[str, str] = {}
    cn: str | None = None
    org: str | None = None
    for attr in name:
        oid_name = attr.oid._name or attr.oid.dotted_string
        raw[oid_name] = attr.value
        if attr.oid == OID_COMMON_NAME:
            cn = attr.value
        elif attr.oid == OID_ORGANIZATION_NAME:
            org = attr.value
    return DistinguishedName(common_name=cn, organization=org, raw=raw)


def _extract_san(cert: x509.Certificate) -> tuple[list[str], list[str]]:
    dns_names: list[str] = []
    ip_addrs: list[str] = []
    try:
        san_ext = cert.extensions.get_extension_for_class(SubjectAlternativeName)
    except ExtensionNotFound:
        return dns_names, ip_addrs

    for name in san_ext.value:
        if isinstance(name, DNSName):
            dns_names.append(name.value)
        elif isinstance(name, IPAddress):
            ip_addrs.append(str(name.value))
    return dns_names, ip_addrs


def _parse_public_key(cert: x509.Certificate) -> PublicKeyInfo:
    key = cert.public_key()
    if isinstance(key, rsa.RSAPublicKey):
        return PublicKeyInfo(
            algorithm="RSA",
            size_bits=key.key_size,
        )
    if isinstance(key, ec.EllipticCurvePublicKey):
        return PublicKeyInfo(
            algorithm="EC",
            size_bits=key.key_size,
            curve=key.curve.name if key.curve else None,
        )
    if isinstance(key, dsa.DSAPublicKey):
        return PublicKeyInfo(
            algorithm="DSA",
            size_bits=key.key_size,
        )
    return PublicKeyInfo(algorithm=type(key).__name__)


def _normalize_signature_algorithm(cert: x509.Certificate) -> str:
    try:
        return cert.signature_algorithm_oid._name or "unknown"
    except Exception:
        return "unknown"


def _is_self_signed(cert: x509.Certificate) -> bool:
    return cert.issuer == cert.subject


def _build_chain_summary(certs: list[x509.Certificate]) -> list[ChainCertificate]:
    summary: list[ChainCertificate] = []
    for index, cert in enumerate(certs):
        subject = _parse_dn(cert.subject)
        issuer = _parse_dn(cert.issuer)
        summary.append(
            ChainCertificate(
                position=index,
                subject_cn=subject.common_name,
                issuer_cn=issuer.common_name,
                fingerprint_sha256=cert.fingerprint(hashes.SHA256()).hex(),
                not_valid_after=_cert_datetime_utc(cert, "not_valid_after").isoformat(),
            )
        )
    return summary


def _hostname_matches_cert(hostname: str, cert: x509.Certificate) -> bool:
    host = hostname.lower().strip(".")
    san_dns, _ = _extract_san(cert)
    if san_dns:
        return any(_match_wildcard(host, pattern.lower()) for pattern in san_dns)
    cn = _parse_dn(cert.subject).common_name
    if cn:
        return _match_wildcard(host, cn.lower())
    return False


def _match_wildcard(host: str, pattern: str) -> bool:
    pattern = pattern.strip(".")
    if pattern == host:
        return True
    if pattern.startswith("*."):
        suffix = pattern[1:]  # ".example.com"
        return host == pattern[2:] or host.endswith(suffix)
    return False


def _compose_validation(
    handshake: _HandshakeResult,
    *,
    strict_handshake_failed: bool,
    strict_error: str | None,
) -> ValidationResult:
    errors = list(handshake.validation_errors)
    warnings: list[str] = []

    if strict_handshake_failed and strict_error:
        errors.append(f"Strict TLS handshake failed: {strict_error}")

    if not handshake.hostname_match:
        warnings.append("Hostname does not match certificate identity")

    return ValidationResult(
        trusted=handshake.trusted and not errors,
        hostname_match=handshake.hostname_match,
        errors=errors,
        warnings=warnings,
    )


def _derive_findings(
    cert: CertificateDetails,
    tls: TlsInfo,
    validation: ValidationResult,
    *,
    expected_host: str,
    expiring_soon_days: int,
) -> list[Finding]:
    findings: list[Finding] = []

    if cert.is_expired:
        findings.append(
            Finding(
                code="CERT_EXPIRED",
                severity=FindingSeverity.CRITICAL,
                message=f"Certificate expired on {cert.not_valid_after}",
            )
        )
    elif cert.is_expiring_soon:
        findings.append(
            Finding(
                code="CERT_EXPIRING_SOON",
                severity=FindingSeverity.MEDIUM,
                message=(
                    f"Certificate expires in {cert.days_until_expiry} days "
                    f"(threshold: {expiring_soon_days})"
                ),
            )
        )

    if cert.is_self_signed:
        findings.append(
            Finding(
                code="CERT_SELF_SIGNED",
                severity=FindingSeverity.HIGH,
                message="Certificate is self-signed",
            )
        )

    if not validation.trusted:
        findings.append(
            Finding(
                code="CERT_UNTRUSTED",
                severity=FindingSeverity.HIGH,
                message="Certificate chain is not trusted by the system store",
            )
        )

    if not validation.hostname_match:
        findings.append(
            Finding(
                code="HOSTNAME_MISMATCH",
                severity=FindingSeverity.HIGH,
                message=f"Certificate does not match hostname '{expected_host}'",
            )
        )

    sig = cert.signature_algorithm.lower().replace("-", "").replace("_", "")
    if any(weak in sig for weak in WEAK_SIGNATURE_ALGORITHMS):
        findings.append(
            Finding(
                code="WEAK_SIGNATURE_ALGORITHM",
                severity=FindingSeverity.MEDIUM,
                message=f"Certificate uses weak signature: {cert.signature_algorithm}",
            )
        )

    pk = cert.public_key
    if pk.algorithm == "RSA" and pk.size_bits is not None and pk.size_bits < MIN_RSA_KEY_BITS:
        findings.append(
            Finding(
                code="WEAK_PUBLIC_KEY",
                severity=FindingSeverity.HIGH,
                message=f"RSA key size ({pk.size_bits} bits) is below {MIN_RSA_KEY_BITS}",
            )
        )
    elif pk.algorithm == "EC" and pk.size_bits is not None and pk.size_bits < MIN_EC_KEY_BITS:
        findings.append(
            Finding(
                code="WEAK_PUBLIC_KEY",
                severity=FindingSeverity.HIGH,
                message=f"EC key size ({pk.size_bits} bits) is below {MIN_EC_KEY_BITS}",
            )
        )
    elif pk.algorithm == "DSA":
        findings.append(
            Finding(
                code="DEPRECATED_PUBLIC_KEY",
                severity=FindingSeverity.MEDIUM,
                message="DSA public keys are deprecated for TLS",
            )
        )

    if tls.version in DEPRECATED_TLS_VERSIONS:
        findings.append(
            Finding(
                code="DEPRECATED_TLS_VERSION",
                severity=FindingSeverity.HIGH,
                message=f"Negotiated deprecated TLS version: {tls.version}",
            )
        )

    if tls.cipher_bits and tls.cipher_bits < 128:
        findings.append(
            Finding(
                code="WEAK_CIPHER",
                severity=FindingSeverity.HIGH,
                message=f"Negotiated weak cipher ({tls.cipher_name}, {tls.cipher_bits} bits)",
            )
        )

    return findings


def _parse_target(target: str, port: int | None) -> tuple[str, int]:
    stripped = target.strip()
    if "://" in stripped:
        parsed = urlparse(stripped)
        host = parsed.hostname
        if not host:
            raise ValueError(f"Invalid URL target: {target!r}")
        resolved_port = port or parsed.port or DEFAULT_PORT
        return host, resolved_port

    if stripped.startswith("[") and "]" in stripped:
        # IPv6 literal with optional port: [::1]:443
        bracket_end = stripped.index("]")
        host = stripped[1:bracket_end]
        remainder = stripped[bracket_end + 1 :]
        if remainder.startswith(":"):
            resolved_port = port or int(remainder[1:])
        else:
            resolved_port = port or DEFAULT_PORT
        return host, resolved_port

    if ":" in stripped and stripped.count(":") == 1:
        host_part, _, port_part = stripped.partition(":")
        if port_part.isdigit():
            return host_part, port or int(port_part)

    return stripped, port or DEFAULT_PORT


def _error_result(target: Target, *, code: str, message: str) -> SSLScanResult:
    return SSLScanResult(
        status=ScanStatus.ERROR,
        target=target,
        error=ScanError(code=code, message=message),
    )


def _serialize(obj: Any) -> Any:
    if isinstance(obj, Enum):
        return obj.value
    if hasattr(obj, "__dataclass_fields__"):
        return {k: _serialize(v) for k, v in asdict(obj).items()}
    if isinstance(obj, list):
        return [_serialize(item) for item in obj]
    if isinstance(obj, dict):
        return {k: _serialize(v) for k, v in obj.items()}
    return obj
