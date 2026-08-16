/** Formats a number using Indian digit grouping (lakh/crore), e.g. 1234567 -> "12,34,567". */
export function formatIndianNumber(value: number): string {
  const isNegative = value < 0;
  const abs = Math.abs(value);
  const [intPart, decPart] = abs.toFixed(2).split(".");

  let grouped: string;
  if (intPart.length <= 3) {
    grouped = intPart;
  } else {
    const last3 = intPart.slice(-3);
    const rest = intPart.slice(0, -3);
    const restGrouped = rest.replace(/\B(?=(\d{2})+(?!\d))/g, ",");
    grouped = `${restGrouped},${last3}`;
  }

  const sign = isNegative ? "-" : "";
  return decPart === "00" ? `${sign}${grouped}` : `${sign}${grouped}.${decPart}`;
}

export function formatINR(value: number, opts: { showDecimals?: boolean } = {}): string {
  const { showDecimals = false } = opts;
  const formatted = showDecimals
    ? formatWithForcedDecimals(value)
    : formatIndianNumber(value);
  return `₹${formatted}`;
}

function formatWithForcedDecimals(value: number): string {
  const isNegative = value < 0;
  const abs = Math.abs(value);
  const [intPart, decPart] = abs.toFixed(2).split(".");
  let grouped: string;
  if (intPart.length <= 3) {
    grouped = intPart;
  } else {
    const last3 = intPart.slice(-3);
    const rest = intPart.slice(0, -3);
    const restGrouped = rest.replace(/\B(?=(\d{2})+(?!\d))/g, ",");
    grouped = `${restGrouped},${last3}`;
  }
  return `${isNegative ? "-" : ""}${grouped}.${decPart}`;
}

/** Formats a Date (or ISO string) as DD/MM/YYYY. */
export function formatDateDMY(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = d.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
}

/** Formats a Date as DD/MM/YYYY HH:mm. */
export function formatDateTimeDMY(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  const hh = String(d.getHours()).padStart(2, "0");
  const min = String(d.getMinutes()).padStart(2, "0");
  return `${formatDateDMY(d)} ${hh}:${min}`;
}

/** Parses a DD/MM/YYYY string into a Date (local time, midnight). */
export function parseDMY(value: string): Date | null {
  const match = value.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (!match) return null;
  const [, dd, mm, yyyy] = match;
  const d = new Date(Number(yyyy), Number(mm) - 1, Number(dd));
  return Number.isNaN(d.getTime()) ? null : d;
}
