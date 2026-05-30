import axios from "axios";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api/v1";

const api = axios.create({
  baseURL: API_URL,
  withCredentials: true, // send HttpOnly auth_token cookie automatically
});

export default api;
