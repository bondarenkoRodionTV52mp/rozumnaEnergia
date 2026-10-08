import {
  useEffect,
  useState
} from 'react';

import {
  BellFill,
  SunFill,
  X
} from 'react-bootstrap-icons';

import {
  Dropdown
} from 'react-bootstrap';


function Header() {

  const [notifications, setNotifications] =
    useState<any[]>([]);

  // =====================================
  // DAY RECOMMENDATIONS
  // =====================================

  const [dayRecommendations, setDayRecommendations] =
    useState<any[]>([]);

  const [showDayRecommendations, setShowDayRecommendations] =
    useState(false);

  const [loadingDayRecommendations, setLoadingDayRecommendations] =
    useState(false);


  // =====================================
  // LOAD NOTIFICATIONS
  // =====================================

  useEffect(() => {

    const loadNotifications = async () => {

      try {

        const response = await fetch(
          "http://77.47.192.6:6014/notifications/latest?limit=10"
        );

        if (!response.ok) {
          throw new Error(
            "Не вдалося отримати сповіщення"
          );
        }

        const data = await response.json();

        setNotifications(data);

      } catch (error) {

        console.error(
          "Помилка завантаження сповіщень:",
          error
        );

      }

    };

    loadNotifications();

    // Оновлення кожні 30 секунд
    const interval = setInterval(
      loadNotifications,
      30000
    );

    return () =>
      clearInterval(interval);

  }, []);


  // =====================================
  // LOAD DAY RECOMMENDATIONS
  // =====================================

  const loadDayRecommendations = async () => {

    try {

      setLoadingDayRecommendations(true);

      const response = await fetch(
        "http://77.47.192.6:6014/notifications/recommendations/day"
      );

      if (!response.ok) {

        throw new Error(
          "Не вдалося отримати рекомендації"
        );

      }

      const data = await response.json();

      setDayRecommendations(
        data.recommendations || []
      );

      setShowDayRecommendations(true);

    } catch (error) {

      console.error(
        "Помилка завантаження рекомендацій:",
        error
      );

    } finally {

      setLoadingDayRecommendations(false);

    }

  };


  return (

    <>

      {/* ================================= */}
      {/* HEADER */}
      {/* ================================= */}

      <div
        className="
          d-flex
          align-items-center
          bg-white
          shadow-sm
          px-4
          py-3
          rounded-4
          mb-4
        "
      >

        {/* ================================= */}
        {/* LEFT SIDE */}
        {/* ================================= */}

        <div className="d-flex align-items-center">

          {/* DAY RECOMMENDATIONS */}

          <button
            type="button"
            className="
              btn
              btn-light
              border-0
              shadow-none
              d-flex
              align-items-center
              gap-2
            "
            onClick={loadDayRecommendations}
            title="Рекомендації на день"
          >

            <SunFill
              size={22}
              className="text-warning"
            />

            <span className="fw-semibold">
              Рекомендації на день
            </span>

          </button>

        </div>


        {/* ================================= */}
        {/* RIGHT SIDE */}
        {/* ================================= */}

        <div className="ms-auto">

          {/* NOTIFICATIONS */}

          <Dropdown align="end">

            <Dropdown.Toggle
              variant="light"
              className="
                border-0
                bg-white
                shadow-none
                position-relative
              "
            >

              <BellFill
                size={24}
                className="text-dark"
              />

              {notifications.length > 0 && (

                <span
                  className="
                    position-absolute
                    top-0
                    start-100
                    translate-middle
                    badge
                    rounded-pill
                    bg-danger
                  "
                >

                  {notifications.length}

                </span>

              )}

            </Dropdown.Toggle>


            <Dropdown.Menu
              className="
                shadow
                border-0
                rounded-4
                p-0
                overflow-hidden
              "
              style={{
                width: "420px"
              }}
            >

              {/* HEADER */}

              <div
                className="
                  p-3
                  border-bottom
                  bg-light
                "
              >

                <h6 className="fw-bold mb-0">
                  Сповіщення системи
                </h6>

              </div>


              {/* EMPTY */}

              {notifications.length === 0 && (

                <div
                  className="
                    p-4
                    text-center
                    text-muted
                  "
                >

                  Немає нових сповіщень

                </div>

              )}


              {/* NOTIFICATIONS */}

              {notifications.length > 0 && (

                <div
                  style={{
                    maxHeight: "430px",
                    overflowY: "auto"
                  }}
                >

                  {notifications.map(
                    (notification) => (

                      <Dropdown.Item
                        key={notification.id}
                        className="
                          px-3
                          py-3
                          border-bottom
                        "
                        style={{
                          whiteSpace: "normal"
                        }}
                      >

                        <div className="w-100">

                          <div
                            className="
                              d-flex
                              justify-content-between
                              align-items-start
                              gap-3
                            "
                          >

                            <h6
                              className="
                                mb-1
                                fw-semibold
                                text-wrap
                              "
                            >

                              {notification.title}

                            </h6>


                            <small
                              className="
                                text-muted
                                text-nowrap
                              "
                            >

                              {new Date(
                                notification.created_at
                              ).toLocaleTimeString(
                                "uk-UA",
                                {
                                  hour: "2-digit",
                                  minute: "2-digit"
                                }
                              )}

                            </small>

                          </div>


                          <div
                            className="
                              text-muted
                              small
                              text-wrap
                            "
                          >

                            {notification.message}

                          </div>

                        </div>

                      </Dropdown.Item>

                    )
                  )}

                </div>

              )}

            </Dropdown.Menu>

          </Dropdown>

        </div>

      </div>


      {/* ================================= */}
      {/* DAY RECOMMENDATIONS MODAL */}
      {/* ================================= */}

      {showDayRecommendations && (

        <div
          className="
            position-fixed
            top-0
            start-0
            w-100
            h-100
            d-flex
            align-items-center
            justify-content-center
          "
          style={{
            backgroundColor:
              "rgba(0, 0, 0, 0.45)",
            zIndex: 1050
          }}
          onClick={() =>
            setShowDayRecommendations(false)
          }
        >

          <div
            className="
              bg-white
              rounded-4
              shadow
              p-4
            "
            style={{
              width: "min(650px, 90%)",
              maxHeight: "80vh",
              overflowY: "auto"
            }}
            onClick={(event) =>
              event.stopPropagation()
            }
          >

            {/* ================================= */}
            {/* MODAL HEADER */}
            {/* ================================= */}

            <div
              className="
                d-flex
                justify-content-between
                align-items-center
                mb-4
              "
            >

              <div
                className="
                  d-flex
                  align-items-center
                  gap-2
                "
              >

                <SunFill
                  size={25}
                  className="text-warning"
                />

                <h4 className="fw-bold mb-0">
                  Рекомендації на день
                </h4>

              </div>


              <button
                type="button"
                className="
                  btn
                  btn-light
                  rounded-circle
                  d-flex
                  align-items-center
                  justify-content-center
                "
                style={{
                  width: "38px",
                  height: "38px"
                }}
                onClick={() =>
                  setShowDayRecommendations(false)
                }
              >

                <X size={20} />

              </button>

            </div>


            {/* ================================= */}
            {/* LOADING */}
            {/* ================================= */}

            {loadingDayRecommendations && (

              <div className="text-center py-5">

                <div
                  className="
                    spinner-border
                    text-warning
                  "
                  role="status"
                />

                <p className="text-muted mt-3 mb-0">
                  Формуємо рекомендації...
                </p>

              </div>

            )}


            {/* ================================= */}
            {/* EMPTY */}
            {/* ================================= */}

            {!loadingDayRecommendations &&
              dayRecommendations.length === 0 && (

                <div
                  className="
                    text-center
                    text-muted
                    py-5
                  "
                >

                  <SunFill
                    size={40}
                    className="
                      mb-3
                      text-secondary
                    "
                  />

                  <p className="mb-0">
                    На цей день немає доступних
                    рекомендацій.
                  </p>

                </div>

              )}


            {/* ================================= */}
            {/* RECOMMENDATIONS */}
            {/* ================================= */}

            {!loadingDayRecommendations &&
              dayRecommendations.length > 0 && (

                <div
                  className="
                    d-flex
                    flex-column
                    gap-3
                  "
                >

                  {dayRecommendations.map(
                    (recommendation, index) => (

                      <div
                        key={`${recommendation.type}-${index}`}
                        className="
                          border
                          rounded-4
                          p-3
                        "
                      >

                        {/* RECOMMENDATION HEADER */}

                        <div
                          className="
                            d-flex
                            justify-content-between
                            align-items-start
                            gap-3
                            mb-2
                          "
                        >

                          <div>

                            <h6
                              className="
                                fw-bold
                                mb-1
                              "
                            >

                              {recommendation.title}

                            </h6>


                            <span
                              className="
                                badge
                                bg-light
                                text-dark
                              "
                            >

                              {recommendation.time}

                            </span>

                          </div>


                          <span
                            className={`
                              badge
                              ${
                                recommendation.level ===
                                "warning"
                                  ? "bg-warning text-dark"
                                  : "bg-info"
                              }
                            `}
                          >

                            {recommendation.level ===
                            "warning"
                              ? "Увага"
                              : "Інформація"}

                          </span>

                        </div>


                        {/* MESSAGE */}

                        <p
                          className="
                            text-muted
                            mb-2
                          "
                        >

                          {recommendation.message}

                        </p>


                        {/* ENERGY BALANCE */}

                        {recommendation.energy_balance !==
                          undefined && (

                          <small className="text-muted">

                            Енергетичний баланс:{" "}

                            <strong>
                              {recommendation.energy_balance} Вт
                            </strong>

                          </small>

                        )}

                      </div>

                    )
                  )}

                </div>

              )}


            {/* ================================= */}
            {/* CLOSE BUTTON */}
            {/* ================================= */}

            <div className="text-end mt-4">

              <button
                type="button"
                className="
                  btn
                  btn-secondary
                  rounded-3
                "
                onClick={() =>
                  setShowDayRecommendations(false)
                }
              >

                Закрити

              </button>

            </div>

          </div>

        </div>

      )}

    </>

  );

}

export default Header;