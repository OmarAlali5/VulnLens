"""Unit tests for the passive subdomain discovery module."""

from __future__ import annotations

import pytest

from app.services.common import ModuleScanStatus
from app.services.subdomain import (
    _deduplicate,
    _derive_findings,
    _extract_domain,
    _is_valid_subdomain,
    SubdomainEntry,
    SubdomainScanResult,
)

# ---------------------------------------------------------------------------
# _extract_domain
# ---------------------------------------------------------------------------


@pytest.mark.parametrize(
    ("target", "expected"),
    [
        ("example.com", "example.com"),
        ("https://example.com", "example.com"),
        ("https://example.com/path?q=1", "example.com"),
        ("https://www.example.com:443", "www.example.com"),
        ("sub.example.com:8080", "sub.example.com"),
        ("  EXAMPLE.COM  ", "example.com"),
        ("localhost", "localhost"),
        ("example.com/path/to/page", "example.com"),
        ("example.com:8080/path/to/page", "example.com"),
    ],
)
def test_extract_domain_valid(target: str, expected: str) -> None:
    assert _extract_domain(target) == expected


@pytest.mark.parametrize(
    "target",
    ["", "   "],
)
def test_extract_domain_invalid(target: str) -> None:
    with pytest.raises(ValueError, match="Invalid target"):
        _extract_domain(target)


# ---------------------------------------------------------------------------
# _is_valid_subdomain
# ---------------------------------------------------------------------------


@pytest.mark.parametrize(
    ("candidate", "domain", "expected"),
    [
        ("api.example.com", "example.com", True),
        ("dev.api.example.com", "example.com", True),
        ("staging.example.com", "example.com", True),
        ("example.com", "example.com", False),  # same as domain
        ("*.example.com", "example.com", False),  # wildcard
        ("", "example.com", False),
        ("notrelated.com", "example.com", False),
        ("api.example.org", "example.com", False),  # different TLD
        ("-invalid.example.com", "example.com", False),  # leading hyphen
        ("with space.example.com", "example.com", False),  # space
    ],
)
def test_is_valid_subdomain(candidate: str, domain: str, expected: bool) -> None:
    assert _is_valid_subdomain(candidate, domain) is expected


def test_is_valid_subdomain_case_insensitive() -> None:
    assert _is_valid_subdomain("API.Example.Com", "example.com") is True


# ---------------------------------------------------------------------------
# _deduplicate
# ---------------------------------------------------------------------------


class TestDeduplicate:
    def test_no_duplicates(self) -> None:
        assert _deduplicate(["a", "b", "c"]) == ["a", "b", "c"]

    def test_with_duplicates(self) -> None:
        assert _deduplicate(["a", "b", "a", "c", "b"]) == ["a", "b", "c"]

    def test_empty(self) -> None:
        assert _deduplicate([]) == []

    def test_all_duplicates(self) -> None:
        assert _deduplicate(["a", "a", "a"]) == ["a"]


# ---------------------------------------------------------------------------
# _derive_findings
# ---------------------------------------------------------------------------


class TestDeriveFindings:
    def test_zero_discovered(self) -> None:
        findings = _derive_findings(0)
        assert len(findings) == 1
        assert findings[0].code == "NO_SUBDOMAINS_DISCOVERED"

    def test_some_discovered(self) -> None:
        findings = _derive_findings(5)
        assert any(f.code == "SUBDOMAINS_DISCOVERED" for f in findings)
        assert not any(f.code == "LARGE_ATTACK_SURFACE" for f in findings)

    def test_large_discovery(self) -> None:
        findings = _derive_findings(21)
        codes = {f.code for f in findings}
        assert "SUBDOMAINS_DISCOVERED" in codes
        assert "LARGE_ATTACK_SURFACE" in codes


# ---------------------------------------------------------------------------
# SubdomainEntry
# ---------------------------------------------------------------------------


class TestSubdomainEntry:
    def test_create(self) -> None:
        entry = SubdomainEntry(
            hostname="api.example.com",
            source="crt.sh",
            status="discovered",
        )
        assert entry.hostname == "api.example.com"
        assert entry.source == "crt.sh"
        assert entry.status == "discovered"


# ---------------------------------------------------------------------------
# SubdomainScanResult
# ---------------------------------------------------------------------------


class TestSubdomainScanResult:
    def test_empty_result(self) -> None:
        result = SubdomainScanResult(
            status=ModuleScanStatus.SUCCESS,
            target="example.com",
        )
        d = result.to_dict()
        assert d["status"] == "success"
        assert d["target"] == "example.com"
        assert d["subdomains"] == []
        assert d["total_discovered"] == 0

    def test_with_subdomains(self) -> None:
        entry = SubdomainEntry(
            hostname="api.example.com",
            source="crt.sh",
            status="discovered",
        )
        result = SubdomainScanResult(
            status=ModuleScanStatus.SUCCESS,
            target="example.com",
            subdomains=[entry],
            total_discovered=1,
        )
        d = result.to_dict()
        assert d["total_discovered"] == 1
        assert len(d["subdomains"]) == 1
        assert d["subdomains"][0]["hostname"] == "api.example.com"

    def test_error_result(self) -> None:
        from app.services.common import ModuleScanError

        result = SubdomainScanResult(
            status=ModuleScanStatus.ERROR,
            target="",
            error=ModuleScanError(code="INVALID_TARGET", message="bad target"),
        )
        d = result.to_dict()
        assert d["status"] == "error"
        assert d["error"]["code"] == "INVALID_TARGET"


# ---------------------------------------------------------------------------
# Integration via async discovery (mocked HTTP)
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_discover_subdomains_async_invalid_target() -> None:
    from app.services.subdomain import discover_subdomains_async

    result = await discover_subdomains_async("")
    assert result["status"] == "error"
    assert result["error"]["code"] == "INVALID_TARGET"


@pytest.mark.asyncio
async def test_discover_subdomains_async_network_error(monkeypatch) -> None:
    import httpx
    from app.services.subdomain import discover_subdomains_async

    async def fake_get(*args, **kwargs):
        raise httpx.RequestError("network error")

    monkeypatch.setattr(httpx.AsyncClient, "get", fake_get)
    result = await discover_subdomains_async("example.com")
    # Should return success with empty results (graceful degradation)
    assert result["status"] == "success"
    assert result["total_discovered"] == 0


@pytest.mark.asyncio
async def test_discover_subdomains_async_non_list_response(monkeypatch) -> None:
    import httpx
    from app.services.subdomain import discover_subdomains_async

    class FakeResponse:
        status_code = 200

        def raise_for_status(self):
            pass

        def json(self):
            return {"not": "a list"}

    async def fake_get(*args, **kwargs):
        return FakeResponse()

    monkeypatch.setattr(httpx.AsyncClient, "get", fake_get)
    result = await discover_subdomains_async("example.com")
    assert result["status"] == "success"
    assert result["total_discovered"] == 0


@pytest.mark.asyncio
async def test_discover_subdomains_async_with_results(monkeypatch) -> None:
    import httpx
    from app.services.subdomain import discover_subdomains_async

    class FakeResponse:
        status_code = 200

        def raise_for_status(self):
            pass

        def json(self):
                return [
                    {"name_value": "api.example.com\nwww.example.com"},
                    {"name_value": "mail.example.com"},
                    {"name_value": "api.example.com"},  # duplicate
                    {"name_value": "*.wildcard.example.com"},  # wildcard
                    {"name_value": "example.com"},  # root domain — excluded
                ]

    async def fake_get(*args, **kwargs):
        return FakeResponse()

    monkeypatch.setattr(httpx.AsyncClient, "get", fake_get)
    result = await discover_subdomains_async("example.com")
    assert result["status"] == "success"
    assert result["total_discovered"] == 3
    hostnames = {sd["hostname"] for sd in result["subdomains"]}
    assert hostnames == {"api.example.com", "www.example.com", "mail.example.com"}


@pytest.mark.asyncio
async def test_discover_subdomains_max_results(monkeypatch) -> None:
    import httpx
    from app.services.subdomain import MAX_RESULTS, discover_subdomains_async

    many_names = "\n".join(f"sub{i:03d}.example.com" for i in range(200))

    class FakeResponse:
        status_code = 200

        def raise_for_status(self):
            pass

        def json(self):
                return [{"name_value": many_names}]

    async def fake_get(*args, **kwargs):
        return FakeResponse()

    monkeypatch.setattr(httpx.AsyncClient, "get", fake_get)
    result = await discover_subdomains_async("example.com")
    assert result["status"] == "success"
    assert result["total_discovered"] == MAX_RESULTS

    if MAX_RESULTS > 20:
        codes = {f["code"] for f in result.get("findings", [])}
        assert "LARGE_ATTACK_SURFACE" in codes


# ---------------------------------------------------------------------------
# Synchronous wrapper
# ---------------------------------------------------------------------------


def test_discover_subdomains_sync_invalid() -> None:
    from app.services.subdomain import discover_subdomains

    result = discover_subdomains("")
    assert result["status"] == "error"
    assert result["error"]["code"] == "INVALID_TARGET"


@pytest.mark.asyncio
async def test_discover_subdomains_http_403(monkeypatch) -> None:
    import httpx
    from app.services.subdomain import discover_subdomains_async

    class Fake403Response:
        status_code = 403
        reason_phrase = "Forbidden"

        def raise_for_status(self):
            raise httpx.HTTPStatusError(
                "403 Forbidden", request=None, response=self  # type: ignore[arg-type]
            )

    async def fake_get(*args, **kwargs):
        return Fake403Response()

    monkeypatch.setattr(httpx.AsyncClient, "get", fake_get)
    result = await discover_subdomains_async("example.com")
    # Should gracefully degrade — 403 from crt.sh is common
    assert result["status"] == "success"
    assert result["total_discovered"] == 0


@pytest.mark.asyncio
async def test_discover_subdomains_invalid_json(monkeypatch) -> None:
    import httpx
    from app.services.subdomain import discover_subdomains_async

    class FakeBadJSONResponse:
        status_code = 200

        def raise_for_status(self):
            pass

        def json(self):
            raise ValueError("bad json")

    async def fake_get(*args, **kwargs):
        return FakeBadJSONResponse()

    monkeypatch.setattr(httpx.AsyncClient, "get", fake_get)
    result = await discover_subdomains_async("example.com")
    assert result["status"] == "success"
    assert result["total_discovered"] == 0