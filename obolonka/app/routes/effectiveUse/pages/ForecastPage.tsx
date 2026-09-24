import { useEffect, useState } from "react";

import MainLayout from "../layouts/MainLayout";

import {
  Card,
  Row,
  Col,
  Spinner,
  Alert,
  Table,
  Badge,
} from "react-bootstrap";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ResponsiveContainer,
  Legend,
} from "recharts";

import API from "../api/api";


interface Forecast24hItem {
  time: string;
  total_consumption: number;
  solar_consumption: number;
  battery_consumption: number;
  solar_generation: number;
  energy_balance: number;
}


interface Forecast7dItem {
  date: string;
  total_consumption: number;
  solar_consumption: number;
  battery_consumption: number;
  solar_generation: number;
  energy_balance: number;
}


interface Recommendation {
  type: string;
  title: string;
  message: string;
  level: "info" | "warning" | "danger" | "success";
}


interface RecommendationsResponse {
  forecast: Recommendation[];
  analytics: Recommendation[];
}


const ForecastPage = () => {

  const [forecast24h, setForecast24h] =
    useState<Forecast24hItem[]>([]);

  const [forecast7d, setForecast7d] =
    useState<Forecast7dItem[]>([]);

  const [forecastMonth, setForecastMonth] =
    useState<Forecast7dItem[]>([]);

  const [recommendations, setRecommendations] =
    useState<RecommendationsResponse>({
      forecast: [],
      analytics: [],
    });

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");


  // =========================================
  // LOAD FORECAST DATA
  // =========================================

  useEffect(() => {

    loadForecastData();

  }, []);


  const loadForecastData = async () => {

    try {

      setLoading(true);

      const [
        forecast24hRes,
        forecast7dRes,
        forecastMonthRes,
        recommendationsRes,
      ] = await Promise.all([

        API.get("/forecast/24h"),

        API.get("/forecast/7d"),

        API.get("/forecast/month"),

        API.get("/forecast/recommendations"),

      ]);


      const forecast24hData =
        forecast24hRes.data;

      const forecast7dData =
        forecast7dRes.data;

      const forecastMonthData =
        forecastMonthRes.data;

      const recommendationsData =
        recommendationsRes.data;


      setForecast24h(
        forecast24hData
      );

      setForecast7d(
        forecast7dData
      );

      setForecastMonth(
        forecastMonthData
      );


      setRecommendations({

        forecast:
          recommendationsData.forecast || [],

        analytics:
          recommendationsData.analytics || [],

      });

      setError("");

    } catch (err) {

      console.error(err);

      setError(
        "Не вдалося завантажити прогноз."
      );

    } finally {

      setLoading(false);

    }

  };


  // =========================================
  // SUMMARY CARDS
  // =========================================

  const tomorrowConsumption =
    forecast24h.reduce(
      (sum, item) =>
        sum + item.total_consumption,
      0
    );


  const tomorrowSolar =
    forecast24h.reduce(
      (sum, item) =>
        sum + item.solar_generation,
      0
    );


  const batteryUsage =
    forecast24h.reduce(
      (sum, item) =>
        sum + item.battery_consumption,
      0
    );


  // =========================================
  // LOADING
  // =========================================

  if (loading) {

    return (

      <MainLayout>

        <div
          className="
            d-flex
            justify-content-center
            align-items-center
            vh-100
          "
        >

          <Spinner animation="border" />

        </div>

      </MainLayout>

    );

  }


  // =========================================
  // ERROR
  // =========================================

  if (error) {

    return (

      <MainLayout>

        <div className="container mt-4">

          <Alert variant="danger">
            {error}
          </Alert>

        </div>

      </MainLayout>

    );

  }


  // =========================================
  // RECOMMENDATION COLORS
  // =========================================

  const getRecommendationVariant = (
    level: string
  ) => {

    switch (level) {

      case "danger":
        return "danger";

      case "warning":
        return "warning";

      case "success":
        return "success";

      default:
        return "primary";

    }

  };


  return (

    <MainLayout>

      <div
        className="
          container-fluid
          p-4
          bg-light
          min-vh-100
        "
      >

        {/* ================================= */}
        {/* PAGE TITLE */}
        {/* ================================= */}

        <div className="mb-4">

          <h1 className="fw-bold">
            Прогнозування енергоспоживання
          </h1>

          <p className="text-muted">
            Прогнозування
            споживання електроенергії
          </p>

        </div>


        {/* ================================= */}
        {/* SUMMARY CARDS */}
        {/* ================================= */}

        <Row className="g-4 mb-4">

          <Col md={4}>

            <Card className="shadow border-0 h-100">

              <Card.Body>

                <h6 className="text-muted">
                  Споживання завтра
                </h6>

                <h2 className="fw-bold">
                  {tomorrowConsumption.toFixed(2)} Вт
                </h2>

              </Card.Body>

            </Card>

          </Col>


          <Col md={4}>

            <Card className="shadow border-0 h-100">

              <Card.Body>

                <h6 className="text-muted">
                  Генерація сонячної енергії
                </h6>

                <h2 className="fw-bold text-warning">
                  {tomorrowSolar.toFixed(2)} Вт
                </h2>

              </Card.Body>

            </Card>

          </Col>


          <Col md={4}>

            <Card className="shadow border-0 h-100">

              <Card.Body>

                <h6 className="text-muted">
                  Використання батареї
                </h6>

                <h2 className="fw-bold text-success">
                  {batteryUsage.toFixed(2)} Вт
                </h2>

              </Card.Body>

            </Card>

          </Col>

        </Row>


        {/* ================================= */}
        {/* 24H CHART */}
        {/* ================================= */}

        <Card className="shadow border-0 mb-4">

          <Card.Body>

            <div
              className="
                d-flex
                justify-content-between
                align-items-center
                mb-3
              "
            >

              <h4 className="fw-bold mb-0">
                Прогноз на 24 години
              </h4>

              <Badge bg="primary">
                Прогноз
              </Badge>

            </div>


            <ResponsiveContainer
              width="100%"
              height={400}
            >

              <LineChart data={forecast24h}>

                <CartesianGrid
                  strokeDasharray="3 3"
                />

                <XAxis
                  dataKey="time"
                />

                <YAxis />

                <Tooltip />

                <Legend />


                <Line
                  type="monotone"
                  dataKey="total_consumption"
                  stroke="#0d6efd"
                  strokeWidth={3}
                  name="Загальне споживання"
                />


                <Line
                  type="monotone"
                  dataKey="solar_generation"
                  stroke="#ffc107"
                  strokeWidth={3}
                  name="Сонячна генерація"
                />


                <Line
                  type="monotone"
                  dataKey="battery_consumption"
                  stroke="#198754"
                  strokeWidth={3}
                  name="Батарея"
                />

              </LineChart>

            </ResponsiveContainer>

          </Card.Body>

        </Card>


        {/* ================================= */}
        {/* 7 DAYS CHART */}
        {/* ================================= */}

        <Card className="shadow border-0 mb-4">

          <Card.Body>

            <h4 className="fw-bold mb-4">
              Прогноз на 7 днів
            </h4>


            <ResponsiveContainer
              width="100%"
              height={400}
            >

              <LineChart data={forecast7d}>

                <CartesianGrid
                  strokeDasharray="3 3"
                />

                <XAxis
                  dataKey="date"
                />

                <YAxis />

                <Tooltip />

                <Legend />


                <Line
                  type="monotone"
                  dataKey="total_consumption"
                  stroke="#0d6efd"
                  strokeWidth={3}
                  name="Споживання"
                />


                <Line
                  type="monotone"
                  dataKey="solar_generation"
                  stroke="#ffc107"
                  strokeWidth={3}
                  name="Генерація"
                />

              </LineChart>

            </ResponsiveContainer>

          </Card.Body>

        </Card>


        {/* ================================= */}
        {/* MONTH TABLE */}
        {/* ================================= */}

        <Card className="shadow border-0 mb-4">

          <Card.Body>

            <h4 className="fw-bold mb-4">
              Місячний прогноз
            </h4>


            <div className="table-responsive">

              <Table
                striped
                bordered
                hover
                className="align-middle"
              >

                <thead>

                  <tr>

                    <th>
                      Дата
                    </th>

                    <th>
                      Загальне
                    </th>

                    <th>
                      Сонячна
                    </th>

                    <th>
                      Батарея
                    </th>

                    <th>
                      Генерація
                    </th>

                    <th>
                      Баланс
                    </th>

                  </tr>

                </thead>


                <tbody>

                  {forecastMonth.map(
                    (item, index) => (

                      <tr key={index}>

                        <td>
                          {item.date}
                        </td>


                        <td>
                          {item.total_consumption} Вт
                        </td>


                        <td>
                          {item.solar_consumption} Вт
                        </td>


                        <td>
                          {item.battery_consumption} Вт
                        </td>


                        <td>
                          {item.solar_generation} Вт
                        </td>


                        <td>

                          <span
                            className={
                              item.energy_balance >= 0
                                ? "text-success fw-semibold"
                                : "text-danger fw-semibold"
                            }
                          >

                            {item.energy_balance > 0
                              ? "+"
                              : ""
                            }

                            {item.energy_balance}

                          </span>

                        </td>

                      </tr>

                    )
                  )}

                </tbody>

              </Table>

            </div>

          </Card.Body>

        </Card>


        {/* ================================= */}
        {/* FORECAST RECOMMENDATIONS */}
        {/* ================================= */}

        <Card className="shadow border-0 mb-4">

          <Card.Body>

            <div
              className="
                d-flex
                justify-content-between
                align-items-center
                mb-4
              "
            >

              <h4 className="fw-bold mb-0">
                Рекомендації на основі прогнозу
              </h4>

              <Badge bg="primary">
                Прогноз
              </Badge>

            </div>


            {recommendations.forecast.length === 0 ? (

              <Alert variant="light">
                Прогнозних рекомендацій поки немає.
              </Alert>

            ) : (

              <Row className="g-3">

                {recommendations.forecast.map(
                  (item, index) => (

                    <Col
                      md={6}
                      key={index}
                    >

                      <Card
                        className={`
                          border-0
                          bg-${getRecommendationVariant(
                            item.level
                          )}
                          bg-opacity-10
                          h-100
                        `}
                      >

                        <Card.Body>

                          <div
                            className="
                              d-flex
                              justify-content-between
                              align-items-start
                              gap-3
                            "
                          >

                            <h6 className="fw-bold mb-2">

                              {item.title}

                            </h6>


                            <Badge
                              bg={getRecommendationVariant(
                                item.level
                              )}
                              text={
                                item.level === "warning"
                                  ? "dark"
                                  : undefined
                              }
                            >

                              Прогноз

                            </Badge>

                          </div>


                          <p className="text-muted mb-0">

                            {item.message}

                          </p>

                        </Card.Body>

                      </Card>

                    </Col>

                  )
                )}

              </Row>

            )}

          </Card.Body>

        </Card>


        {/* ================================= */}
        {/* ANALYTICS RECOMMENDATIONS */}
        {/* ================================= */}

        <Card className="shadow border-0 mb-4">

          <Card.Body>

            <div
              className="
                d-flex
                justify-content-between
                align-items-center
                mb-4
              "
            >

              <h4 className="fw-bold mb-0">
                Аналітичні рекомендації
              </h4>

              <Badge bg="success">
                Історичні дані
              </Badge>

            </div>


            {recommendations.analytics.length === 0 ? (

              <Alert variant="light">

                Недостатньо історичних даних
                для формування рекомендацій.

              </Alert>

            ) : (

              <Row className="g-3">

                {recommendations.analytics.map(
                  (item, index) => (

                    <Col
                      md={6}
                      key={index}
                    >

                      <Card
                        className="
                          border-0
                          bg-success
                          bg-opacity-10
                          h-100
                        "
                      >

                        <Card.Body>

                          <div
                            className="
                              d-flex
                              justify-content-between
                              align-items-start
                              gap-3
                            "
                          >

                            <h6 className="fw-bold mb-2">

                              {item.title}

                            </h6>


                            <Badge bg="success">

                              Аналітика

                            </Badge>

                          </div>


                          <p className="text-muted mb-0">

                            {item.message}

                          </p>

                        </Card.Body>

                      </Card>

                    </Col>

                  )
                )}

              </Row>

            )}

          </Card.Body>

        </Card>

      </div>

    </MainLayout>

  );

};


export default ForecastPage;