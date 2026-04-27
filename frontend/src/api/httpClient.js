/**
 * src/api/httpClient.js
 * ─────────────────────
 * Configured Axios instance for all REST calls to the FastAPI backend.
 * All HTTP interaction (e.g. POST /audio/transcribe) should go through here.
 */

import axios from "axios";

const BASE_URL =
  import.meta.env.VITE_API_BASE_URL ||
  "https://astra-ai-voice-assistant.onrender.com";

const httpClient = axios.create({
  baseURL: `${BASE_URL}/api/v1`,
  timeout: 120_000,
  headers: {
    Accept: "application/json",
  },
});

// ── Request interceptor ───────────────────────────────────────────────────────
httpClient.interceptors.request.use(
  (config) => config,
  (error) => Promise.reject(error),
);

// ── Response interceptor ──────────────────────────────────────────────────────
httpClient.interceptors.response.use(
  (response) => response,
  (error) => {
    const detail =
      error.response?.data?.detail ||
      error.response?.data?.error ||
      error.message ||
      "Unknown error";
    // Re-throw a normalised error so callers get a predictable shape
    return Promise.reject(new Error(detail));
  },
);

export default httpClient;
