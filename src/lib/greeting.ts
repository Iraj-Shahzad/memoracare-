/**
 * GREETING — time-of-day greeting computed from the current clock time.
 *
 * Key concepts: reads new Date().getHours() and maps it to a phrase — Morning < 12:00,
 * Afternoon < 17:00, Evening < 21:00, else Good Night; optionally appends the name.
 * Shared so every page greets consistently instead of a hardcoded "Good Morning".
 * Viva line: "A tiny pure helper keeps every page's greeting consistent and based on the real time of day."
 */
export function timeGreeting(name?: string): string {
  const hour = new Date().getHours();
  const g =
    hour < 12 ? "Good Morning"
    : hour < 17 ? "Good Afternoon"
    : hour < 21 ? "Good Evening"
    : "Good Night";
  return name ? `${g}, ${name}` : g;
}
