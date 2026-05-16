"""
TCP port scanning service.

Uses asyncio and the stdlib socket stack only. No subprocess or shell execution.
"""

from __future__ import annotations

import asyncio
import socket
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

DEFAULT_TIMEOUT: Final[float] = 3.0
DEFAULT_PORTS: Final[tuple[int, ...]] = (
    21, 22, 23, 25, 53, 80, 110, 143, 443, 445, 993, 995, 3306, 3389, 5432, 6379, 8080, 8443
)
DANGEROUS_OPEN_PORTS: Final[dict[int, tuple[str, FindingSeverity]]] = {
    21: ("FTP_OPEN", FindingSeverity.MEDIUM),
    23: ("TELNET_OPEN", FindingSeverity.HIGH),
    445: ("SMB_OPEN", FindingSeverity.HIGH),
    3389: ("RDP_OPEN", FindingSeverity.HIGH),
    6379: ("REDIS_OPEN", FindingSeverity.HIGH),
    3306: ("MYSQL_OPEN", FindingSeverity.MEDIUM),
    5432: ("POSTGRES_OPEN", FindingSeverity.MEDIUM),
}
MAX_CONCURRENT: Final[int] = 10


@dataclass(frozen=True, slots=True)
class PortScanResult:
    status: ModuleScanStatus
    host: str
    open_ports: list[int] = field(default_factory=list)
    closed_ports: list[int] = field(default_factory=list)
    filtered_ports: list[int] = field(default_factory=list)
    findings: list[Finding] = field(default_factory=list)
    error: ModuleScanError | None = None

    def to_dict(self) -> dict[str, Any]:
        return serialize(self)


def _resolve_host(target: str) -> str:
    stripped = target.strip()
    if "://" in stripped:
        parsed = urlparse(stripped)
        host = parsed.hostname
    else:
        host = stripped.split(":")[0]
    if not host:
        raise ValueError(f"Invalid target: {target!r}")
    return host


async def _probe_port(host: str, port: int, *, timeout: float) -> str:
    try:
        _, writer = await asyncio.wait_for(
            asyncio.open_connection(host, port),
            timeout=timeout,
        )
        writer.close()
        await writer.wait_closed()
        return "open"
    except (asyncio.TimeoutError, ConnectionRefusedError, OSError):
        return "closed"


async def _scan_ports(
    host: str,
    ports: tuple[int, ...],
    *,
    timeout: float,
) -> PortScanResult:
    semaphore = asyncio.Semaphore(MAX_CONCURRENT)
    open_ports: list[int] = []
    closed_ports: list[int] = []

    async def scan_one(port: int) -> None:
        async with semaphore:
            state = await _probe_port(host, port, timeout=timeout)
            if state == "open":
                open_ports.append(port)
            else:
                closed_ports.append(port)

    await asyncio.gather(*[scan_one(p) for p in ports])

    open_ports.sort()
    closed_ports.sort()

    findings: list[Finding] = []
    for port in open_ports:
        if port in DANGEROUS_OPEN_PORTS:
            code, severity = DANGEROUS_OPEN_PORTS[port]
            findings.append(
                Finding(
                    code=code,
                    severity=severity,
                    message=f"Potentially risky port {port}/tcp is open",
                )
            )

    if 80 in open_ports and 443 not in open_ports:
        findings.append(
            Finding(
                code="NO_HTTPS_PORT",
                severity=FindingSeverity.MEDIUM,
                message="Port 80 is open but 443 is not",
            )
        )

    return PortScanResult(
        status=ModuleScanStatus.SUCCESS,
        host=host,
        open_ports=open_ports,
        closed_ports=closed_ports,
        filtered_ports=[],
        findings=findings,
    )


async def scan_ports_async(
    target: str,
    *,
    ports: list[int] | None = None,
    timeout: float = DEFAULT_TIMEOUT,
) -> dict[str, Any]:
    """Scan TCP ports on the host derived from *target*."""
    try:
        host = _resolve_host(target)
    except ValueError as exc:
        return PortScanResult(
            status=ModuleScanStatus.ERROR,
            host=target,
            error=ModuleScanError(code="INVALID_TARGET", message=str(exc)),
        ).to_dict()

    port_tuple = tuple(ports) if ports else DEFAULT_PORTS

    try:
        await asyncio.to_thread(socket.getaddrinfo, host, None)
    except socket.gaierror as exc:
        return PortScanResult(
            status=ModuleScanStatus.ERROR,
            host=host,
            error=ModuleScanError(code="DNS_FAILED", message=str(exc)),
        ).to_dict()

    try:
        result = await _scan_ports(host, port_tuple, timeout=timeout)
        return result.to_dict()
    except Exception as exc:
        return PortScanResult(
            status=ModuleScanStatus.ERROR,
            host=host,
            error=ModuleScanError(code="SCAN_FAILED", message=str(exc)),
        ).to_dict()


def scan_ports(
    target: str,
    *,
    ports: list[int] | None = None,
    timeout: float = DEFAULT_TIMEOUT,
) -> dict[str, Any]:
    return asyncio.run(scan_ports_async(target, ports=ports, timeout=timeout))
