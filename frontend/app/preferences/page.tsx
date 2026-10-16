"use client";
/** Preferences (docs/06 §4.6): the screen that asks how the app should talk
 * to you — language and appearance. Both apply immediately and are saved on
 * the device (lib/prefs.ts); nothing is sent to the backend. */
import { AppBar } from "@/components/AppBar";
import { CheckIcon, MoonIcon, SunIcon } from "@/components/icons";
import { usePrefs, type Lang, type Theme } from "@/lib/prefs";
import type { Lane } from "@/lib/types";

function Option({
  selected,
  onSelect,
  title,
  hint,
  badge,
}: {
  selected: boolean;
  onSelect: () => void;
  title: string;
  hint: string;
  badge: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onSelect}
      className={`flex w-full items-center gap-5 rounded-2xl border bg-surface px-6 py-6 text-left transition ${
        selected
          ? "border-ink shadow-lift"
          : "border-line shadow-soft hover:border-ink/40"
      }`}
    >
      <span
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-line font-mono text-[12px] tracking-[0.08em] text-ink"
        aria-hidden
      >
        {badge}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-[17px] font-semibold text-ink">{title}</span>
        <span className="mt-1 block text-[13px] leading-relaxed text-muted">{hint}</span>
      </span>
      {selected && <CheckIcon size={16} className="shrink-0 text-accent" />}
    </button>
  );
}

export default function PreferencesPage() {
  const { lang, theme, setLang, setTheme, t } = usePrefs();

  const langOptions: { v: Lang; title: string; hint: string; badge: string }[] = [
    { v: "en", title: t("pref.english"), hint: "Order Khata in English.", badge: "A" },
    { v: "bn", title: t("pref.bangla"), hint: "অর্ডার খাতা বাংলায়।", badge: "অ" },
  ];
  const themeOptions: { v: Theme; title: string; hint: string; badge: React.ReactNode }[] = [
    {
      v: "light",
      title: t("pref.light"),
      hint: t("pref.lightHint"),
      badge: <SunIcon size={15} />,
    },
    {
      v: "dark",
      title: t("pref.dark"),
      hint: t("pref.darkHint"),
      badge: <MoonIcon size={15} />,
    },
  ];

  const lanes: { lane: Lane; tone: string }[] = [
    { lane: "auto", tone: "var(--lane-auto-deep)" },
    { lane: "review", tone: "var(--lane-review-deep)" },
    { lane: "scam", tone: "var(--lane-scam-deep)" },
  ];

  return (
    <div className="flex min-h-screen flex-col bg-paper">
      <AppBar />

      <main className="mx-auto w-full max-w-4xl px-6 py-16 md:py-24">
        <h1
          className="font-display font-extrabold text-ink"
          style={{ fontSize: "clamp(32px, 5vw, 52px)", lineHeight: 1.04, letterSpacing: "-0.035em" }}
        >
          {t("pref.title")}
        </h1>
        <p className="mt-6 max-w-xl text-[17px] leading-[1.75] text-muted">{t("pref.lede")}</p>

        <div className="mt-16 grid gap-x-12 gap-y-12 md:grid-cols-2">
          <section>
            <h2 className="label text-muted">{t("pref.language")}</h2>
            <p className="mt-3 text-[13px] text-muted">{t("pref.languageHint")}</p>
            <div className="mt-6 flex flex-col gap-3">
              {langOptions.map((o) => (
                <Option
                  key={o.v}
                  selected={lang === o.v}
                  onSelect={() => setLang(o.v)}
                  title={o.title}
                  hint={o.hint}
                  badge={o.badge}
                />
              ))}
            </div>
          </section>

          <section>
            <h2 className="label text-muted">{t("pref.appearance")}</h2>
            <p className="mt-3 text-[13px] text-muted">{t("pref.appearanceHint")}</p>
            <div className="mt-6 flex flex-col gap-3">
              {themeOptions.map((o) => (
                <Option
                  key={o.v}
                  selected={theme === o.v}
                  onSelect={() => setTheme(o.v)}
                  title={o.title}
                  hint={o.hint}
                  badge={o.badge}
                />
              ))}
            </div>
          </section>
        </div>

        {/* live preview: the three lanes in the chosen language */}
        <section className="mt-16 border-t border-line pt-8">
          <div className="flex flex-wrap items-center gap-x-8 gap-y-3">
            {lanes.map((l) => (
              <span key={l.lane} className="flex items-center gap-2.5" style={{ color: l.tone }}>
                <span className="h-2 w-2 rounded-full" style={{ background: l.tone }} aria-hidden />
                <span className="label">{t(`lane.${l.lane}`)}</span>
              </span>
            ))}
            <span className="label ml-auto text-muted">{t("pref.saved")}</span>
          </div>
          <p className="mt-6 max-w-2xl text-[13px] leading-relaxed text-muted">{t("pref.note")}</p>
        </section>
      </main>
    </div>
  );
}
