from app.services.headers import _analyze_headers


def test_missing_hsts_on_https():
    findings = _analyze_headers({}, [], is_https=True)
    codes = [f.code for f in findings]
    assert "MISSING_HSTS" in codes


def test_insecure_cookie_finding():
    from app.services.headers import CookieInfo

    cookies = [CookieInfo(name="session", secure=False, httponly=False, samesite=None)]
    findings = _analyze_headers({"content-security-policy": "default-src 'self'"}, cookies, is_https=True)
    codes = [f.code for f in findings]
    assert "INSECURE_COOKIE" in codes
