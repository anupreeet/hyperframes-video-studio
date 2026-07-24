export type StudioErrorCode =
  | "BAD_REQUEST"
  | "PIPELINE_PREREQUISITE"
  | "CAPABILITY_UNAVAILABLE";

export class StudioError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly code: StudioErrorCode,
    public readonly details: Record<string, unknown> = {},
  ) {
    super(message);
    this.name = "StudioError";
  }
}

export function prerequisite(message: string, prerequisiteName: string): StudioError {
  return new StudioError(message, 409, "PIPELINE_PREREQUISITE", {
    prerequisite: prerequisiteName,
  });
}

export function capabilityUnavailable(message: string, remediation?: string): StudioError {
  return new StudioError(message, 503, "CAPABILITY_UNAVAILABLE", {
    ...(remediation ? { remediation } : {}),
  });
}
