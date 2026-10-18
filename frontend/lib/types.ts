/** Types mirroring the Pydantic schemas in docs/05 (frontend contract). */

export type Lane = "auto" | "review" | "scam";
export type ClassKey =
  | "order"
  | "price_question"
  | "delivery_problem"
  | "complaint"
  | "scam"
  | "other";
export type Script = "bn" | "bl" | "en" | "mx";
export type LlmStatus = "ok" | "unavailable";

export const CLASSES: ClassKey[] = [
  "order",
  "price_question",
  "delivery_problem",
  "complaint",
  "scam",
  "other",
];

export interface ClassMeta {
  label: string;
  color: string;
}

export interface Prediction {
  class_probs: Record<ClassKey, number>;
  top_class: ClassKey;
  top_prob: number;
  scam_prob: number;
  escalate_prob: number;
  llm_class: ClassKey | null;
  llm_reason: string | null;
  llm_status: LlmStatus;
  engine: string;
  latency_ms: number;
  lane: Lane; // at default tau; UI recomputes with route() for the slider
  route_reason: string;
}

export interface Resolution {
  human_label: string;
  resolved_at: string;
}

export interface MessageRecord {
  id: string;
  conversation_id: string;
  sender_name: string | null;
  text: string;
  script: Script;
  source: "seed" | "simulator" | "user";
  received_at: string;
  prediction: Prediction;
  resolution: Resolution | null;
}

export interface ConversationRecord {
  id: string;
  customer_name: string;
  created_at: string;
  last_message: MessageRecord | null;
  messages: MessageRecord[];
}

export interface HealthResponse {
  status: string;
  model_loaded: boolean;
  llm_provider: string | null;
  llm_status: LlmStatus;
  /** Which engine answers S1 right now (docs/04 §2.1) — reported, never assumed:
   * a deployment without the checkpoint is running the backup. */
  engine: string;
  version: string;
}

/** One selectable Engine A. `available` is "can be selected here"; `reason` is
 * why not when it cannot — a host-probe verdict or the load error. */
export interface EngineOption {
  id: string;
  available: boolean;
  active: boolean;
  reason?: string | null;
}

export interface EngineSwitchResponse {
  engine: string;
  requested: string;
  /** The request was understood but could not be honoured; `engine` is serving. */
  fallback: boolean;
  engines: EngineOption[];
  reason: string | null;
}

export interface ConfigResponse {
  engine_default: string;
  engines: EngineOption[];
  tau_default: number;
  tau_min: number;
  tau_max: number;
  tau_other_offset: number;
  scam_t: number;
  escalate_t: number;
  decisive_t: number;
  classes: ClassKey[];
}

export interface HistogramBin {
  bin_start: number;
  bin_end: number;
  count: number;
}

export interface StatsResponse {
  total: number;
  lanes: Record<Lane, number>;
  classes: Record<string, number>;
  histogram: HistogramBin[];
  auto_count: number;
  seconds_per_message: number;
  time_saved_s: number;
}

export interface CoveragePoint {
  tau: number;
  coverage: number;
  auto_accuracy: number;
}

/** Loose shape: written by ml/notebooks/order_khata_lab.ipynb §8 (docs/07 §6). */
export interface EvalResponse {
  generated_at: string | null;
  data: Record<string, number>;
  systems: Record<string, { accuracy: number; macro_f1: number }>;
  per_class: Record<string, { p: number; r: number; f1: number }>;
  per_script: Record<string, Record<string, number>>;
  calibration: {
    ece_before: number;
    ece_after: number;
    reliability: unknown[];
  };
  coverage_curve: CoveragePoint[];
  scam: Record<string, number>;
  ood: { dataset: string; accuracy: number; n: number };
  latency_ms: { p50: number; p95: number };
  limitations: string[];
}
