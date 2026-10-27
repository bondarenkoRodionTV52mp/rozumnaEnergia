import { proxyDataManagerRequest } from "./api/proxy.server.js";

// This resource route is owned entirely by the Data Manager module.
export const loader = proxyDataManagerRequest;
export const action = proxyDataManagerRequest;
