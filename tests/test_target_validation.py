import pytest

from app.core.target_validation import TargetValidationError, validate_scan_target


def test_validate_normalizes_https():
    result = validate_scan_target("example.com", block_private=False)
    assert result == "https://example.com"


def test_validate_rejects_private_ip():
    with pytest.raises(TargetValidationError):
        validate_scan_target("https://127.0.0.1", block_private=True)


def test_validate_rejects_invalid_scheme():
    with pytest.raises(TargetValidationError):
        validate_scan_target("ftp://example.com", block_private=False)
