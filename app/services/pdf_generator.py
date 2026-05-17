"""Generate PDF security reports from scan payloads using WeasyPrint."""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any

from jinja2 import Environment, FileSystemLoader, select_autoescape

_TEMPLATES_DIR = Path(__file__).resolve().parent / "templates"
_env = Environment(
    loader=FileSystemLoader(str(_TEMPLATES_DIR)),
    autoescape=select_autoescape(["html", "xml"]),
)


def _severity_badge_class(severity: str) -> str:
    return {
        "critical": "badge-critical",
        "high": "badge-high",
        "medium": "badge-medium",
        "low": "badge-low",
        "info": "badge-info",
    }.get(severity, "badge-info")


def render_report_html(payload: dict[str, Any], *, scan_id: str, target_url: str) -> str:
    template = _env.get_template("report.html")
    modules = payload.get("modules", {})
    all_findings: list[dict[str, Any]] = []
    for module_name, module_data in modules.items():
        if not isinstance(module_data, dict):
            continue
        for finding in module_data.get("findings", []):
            if isinstance(finding, dict):
                all_findings.append({**finding, "module": module_name})

    module_jsons = {
        name: json.dumps(data, indent=2, default=str)
        for name, data in modules.items()
    }

    return template.render(
        scan_id=scan_id,
        target_url=target_url,
        scanned_at=payload.get("scanned_at", ""),
        summary=payload.get("summary", {}),
        modules=modules,
        module_jsons=module_jsons,
        all_findings=all_findings,
        severity_badge_class=_severity_badge_class,
    )


def generate_pdf(
    payload: dict[str, Any],
    *,
    scan_id: str,
    target_url: str,
) -> bytes:
    try:
        from weasyprint import HTML
    except (ImportError, OSError) as e:
        raise RuntimeError(
            "WeasyPrint missing GTK+ libraries (libgobject). "
            "Please start Docker Desktop and run VulnLens via Docker, or install GTK+ on Windows."
        ) from e

    html = render_report_html(payload, scan_id=scan_id, target_url=target_url)
    return HTML(string=html).write_pdf()
