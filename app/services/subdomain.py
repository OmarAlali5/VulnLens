"""
Passive subdomain discovery service.

Uses subfinder for fast, robust, and safe passive discovery using dozens of OSINT sources.
"""

from __future__ import annotations

import asyncio
import logging
import re
from dataclasses import dataclass, field
from typing import Any, Final
from urllib.parse import urlparse

from app.services.common import (
    Finding,
    FindingSeverity,
    ModuleScanError,
    ModuleScanStatus,
    serialize,
)

logger = logging.getLogger(__name__)

DEFAULT_TIMEOUT: Final[float] = 60.0
MAX_RESULTS: Final[int] = 500

_SUBDOMAIN_RE: Final[re.Pattern[str]] = re.compile(
    r"^[a-z0-9]([a-z0-9\-]*[a-z0-9])?$", re.IGNORECASE
)
"""Basic hostname label validation regex."""


@dataclass(frozen=True, slots=True)
class SubdomainEntry:
    """A single discovered subdomain."""

    hostname: str
    source: str
    status: str


@dataclass(frozen=True, slots=True)
class SubdomainScanResult:
    """Complete result for the subdomain discovery module."""

    status: ModuleScanStatus
    target: str
    subdomains: list[SubdomainEntry] = field(default_factory=list)
    total_discovered: int = 0
    findings: list[Finding] = field(default_factory=list)
    error: ModuleScanError | None = None

    def to_dict(self) -> dict[str, Any]:
        return serialize(self)


# ---------------------------------------------------------------------------
# Internal helpers
# ---------------------------------------------------------------------------


def _extract_domain(target: str) -> str:
    """Extract a clean, lower-case domain name from *target*.

    Accepts a URL (``https://www.example.com/path``), a host+port
    (``example.com:443``) or a bare hostname (``example.com``).
    """
    stripped = target.strip()
    if "://" in stripped:
        parsed = urlparse(stripped)
        host = parsed.hostname
    else:
        host = stripped.split("/")[0].split(":")[0]

    if not host:
        raise ValueError(f"Invalid target: {target!r}")

    return host.rstrip(".").lower()


def _is_valid_subdomain(candidate: str, domain: str) -> bool:
    """Return True when *candidate* is a plausible subdomain of *domain*."""
    if not candidate or not domain:
        return False

    cd = candidate.strip().lower().rstrip(".")
    dm = domain.lower().rstrip(".")

    if cd == dm:
        return False
    if not cd.endswith(f".{dm}"):
        return False

    # Validate each label
    subdomain_part = cd[:-(len(dm) + 1)]
    for label in subdomain_part.split("."):
        if not label or not _SUBDOMAIN_RE.match(label):
            return False

    # Reject wildcards and obviously invalid entries
    if cd.startswith("*."):
        return False

    return True


async def _run_subfinder(domain: str, timeout: float) -> list[str]:
    """Execute subfinder using asyncio and return a list of subdomains."""
    try:
        process = await asyncio.create_subprocess_exec(
            "subfinder",
            "-d",
            domain,
            "-silent",
            "-all",
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
        )
    except FileNotFoundError:
        logger.error("subfinder binary not found in PATH")
        return []

    try:
        stdout, stderr = await asyncio.wait_for(process.communicate(), timeout=timeout)
    except asyncio.TimeoutError:
        logger.warning("subfinder timed out after %s seconds for %s", timeout, domain)
        try:
            process.kill()
        except OSError:
            pass
        await process.wait()
        return []

    if process.returncode != 0:
        err = stderr.decode(errors="replace").strip()
        logger.warning("subfinder failed for %s (exit %s): %s", domain, process.returncode, err)
        return []

    raw_output = stdout.decode(errors="replace")
    raw_names = []
    for line in raw_output.splitlines():
        name = line.strip().lower()
        if name:
            raw_names.append(name)
            
    return list(set(raw_names))


def _deduplicate(entries: list[str]) -> list[str]:
    """Stable deduplication preserving first-occurrence order."""
    seen: set[str] = set()
    out: list[str] = []
    for e in entries:
        if e not in seen:
            seen.add(e)
            out.append(e)
    return out


def _derive_findings(discovered_count: int) -> list[Finding]:
    """Build informational findings based on how many subdomains were found."""
    if discovered_count == 0:
        return [
            Finding(
                code="NO_SUBDOMAINS_DISCOVERED",
                severity=FindingSeverity.INFO,
                message="No subdomains discovered via passive enumeration",
            )
        ]

    findings: list[Finding] = [
        Finding(
            code="SUBDOMAINS_DISCOVERED",
            severity=FindingSeverity.INFO,
            message=f"{discovered_count} subdomain(s) discovered via passive enumeration",
        )
    ]

    if discovered_count > 20:
        findings.append(
            Finding(
                code="LARGE_ATTACK_SURFACE",
                severity=FindingSeverity.MEDIUM,
                message=(
                    f"{discovered_count} subdomains found — "
                    f"large enumeration increases potential attack surface"
                ),
            )
        )

    return findings


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------


async def discover_subdomains_async(
    target: str,
    *,
    timeout: float = DEFAULT_TIMEOUT,
) -> dict[str, Any]:
    """Passively enumerate subdomains for *target*.

    Uses subfinder for fast and extensive passive subdomain discovery.
    No brute-force, DNS query flooding, or aggressive probing is performed.

    Returns a JSON-serializable dict consistent with the project's module
    result format.
    """
    try:
        domain = _extract_domain(target)
    except ValueError as exc:
        return SubdomainScanResult(
            status=ModuleScanStatus.ERROR,
            target=target,
            error=ModuleScanError(code="INVALID_TARGET", message=str(exc)),
        ).to_dict()

    logger.info("Subdomain discovery starting for %s", domain)

    raw_names = await _run_subfinder(domain, timeout=timeout)

    validated: list[str] = [
        name for name in raw_names if _is_valid_subdomain(name, domain)
    ]

    unique = _deduplicate(validated)
    unique.sort()

    if len(unique) > MAX_RESULTS:
        unique = unique[:MAX_RESULTS]

    entries = [
        SubdomainEntry(hostname=sd, source="subfinder", status="discovered")
        for sd in unique
    ]

    findings = _derive_findings(len(entries))

    logger.info(
        "Subdomain discovery complete for %s: %d subdomain(s)",
        domain,
        len(entries),
    )

    return SubdomainScanResult(
        status=ModuleScanStatus.SUCCESS,
        target=domain,
        subdomains=entries,
        total_discovered=len(entries),
        findings=findings,
    ).to_dict()


def discover_subdomains(
    target: str,
    *,
    timeout: float = DEFAULT_TIMEOUT,
) -> dict[str, Any]:
    """Synchronous wrapper around :func:`discover_subdomains_async`."""
    return asyncio.run(discover_subdomains_async(target, timeout=timeout))