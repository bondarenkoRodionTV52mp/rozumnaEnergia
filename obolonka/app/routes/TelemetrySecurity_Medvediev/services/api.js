import axios from "axios";
import { API_BASE_URL } from "../../../../consts";

const api = axios.create({
  baseURL: `${API_BASE_URL}:6020/api`, // бекенд на порту
  headers: { "Content-Type": "application/json" },
});

export default api;
