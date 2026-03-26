export function normalizeVehiclePlate(value?: string | null) {
  return (value ?? "")
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
    .slice(0, 7);
}

export function formatLegacyVehiclePlate(value?: string | null) {
  const normalized = normalizeVehiclePlate(value);

  if (
    normalized.length > 3 &&
    /^[A-Z]{3}\d{1,4}$/.test(normalized)
  ) {
    return `${normalized.slice(0, 3)}-${normalized.slice(3)}`;
  }

  return normalized;
}

export function normalizeParkingSpot(value?: string | null) {
  return (value ?? "")
    .trim()
    .replace(/\s+/g, " ")
    .toUpperCase();
}
