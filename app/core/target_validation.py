import ipaddress
import socket
from urllib.parse import urlparse


class TargetValidationError(ValueError):
    pass


_PRIVATE_NETWORKS = (
    ipaddress.ip_network("127.0.0.0/8"),
    ipaddress.ip_network("10.0.0.0/8"),
    ipaddress.ip_network("172.16.0.0/12"),
    ipaddress.ip_network("192.168.0.0/16"),
    ipaddress.ip_network("169.254.0.0/16"),
    ipaddress.ip_network("::1/128"),
    ipaddress.ip_network("fc00::/7"),
    ipaddress.ip_network("fe80::/10"),
)


def _is_private_ip(ip: ipaddress.IPv4Address | ipaddress.IPv6Address) -> bool:
    return any(ip in net for net in _PRIVATE_NETWORKS)


def validate_scan_target(target: str, *, block_private: bool = True) -> str:
    """
    Validate and normalize a scan target URL.

    Returns the normalized URL string. Raises TargetValidationError on invalid
    or blocked targets (SSRF mitigation).
    """
    stripped = target.strip()
    if not stripped:
        raise TargetValidationError("Target URL is required")

    parsed = urlparse(stripped if "://" in stripped else f"https://{stripped}")
    if parsed.scheme not in ("http", "https"):
        raise TargetValidationError("Target must use http or https scheme")

    host = parsed.hostname
    if not host:
        raise TargetValidationError("Target must include a valid hostname")

    if block_private:
        try:
            addr = ipaddress.ip_address(host)
            if _is_private_ip(addr):
                raise TargetValidationError(
                    "Scanning private or loopback addresses is not allowed"
                )
        except ValueError:
            pass

        try:
            for info in socket.getaddrinfo(host, None):
                sockaddr = info[4]
                ip_str = sockaddr[0]
                addr = ipaddress.ip_address(ip_str)
                if _is_private_ip(addr):
                    raise TargetValidationError(
                        f"Target hostname resolves to private address: {ip_str}"
                    )
        except socket.gaierror as exc:
            raise TargetValidationError(
                f"Unable to resolve hostname: {host}"
            ) from exc

    normalized = f"{parsed.scheme}://{host}"
    if parsed.port:
        normalized += f":{parsed.port}"
    if parsed.path and parsed.path != "/":
        normalized += parsed.path

    return normalized
