export function normalizeRouteParam(value: string | string[] | undefined, fallback = ""): string {
  if (typeof value === "string") {
    return value;
  }

  if (Array.isArray(value)) {
    return value[0] ?? fallback;
  }

  return fallback;
}
