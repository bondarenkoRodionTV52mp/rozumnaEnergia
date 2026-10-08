import {
  useEffect,
  useState
} from "react";

import {
  Card,
  Row,
  Col,
  ButtonGroup,
  Button,
  Table,
  Spinner
} from "react-bootstrap";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid
} from "recharts";

import API from "../api/api";
import MainLayout from "../layouts/MainLayout";


type HistoryPoint = {

  label: string;

  value: number;
};


type PeriodType =
  | "month"
  | "week"
  | "year";


type HistoryType =
  | "total"
  | "solar"
  | "battery"
  | "generation";


function HistoryPage() {

  const [period, setPeriod] =
    useState<PeriodType>("month");

  const [historyType, setHistoryType] =
    useState<HistoryType>("total");

  const [data, setData] =
    useState<HistoryPoint[]>([]);

  const [loading, setLoading] =
    useState<boolean>(false);


  // =====================================
  // LOAD HISTORY
  // =====================================

  const loadHistory = async () => {

    try {

      setLoading(true);

      const response = await API.get(
        `/history/${period}`,
        {
          params: {
            history_type: historyType
          }
        }
      );

      setData(response.data);

    } catch (error) {

      console.error(
        "Помилка завантаження історії:",
        error
      );

      setData([]);

    } finally {

      setLoading(false);

    }

  };


  // =====================================
  // EFFECT
  // =====================================

  useEffect(() => {

    loadHistory();

  }, [period, historyType]);


  // =====================================
  // TITLE
  // =====================================

  const getChartTitle = () => {

    switch (historyType) {

      case "total":
        return "Загальне споживання";

      case "solar":
        return "Споживання від сонця";

      case "battery":
        return "Споживання від батареї";

      case "generation":
        return "Генерація сонячної енергії";

      default:
        return "";

    }

  };


  return (

    <MainLayout>

      <div className="container-fluid">

        {/* ================================= */}
        {/* HEADER */}
        {/* ================================= */}

        <div className="mb-4">

          <h2 className="fw-bold">

            Історія енергоспоживання

          </h2>


          <p className="text-muted">

            Аналіз споживання та генерації
            електроенергії

          </p>

        </div>


        {/* ================================= */}
        {/* FILTERS */}
        {/* ================================= */}

        <Row className="g-3 mb-4">

          {/* PERIOD */}

          <Col lg={6}>

            <Card
              className="
                border-0
                shadow-sm
                rounded-4
                p-3
              "
            >

              <h6 className="fw-bold mb-3">

                Період

              </h6>


              <ButtonGroup className="w-100">

                <Button
                  variant={
                    period === "week"
                      ? "dark"
                      : "outline-dark"
                  }

                  onClick={() =>
                    setPeriod("week")
                  }
                >

                  Тиждень

                </Button>


                <Button
                  variant={
                    period === "month"
                      ? "dark"
                      : "outline-dark"
                  }

                  onClick={() =>
                    setPeriod("month")
                  }
                >

                  Місяць

                </Button>


                <Button
                  variant={
                    period === "year"
                      ? "dark"
                      : "outline-dark"
                  }

                  onClick={() =>
                    setPeriod("year")
                  }
                >

                  Рік

                </Button>

              </ButtonGroup>

            </Card>

          </Col>


          {/* TYPE */}

          <Col lg={6}>

            <Card
              className="
                border-0
                shadow-sm
                rounded-4
                p-3
              "
            >

              <h6 className="fw-bold mb-3">

                Тип даних

              </h6>


              <ButtonGroup
                className="w-100 flex-wrap"
              >

                <Button
                  variant={
                    historyType === "total"
                      ? "dark"
                      : "outline-dark"
                  }

                  onClick={() =>
                    setHistoryType("total")
                  }
                >

                  Загальне

                </Button>


                <Button
                  variant={
                    historyType === "solar"
                      ? "dark"
                      : "outline-dark"
                  }

                  onClick={() =>
                    setHistoryType("solar")
                  }
                >

                  Сонце

                </Button>


                <Button
                  variant={
                    historyType === "battery"
                      ? "dark"
                      : "outline-dark"
                  }

                  onClick={() =>
                    setHistoryType("battery")
                  }
                >

                  Батарея

                </Button>


                <Button
                  variant={
                    historyType === "generation"
                      ? "dark"
                      : "outline-dark"
                  }

                  onClick={() =>
                    setHistoryType("generation")
                  }
                >

                  Генерація

                </Button>

              </ButtonGroup>

            </Card>

          </Col>

        </Row>


        {/* ================================= */}
        {/* CHART */}
        {/* ================================= */}

        <Card
          className="
            border-0
            shadow-sm
            rounded-4
            p-4
            mb-4
          "
        >

          <div
            className="
              d-flex
              justify-content-between
              align-items-center
              mb-4
            "
          >

            <div>

              <h4 className="fw-bold mb-1">

                {getChartTitle()}

              </h4>


              <p className="text-muted mb-0">

                Графік енергетичних показників

              </p>

            </div>

          </div>


          {loading ? (

            <div className="text-center py-5">

              <Spinner animation="border" />

            </div>

          ) : data.length === 0 ? (

            <div
              className="
                text-center
                text-muted
                py-5
              "
            >

              Дані за вибраний період відсутні.

            </div>

          ) : (

            <ResponsiveContainer
              width="100%"
              height={400}
            >

              <LineChart data={data}>

                <CartesianGrid
                  strokeDasharray="3 3"
                />

                <XAxis
                  dataKey="label"
                />

                <YAxis />

                <Tooltip />


                <Line
                  type="monotone"
                  dataKey="value"
                  strokeWidth={3}
                />

              </LineChart>

            </ResponsiveContainer>

          )}

        </Card>


        {/* ================================= */}
        {/* TABLE */}
        {/* ================================= */}

        <Card
          className="
            border-0
            shadow-sm
            rounded-4
            p-4
          "
        >

          <div className="mb-4">

            <h4 className="fw-bold">

              Таблиця показників

            </h4>


            <p className="text-muted mb-0">

              Деталізовані дані

            </p>

          </div>


          <div className="table-responsive">

            <Table
              hover
              className="align-middle"
            >

              <thead>

                <tr>

                  <th>

                    Період

                  </th>


                  <th>

                    Значення (Вт)

                  </th>

                </tr>

              </thead>


              <tbody>

                {data.length === 0 ? (

                  <tr>

                    <td
                      colSpan={2}
                      className="
                        text-center
                        text-muted
                        py-4
                      "
                    >

                      Дані відсутні.

                    </td>

                  </tr>

                ) : (

                  data.map(
                    (item, index) => (

                      <tr key={index}>

                        <td>

                          {item.label}

                        </td>


                        <td>

                          {item.value.toFixed(2)}

                        </td>

                      </tr>

                    )
                  )

                )}

              </tbody>

            </Table>

          </div>

        </Card>

      </div>

    </MainLayout>

  );

}


export default HistoryPage;