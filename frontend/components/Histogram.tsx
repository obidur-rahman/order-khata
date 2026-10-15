"use client";
/** Confidence histogram with the threshold line (docs/06 §4.4). Plain SVG. */
import type { HistogramBin } from "@/lib/types";

const W = 640;
const H = 200;
const PAD = { l: 36, r: 12, t: 12, b: 26 };

export function Histogram({
  bins,
  tau,
}: {
  bins: HistogramBin[];
  tau: number;
}) {
  const max = Math.max(1, ...bins.map((b) => b.count));
  const plotW = W - PAD.l - PAD.r;
  const plotH = H - PAD.t - PAD.b;
  const barW = plotW / Math.max(1, bins.length);
  const tauX = PAD.l + Math.max(0, Math.min(1, tau)) * plotW;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label="Confidence histogram">
      {/* y grid */}
      {[0, 0.5, 1].map((f) => {
        const y = PAD.t + plotH * (1 - f);
        return (
          <g key={f}>
            <line x1={PAD.l} x2={W - PAD.r} y1={y} y2={y} stroke="#E8E2D4" strokeWidth="1" />
            <text x={PAD.l - 6} y={y + 4} textAnchor="end" fontSize="10" fill="#6B665B">
              {Math.round(max * f)}
            </text>
          </g>
        );
      })}
      {/* bars */}
      {bins.map((b, i) => {
        const h = (b.count / max) * plotH;
        const x = PAD.l + i * barW + 2;
        const y = PAD.t + plotH - h;
        const mid = (b.bin_start + b.bin_end) / 2;
        return (
          <g key={i}>
            <rect x={x} y={y} width={Math.max(1, barW - 4)} height={h} rx="3" fill={mid >= tau ? "#17A34A" : "#0FA3A3"} opacity={mid >= tau ? 0.9 : 0.45} />
            <text x={x + (barW - 4) / 2} y={H - 8} textAnchor="middle" fontSize="9" fill="#6B665B">
              {b.bin_start.toFixed(1)}
            </text>
          </g>
        );
      })}
      {/* threshold line */}
      <line x1={tauX} x2={tauX} y1={PAD.t - 4} y2={PAD.t + plotH} stroke="#0F0F0F" strokeWidth="2" strokeDasharray="5 4" />
      <rect x={tauX - 26} y={0} width="52" height="14" rx="4" fill="#FFD60A" />
      <text x={tauX} y={11} textAnchor="middle" fontSize="10" fontWeight="700" fill="#0F0F0F">
        τ {tau.toFixed(2)}
      </text>
    </svg>
  );
}
