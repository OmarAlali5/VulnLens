from uuid import UUID

from pydantic import BaseModel


class ReportMetaResponse(BaseModel):
    scan_id: UUID
    report_url: str
