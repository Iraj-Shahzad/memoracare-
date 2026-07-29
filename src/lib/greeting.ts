/**
 * Time-of-day greeting, computed from the current clock time.
 * Shared so every page greets consistently (Morning < 12:00, Afternoon
 * < 17:00, else Evening) instead of a hardcoded "Good Morning".
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
