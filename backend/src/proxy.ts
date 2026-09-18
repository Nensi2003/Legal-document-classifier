import { NextRequest, NextResponse } from "next/server";

const FRONTEND_ORIGIN = "http://localhost:5173";

export function proxy(request: NextRequest) {
  const response = NextResponse.next();

  response.headers.set(
    "Access-Control-Allow-Origin",
    FRONTEND_ORIGIN
  );

  response.headers.set(
    "Access-Control-Allow-Credentials",
    "true"
  );

  response.headers.set(
    "Access-Control-Allow-Methods",
    "GET, POST, PATCH, DELETE, OPTIONS"
  );

  response.headers.set(
    "Access-Control-Allow-Headers",
    "Content-Type"
  );

  if (request.method === "OPTIONS") {
    return new NextResponse(null, {
      status: 204,
      headers: response.headers,
    });
  }

  return response;
}

export const config = {
  matcher: "/api/:path*",
};