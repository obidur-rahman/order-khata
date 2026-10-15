/**
 * Parity runner: executes route() from route.ts over a fixture file and
 * prints JSON results to stdout. Invoked by tests/test_parity.py as:
 *   node frontend/lib/parity_runner.ts <fixtures.json>
 * Fixtures: [{name, signals: {...}, tau?}] — same file used by test_router.py.
 */
import { readFileSync } from "node:fs";
import { requiredThreshold, route, type RouteSignals } from "./route.ts";

interface Fixture {
  name: string;
  signals: RouteSignals;
  tau?: number;
}

const path = process.argv[2];
if (!path) {
  console.error("usage: node parity_runner.ts <fixtures.json>");
  process.exit(2);
}

const fixtures: Fixture[] = JSON.parse(readFileSync(path, "utf8"));
const results = fixtures.map((f) => {
  const tau = f.tau ?? 0.85;
  const [lane, reason] = route(f.signals, tau);
  const degraded = (f.signals.llm_status ?? "unavailable") !== "ok" || !f.signals.llm_class;
  const req = requiredThreshold(f.signals.top_class, tau, degraded);
  return { name: f.name, lane, reason, req };
});
console.log(JSON.stringify(results));
