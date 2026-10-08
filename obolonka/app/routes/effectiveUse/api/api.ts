import axios from "axios";

const API = axios.create({
  baseURL: "http://77.47.192.6:6014",
});

export default API;