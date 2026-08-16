/** Days elapsed in the month containing `reference`, counting the current day as elapsed. */
export function daysElapsedInMonth(reference: Date): number {
  return reference.getDate();
}

export function daysInMonth(reference: Date): number {
  return new Date(reference.getFullYear(), reference.getMonth() + 1, 0).getDate();
}

/** Average daily spend so far this month, and a simple linear projection to month-end. */
export function projectMonthEnd(monthToDateSpend: number, reference: Date): { dailyAverage: number; projected: number } {
  const elapsed = daysElapsedInMonth(reference);
  const total = daysInMonth(reference);
  if (elapsed <= 0) return { dailyAverage: 0, projected: 0 };
  const dailyAverage = monthToDateSpend / elapsed;
  return { dailyAverage, projected: dailyAverage * total };
}
