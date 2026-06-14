"""Інтеграційні тести REST API через FastAPI TestClient з мок-базою даних."""
import pytest
import sys, os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from unittest.mock import patch, MagicMock
from contextlib import contextmanager


# ── Мок бази даних ────────────────────────────────────────────────────────────
def make_cursor(rows=None, one=None):
    cur = MagicMock()
    cur.fetchall.return_value = rows or []
    cur.fetchone.return_value = one or {}
    return cur


@contextmanager
def mock_db_ctx(cursor):
    yield cursor


@pytest.fixture
def client():
    """TestClient з підміненими БД та фоновими потоками."""
    with patch("database._create_pool"), \
         patch("database.init_db"), \
         patch("alert_checker.seed_default_thresholds"), \
         patch("mqtt_client.start_mqtt_subscriber"), \
         patch("simulator.start_simulation"):
        from fastapi.testclient import TestClient
        from main import app
        yield TestClient(app)


# ── Health ────────────────────────────────────────────────────────────────────
class TestHealth:
    def test_health_ok(self, client):
        r = client.get("/api/health")
        assert r.status_code == 200
        assert r.json()["status"] == "ok"

    def test_health_contains_service_name(self, client):
        r = client.get("/api/health")
        assert "SmartEnergy Lab" in r.json()["service"]

    def test_health_contains_version(self, client):
        r = client.get("/api/health")
        assert "version" in r.json()


# ── Nodes ─────────────────────────────────────────────────────────────────────
class TestNodes:
    MOCK_NODES = [
        {"id": "node-001", "name": "Офіс",   "location": "Кімната 101", "status": "online", "last_seen": None},
        {"id": "node-002", "name": "Серверна","location": "Підвал",      "status": "online", "last_seen": None},
    ]

    def test_list_nodes_returns_list(self, client):
        cur = make_cursor(rows=self.MOCK_NODES)
        with patch("routers.nodes.get_db", return_value=mock_db_ctx(cur)), patch("routers.stats.get_db", return_value=mock_db_ctx(cur)), patch("routers.alerts.get_db", return_value=mock_db_ctx(cur)), patch("routers.config.get_db", return_value=mock_db_ctx(cur)):
            r = client.get("/api/nodes/")
        assert r.status_code == 200
        assert isinstance(r.json(), list)

    def test_node_not_found(self, client):
        cur = make_cursor(one=None)
        with patch("routers.nodes.get_db", return_value=mock_db_ctx(cur)), patch("routers.stats.get_db", return_value=mock_db_ctx(cur)), patch("routers.alerts.get_db", return_value=mock_db_ctx(cur)), patch("routers.config.get_db", return_value=mock_db_ctx(cur)):
            r = client.get("/api/nodes/node-999")
        assert r.status_code == 404


# ── Stats ─────────────────────────────────────────────────────────────────────
class TestStats:
    MOCK_AGG = {
        "c": 4, "avg_temp": 26.5, "avg_voltage": 230.1,
        "avg_current": 6.2, "total_kw": 1.4,
    }

    def test_summary_structure(self, client):
        cur = make_cursor(one=self.MOCK_AGG)
        cur.fetchone.side_effect = [
            {"c": 4}, {"c": 4}, self.MOCK_AGG, {"total": 350.5}, {"c": 1200}
        ]
        with patch("routers.nodes.get_db", return_value=mock_db_ctx(cur)), patch("routers.stats.get_db", return_value=mock_db_ctx(cur)), patch("routers.alerts.get_db", return_value=mock_db_ctx(cur)), patch("routers.config.get_db", return_value=mock_db_ctx(cur)):
            r = client.get("/api/stats/summary")
        assert r.status_code == 200
        body = r.json()
        for key in ("online_nodes", "total_nodes", "avg_temperature",
                    "total_power_kw", "total_energy_kwh", "total_readings"):
            assert key in body, f"Відсутнє поле '{key}' у відповіді"

    def test_summary_numeric_values(self, client):
        cur = make_cursor()
        cur.fetchone.side_effect = [
            {"c": 3}, {"c": 4},
            {"avg_temp": 28.0, "avg_voltage": 231.0, "avg_current": 5.5, "total_kw": 1.2},
            {"total": 120.5}, {"c": 800},
        ]
        with patch("routers.nodes.get_db", return_value=mock_db_ctx(cur)), patch("routers.stats.get_db", return_value=mock_db_ctx(cur)), patch("routers.alerts.get_db", return_value=mock_db_ctx(cur)), patch("routers.config.get_db", return_value=mock_db_ctx(cur)):
            r = client.get("/api/stats/summary")
        body = r.json()
        assert body["online_nodes"] == 3
        assert body["total_nodes"] == 4


# ── Alerts ────────────────────────────────────────────────────────────────────
class TestAlerts:
    def test_alert_count_returns_int(self, client):
        cur = make_cursor(one={"c": 0})
        with patch("routers.nodes.get_db", return_value=mock_db_ctx(cur)), patch("routers.stats.get_db", return_value=mock_db_ctx(cur)), patch("routers.alerts.get_db", return_value=mock_db_ctx(cur)), patch("routers.config.get_db", return_value=mock_db_ctx(cur)):
            r = client.get("/api/alerts/count")
        assert r.status_code == 200
        assert isinstance(r.json()["count"], int)

    def test_empty_alerts_list(self, client):
        cur = make_cursor(rows=[])
        with patch("routers.nodes.get_db", return_value=mock_db_ctx(cur)), patch("routers.stats.get_db", return_value=mock_db_ctx(cur)), patch("routers.alerts.get_db", return_value=mock_db_ctx(cur)), patch("routers.config.get_db", return_value=mock_db_ctx(cur)):
            r = client.get("/api/alerts/")
        assert r.status_code == 200
        assert r.json() == []


# ── Config ────────────────────────────────────────────────────────────────────
class TestConfig:
    def test_network_config_structure(self, client):
        r = client.get("/api/config/network")
        assert r.status_code == 200
        body = r.json()
        assert "mqtt" in body
        assert "database" in body
        assert "simulation" in body

    def test_mqtt_config_has_auth_flag(self, client):
        r = client.get("/api/config/network")
        assert r.json()["mqtt"]["auth_enabled"] is True

    def test_thresholds_list(self, client):
        cur = make_cursor(rows=[])
        with patch("routers.nodes.get_db", return_value=mock_db_ctx(cur)), patch("routers.stats.get_db", return_value=mock_db_ctx(cur)), patch("routers.alerts.get_db", return_value=mock_db_ctx(cur)), patch("routers.config.get_db", return_value=mock_db_ctx(cur)):
            r = client.get("/api/config/thresholds")
        assert r.status_code == 200
