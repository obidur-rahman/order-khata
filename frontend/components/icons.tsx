/** Minimal inline SVG icon set — no icon dependency (docs/06 §7: color is
 * never the only status carrier; every status pairs icon + text). */

type P = { className?: string; size?: number };

export function CheckIcon({ className, size = 14 }: P) {
  return (
    <svg className={className} width={size} height={size} viewBox="0 0 16 16" fill="none" aria-hidden>
      <path d="M3 8.5l3.2 3.2L13 5" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function EyeIcon({ className, size = 14 }: P) {
  return (
    <svg className={className} width={size} height={size} viewBox="0 0 16 16" fill="none" aria-hidden>
      <path d="M1.5 8s2.4-4.2 6.5-4.2S14.5 8 14.5 8s-2.4 4.2-6.5 4.2S1.5 8 1.5 8z" stroke="currentColor" strokeWidth="1.6" />
      <circle cx="8" cy="8" r="1.9" stroke="currentColor" strokeWidth="1.6" />
    </svg>
  );
}

export function ShieldIcon({ className, size = 14 }: P) {
  return (
    <svg className={className} width={size} height={size} viewBox="0 0 16 16" fill="none" aria-hidden>
      <path d="M8 1.6l5.2 2v4.1c0 3.2-2.2 5.4-5.2 6.7-3-1.3-5.2-3.5-5.2-6.7V3.6L8 1.6z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
      <path d="M5.6 7.9l1.7 1.7 3.1-3.4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function AlertIcon({ className, size = 14 }: P) {
  return (
    <svg className={className} width={size} height={size} viewBox="0 0 16 16" fill="none" aria-hidden>
      <path d="M8 2.2l6.3 11H1.7L8 2.2z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
      <path d="M8 6.4v3.1" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <circle cx="8" cy="11.4" r="0.9" fill="currentColor" />
    </svg>
  );
}

export function ArrowRightIcon({ className, size = 16 }: P) {
  return (
    <svg className={className} width={size} height={size} viewBox="0 0 16 16" fill="none" aria-hidden>
      <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function InboxIcon({ className, size = 18 }: P) {
  return (
    <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M4 14l2.4-7.2A2 2 0 018.3 5.5h7.4a2 2 0 011.9 1.3L20 14v4a2 2 0 01-2 2H6a2 2 0 01-2-2v-4z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
      <path d="M4 14h4.5a1.5 1.5 0 001.4-1l.3-.7a1.5 1.5 0 011.4-1h.8a1.5 1.5 0 011.4 1l.3.7a1.5 1.5 0 001.4 1H20" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
    </svg>
  );
}
