"""
HTTP security header analysis service.

Uses httpx for async HTTP requests. No subprocess or shell execution.
"""

from __future__ import annotations

import asyncio
from dataclasses import dataclass, field
from typing import Any, Final
from urllib.parse import urlparse

import httpx

from app.services.common import (
    Finding,
    FindingSeverity,
    ModuleScanError,
    ModuleScanStatus,
    serialize,
)

DEFAULT_TIMEOUT: Final[float] = 10.0
SECURITY_HEADERS: Final[dict[str, tuple[str, FindingSeverity]]] = {
    "strict-transport-security": (
        "MISSING_HSTS",
        FindingSeverity.HIGH,
    ),
    "content-security-policy": (
        "MISSING_CSP",
        FindingSeverity.MEDIUM,
    ),
    "x-frame-options": (
        "MISSING_X_FRAME_OPTIONS",
        FindingSeverity.MEDIUM,
    ),
    "x-content-type-options": (
        "MISSING_X_CONTENT_TYPE_OPTIONS",
        FindingSeverity.LOW,
    ),
    "referrer-policy": (
        "MISSING_REFERRER_POLICY",
        FindingSeverity.LOW,
    ),
    "permissions-policy": (
        "MISSING_PERMISSIONS_POLICY",
        FindingSeverity.INFO,
    ),
}


@dataclass(frozen=True, slots=True)
class CookieInfo:
    name: str
    secure: bool
    httponly: bool
    samesite: str | None


@dataclass(frozen=True, slots=True)
class HeadersScanResult:
    status: ModuleScanStatus
    target: str
    status_code: int | None = None
    headers: dict[str, str] = field(default_factory=dict)
    cookies: list[CookieInfo] = field(default_factory=list)
    findings: list[Finding] = field(default_factory=list)
    error: ModuleScanError | None = None

    def to_dict(self) -> dict[str, Any]:
        return serialize(self)


def _normalize_url(target: str) -> str:
    stripped = target.strip()
    if "://" not in stripped:
        return f"https://{stripped}"
    return stripped


def _parse_cookies(response: httpx.Response) -> list[CookieInfo]:
    cookies: list[CookieInfo] = []
    for header_value in response.headers.get_list("set-cookie"):
        parts = [p.strip() for p in header_value.split(";")]
        if not parts:
            continue
        name_value = parts[0]
        if "=" not in name_value:
            continue
        name, _ = name_value.split("=", 1)
        attrs = {p.split("=")[0].lower(): True for p in parts[1:] if p}
        samesite = None
        for part in parts[1:]:
            if part.lower().startswith("samesite="):
                samesite = part.split("=", 1)[1].strip()
        cookies.append(
            CookieInfo(
                name=name.strip(),
                secure="secure" in attrs,
                httponly="httponly" in attrs,
                samesite=samesite,
            )
        )
    return cookies


def _analyze_headers(
    response_headers: dict[str, str],
    cookies: list[CookieInfo],
    *,
    is_https: bool,
) -> list[Finding]:
    """Inspects the HTTP response headers for missing or misconfigured security protections."""
    findings: list[Finding] = []
    lower_headers = {k.lower(): v for k, v in response_headers.items()}

    # Run through our master list of required security headers
    for header_name, (code, severity) in SECURITY_HEADERS.items():
        if header_name not in lower_headers:
            # HSTS is only applicable over HTTPS, ignore if it's plain HTTP
            if header_name == "strict-transport-security" and not is_https:
                continue
            findings.append(
                Finding(
                    code=code,
                    severity=severity,
                    message=f"Missing security header: {header_name}",
                )
            )

    # Check for misconfigured HSTS
    hsts = lower_headers.get("strict-transport-security", "")
    if hsts and "max-age=0" in hsts.replace(" ", ""):
        findings.append(
            Finding(
                code="HSTS_DISABLED",
                severity=FindingSeverity.HIGH,
                message="HSTS max-age is set to 0 (disabled)",
            )
        )

    # Check if they explicitly allow framing (clickjacking risk)
    xfo = lower_headers.get("x-frame-options", "").upper()
    if xfo == "ALLOWALL" or xfo == "ALLOW":
        findings.append(
            Finding(
                code="WEAK_X_FRAME_OPTIONS",
                severity=FindingSeverity.MEDIUM,
                message="X-Frame-Options allows framing",
            )
        )

    # See if the server is leaking its exact software version
    server = lower_headers.get("server", "")
    if server:
        findings.append(
            Finding(
                code="SERVER_HEADER_DISCLOSURE",
                severity=FindingSeverity.INFO,
                message=f"Server header discloses: {server[:120]}",
            )
        )

    # Scrutinize every cookie for secure transmission flags
    for cookie in cookies:
        issues: list[str] = []
        if not cookie.secure and is_https:
            issues.append("missing Secure")
        if not cookie.httponly:
            issues.append("missing HttpOnly")
        if cookie.samesite is None:
            issues.append("missing SameSite")
        elif cookie.samesite.lower() == "none" and not cookie.secure:
            issues.append("SameSite=None requires Secure")
        if issues:
            findings.append(
                Finding(
                    code="INSECURE_COOKIE",
                    severity=FindingSeverity.MEDIUM,
                    message=f"Cookie '{cookie.name}': {', '.join(issues)}",
                )
            )

    return findings


async def inspect_headers_async(
    target: str,
    *,
    timeout: float = DEFAULT_TIMEOUT,
) -> dict[str, Any]:
    """Fetch and analyze HTTP security headers for *target*."""
    url = _normalize_url(target)
    parsed = urlparse(url)
    is_https = parsed.scheme == "https"

    try:
        # We don't follow redirects here because we want to analyze the exact endpoint requested.
        # Often, a redirect itself is missing security headers before sending you to the secure site.
        async with httpx.AsyncClient(
            follow_redirects=False,
            timeout=timeout,
            verify=True,
        ) as client:
            response = await client.get(url)
    except httpx.RequestError as exc:
        return HeadersScanResult(
            status=ModuleScanStatus.ERROR,
            target=url,
            error=ModuleScanError(code="REQUEST_FAILED", message=str(exc)),
        ).to_dict()

    headers = dict(response.headers)
    cookies = _parse_cookies(response)
    findings = _analyze_headers(headers, cookies, is_https=is_https)

    return HeadersScanResult(
        status=ModuleScanStatus.SUCCESS,
        target=url,
        status_code=response.status_code,
        headers={k: v for k, v in headers.items()},
        cookies=cookies,
        findings=findings,
    ).to_dict()


def inspect_headers(
    target: str,
    *,
    timeout: float = DEFAULT_TIMEOUT,
) -> dict[str, Any]:
    return asyncio.run(inspect_headers_async(target, timeout=timeout))
