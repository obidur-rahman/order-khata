"use client";
/** Landing masthead + hero (quiet-ledger skin, dark only).
 *
 * The signature moment stays: an open khata that sorts itself. The left page
 * is the message in the script it arrived in; the right page is the verdict
 * that settles onto it. One interval drives rows, verdicts and tally, so they
 * can never disagree. It is an illustration on a simulated feed — never
 * presented as measurement.
 *
 * The skin: no dateline rules, no uppercase display. One large quiet
 * statement on the left, the live card floating on the right.
 */
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { TopBar } from "@/components/AppBar";
import { LaneIcon } from "@/components/LaneChip";
import { CLASS_META, LANE_META } from "@/lib/brand";
import { usePrefs } from "@/lib/prefs";
import { CLASSES, type ClassKey, type Lane } from "@/lib/types";
import { GhostCTA, PrimaryCTA } from "./parts";

export function LandingBar() {
  const { t } = usePrefs();
  return (
    <TopBar
      trailing={
        <Link
          href="/inbox/"
          prefetch={false}
          className="hidden rounded-full bg-btn px-4 py-2 text-[12.5px] font-medium text-btn-ink transition hover:opacity-85 sm:inline-flex"
        >
          {t("nav.openInbox")}
        </Link>
      }
    />
  );
}

interface Entry {
  text: string;
  cls: ClassKey;
  lane: Lane;
  p: number;
  script: string;
  at: string;
}

/** Hand-authored examples, one per shape a real day has. The scam row is red
 *  and never auto: the same hard invariant the router enforces. */
const FEED: Entry[] = [
  {
    text: "ei saree ta ki stock e ache? ami nite chai",
    cls: "order",
    lane: "auto",
    p: 0.94,
    script: "bl",
    at: "23:41",
  },
  {
    text: "দামটা কি একটু কমবে? তিন পিস নিলে কোনো ছাড় আছে?",
    cls: "price_question",
    lane: "review",
    p: 0.63,
    script: "bn",
    at: "23:38",
  },
  {
    text: "Send the OTP to verify your account and click this link to claim your prize",
    cls: "scam",
    lane: "scam",
    p: 0.86,
    script: "en",
    at: "23:35",
  },
  {
    text: "eta kobe pabo? taratari lagbe, agami shombare",
    cls: "delivery_problem",
    lane: "auto",
    p: 0.88,
    script: "bl",
    at: "23:31",
  },
  {
    text: "আমি ম্যানেজারের সাথে কথা বলতে চাই",
    cls: "other",
    lane: "review",
    p: 0.55,
    script: "bn",
    at: "23:27",
  },
  {
    text: "নীল রঙের ওই কুর্তিটা কি ৪২ সাইজে আছে?",
    cls: "order",
    lane: "auto",
    p: 0.91,
    script: "bn",
    at: "23:24",
  },
  {
    text: "গত সপ্তাহে অর্ডার করা শাড়িটা এখনো পাইনি, রিপ্লাই দেন",
    cls: "complaint",
    lane: "review",
    p: 0.68,
    script: "bn",
    at: "23:19",
  },
  {
    text: "Is the price negotiable for 3 pieces?",
    cls: "price_question",
    lane: "auto",
    p: 0.89,
    script: "en",
    at: "23:15",
  },
];

const TALLY: Record<Lane, number> = { auto: 38, review: 14, scam: 3 };
const LANE_ORDER: Lane[] = ["auto", "review", "scam"];

/** The open book, as a soft floating card. Newest entry on top; older
 *  entries walk down and out. */
function LiveLedger() {
  const { t } = usePrefs();
  const [seq, setSeq] = useState(0);
  const [still, setStill] = useState(false);
  const [tally, setTally] = useState<Record<Lane, number>>(TALLY);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setStill(true);
      return;
    }
    const id = window.setInterval(() => setSeq((s) => s + 1), 4800);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    if (seq === 0) return;
    const lane = FEED[seq % FEED.length].lane;
    setTally((prev) => ({ ...prev, [lane]: prev[lane] + 1 }));
  }, [seq]);

  const rows = useMemo(
    () => Array.from({ length: 4 }, (_, k) => FEED[(seq + k) % FEED.length]),
    [seq],
  );

  return (
    <figure className="sheet relative overflow-hidden p-1.5">
      <div className="overflow-hidden rounded-[22px] bg-surface2/60">
        {/* the two pages, named softly */}
        <div className="grid grid-cols-[1fr_104px] px-5 pt-4">
          <span className="label flex items-center gap-2 text-muted">
            <span
              className="live-dot inline-block h-1.5 w-1.5 rounded-full"
              style={{ background: "var(--lane-auto)" }}
              aria-hidden
            />
            {t("ledger.arrived")}
          </span>
          <span className="label pl-3 text-muted">{t("ledger.did")}</span>
        </div>

        <ul className="mt-3 min-h-[300px] space-y-1 px-1.5 pb-1.5">
          {rows.map((e, k) => {
            const lane = LANE_META[e.lane];
            const first = k === 0 && !still;
            return (
              <li
                key={`${seq}-${k}`}
                className={`grid grid-cols-[1fr_104px] items-center rounded-2xl bg-surface px-4 py-3 shadow-soft ${
                  first ? "slip" : ""
                }`}
              >
                <div className="min-w-0">
                  <p className="msg-text line-clamp-2 text-[13px] leading-[1.5] text-ink">{e.text}</p>
                  <div className="mt-2 flex items-center gap-2">
                    <span className="index text-[10px] text-muted">{e.script}</span>
                    <span
                      className="h-1 w-1 rounded-full"
                      style={{ background: CLASS_META[e.cls].color }}
                      aria-hidden
                    />
                    <span
                      className="label inline-flex items-center gap-1"
                      style={{ color: CLASS_META[e.cls].color }}
                    >
                      {CLASS_META[e.cls].label}
                    </span>
                  </div>
                </div>

                {/* the verdict, settling */}
                <div className="flex flex-col items-end justify-between gap-2 pl-3">
                  <span
                    className={`stamp ${first ? "stamp-land" : ""}`}
                    style={{ color: lane.deep }}
                  >
                    <LaneIcon icon={lane.icon} size={10} />
                    {t(`lane.${e.lane}.short`)}
                  </span>
                  <span className="index text-[10px] text-muted">
                    p {e.p.toFixed(2)}
                  </span>
                </div>
              </li>
            );
          })}
        </ul>

        <figcaption className="flex items-stretch gap-1 px-1.5 pb-1.5">
          {LANE_ORDER.map((l) => {
            const m = LANE_META[l];
            return (
              <div
                key={l}
                className="flex flex-1 flex-col gap-0.5 rounded-2xl bg-surface px-4 py-3 shadow-soft"
              >
                <span className="label flex items-center gap-1.5" style={{ color: m.deep }}>
                  <LaneIcon icon={m.icon} size={10} />
                  {t(`lane.${l}.short`)}
                </span>
                <span className="tnum text-[22px]" style={{ color: m.color }}>
                  {String(tally[l]).padStart(2, "0")}
                </span>
              </div>
            );
          })}
        </figcaption>
      </div>
    </figure>
  );
}

export function Hero() {
  const { t } = usePrefs();
  return (
    <section className="lamp relative isolate overflow-hidden">
      <div className="relative mx-auto max-w-[1180px] px-5 pb-16 pt-10 md:px-8 md:pb-24 md:pt-16">
        <div className="grid items-center gap-14 lg:grid-cols-12 lg:gap-10">
          <div className="lg:col-span-6">
            <p className="label text-muted">{t("hero.mode")}</p>

            <h1
              className="display mt-5 text-ink"
              style={{ fontSize: "clamp(38px, 5.6vw, 68px)" }}
            >
              {t("hero.t1a")} {t("hero.t1b")}
              <br />
              <span className="mark">{t("hero.t2a")} {t("hero.t2b")}</span>
            </h1>

            <p className="mt-7 max-w-md text-[16.5px] leading-[1.75] text-muted">
              {t("hero.lede")}
            </p>

            <div className="mt-9 flex flex-wrap items-center gap-3">
              <PrimaryCTA href="/inbox/">{t("hero.ctaInbox")}</PrimaryCTA>
              <GhostCTA href="/evaluation/">{t("hero.ctaEval")}</GhostCTA>
            </div>

            <div className="mt-12">
              <div className="mb-4 flex items-center gap-3">
                <span className="label text-muted">{t("hero.legend")}</span>
                <span className="h-px flex-1 bg-line" aria-hidden />
              </div>
              <ul className="flex flex-wrap gap-2">
                {CLASSES.map((c) => (
                  <li key={c}>
                    <span className="stamp text-ink">
                      <span
                        className="h-1.5 w-1.5 rounded-full"
                        style={{ background: CLASS_META[c].color }}
                        aria-hidden
                      />
                      {CLASS_META[c].label}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="lg:col-span-6">
            <LiveLedger />
            <p className="label mt-4 flex items-center justify-between text-muted">
              <span>{t("ledger.illustration")}</span>
              <span>{t("ledger.caption")}</span>
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
