// Consistent time formatting across the whole app.
// Converts stored 24-hour "HH:MM" strings into a friendly 12-hour clock with
// AM/PM. Works on single times ("05:30"), comma lists ("08:00, 14:00") and
// ranges ("05:30 - 06:30") by replacing every HH:MM token it finds.
export function formatTime12(input?: string | null): string {
  if (input == null) return "—";
  const s = String(input).trim();
  if (s === "" || s === "—") return "—";
  // Already 12-hour (contains AM/PM) — leave it untouched so we never double-format.
  if (/[ap]\.?m\.?/i.test(s)) return s;

  return s.replace(/\b(\d{1,2}):(\d{2})(?::\d{2})?\b/g, (_match, hh: string, mm: string) => {
    let h = parseInt(hh, 10);
    if (Number.isNaN(h) || h > 23) return `${hh}:${mm}`;
    const ap = h >= 12 ? "PM" : "AM";
    h = h % 12 === 0 ? 12 : h % 12;
    return `${h}:${mm} ${ap}`;
  });
}
