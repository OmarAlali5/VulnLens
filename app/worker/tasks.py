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
    """Helper to ensure we always return a standardized dictionary format, even on failure."""
    if isinstance(result, dict):
        return result
    if isinstance(result, BaseException):
        # We caught an unhandled exception during the async scan module
        return {
            "status": "error",
            "error": {"code": "MODULE_EXCEPTION", "message": str(result)},
            "findings": [],
        }
    # Fallback for weird edge cases
    return {"status": "error", "error": {"code": "UNKNOWN", "message": "Unknown result"}}


async def _run_scan_modules(target: str, options: dict[str, Any]) -> dict[str, Any]:
    """Dynamically construct and execute the scan tasks based on user options."""
    modules: dict[str, Any] = {}
    tasks: list[tuple[str, Any]] = []

    # Queue up the modules the user asked for
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
        # User deselected everything, nothing to do
        return modules

    # Run everything concurrently for maximum speed
    results = await asyncio.gather(
        *[coro for _, coro in tasks],
        return_exceptions=True,
    )

    # Stitch the results back together with their module names
    for (name, _), result in zip(tasks, results):
        modules[name] = _module_result_to_dict(result)

    return modules


@celery_app.task(name="app.worker.tasks.scan_task", bind=True, max_retries=0)
def scan_task(self, scan_id: str) -> None:
    """The main background worker process triggered when a new scan is created."""
    db = SessionLocal()
    try:
        # Look up the scan job from the database
        job = db.get(ScanJob, uuid.UUID(scan_id))
        if job is None:
            logger.error("Scan job %s not found", scan_id)
            return

        # Mark as running so the frontend shows the progress spinner
        job.status = ScanStatusEnum.RUNNING
        db.commit()

        options = job.options or {}
        try:
            # Fire off the scan modules asynchronously
            modules = asyncio.run(_run_scan_modules(job.target_url, options))
            
            # Tally up the final score (critical, high, medium, etc.)
            summary = summarize_findings(modules)
            
            # Format the final JSON response for the database
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
            # Uh oh, something catastrophic failed outside the module try/catch
            logger.exception("Scan %s failed", scan_id)
            job.status = ScanStatusEnum.FAILED
            job.error_message = str(exc)

        # Save the final results to Postgres
        db.commit()
    finally:
        # Always clean up the database connection
        db.close()
