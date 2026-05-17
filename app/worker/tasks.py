from __future__ import annotations

import asyncio
import logging
import uuid
from datetime import datetime, timezone
from typing import Any

from app.core.celery_app import celery_app
from app.db.models import ScanJob, ScanStatusEnum
from app.db.session import SessionLocal
from app.services.common import summarize_findings
from app.services.headers import inspect_headers_async
from app.services.ports import scan_ports_async
from app.services.ssl import inspect_ssl_async
from app.services.subdomain import discover_subdomains_async
from app.services.technology import inspect_technology_async

logger = logging.getLogger(__name__)


def _module_result_to_dict(result: Any) -> dict[str, Any]:
    if isinstance(result, dict):
        return result
    if isinstance(result, BaseException):
        return {
            "status": "error",
            "error": {"code": "MODULE_EXCEPTION", "message": str(result)},
            "findings": [],
        }
    return {"status": "error", "error": {"code": "UNKNOWN", "message": "Unknown result"}}


async def _run_scan_modules(target: str, options: dict[str, Any]) -> dict[str, Any]:
    modules: dict[str, Any] = {}
    tasks: list[tuple[str, Any]] = []

    if options.get("ssl_scan", True):
        tasks.append(("ssl", inspect_ssl_async(target)))
    if options.get("headers_scan", True):
        tasks.append(("headers", inspect_headers_async(target)))
    if options.get("port_scan", True):
        port_list = options.get("port_list")
        tasks.append(("ports", scan_ports_async(target, ports=port_list)))
    if options.get("tech_scan", True):
        tasks.append(("technology", inspect_technology_async(target)))
    if options.get("subdomain_scan", True):
        tasks.append(("subdomain", discover_subdomains_async(target)))

    if not tasks:
        return modules

    results = await asyncio.gather(
        *[coro for _, coro in tasks],
        return_exceptions=True,
    )

    for (name, _), result in zip(tasks, results):
        modules[name] = _module_result_to_dict(result)

    return modules


@celery_app.task(name="app.worker.tasks.scan_task", bind=True, max_retries=0)
def scan_task(self, scan_id: str) -> None:
    db = SessionLocal()
    try:
        job = db.get(ScanJob, uuid.UUID(scan_id))
        if job is None:
            logger.error("Scan job %s not found", scan_id)
            return

        job.status = ScanStatusEnum.RUNNING
        db.commit()

        options = job.options or {}
        try:
            modules = asyncio.run(_run_scan_modules(job.target_url, options))
            summary = summarize_findings(modules)
            payload = {
                "target": job.target_url,
                "scanned_at": datetime.now(timezone.utc).isoformat(),
                "modules": modules,
                "summary": summary,
            }
            job.result_payload = payload
            job.status = ScanStatusEnum.COMPLETED
            job.error_message = None
        except Exception as exc:
            logger.exception("Scan %s failed", scan_id)
            job.status = ScanStatusEnum.FAILED
            job.error_message = str(exc)

        db.commit()
    finally:
        db.close()
