import axios from "axios";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4005/api/v1";

const api = axios.create({
  baseURL: API_URL,
  withCredentials: true,
});

// Auto-redirect to /login on 401 — handles expired/revoked sessions
api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401 && typeof window !== "undefined") {
      const isAuthRoute = ["/login", "/signup"].some((p) => window.location.pathname.startsWith(p));
      if (!isAuthRoute) {
        window.location.href = "/login";
      }
    }
    return Promise.reject(err);
  }
);

export default api;
