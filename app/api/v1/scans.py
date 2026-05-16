from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.dependencies import get_db
from app.core.config import get_settings
from app.core.security import verify_api_key
from app.core.target_validation import TargetValidationError, validate_scan_target
from app.db.models import ScanJob, ScanStatusEnum
from app.schemas.scan import (
    FindingSummary,
    ScanCreateRequest,
    ScanCreateResponse,
    ScanDetailResponse,
    ScanResultPayload,
)
from app.worker.tasks import scan_task

router = APIRouter(prefix="/scans", tags=["scans"])


@router.post(
    "/",
    response_model=ScanCreateResponse,
    status_code=status.HTTP_202_ACCEPTED,
    dependencies=[Depends(verify_api_key)],
)
def create_scan(
    body: ScanCreateRequest,
    db: Session = Depends(get_db),
) -> ScanCreateResponse:
    settings = get_settings()
    target_str = str(body.target)
    try:
        normalized = validate_scan_target(
            target_str, block_private=settings.block_private_targets
        )
    except TargetValidationError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(exc),
        ) from exc

    job = ScanJob(
        target_url=normalized,
        status=ScanStatusEnum.PENDING,
        options=body.options.model_dump(),
    )
    db.add(job)
    db.commit()
    db.refresh(job)

    scan_task.delay(str(job.id))

    return ScanCreateResponse(scan_id=job.id, status=job.status)


@router.get(
    "/{scan_id}",
    response_model=ScanDetailResponse,
    dependencies=[Depends(verify_api_key)],
)
def get_scan(scan_id: UUID, db: Session = Depends(get_db)) -> ScanDetailResponse:
    job = db.get(ScanJob, scan_id)
    if job is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Scan not found",
        )

    result: ScanResultPayload | None = None
    if job.result_payload:
        summary_data = job.result_payload.get("summary", {})
        result = ScanResultPayload(
            target=job.result_payload.get("target", job.target_url),
            scanned_at=job.result_payload.get("scanned_at", ""),
            modules=job.result_payload.get("modules", {}),
            summary=FindingSummary(**summary_data),
        )

    return ScanDetailResponse(
        scan_id=job.id,
        target_url=job.target_url,
        status=job.status,
        created_at=job.created_at,
        updated_at=job.updated_at,
        result=result,
        error_message=job.error_message,
    )
