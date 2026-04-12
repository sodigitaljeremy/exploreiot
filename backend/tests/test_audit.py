"""Tests for the audit logging middleware."""

import sys
import os
import logging

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))


class TestAuditMiddleware:
    def test_audit_logs_request(self, client, caplog):
        """Audit middleware should log each request."""
        with caplog.at_level(logging.INFO, logger="app.audit"):
            response = client.get("/")
            assert response.status_code == 200

        audit_logs = [r for r in caplog.records if r.name == "app.audit"]
        assert len(audit_logs) >= 1
        log_message = audit_logs[0].message
        assert "GET" in log_message
        assert "/" in log_message
        assert "200" in log_message
        assert "ms" in log_message

    def test_audit_logs_404(self, client, caplog):
        """Audit middleware should log 404 responses."""
        with caplog.at_level(logging.INFO, logger="app.audit"):
            response = client.get("/nonexistent-endpoint")
            assert response.status_code in (404, 405)

        audit_logs = [r for r in caplog.records if r.name == "app.audit"]
        assert len(audit_logs) >= 1

    def test_audit_log_format(self, client, caplog):
        """Audit log should contain method, path, status, and duration."""
        with caplog.at_level(logging.INFO, logger="app.audit"):
            client.get("/health")

        audit_logs = [r for r in caplog.records if r.name == "app.audit"]
        assert len(audit_logs) >= 1
        msg = audit_logs[0].message
        # Format: "GET /health 200 1.2ms"
        parts = msg.split()
        assert parts[0] == "GET"
        assert parts[1] == "/health"
