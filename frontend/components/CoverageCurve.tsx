"use client";
/** Coverage-vs-accuracy curve (docs/06 §4.5, docs/07 §4): plain SVG. */
import type { CoveragePoint } from "@/lib/types";

const W = 640;
const H = 260;
const PAD = { l: 44, r: 14, t: 16, b: 34 };

function scaleX(tau: number): number {
  return PAD.l + ((tau - 0.5) / 0.49) * (W - PAD.l - PAD.r);
}
function scaleY(v: number): number {
  return PAD.t + (1 - v) * (H - PAD.t - PAD.b);
}

export function CoverageCurve({
  curve,
  tau,
}: {
  curve: CoveragePoint[];
  tau: number;
}) {
  if (!curve.length) {
    return (
      <div className="flex h-56 items-center justify-center rounded-xl border border-dashed border-line text-sm text-muted">
        Coverage curve appears after ml/05_evaluate.py runs.
      </div>
    );
  }
  const path = (pick: (p: CoveragePoint) => number) =>
    curve.map((p, i) => `${i === 0 ? "M" : "L"}${scaleX(p.tau).toFixed(1)},${scaleY(pick(p)).toFixed(1)}`).join(" ");
  const nearest = curve.reduce((a, b) => (Math.abs(b.tau - tau) < Math.abs(a.tau - tau) ? b : a));
  const markerX = scaleX(tau);

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label="Coverage vs accuracy curve">
      {/* axes */}
      {[0, 0.5, 1].map((f) => (
        <g key={f}>
          <line x1={PAD.l} x2={W - PAD.r} y1={scaleY(f)} y2={scaleY(f)} stroke="#E8E2D4" />
          <text x={PAD.l - 6} y={scaleY(f) + 4} textAnchor="end" fontSize="10" fill="#6B665B">
            {(f * 100).toFixed(0)}%
          </text>
        </g>
      ))}
      {[0.5, 0.6, 0.7, 0.8, 0.9, 0.99].map((t) => (
        <text key={t} x={scaleX(t)} y={H - 12} textAnchor="middle" fontSize="10" fill="#6B665B">
          {t.toFixed(2)}
        </text>
      ))}
      <text x={(W + PAD.l) / 2} y={H - 1} textAnchor="middle" fontSize="10" fill="#6B665B">
        threshold τ
      </text>

      <path d={path((p) => p.coverage)} fill="none" stroke="#2F6BFF" strokeWidth="2.5" />
      <path d={path((p) => p.auto_accuracy)} fill="none" stroke="#17A34A" strokeWidth="2.5" strokeDasharray="6 4" />

      {/* current tau marker */}
      <line x1={markerX} x2={markerX} y1={PAD.t} y2={H - PAD.b} stroke="#0F0F0F" strokeWidth="1.5" strokeDasharray="4 4" />
      <circle cx={markerX} cy={scaleY(nearest.coverage)} r="4.5" fill="#2F6BFF" stroke="#fff" strokeWidth="1.5" />
      <circle cx={markerX} cy={scaleY(nearest.auto_accuracy)} r="4.5" fill="#17A34A" stroke="#fff" strokeWidth="1.5" />
      <rect x={markerX - 26} y={2} width="52" height="14" rx="4" fill="#FFD60A" />
      <text x={markerX} y={13} textAnchor="middle" fontSize="10" fontWeight="700" fill="#0F0F0F">
        τ {tau.toFixed(2)}
      </text>

      {/* legend */}
      <g fontSize="10" fill="#6B665B">
        <rect x={PAD.l + 8} y={PAD.t + 4} width="14" height="3" fill="#2F6BFF" />
        <text x={PAD.l + 28} y={PAD.t + 9}>coverage (auto %)</text>
        <rect x={PAD.l + 8} y={PAD.t + 18} width="14" height="3" fill="#17A34A" />
        <text x={PAD.l + 28} y={PAD.t + 23}>auto accuracy</text>
      </g>
    </svg>
  );
}
