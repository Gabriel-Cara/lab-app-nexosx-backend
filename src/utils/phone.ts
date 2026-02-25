export function normalizePhoneE164(value?: string | null) {
  const digits = (value ?? "").replace(/\D/g, "");

  if (!digits) {
    return null;
  }

  const local =
    digits.startsWith("55") && digits.length > 11 ? digits.slice(2) : digits;

  if (local.length !== 10 && local.length !== 11) {
    return null;
  }

  return `+55${local}`;
}
