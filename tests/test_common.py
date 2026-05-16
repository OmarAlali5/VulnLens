from app.services.common import summarize_findings


def test_summarize_findings_counts_severities():
    modules = {
        "ssl": {
            "findings": [
                {"severity": "critical", "code": "A"},
                {"severity": "high", "code": "B"},
            ]
        },
        "headers": {
            "findings": [{"severity": "medium", "code": "C"}],
        },
    }
    summary = summarize_findings(modules)
    assert summary["critical"] == 1
    assert summary["high"] == 1
    assert summary["medium"] == 1
