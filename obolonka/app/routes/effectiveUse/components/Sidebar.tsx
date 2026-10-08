import {
  HouseDoor,
  ClockHistory,
  GraphUp,
  Cpu,
  LightningCharge
} from "react-bootstrap-icons";

import { useNavigate } from "react-router";

function Sidebar() {
  const navigate = useNavigate();

  return (
    <div
      className="bg-white shadow-sm p-4 d-flex flex-column justify-content-between"
      style={{
        width: "280px",
        minHeight: "100vh",
      }}
    >
      <div>
        {/* Logo */}
        <div className="mb-5">
          <h3 className="fw-bold">
            SmartEnergy
          </h3>

          <p className="text-muted mb-0">
            Energy Management
          </p>
        </div>

        {/* Navigation */}
        <div className="d-flex flex-column gap-3">

          {/* Current State */}
          <button
            className="btn btn-light d-flex align-items-center gap-3 text-start p-3 rounded-4"
            onClick={() => navigate("/effective-use")}
          >
            <HouseDoor size={22} />
            Про поточний стан системи
          </button>

          {/* History */}
          <button
            className="btn btn-light d-flex align-items-center gap-3 text-start p-3 rounded-4"
            onClick={() => navigate("/effective-use/history")}
          >
            <ClockHistory size={22} />
            Історія
          </button>

          {/* Analytics */}
          <button
            className="btn btn-light d-flex align-items-center gap-3 text-start p-3 rounded-4"
            onClick={() => navigate("/effective-use/analytics")}
          >
            <GraphUp size={22} />
            Аналітика
          </button>

          {/* Forecast */}
          <button
            className="btn btn-light d-flex align-items-center gap-3 text-start p-3 rounded-4"
            onClick={() => navigate("/effective-use/forecast")}
          >
            <Cpu size={22} />
            Прогнозування
          </button>
        </div>
      </div>

      {/* Current Power Source */}
      <div className="bg-light rounded-4 p-4 mt-4">
        <p className="text-muted mb-2">
          Поточне джерело живлення
        </p>

        <div className="d-flex align-items-center gap-3">
          <LightningCharge
            size={28}
            className="text-warning"
          />

          <div>
            <h6 className="fw-bold mb-0">
              Сонячні панелі
            </h6>

            <small className="text-muted">
              Активне живлення
            </small>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Sidebar;