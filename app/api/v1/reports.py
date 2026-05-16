from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import Response
from sqlalchemy.orm import Session

from app.api.dependencies import get_db
from app.core.security import verify_api_key
from app.db.models import ScanJob, ScanStatusEnum
from app.services.pdf_generator import generate_pdf

router = APIRouter(prefix="/reports", tags=["reports"])


@router.get(
    "/{scan_id}/pdf",
    dependencies=[Depends(verify_api_key)],
    response_class=Response,
)
def get_scan_pdf(scan_id: UUID, db: Session = Depends(get_db)) -> Response:
    job = db.get(ScanJob, scan_id)
    if job is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Scan not found",
        )
    if job.status != ScanStatusEnum.COMPLETED or not job.result_payload:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Scan is not completed or has no results",
        )

    pdf_bytes = generate_pdf(
        job.result_payload,
        scan_id=str(job.id),
        target_url=job.target_url,
    )
    filename = f"vulnlens-report-{scan_id}.pdf"
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )
