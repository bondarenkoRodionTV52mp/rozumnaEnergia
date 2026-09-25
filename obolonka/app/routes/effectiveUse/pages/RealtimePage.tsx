import MainLayout from "../layouts/MainLayout";

import { useEffect, useState } from "react";


type RealtimeData = {

    solar: {

        power: number;

        voltage: number;

        current: number;

        energy_today_wh: number;

    };


    battery: {

        soc: number;

        power: number;

        voltage: number;

        current: number;

    };


    load: {

        load_power: number;

        load_voltage: number;

        load_current: number;

    };


    meter: {

        grid_power: number;

        grid_voltage: number;

        grid_current: number;

        grid_energy_today_kwh: number;

    };

};


function RealtimePage() {

    const [data, setData] =
        useState<RealtimeData | null>(null);


    const [connected, setConnected] =
        useState(false);


    // =====================================
    // WEBSOCKET
    // =====================================

    useEffect(() => {

        const ws = new WebSocket(
            "ws://77.47.192.6:6014/realtime/ws"
        );


        ws.onopen = () => {

            console.log(
                "WebSocket підключено"
            );

            setConnected(true);

        };


        ws.onclose = () => {

            console.log(
                "WebSocket відключено"
            );

            setConnected(false);

        };


        ws.onerror = (error) => {

            console.error(
                "Помилка WebSocket:",
                error
            );

            setConnected(false);

        };


        ws.onmessage = (event) => {

            try {

                const parsed: RealtimeData =
                    JSON.parse(event.data);

                setData(parsed);

            } catch (error) {

                console.error(
                    "Помилка обробки даних WebSocket:",
                    error
                );

            }

        };


        return () => {

            ws.close();

        };

    }, []);


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
                {/* HEADER */}
                {/* ================================= */}

                <div
                    className="
                        d-flex
                        justify-content-between
                        align-items-center
                        mb-4
                    "
                >

                    <div>

                        <h1 className="fw-bold mb-1">

                            SmartEnergy Lab

                        </h1>


                        <p className="text-muted mb-0">

                            Моніторинг енергосистеми
                            в реальному часі

                        </p>

                    </div>


                    <div>

                        {connected ? (

                            <span
                                className="
                                    badge
                                    bg-success
                                    p-2
                                "
                            >

                                Підключено

                            </span>

                        ) : (

                            <span
                                className="
                                    badge
                                    bg-danger
                                    p-2
                                "
                            >

                                Відключено

                            </span>

                        )}

                    </div>

                </div>


                {/* ================================= */}
                {/* MAIN GRID */}
                {/* ================================= */}

                <div className="row g-4">

                    {/* ================================= */}
                    {/* SOLAR */}
                    {/* ================================= */}

                    <div className="col-lg-3 col-md-6">

                        <div
                            className="
                                card
                                shadow
                                border-0
                                h-100
                            "
                        >

                            <div className="card-body">

                                <div
                                    className="
                                        d-flex
                                        justify-content-between
                                    "
                                >

                                    <h5 className="fw-bold">

                                        ☀️ Сонячна панель

                                    </h5>

                                </div>


                                <hr />


                                <h2
                                    className="
                                        fw-bold
                                        text-warning
                                    "
                                >

                                    {data?.solar?.power ?? 0} Вт

                                </h2>


                                {/* <div className="mt-3">

                                    <p className="mb-2">

                                        Напруга:{" "}

                                        <strong>

                                            {data?.solar?.voltage ?? 0} В

                                        </strong>

                                    </p>


                                    <p className="mb-2">

                                        Струм:{" "}

                                        <strong>

                                            {data?.solar?.current ?? 0} А

                                        </strong>

                                    </p>


                                    <p className="mb-0">

                                        Енергія за день:{" "}

                                        <strong>

                                            {data?.solar?.energy_today_wh ?? 0}
                                            {" "}
                                            Вт·год

                                        </strong>

                                    </p>

                                </div> */}

                            </div>

                        </div>

                    </div>


                    {/* ================================= */}
                    {/* BATTERY */}
                    {/* ================================= */}

                    <div className="col-lg-3 col-md-6">

                        <div
                            className="
                                card
                                shadow
                                border-0
                                h-100
                            "
                        >

                            <div className="card-body">

                                <div
                                    className="
                                        d-flex
                                        justify-content-between
                                    "
                                >

                                    <h5 className="fw-bold">

                                        🔋 Акумулятор

                                    </h5>

                                </div>


                                <hr />


                                <h2
                                    className="
                                        fw-bold
                                        text-primary
                                    "
                                >

                                    {data?.battery?.soc ?? 0} %

                                </h2>


                                <div className="progress mb-3">

                                    <div
                                        className="progress-bar"
                                        role="progressbar"
                                        style={{
                                            width: `${Math.min(
                                                Math.max(
                                                    data?.battery?.soc ?? 0,
                                                    0
                                                ),
                                                100
                                            )}%`
                                        }}
                                    />

                                </div>


                                {/* <div>

                                    <p className="mb-2">

                                        Потужність:{" "}

                                        <strong>

                                            {data?.battery?.power ?? 0} Вт

                                        </strong>

                                    </p>


                                    <p className="mb-2">

                                        Напруга:{" "}

                                        <strong>

                                            {data?.battery?.voltage ?? 0} В

                                        </strong>

                                    </p>


                                    <p className="mb-0">

                                        Струм:{" "}

                                        <strong>

                                            {data?.battery?.current ?? 0} А

                                        </strong>

                                    </p>

                                </div> */}

                            </div>

                        </div>

                    </div>


                    {/* ================================= */}
                    {/* LOAD */}
                    {/* ================================= */}

                    <div className="col-lg-3 col-md-6">

                        <div
                            className="
                                card
                                shadow
                                border-0
                                h-100
                            "
                        >

                            <div className="card-body">

                                <div
                                    className="
                                        d-flex
                                        justify-content-between
                                    "
                                >

                                    <h5 className="fw-bold">

                                        ⚡ Навантаження

                                    </h5>

                                </div>


                                <hr />


                                <h2
                                    className="
                                        fw-bold
                                        text-dark
                                    "
                                >

                                    {data?.load?.load_power ?? 0} Вт

                                </h2>


                                {/* <div className="mt-3">

                                    <p className="mb-2">

                                        Напруга:{" "}

                                        <strong>

                                            {data?.load?.load_voltage ?? 0} В

                                        </strong>

                                    </p>


                                    <p className="mb-2">

                                        Струм:{" "}

                                        <strong>

                                            {data?.load?.load_current ?? 0} А

                                        </strong>

                                    </p>

                                </div> */}

                            </div>

                        </div>

                    </div>


                    {/* ================================= */}
                    {/* GRID */}
                    {/* ================================= */}

                    <div className="col-lg-3 col-md-6">

                        <div
                            className="
                                card
                                shadow
                                border-0
                                h-100
                            "
                        >

                            <div className="card-body">

                                <div
                                    className="
                                        d-flex
                                        justify-content-between
                                    "
                                >

                                    <h5 className="fw-bold">

                                        🏠 Електромережа

                                    </h5>

                                </div>


                                <hr />


                                <h2
                                    className="
                                        fw-bold
                                        text-success
                                    "
                                >

                                    {data?.meter?.grid_power ?? 0} Вт

                                </h2>


                                {/* <div className="mt-3">

                                    <p className="mb-2">

                                        Напруга:{" "}

                                        <strong>

                                            {data?.meter?.grid_voltage ?? 0} В

                                        </strong>

                                    </p>


                                    <p className="mb-2">

                                        Струм:{" "}

                                        <strong>

                                            {data?.meter?.grid_current ?? 0} А

                                        </strong>

                                    </p>


                                    <p className="mb-0">

                                        Енергія за день:{" "}

                                        <strong>

                                            {data?.meter?.grid_energy_today_kwh ?? 0}
                                            {" "}
                                            кВт·год

                                        </strong>

                                    </p>

                                </div> */}

                            </div>

                        </div>

                    </div>

                </div>


                {/* ================================= */}
                {/* ENERGY FLOW */}
                {/* ================================= */}

                <div
                    className="
                        card
                        shadow
                        border-0
                        mt-4
                    "
                >

                    <div className="card-body">

                        <h4 className="fw-bold mb-4">

                            Потоки енергії

                        </h4>


                        <div className="row text-center">

                            {/* SOLAR */}

                            <div className="col-md-3">

                                <div
                                    className="
                                        p-3
                                        bg-warning-subtle
                                        rounded
                                    "
                                >

                                    <h5>
                                        ☀️ Сонце
                                    </h5>


                                    <h3>

                                        {data?.solar?.power ?? 0} Вт

                                    </h3>

                                </div>

                            </div>


                            {/* BATTERY */}

                            <div className="col-md-3">

                                <div
                                    className="
                                        p-3
                                        bg-primary-subtle
                                        rounded
                                    "
                                >

                                    <h5>
                                        🔋 Батарея
                                    </h5>


                                    <h3>

                                        {data?.battery?.power ?? 0} Вт

                                    </h3>

                                </div>

                            </div>


                            {/* LOAD */}

                            <div className="col-md-3">

                                <div
                                    className="
                                        p-3
                                        bg-dark-subtle
                                        rounded
                                    "
                                >

                                    <h5>
                                        ⚡ Споживання
                                    </h5>


                                    <h3>

                                        {data?.load?.load_power ?? 0} Вт

                                    </h3>

                                </div>

                            </div>


                            {/* GRID */}

                            <div className="col-md-3">

                                <div
                                    className="
                                        p-3
                                        bg-success-subtle
                                        rounded
                                    "
                                >

                                    <h5>
                                        🏠 Мережа
                                    </h5>


                                    <h3>

                                        {data?.meter?.grid_power ?? 0} Вт

                                    </h3>

                                </div>

                            </div>

                        </div>

                    </div>

                </div>

            </div>

        </MainLayout>

    );

}


export default RealtimePage;