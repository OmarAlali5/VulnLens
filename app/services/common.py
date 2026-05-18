from __future__ import annotations

from dataclasses import asdict, dataclass
from enum import Enum
from typing import Any


class FindingSeverity(str, Enum):
    CRITICAL = "critical"
    HIGH = "high"
    MEDIUM = "medium"
    LOW = "low"
    INFO = "info"


class ModuleScanStatus(str, Enum):
    SUCCESS = "success"
    ERROR = "error"


@dataclass(frozen=True, slots=True)
class Finding:
    code: str
    severity: FindingSeverity
    message: str


@dataclass(frozen=True, slots=True)
class ModuleScanError:
    code: str
    message: str


def serialize(obj: Any) -> Any:
    """Recursively converts dataclasses, enums, and native types into a JSON-friendly format."""
    if isinstance(obj, Enum):
        return obj.value
    if hasattr(obj, "__dataclass_fields__"):
        return {k: serialize(v) for k, v in asdict(obj).items()}
    if isinstance(obj, list):
        return [serialize(item) for item in obj]
    if isinstance(obj, dict):
        return {k: serialize(v) for k, v in obj.items()}
    return obj


def summarize_findings(modules: dict[str, Any]) -> dict[str, int]:
    """Tally up the total number of findings across all scan modules by severity level."""
    counts = {s.value: 0 for s in FindingSeverity}
    for module_data in modules.values():
        if not isinstance(module_data, dict):
            continue
        for finding in module_data.get("findings", []):
            if not isinstance(finding, dict):
                continue
            sev = finding.get("severity", "info")
            if sev in counts:
                counts[sev] += 1
    return counts
