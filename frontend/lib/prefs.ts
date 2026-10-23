"use client";
/** Language preference (docs/06 §4.6), dark-only.
 *
 * Language lives in localStorage — the browser's own store, so nothing is
 * written to the backend and no account is needed. `applyLang` mirrors it
 * onto <html>. The site is dark-only (the committed theme); there is no
 * theme toggle.
 */
import { useEffect, useState } from "react";

import { t } from "./i18n";
import { TAU_MAX, TAU_MIN } from "./route";
import { LANG_KEY, PREFS_EVENT as EVENT } from "./prefKeys";

export type Lang = "en" | "bn";

function read(key: string): string | null {
  try {
    return window.localStorage.getItem(key);
  } catch {
    /* private mode, disabled storage — fall through to the default */
    return null;
  }
}

function write(key: string, value: string): void {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    /* non-fatal: the choice just does not outlive this tab */
  }
}

export function loadLang(): Lang {
  return read(LANG_KEY) === "bn" ? "bn" : "en";
}

export function applyLang(lang: Lang): void {
  document.documentElement.lang = lang;
}

function broadcast(): void {
  window.dispatchEvent(new Event(EVENT));
}

export function setLang(lang: Lang): void {
  write(LANG_KEY, lang);
  applyLang(lang);
  broadcast();
}

/* ── threshold τ (docs/06 §6) ──────────────────────────────────────────
 * Same store, same shape as the above: the slider writes it and every
 * screen reads it on mount, so the value stays consistent across Inbox /
 * Try It / Dashboard / Evaluation without a provider. Clamped to the range
 * route() can actually enforce, so a stale value cannot sit outside it. */
const TAU_KEY = "order_khata.tau";

export function loadTau(fallback: number): number {
  const raw = read(TAU_KEY);
  if (raw === null) return fallback;
  const v = parseFloat(raw);
  return Number.isFinite(v) ? Math.min(TAU_MAX, Math.max(TAU_MIN, v)) : fallback;
}

export function saveTau(v: number): void {
  write(TAU_KEY, String(v));
}

export interface Prefs {
  lang: Lang;
  setLang: (v: Lang) => void;
  /** Translate a key into the current language. */
  t: (key: string) => string;
}

/** Reactive preferences. Renders the default (English — the same as the
 *  server markup and the pre-paint script) and syncs from storage on mount,
 *  so hydration never mismatches. */
export function usePrefs(): Prefs {
  const [lang, setLangState] = useState<Lang>("en");

  useEffect(() => {
    const sync = () => {
      setLangState(loadLang());
    };
    sync();
    window.addEventListener(EVENT, sync);
    return () => window.removeEventListener(EVENT, sync);
  }, []);

  return { lang, setLang, t: (key: string) => t(lang, key) };
}
