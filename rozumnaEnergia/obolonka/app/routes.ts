import { type RouteConfig, index, route } from "@react-router/dev/routes";

export default [
    index("routes/kotiSivu.tsx"),
    route("sivuKaksi", "routes/sivuKaksi/index.tsx"),

    route("heat-flow", "routes/heatFlow/index.tsx"),

    route("sinusInvertor", "routes/sinusInvertor/index.jsx"),

    // SmartEnergy Lab — IoT telemetry monitoring
    route("smart-energy", "routes/smartEnergyLab/index.tsx"),
] satisfies RouteConfig;
