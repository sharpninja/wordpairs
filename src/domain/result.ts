export type ErrorCode =
  | "VALIDATION_ERROR"
  | "NOT_AUTHENTICATED"
  | "NOT_AUTHORIZED"
  | "NOT_FOUND"
  | "ROOM_FULL"
  | "ROOM_CLOSED"
  | "CONFLICT"
  | "IDEMPOTENCY_CONFLICT"
  | "RATE_LIMITED"
  | "SERVICE_LIMIT"
  | "TEMPORARY_UNAVAILABLE"
  | "INTERNAL_ERROR";

export type Failure = {
  ok: false;
  error: { code: ErrorCode; retryableWithCommandId?: string };
};
export type Result<T> = { ok: true; value: T } | Failure;

export function success<T>(value: T): Result<T> {
  return { ok: true, value };
}

export function failure(
  code: ErrorCode,
  retryableWithCommandId?: string,
): Failure {
  return {
    ok: false,
    error: {
      code,
      ...(retryableWithCommandId ? { retryableWithCommandId } : {}),
    },
  };
}
