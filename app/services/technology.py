"""
Passive technology fingerprinting service.

Detects web servers, frameworks, CMS platforms, CDNs, analytics tools, and
JavaScript libraries by analysing HTTP response headers and HTML body content.
Uses httpx for async HTTP requests. No subprocess or shell execution.
"""

from __future__ import annotations

import asyncio
import logging
import re
from dataclasses import dataclass, field
from enum import Enum
from typing import Any, Final
from urllib.parse import urlparse

import httpx

from app.services.common import (
    Finding,
    FindingSeverity,
    ModuleScanError,
    ModuleScanStatus,
    serialize,
)

logger = logging.getLogger(__name__)

DEFAULT_TIMEOUT: Final[float] = 12.0
MAX_BODY_BYTES: Final[int] = 200_000  # 200 KB cap for HTML parsing


# ---------------------------------------------------------------------------
# Enums & data structures
# ---------------------------------------------------------------------------


class TechCategory(str, Enum):
    WEB_SERVER = "web_server"
    FRAMEWORK = "framework"
    CMS = "cms"
    CDN = "cdn"
    REVERSE_PROXY = "reverse_proxy"
    LANGUAGE = "language"
    JS_FRAMEWORK = "js_framework"
    JS_LIBRARY = "js_library"
    ANALYTICS = "analytics"
    HOSTING = "hosting"
    FRONTEND = "frontend"
    SECURITY = "security"


@dataclass(frozen=True, slots=True)
class TechSignature:
    """One passive detection rule."""

    name: str
    category: TechCategory
    header_name: str | None = None
    header_pattern: str | None = None
    meta_generator: str | None = None
    script_pattern: str | None = None
    body_pattern: str | None = None
    version_regex: str | None = None
    confidence: int = 80


@dataclass(frozen=True, slots=True)
class TechFingerprint:
    """A single detected technology."""

    name: str
    category: str
    version: str | None
    confidence: int
    evidence: str


@dataclass(frozen=True, slots=True)
class TechScanResult:
    """Complete result for the technology module."""

    status: ModuleScanStatus
    target: str
    fingerprints: list[TechFingerprint] = field(default_factory=list)
    findings: list[Finding] = field(default_factory=list)
    error: ModuleScanError | None = None

    def to_dict(self) -> dict[str, Any]:
        return serialize(self)


# ---------------------------------------------------------------------------
# Signature database — pre-compiled at module load time
# ---------------------------------------------------------------------------


_SIGNATURES: Final[tuple[TechSignature, ...]] = (
    # -- Web servers --
    TechSignature(
        name="nginx",
        category=TechCategory.WEB_SERVER,
        header_name="server",
        header_pattern=r"nginx",
        version_regex=r"nginx[/ ]([\d.]+)",
        confidence=95,
    ),
    TechSignature(
        name="Apache",
        category=TechCategory.WEB_SERVER,
        header_name="server",
        header_pattern=r"apache",
        version_regex=r"Apache[/ ]([\d.]+)",
        confidence=95,
    ),
    TechSignature(
        name="LiteSpeed",
        category=TechCategory.WEB_SERVER,
        header_name="server",
        header_pattern=r"litespeed",
        version_regex=r"LiteSpeed[/ ]([\d.]+)",
        confidence=90,
    ),
    TechSignature(
        name="Microsoft IIS",
        category=TechCategory.WEB_SERVER,
        header_name="server",
        header_pattern=r"microsoft-iis",
        version_regex=r"IIS[/ ]([\d.]+)",
        confidence=95,
    ),
    TechSignature(
        name="Caddy",
        category=TechCategory.WEB_SERVER,
        header_name="server",
        header_pattern=r"caddy",
        confidence=90,
    ),
    TechSignature(
        name="Gunicorn",
        category=TechCategory.WEB_SERVER,
        header_name="server",
        header_pattern=r"gunicorn",
        confidence=85,
    ),
    # -- CDN / Reverse proxies --
    TechSignature(
        name="Cloudflare",
        category=TechCategory.CDN,
        header_name="cf-ray",
        header_pattern=r".+",
        confidence=99,
    ),
    TechSignature(
        name="Cloudflare",
        category=TechCategory.CDN,
        header_name="server",
        header_pattern=r"cloudflare",
        confidence=99,
    ),
    TechSignature(
        name="AWS CloudFront",
        category=TechCategory.CDN,
        header_name="x-amz-cf-id",
        header_pattern=r".+",
        confidence=95,
    ),
    TechSignature(
        name="AWS CloudFront",
        category=TechCategory.CDN,
        header_name="server",
        header_pattern=r"cloudfront",
        confidence=95,
    ),
    TechSignature(
        name="Vercel",
        category=TechCategory.HOSTING,
        header_name="x-vercel-id",
        header_pattern=r".+",
        confidence=95,
    ),
    TechSignature(
        name="Netlify",
        category=TechCategory.HOSTING,
        header_name="server",
        header_pattern=r"netlify",
        confidence=95,
    ),
    TechSignature(
        name="Netlify",
        category=TechCategory.HOSTING,
        header_name="x-nf-request-id",
        header_pattern=r".+",
        confidence=95,
    ),
    TechSignature(
        name="Fastly",
        category=TechCategory.CDN,
        header_name="x-served-by",
        header_pattern=r"cache-",
        confidence=85,
    ),
    TechSignature(
        name="Fastly",
        category=TechCategory.CDN,
        header_name="via",
        header_pattern=r"varnish",
        confidence=70,
    ),
    TechSignature(
        name="Varnish",
        category=TechCategory.REVERSE_PROXY,
        header_name="x-varnish",
        header_pattern=r".+",
        confidence=90,
    ),
    TechSignature(
        name="Akamai",
        category=TechCategory.CDN,
        header_name="x-akamai-transformed",
        header_pattern=r".+",
        confidence=90,
    ),
    # -- Languages / Runtimes --
    TechSignature(
        name="PHP",
        category=TechCategory.LANGUAGE,
        header_name="x-powered-by",
        header_pattern=r"php",
        version_regex=r"PHP[/ ]([\d.]+)",
        confidence=95,
    ),
    TechSignature(
        name="ASP.NET",
        category=TechCategory.FRAMEWORK,
        header_name="x-powered-by",
        header_pattern=r"asp\.net",
        confidence=95,
    ),
    TechSignature(
        name="ASP.NET",
        category=TechCategory.FRAMEWORK,
        header_name="x-aspnet-version",
        header_pattern=r".+",
        version_regex=r"([\d.]+)",
        confidence=95,
    ),
    TechSignature(
        name="Express",
        category=TechCategory.FRAMEWORK,
        header_name="x-powered-by",
        header_pattern=r"express",
        confidence=90,
    ),
    TechSignature(
        name="Next.js",
        category=TechCategory.FRAMEWORK,
        header_name="x-powered-by",
        header_pattern=r"next\.?js",
        confidence=90,
    ),
    TechSignature(
        name="Django",
        category=TechCategory.FRAMEWORK,
        header_name="x-frame-options",
        header_pattern=r".*",
        body_pattern=r"csrfmiddlewaretoken",
        confidence=60,
    ),
    # -- CMS platforms --
    TechSignature(
        name="WordPress",
        category=TechCategory.CMS,
        meta_generator=r"wordpress",
        version_regex=r"WordPress\s+([\d.]+)",
        confidence=95,
    ),
    TechSignature(
        name="WordPress",
        category=TechCategory.CMS,
        body_pattern=r"/wp-content/",
        confidence=85,
    ),
    TechSignature(
        name="Drupal",
        category=TechCategory.CMS,
        meta_generator=r"drupal",
        version_regex=r"Drupal\s+([\d.]+)",
        confidence=95,
    ),
    TechSignature(
        name="Drupal",
        category=TechCategory.CMS,
        header_name="x-drupal-cache",
        header_pattern=r".+",
        confidence=95,
    ),
    TechSignature(
        name="Joomla",
        category=TechCategory.CMS,
        meta_generator=r"joomla",
        version_regex=r"Joomla!\s+([\d.]+)",
        confidence=95,
    ),
    TechSignature(
        name="Shopify",
        category=TechCategory.CMS,
        header_name="x-shopify-stage",
        header_pattern=r".+",
        confidence=95,
    ),
    TechSignature(
        name="Shopify",
        category=TechCategory.CMS,
        body_pattern=r"cdn\.shopify\.com",
        confidence=85,
    ),
    TechSignature(
        name="Squarespace",
        category=TechCategory.CMS,
        body_pattern=r"static\d?\.squarespace\.com",
        confidence=90,
    ),
    TechSignature(
        name="Wix",
        category=TechCategory.CMS,
        body_pattern=r"static\.parastorage\.com|wix\.com",
        confidence=85,
    ),
    TechSignature(
        name="Hugo",
        category=TechCategory.CMS,
        meta_generator=r"hugo",
        version_regex=r"Hugo\s+([\d.]+)",
        confidence=90,
    ),
    TechSignature(
        name="Jekyll",
        category=TechCategory.CMS,
        meta_generator=r"jekyll",
        version_regex=r"Jekyll\s+v?([\d.]+)",
        confidence=90,
    ),
    TechSignature(
        name="Ghost",
        category=TechCategory.CMS,
        meta_generator=r"ghost",
        version_regex=r"Ghost\s+([\d.]+)",
        confidence=90,
    ),
    # -- JavaScript frameworks (script src) --
    TechSignature(
        name="React",
        category=TechCategory.JS_FRAMEWORK,
        body_pattern=r"react(?:\.(?:production|development|min))*\.js|__NEXT_DATA__|_react",
        confidence=80,
    ),
    TechSignature(
        name="Vue.js",
        category=TechCategory.JS_FRAMEWORK,
        body_pattern=r"vue(?:\.(?:global|runtime|esm-browser|esm-bundler|cjs|min))*\.js|__VUE__",
        confidence=80,
    ),
    TechSignature(
        name="Angular",
        category=TechCategory.JS_FRAMEWORK,
        body_pattern=r"ng-version=|angular(?:\.min)?\.js",
        confidence=80,
    ),
    TechSignature(
        name="Svelte",
        category=TechCategory.JS_FRAMEWORK,
        body_pattern=r"__svelte",
        confidence=75,
    ),
    TechSignature(
        name="Next.js",
        category=TechCategory.FRAMEWORK,
        body_pattern=r"__NEXT_DATA__|/_next/static/",
        confidence=85,
    ),
    TechSignature(
        name="Nuxt.js",
        category=TechCategory.FRAMEWORK,
        body_pattern=r"__NUXT__|/_nuxt/",
        confidence=85,
    ),
    TechSignature(
        name="Gatsby",
        category=TechCategory.FRAMEWORK,
        meta_generator=r"gatsby",
        version_regex=r"Gatsby\s+([\d.]+)",
        confidence=90,
    ),
    # -- JS libraries --
    TechSignature(
        name="jQuery",
        category=TechCategory.JS_LIBRARY,
        body_pattern=r"jquery(?:[.-][\d.]+)?(?:\.min)?\.js",
        version_regex=r"jquery[.-]([\d.]+)",
        confidence=80,
    ),
    TechSignature(
        name="Bootstrap",
        category=TechCategory.FRONTEND,
        body_pattern=r"bootstrap(?:[.-][\d.]+)?(?:\.min)?\.(?:js|css)",
        version_regex=r"bootstrap[.-]([\d.]+)",
        confidence=75,
    ),
    TechSignature(
        name="Tailwind CSS",
        category=TechCategory.FRONTEND,
        body_pattern=r"tailwindcss|tailwind(?:\.min)?\.css",
        confidence=70,
    ),
    # -- Analytics --
    TechSignature(
        name="Google Analytics",
        category=TechCategory.ANALYTICS,
        body_pattern=r"google-analytics\.com/(?:analytics|ga)\.js|gtag/js\?id=(?:UA|G)-",
        confidence=90,
    ),
    TechSignature(
        name="Google Tag Manager",
        category=TechCategory.ANALYTICS,
        body_pattern=r"googletagmanager\.com/gtm\.js",
        confidence=90,
    ),
    TechSignature(
        name="Facebook Pixel",
        category=TechCategory.ANALYTICS,
        body_pattern=r"connect\.facebook\.net/.*/fbevents\.js",
        confidence=85,
    ),
    TechSignature(
        name="Hotjar",
        category=TechCategory.ANALYTICS,
        body_pattern=r"static\.hotjar\.com",
        confidence=85,
    ),
    # -- Security --
    TechSignature(
        name="reCAPTCHA",
        category=TechCategory.SECURITY,
        body_pattern=r"google\.com/recaptcha",
        confidence=85,
    ),
    TechSignature(
        name="hCaptcha",
        category=TechCategory.SECURITY,
        body_pattern=r"hcaptcha\.com",
        confidence=85,
    ),
)


# Pre-compile all regex patterns at module load time
_COMPILED_PATTERNS: dict[int, re.Pattern[str]] = {}


def _get_compiled(pattern: str) -> re.Pattern[str]:
    """Return a cached, compiled regex for *pattern*."""
    key = id(pattern)  # stable because signatures are frozen module-level constants
    if key not in _COMPILED_PATTERNS:
        _COMPILED_PATTERNS[key] = re.compile(pattern, re.IGNORECASE)
    return _COMPILED_PATTERNS[key]


# ---------------------------------------------------------------------------
# Detection engine
# ---------------------------------------------------------------------------


def _normalize_url(target: str) -> str:
    stripped = target.strip()
    if "://" not in stripped:
        return f"https://{stripped}"
    return stripped


def _extract_meta_generators(body: str) -> list[str]:
    """Extract all ``<meta name="generator" content="...">`` values."""
    pattern = re.compile(
        r'<meta\s+[^>]*name\s*=\s*["\']generator["\'][^>]*content\s*=\s*["\']([^"\']+)["\']',
        re.IGNORECASE,
    )
    return pattern.findall(body)


def _match_signature(
    sig: TechSignature,
    lower_headers: dict[str, str],
    meta_generators: list[str],
    body: str,
) -> TechFingerprint | None:
    """Test a single signature against the collected evidence.

    Returns a TechFingerprint if matched, else None.
    """
    evidence_parts: list[str] = []
    matched = False
    version: str | None = None

    # --- Header match ---
    # First, let's see if there's a dead giveaway in the HTTP headers
    if sig.header_name and sig.header_pattern:
        header_val = lower_headers.get(sig.header_name, "")
        if header_val:
            pat = _get_compiled(sig.header_pattern)
            if pat.search(header_val):
                matched = True
                evidence_parts.append(f"Header: {sig.header_name}: {header_val[:120]}")
                # If we got a hit, let's try to extract the exact version number
                if sig.version_regex:
                    ver_match = _get_compiled(sig.version_regex).search(header_val)
                    if ver_match:
                        version = ver_match.group(1).rstrip(".-")

    # --- Meta generator match ---
    # Next up: check the <meta name="generator"> tags.
    if sig.meta_generator and meta_generators:
        gen_pat = _get_compiled(sig.meta_generator)
        for gen_val in meta_generators:
            if gen_pat.search(gen_val):
                matched = True
                evidence_parts.append(f"Meta generator: {gen_val[:120]}")
                if sig.version_regex and version is None:
                    ver_match = _get_compiled(sig.version_regex).search(gen_val)
                    if ver_match:
                        version = ver_match.group(1).rstrip(".-")
                break

    # --- Body pattern match ---
    if sig.body_pattern and body:
        body_pat = _get_compiled(sig.body_pattern)
        body_match = body_pat.search(body)
        if body_match:
            matched = True
            snippet = body_match.group(0)[:80]
            evidence_parts.append(f"HTML body match: {snippet}")
            if sig.version_regex and version is None:
                ver_match = _get_compiled(sig.version_regex).search(body_match.group(0))
                if ver_match:
                    version = ver_match.group(1).rstrip(".-")

    # --- Django special case: needs BOTH header and body to match ---
    if sig.name == "Django" and sig.body_pattern:
        has_header = bool(evidence_parts and any("Header:" in e for e in evidence_parts))
        has_body = bool(evidence_parts and any("HTML body" in e for e in evidence_parts))
        if not (has_header or has_body) or not has_body:
            return None

    if not matched:
        return None

    return TechFingerprint(
        name=sig.name,
        category=sig.category.value,
        version=version,
        confidence=sig.confidence,
        evidence="; ".join(evidence_parts),
    )


def _deduplicate_fingerprints(
    fingerprints: list[TechFingerprint],
) -> list[TechFingerprint]:
    """Keep only the highest-confidence entry per technology name."""
    best: dict[str, TechFingerprint] = {}
    
    # We might get multiple hits for the same tech (e.g. from a header AND a script tag).
    # We want to keep the one that gives us the most confidence or the clearest version info.
    for fp in fingerprints:
        existing = best.get(fp.name)
        if existing is None or fp.confidence > existing.confidence:
            best[fp.name] = fp
        elif fp.confidence == existing.confidence and fp.version and not existing.version:
            # Tie breaker: prefer the one that actually tells us the version
            best[fp.name] = fp
            
    return sorted(best.values(), key=lambda f: (-f.confidence, f.name))


def _derive_findings(fingerprints: list[TechFingerprint]) -> list[Finding]:
    """Generate security-relevant findings from detected technologies."""
    findings: list[Finding] = []
    seen_codes: set[str] = set()

    for fp in fingerprints:
        # Version disclosure in headers
        if fp.version and "Header:" in fp.evidence:
            code = f"TECH_VERSION_DISCLOSED_{fp.name.upper().replace('.', '_').replace(' ', '_')}"
            if code not in seen_codes:
                seen_codes.add(code)
                findings.append(
                    Finding(
                        code="TECHNOLOGY_DISCLOSURE",
                        severity=FindingSeverity.INFO,
                        message=(
                            f"{fp.name} version {fp.version} disclosed via HTTP headers"
                        ),
                    )
                )

        # CMS detected — attack surface awareness
        if fp.category == TechCategory.CMS.value:
            code = f"CMS_DETECTED_{fp.name.upper().replace(' ', '_')}"
            if code not in seen_codes:
                seen_codes.add(code)
                msg = f"CMS platform detected: {fp.name}"
                if fp.version:
                    msg += f" {fp.version}"
                findings.append(
                    Finding(
                        code="CMS_DETECTED",
                        severity=FindingSeverity.INFO,
                        message=msg,
                    )
                )

    # Large technology stack
    if len(fingerprints) >= 8:
        findings.append(
            Finding(
                code="LARGE_TECH_STACK",
                severity=FindingSeverity.INFO,
                message=(
                    f"{len(fingerprints)} technologies detected — large "
                    f"tech stacks increase attack surface"
                ),
            )
        )

    return findings


def _analyze_response(
    response_headers: dict[str, str],
    body: str,
) -> tuple[list[TechFingerprint], list[Finding]]:
    """Run all signatures against headers and body."""
    lower_headers = {k.lower(): v for k, v in response_headers.items()}
    meta_generators = _extract_meta_generators(body)

    raw_fingerprints: list[TechFingerprint] = []
    for sig in _SIGNATURES:
        fp = _match_signature(sig, lower_headers, meta_generators, body)
        if fp is not None:
            raw_fingerprints.append(fp)

    fingerprints = _deduplicate_fingerprints(raw_fingerprints)
    findings = _derive_findings(fingerprints)
    return fingerprints, findings


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------


async def inspect_technology_async(
    target: str,
    *,
    timeout: float = DEFAULT_TIMEOUT,
) -> dict[str, Any]:
    """Passively fingerprint technologies used by *target*.

    Makes a single GET request. Analyses HTTP response headers and the
    first ``MAX_BODY_BYTES`` of HTML body content.
    """
    url = _normalize_url(target)
    logger.info("Technology scan starting for %s", url)

    try:
        # Reach out to the target server. We're not following redirects
        # because we only want to analyze the exact URL requested.
        async with httpx.AsyncClient(
            follow_redirects=False,
            timeout=timeout,
            verify=True,
        ) as client:
            response = await client.get(url)
    except httpx.RequestError as exc:
        logger.warning("Technology scan HTTP error for %s: %s", url, exc)
        return TechScanResult(
            status=ModuleScanStatus.ERROR,
            target=url,
            error=ModuleScanError(code="REQUEST_FAILED", message=str(exc)),
        ).to_dict()

    headers = dict(response.headers)
    
    # Grab the first chunk of the HTML body. We don't want to parse megabytes
    # of a huge file, so we cap it to MAX_BODY_BYTES.
    body_bytes = response.content[:MAX_BODY_BYTES]
    try:
        body = body_bytes.decode("utf-8", errors="replace")
    except Exception:
        body = ""

    try:
        # Pass the raw data into our analysis engine
        fingerprints, findings = _analyze_response(headers, body)
    except Exception as exc:
        logger.exception("Technology analysis failed for %s", url)
        return TechScanResult(
            status=ModuleScanStatus.ERROR,
            target=url,
            error=ModuleScanError(code="ANALYSIS_FAILED", message=str(exc)),
        ).to_dict()

    logger.info(
        "Technology scan complete for %s: %d technologies detected",
        url,
        len(fingerprints),
    )

    return TechScanResult(
        status=ModuleScanStatus.SUCCESS,
        target=url,
        fingerprints=fingerprints,
        findings=findings,
    ).to_dict()


def inspect_technology(
    target: str,
    *,
    timeout: float = DEFAULT_TIMEOUT,
) -> dict[str, Any]:
    """Synchronous wrapper around :func:`inspect_technology_async`."""
    return asyncio.run(inspect_technology_async(target, timeout=timeout))
