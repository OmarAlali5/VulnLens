from unittest.mock import patch
from uuid import uuid4

from app.db.models import ScanJob, ScanStatusEnum


@patch("app.api.v1.scans.scan_task.delay")
def test_create_scan_returns_pending(mock_delay, client, db_session):
    response = client.post(
        "/api/v1/scans/",
        json={
            "target": "https://example.com",
            "options": {"ssl_scan": True, "headers_scan": False, "port_scan": False},
        },
    )
    assert response.status_code == 202
    data = response.json()
    assert data["status"] == "PENDING"
    assert "scan_id" in data
    mock_delay.assert_called_once()


def test_get_scan_not_found(client):
    response = client.get(f"/api/v1/scans/{uuid4()}")
    assert response.status_code == 404


def test_get_scan_completed(client, db_session):
    job = ScanJob(
        target_url="https://example.com",
        status=ScanStatusEnum.COMPLETED,
        result_payload={
            "target": "https://example.com",
            "scanned_at": "2026-05-15T00:00:00+00:00",
            "modules": {"ssl": {"status": "success", "findings": []}},
            "summary": {"critical": 0, "high": 0, "medium": 0, "low": 0, "info": 0},
        },
    )
    db_session.add(job)
    db_session.commit()
    db_session.refresh(job)

    response = client.get(f"/api/v1/scans/{job.id}")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "COMPLETED"
    assert data["result"] is not None
    assert "ssl" in data["result"]["modules"]
