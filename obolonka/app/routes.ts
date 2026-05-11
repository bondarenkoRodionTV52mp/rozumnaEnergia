import { type RouteConfig, index, route } from "@react-router/dev/routes";

export default [
    index("routes/kotiSivu.tsx"),
    route("sivuKaksi", "routes/sivuKaksi/index.tsx"),

    route("heat-flow", "routes/heatFlow/index.tsx"),

    route("sinusInvertor", "routes/sinusInvertor/index.jsx"),

    route("routes/Home.tsx"),
    route("monitor", "routes/Monitor/index.tsx"),
    route("logs", "routes/Logs/index.tsx"),
    route("stats", "routes/Stats/index.tsx"),
    route("login", "routes/Login/index.tsx"),
] satisfies RouteConfig;
