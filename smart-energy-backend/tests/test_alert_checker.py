"""Юніт-тести модуля перевірки порогових значень."""
import pytest
import sys, os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from alert_checker import DEFAULT_THRESHOLDS


class TestDefaultThresholds:
    def test_all_metrics_have_thresholds(self):
        """Усі ключові метрики мають порогові значення."""
        required = {"temperature", "voltage", "current_a", "power", "frequency"}
        assert required.issubset(set(DEFAULT_THRESHOLDS.keys()))

    def test_temperature_threshold(self):
        """Температурний поріг: 10–40 °C."""
        t = DEFAULT_THRESHOLDS["temperature"]
        assert t["min"] == 10.0
        assert t["max"] == 40.0

    def test_voltage_threshold(self):
        """Напруга має відповідати стандарту EN 50160: 210–250 В."""
        v = DEFAULT_THRESHOLDS["voltage"]
        assert v["min"] == 210.0
        assert v["max"] == 250.0

    def test_frequency_threshold(self):
        """Частота: 49–51 Гц (допуск ±2%)."""
        f = DEFAULT_THRESHOLDS["frequency"]
        assert f["min"] == 49.0
        assert f["max"] == 51.0

    def test_min_less_than_max(self):
        """Мінімальний поріг має бути менший за максимальний."""
        for metric, bounds in DEFAULT_THRESHOLDS.items():
            assert bounds["min"] < bounds["max"], \
                f"min >= max для метрики '{metric}'"

    def test_all_thresholds_positive(self):
        """Пороги для фізичних величин не від'ємні."""
        for metric, bounds in DEFAULT_THRESHOLDS.items():
            assert bounds["min"] >= 0, f"від'ємний мін для '{metric}'"
            assert bounds["max"] > 0,  f"нульовий макс для '{metric}'"


class TestViolationLogic:
    """Тести логіки визначення порушення порогу."""

    def _is_violated(self, value: float, min_v: float, max_v: float) -> bool:
        return value < min_v or value > max_v

    def test_value_within_bounds(self):
        assert not self._is_violated(25.0, 10.0, 40.0)

    def test_value_above_max(self):
        assert self._is_violated(45.0, 10.0, 40.0)

    def test_value_below_min(self):
        assert self._is_violated(5.0, 10.0, 40.0)

    def test_value_exactly_at_max(self):
        """Значення рівно на межі — не порушення."""
        assert not self._is_violated(40.0, 10.0, 40.0)

    def test_severity_critical_over_10_percent(self):
        """Відхилення > 10% від порогу → серйозність critical."""
        max_v = 40.0
        value = 45.0  # відхилення 12.5%
        deviation = (value - max_v) / max_v
        severity = "critical" if deviation > 0.10 else "warning"
        assert severity == "critical"

    def test_severity_warning_under_10_percent(self):
        """Відхилення ≤ 10% від порогу → серйозність warning."""
        max_v = 40.0
        value = 42.0  # відхилення 5%
        deviation = (value - max_v) / max_v
        severity = "critical" if deviation > 0.10 else "warning"
        assert severity == "warning"
