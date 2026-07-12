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

    let io: IntersectionObserver | null = null;

    const reveal = (el: Element) => {
      el.classList.add('in');
      window.setTimeout(() => el.classList.remove('reveal', 'in'), 1200);
    };

    // Wait a tick so the new page's DOM is present after navigation.
    const timer = window.setTimeout(() => {
      const els = Array.from(document.querySelectorAll<HTMLElement>('.reveal:not(.in)'));
      if (reduce || !('IntersectionObserver' in window)) {
        els.forEach(reveal);
        return;
      }
      io = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              reveal(entry.target);
              io?.unobserve(entry.target);
            }
          });
        },
        { threshold: 0.12, rootMargin: '0px 0px -8% 0px' }
      );
      els.forEach((el) => io?.observe(el));
    }, 60);

    return () => {
      window.clearTimeout(timer);
      io?.disconnect();
    };
  }, [pathname]);

  return null;
}
