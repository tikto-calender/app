export function dashboardWindow(mode, reference = new Date()) {
  const start = new Date(reference);
  start.setHours(0, 0, 0, 0);

  if (mode === "week") {
    const mondayOffset = (start.getDay() + 6) % 7;
    start.setDate(start.getDate() - mondayOffset);
  }

  if (mode === "month") start.setDate(1);

  const end = new Date(start);
  if (mode === "day") end.setDate(end.getDate() + 1);
  if (mode === "week") end.setDate(end.getDate() + 7);
  if (mode === "month") end.setMonth(end.getMonth() + 1);
  return { start, end };
}

export function isInsideWindow(value, window) {
  const date = new Date(value);
  return date >= window.start && date < window.end;
}
