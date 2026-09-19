import type { ApiEnvelope, ApiErrorBody } from "./types";

export const API_URL = `${process.env.API_URL ?? "http://localhost:4000"}/api/v1`;

let authToken: string | null = null;

export function setAuthToken(token: string | null): void {
  authToken = token;
}

export class ApiError extends Error {
  readonly code: string;
  readonly status: number;

  constructor(message: string, code: string, status: number) {
    super(message);
    this.name = "ApiError";
    this.code = code;
    this.status = status;
  }
}

interface Options {
  method?: "GET" | "POST" | "PATCH" | "PUT" | "DELETE";
  body?: unknown;
  auth?: boolean;
}

export async function request<T>(path: string, opts?: Options): Promise<T> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (opts?.auth !== false && authToken) {
    headers.Authorization = `Bearer ${authToken}`;
  }

  const res = await fetch(`${API_URL}${path}`, {
    method: opts?.method ?? "GET",
    headers,
    body: opts?.body !== undefined ? JSON.stringify(opts.body) : undefined,
  });

  const text = await res.text();
  let parsed: ApiEnvelope<T> | ApiErrorBody | null = null;
  try {
    parsed = text ? (JSON.parse(text) as ApiEnvelope<T> | ApiErrorBody) : null;
  } catch {
    parsed = null;
  }

  if (parsed && "error" in parsed && parsed.error) {
    const message = parsed.error.message || `Request failed (${res.status})`;
    const code = parsed.error.code || "ERROR";
    throw new ApiError(message, code, res.status);
  }
  if (!res.ok) {
    throw new ApiError(`Request failed (${res.status})`, "ERROR", res.status);
  }
  if (!parsed || !("data" in parsed)) {
    throw new ApiError("Unexpected response format", "ERROR", res.status);
  }

  return parsed.data as T;
}

export const api = {
  get: <T>(path: string, opts?: { auth?: boolean }) => request<T>(path, opts),
  post: <T>(path: string, body?: unknown, opts?: { auth?: boolean }) =>
    request<T>(path, { ...opts, method: "POST", body }),
  patch: <T>(path: string, body?: unknown, opts?: { auth?: boolean }) =>
    request<T>(path, { ...opts, method: "PATCH", body }),
  put: <T>(path: string, body?: unknown, opts?: { auth?: boolean }) =>
    request<T>(path, { ...opts, method: "PUT", body }),
  del: <T>(path: string, opts?: { auth?: boolean }) =>
    request<T>(path, { ...opts, method: "DELETE" }),
};