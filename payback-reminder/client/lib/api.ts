import axios from "axios";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:5000/api";

export const api = axios.create({ baseURL: API_URL });

// Attach the bearer token stored by the local-auth flow. When using Clerk,
// swap this for `useAuth().getToken()` inside a client-side effect and pass
// it in per-request instead — see README for details.
api.interceptors.request.use((config) => {
  if (typeof window !== "undefined") {
    const token = window.localStorage.getItem("pbr_token");
    if (token) config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (typeof window !== "undefined" && err?.response?.status === 401) {
      window.localStorage.removeItem("pbr_token");
      if (!window.location.pathname.startsWith("/sign-in")) {
        window.location.href = "/sign-in";
      }
    }
    return Promise.reject(err);
  }
);
