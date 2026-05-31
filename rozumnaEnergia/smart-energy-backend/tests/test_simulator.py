"""Юніт-тести модуля симуляції IoT-вузлів."""
import pytest
import sys, os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from simulator import _generate, _energy, NODES, NODE_PARAMS, INTERVAL


class TestNodes:
    def test_node_count(self):
        """Система має рівно 4 вузли."""
        assert len(NODES) == 4

    def test_node_ids_format(self):
        """Ідентифікатори вузлів відповідають формату node-XXX."""
        for nid in NODES:
            assert nid.startswith("node-")

    def test_all_nodes_have_params(self):
        """Кожен вузол має параметри симуляції."""
        for nid in NODES:
            assert nid in NODE_PARAMS
            assert "temp_base" in NODE_PARAMS[nid]
            assert "cur_base" in NODE_PARAMS[nid]


class TestDataGeneration:
    def test_all_metrics_present(self):
        """Кожен вимір містить усі 6 метрик."""
        required = {"temperature", "voltage", "current_a", "power", "energy", "frequency"}
        for nid in NODES:
            reading = _generate(nid, 0)
            assert required.issubset(set(reading.keys()))

    def test_temperature_realistic(self):
        """Температура знаходиться в реалістичному діапазоні 0–80°C."""
        for nid in NODES:
            reading = _generate(nid, 0)
            assert 0 < reading["temperature"] < 80

    def test_voltage_around_230(self):
        """Напруга в мережі — 210–250 В (стандарт EN 50160)."""
        for nid in NODES:
            reading = _generate(nid, 0)
            assert 210 <= reading["voltage"] <= 250, \
                f"Напруга {reading['voltage']} В поза стандартним діапазоном для {nid}"

    def test_current_non_negative(self):
        """Струм не може бути від'ємним."""
        for nid in NODES:
            reading = _generate(nid, 0)
            assert reading["current_a"] >= 0

    def test_power_equals_voltage_times_current(self):
        """Потужність = напруга × струм (закон Ома)."""
        for nid in NODES:
            reading = _generate(nid, 0)
            expected = reading["voltage"] * reading["current_a"]
            assert abs(reading["power"] - expected) < 0.2, \
                f"P≠U×I для {nid}: {reading['power']} ≠ {expected:.2f}"

    def test_frequency_near_50hz(self):
        """Частота мережі має бути близько 50 Гц (49–51 Гц)."""
        for nid in NODES:
            reading = _generate(nid, 0)
            assert 49.0 <= reading["frequency"] <= 51.0

    def test_energy_accumulates(self):
        """Накопичена енергія не зменшується з часом."""
        before = {nid: _energy[nid] for nid in NODES}
        for nid in NODES:
            _generate(nid, 100)
        for nid in NODES:
            assert _energy[nid] >= before[nid], \
                f"Енергія зменшилась для {nid}"

    def test_server_room_hotter_than_warehouse(self):
        """Серверна кімната має вищу базову температуру ніж склад."""
        assert NODE_PARAMS["node-002"]["temp_base"] > NODE_PARAMS["node-004"]["temp_base"]

    def test_production_floor_highest_current(self):
        """Виробничий цех споживає найбільший струм."""
        max_node = max(NODES, key=lambda n: NODE_PARAMS[n]["cur_base"])
        assert max_node == "node-003"

    def test_simulation_interval(self):
        """Інтервал симуляції — 5 секунд."""
        assert INTERVAL == 5
