const FRONTEND_ORIGIN =
  "http://localhost:5173";

export function corsHeaders() {
  return {
    "Access-Control-Allow-Origin":
      FRONTEND_ORIGIN,
    "Access-Control-Allow-Credentials": "true",
    "Access-Control-Allow-Methods":
      "GET, POST, PATCH, DELETE, OPTIONS",
    "Access-Control-Allow-Headers":
      "Content-Type",
  };
}