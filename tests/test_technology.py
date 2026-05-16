"""Unit tests for the technology fingerprinting service."""

import pytest

from app.services.technology import (
    TechFingerprint,
    _analyze_response,
    _deduplicate_fingerprints,
    _extract_meta_generators,
)


class TestExtractMetaGenerators:
    def test_wordpress_meta(self) -> None:
        html = '<meta name="generator" content="WordPress 6.5.2">'
        result = _extract_meta_generators(html)
        assert len(result) == 1
        assert "WordPress 6.5.2" in result[0]

    def test_no_generator(self) -> None:
        html = "<html><head><title>Test</title></head><body></body></html>"
        assert _extract_meta_generators(html) == []

    def test_multiple_generators(self) -> None:
        html = (
            '<meta name="generator" content="Hugo 0.121">'
            '<meta name="generator" content="Some Tool 1.0">'
        )
        result = _extract_meta_generators(html)
        assert len(result) == 2


class TestAnalyzeResponse:
    def test_detect_nginx_from_server_header(self) -> None:
        headers = {"Server": "nginx/1.21.6"}
        fps, _ = _analyze_response(headers, "")
        names = [fp.name for fp in fps]
        assert "nginx" in names
        nginx = next(fp for fp in fps if fp.name == "nginx")
        assert nginx.version == "1.21.6"
        assert nginx.category == "web_server"
        assert nginx.confidence >= 90

    def test_detect_apache_from_server_header(self) -> None:
        headers = {"Server": "Apache/2.4.52 (Ubuntu)"}
        fps, _ = _analyze_response(headers, "")
        names = [fp.name for fp in fps]
        assert "Apache" in names
        apache = next(fp for fp in fps if fp.name == "Apache")
        assert apache.version == "2.4.52"

    def test_detect_php_from_x_powered_by(self) -> None:
        headers = {"X-Powered-By": "PHP/8.1.2"}
        fps, _ = _analyze_response(headers, "")
        names = [fp.name for fp in fps]
        assert "PHP" in names
        php = next(fp for fp in fps if fp.name == "PHP")
        assert php.version == "8.1.2"
        assert php.category == "language"

    def test_detect_cloudflare_from_cf_ray(self) -> None:
        headers = {"cf-ray": "8abc123-IAD", "Server": "cloudflare"}
        fps, _ = _analyze_response(headers, "")
        names = [fp.name for fp in fps]
        assert "Cloudflare" in names

    def test_detect_wordpress_from_meta_generator(self) -> None:
        body = '<html><head><meta name="generator" content="WordPress 6.5"></head></html>'
        fps, findings = _analyze_response({}, body)
        names = [fp.name for fp in fps]
        assert "WordPress" in names
        wp = next(fp for fp in fps if fp.name == "WordPress")
        assert wp.version == "6.5"
        assert wp.category == "cms"
        # Should also generate a CMS_DETECTED finding
        codes = [f.code for f in findings]
        assert "CMS_DETECTED" in codes

    def test_detect_wordpress_from_wp_content(self) -> None:
        body = '<link rel="stylesheet" href="/wp-content/themes/foo/style.css">'
        fps, _ = _analyze_response({}, body)
        names = [fp.name for fp in fps]
        assert "WordPress" in names

    def test_detect_react_from_script(self) -> None:
        body = '<script src="/static/js/react.production.min.js"></script>'
        fps, _ = _analyze_response({}, body)
        names = [fp.name for fp in fps]
        assert "React" in names

    def test_detect_vue_from_body(self) -> None:
        body = '<script src="/assets/vue.global.min.js"></script>'
        fps, _ = _analyze_response({}, body)
        names = [fp.name for fp in fps]
        assert "Vue.js" in names

    def test_detect_angular_from_ng_version(self) -> None:
        body = '<app-root ng-version="17.1.0"></app-root>'
        fps, _ = _analyze_response({}, body)
        names = [fp.name for fp in fps]
        assert "Angular" in names

    def test_detect_nextjs_from_next_data(self) -> None:
        body = '<script id="__NEXT_DATA__" type="application/json">{"props":{}}</script>'
        fps, _ = _analyze_response({}, body)
        names = [fp.name for fp in fps]
        assert "Next.js" in names

    def test_detect_google_analytics(self) -> None:
        body = '<script async src="https://www.googletagmanager.com/gtag/js?id=G-ABC123"></script>'
        fps, _ = _analyze_response({}, body)
        names = [fp.name for fp in fps]
        assert "Google Analytics" in names

    def test_detect_google_tag_manager(self) -> None:
        body = '<script src="https://www.googletagmanager.com/gtm.js?id=GTM-ABC"></script>'
        fps, _ = _analyze_response({}, body)
        names = [fp.name for fp in fps]
        assert "Google Tag Manager" in names

    def test_detect_jquery(self) -> None:
        body = '<script src="/js/jquery-3.7.1.min.js"></script>'
        fps, _ = _analyze_response({}, body)
        names = [fp.name for fp in fps]
        assert "jQuery" in names
        jq = next(fp for fp in fps if fp.name == "jQuery")
        assert jq.version == "3.7.1"

    def test_detect_bootstrap(self) -> None:
        body = '<link href="/css/bootstrap-5.3.2.min.css" rel="stylesheet">'
        fps, _ = _analyze_response({}, body)
        names = [fp.name for fp in fps]
        assert "Bootstrap" in names

    def test_no_detections_on_empty_response(self) -> None:
        fps, findings = _analyze_response({}, "")
        assert fps == []
        assert findings == []

    def test_no_detections_minimal_headers(self) -> None:
        headers = {"Content-Type": "text/html", "Content-Length": "0"}
        fps, findings = _analyze_response(headers, "<html></html>")
        assert fps == []
        assert findings == []

    def test_version_not_fabricated(self) -> None:
        """Version should only appear if explicitly extracted, never guessed."""
        headers = {"Server": "nginx"}
        fps, _ = _analyze_response(headers, "")
        nginx = next(fp for fp in fps if fp.name == "nginx")
        assert nginx.version is None

    def test_technology_disclosure_finding(self) -> None:
        headers = {"Server": "nginx/1.10.3"}
        _, findings = _analyze_response(headers, "")
        codes = [f.code for f in findings]
        assert "TECHNOLOGY_DISCLOSURE" in codes

    def test_large_tech_stack_finding(self) -> None:
        """When many technologies are detected, a LARGE_TECH_STACK finding should appear."""
        headers = {
            "Server": "nginx/1.21.6",
            "X-Powered-By": "PHP/8.1",
            "cf-ray": "abc-123",
        }
        body = (
            '<meta name="generator" content="WordPress 6.5">'
            '<script src="/js/jquery-3.7.1.min.js"></script>'
            '<link href="/css/bootstrap-5.3.min.css" rel="stylesheet">'
            '<script async src="https://www.googletagmanager.com/gtag/js?id=G-X"></script>'
            '<script src="https://www.googletagmanager.com/gtm.js?id=GTM-Y"></script>'
            '<script src="/react.production.min.js"></script>'
        )
        fps, findings = _analyze_response(headers, body)
        assert len(fps) >= 8
        codes = [f.code for f in findings]
        assert "LARGE_TECH_STACK" in codes

    def test_body_size_limit(self) -> None:
        """Body analysis should work even with very large content (it gets truncated upstream)."""
        # The truncation happens in inspect_technology_async, but _analyze_response
        # should handle any size gracefully.
        big_body = "x" * 500_000 + '<script src="/react.production.min.js"></script>'
        fps, _ = _analyze_response({}, big_body)
        names = [fp.name for fp in fps]
        assert "React" in names


class TestDeduplication:
    def test_keeps_highest_confidence(self) -> None:
        fps = [
            TechFingerprint(name="Cloudflare", category="cdn", version=None, confidence=70, evidence="via"),
            TechFingerprint(name="Cloudflare", category="cdn", version=None, confidence=99, evidence="cf-ray"),
        ]
        result = _deduplicate_fingerprints(fps)
        assert len(result) == 1
        assert result[0].confidence == 99

    def test_prefers_version_on_tie(self) -> None:
        fps = [
            TechFingerprint(name="nginx", category="web_server", version=None, confidence=95, evidence="header"),
            TechFingerprint(name="nginx", category="web_server", version="1.21.6", confidence=95, evidence="header"),
        ]
        result = _deduplicate_fingerprints(fps)
        assert len(result) == 1
        assert result[0].version == "1.21.6"

    def test_sorted_by_confidence_desc(self) -> None:
        fps = [
            TechFingerprint(name="jQuery", category="js_library", version="3.7", confidence=80, evidence="body"),
            TechFingerprint(name="nginx", category="web_server", version="1.21", confidence=95, evidence="header"),
        ]
        result = _deduplicate_fingerprints(fps)
        assert result[0].name == "nginx"
        assert result[1].name == "jQuery"
