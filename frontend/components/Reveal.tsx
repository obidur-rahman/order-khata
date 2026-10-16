"use client";
/** Scroll reveal: content rises into place once, then stays put.
 *
 * Rich-showcase motion, but one pattern — sections and card rows share it so
 * the page reads as composed rather than decorated. Honours
 * prefers-reduced-motion in JS (visible immediately) and again in CSS
 * (globals.css `.reveal` reset), so no content can be stranded invisible.
 */
import { useEffect, useRef, useState, type ReactNode } from "react";

export function Reveal({
  children,
  delay = 0,
  className = "",
}: {
  children: ReactNode;
  /** Stagger delay in ms for sibling items in a row. */
  delay?: number;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [shown, setShown] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    // The observer's callback is the only place setState happens (allowed:
    // state syncs from an external system). Reduced-motion users get the
    // content immediately anyway — globals.css resets .reveal to visible —
    // so no matchMedia branch is needed here.
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            setShown(true);
            io.disconnect();
          }
        }
      },
      { threshold: 0.1, rootMargin: "0px 0px -6% 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className={`reveal ${shown ? "is-in" : ""} ${className}`.trim()}
      style={delay ? { transitionDelay: `${delay}ms` } : undefined}
    >
      {children}
    </div>
  );
}
