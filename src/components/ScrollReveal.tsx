'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';

/**
 * App-wide scroll reveal.
 * Any element with the `reveal` class fades + rises into view as it enters the
 * viewport — the same effect used on the home page. Mounted once in the root
 * layout and re-scans on every route change, so cards on every page behave
 * identically. Classes are removed after revealing so hover transforms still work.
 */
export default function ScrollReveal() {
  const pathname = usePathname();

  useEffect(() => {
    const reduce =
      typeof window !== 'undefined' &&
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const reveal = (el: Element) => {
      el.classList.add('in');
      window.setTimeout(() => el.classList.remove('reveal', 'in'), 1200);
    };

    // Reduced motion or no observer support: just show everything.
    if (reduce || !('IntersectionObserver' in window)) {
      document.querySelectorAll<HTMLElement>('.reveal:not(.in)').forEach(reveal);
      return;
    }

    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            reveal(entry.target);
            io.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.12, rootMargin: '0px 0px -8% 0px' }
    );

    // Observe current + late-rendered elements (dashboards load data async, so
    // cards can appear after the first scan). Re-scanning is safe — observing an
    // element twice is a no-op, and revealed elements drop the `reveal` class.
    const scan = () =>
      document.querySelectorAll<HTMLElement>('.reveal:not(.in)').forEach((el) => io.observe(el));
    const timers = [60, 400, 1000, 2000].map((d) => window.setTimeout(scan, d));

    return () => {
      timers.forEach((t) => window.clearTimeout(t));
      io.disconnect();
    };
  }, [pathname]);

  return null;
}
