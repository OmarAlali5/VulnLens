from datetime import datetime
from typing import Any
from uuid import UUID

from pydantic import BaseModel, Field, HttpUrl

from app.db.models import ScanStatusEnum


class ScanOptions(BaseModel):
    port_scan: bool = True
    headers_scan: bool = True
    ssl_scan: bool = True
    tech_scan: bool = True
    subdomain_scan: bool = True
    port_list: list[int] | None = None


class ScanCreateRequest(BaseModel):
    target: HttpUrl
    options: ScanOptions = Field(default_factory=ScanOptions)


class ScanCreateResponse(BaseModel):
    scan_id: UUID
    status: ScanStatusEnum


class FindingSummary(BaseModel):
    critical: int = 0
    high: int = 0
    medium: int = 0
    low: int = 0
    info: int = 0


class ScanResultPayload(BaseModel):
    target: str
    scanned_at: str
    modules: dict[str, Any]
    summary: FindingSummary


class ScanDetailResponse(BaseModel):
    scan_id: UUID
    target_url: str
    status: ScanStatusEnum
    created_at: datetime
    updated_at: datetime
    result: ScanResultPayload | None = None
    error_message: str | None = None

    model_config = {"from_attributes": True}
