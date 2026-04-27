export class ValidationError extends Error {
  details?: unknown;

  constructor(message: string, details?: unknown) {
    super(message);
    this.name = "ValidationError";
    this.details = details;
  }
}

export async function parseJsonBody<T = unknown>(request: Request): Promise<T> {
  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object") {
    throw new ValidationError("Invalid JSON payload.");
  }
  return body as T;
}

export function requireStringField(
  value: unknown,
  fieldName: string,
  opts?: { minLength?: number }
): string {
  if (typeof value !== "string") {
    throw new ValidationError(`${fieldName} must be a string.`);
  }
  const trimmed = value.trim();
  if (opts?.minLength && trimmed.length < opts.minLength) {
    throw new ValidationError(`${fieldName} must be at least ${opts.minLength} characters.`);
  }
  return trimmed;
}

export function optionalStringField(value: unknown): string | undefined {
  if (value === undefined || value === null) return undefined;
  if (typeof value !== "string") {
    throw new ValidationError("Expected a string value.");
  }
  return value.trim();
}
