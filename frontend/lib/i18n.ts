/** Interface strings (docs/06 §4.6).
 *
 * Scope, on purpose: the *chrome and the narrative* — navigation, headings,
 * buttons, the landing story, the footer, this preferences screen — switch
 * with the language toggle. Two things stay English because they are product
 * vocabulary rather than prose:
 *
 *   · the six class names (Order, Price, Delivery, Complaint, Scam, Other) —
 *     they are the model's output labels and appear verbatim in the API
 *     contract (docs/05), so translating them in the UI only would make the
 *     screens disagree with the docs;
 *   · the detection internals (engine names, ECE, macro-F1, τ).
 *
 * ponytail: chrome-level i18n only. Inbox / Dashboard / Evaluation body copy
 * is still English — add keys here when a reviewer actually asks for it.
 */

import type { Lang } from "./prefs";

const S = (en: string, bn: string) => ({ en, bn });

export const STRINGS: Record<string, { en: string; bn: string }> = {
  /* ── navigation & shared chrome ───────────────────────────────────── */
  "nav.inbox": S("Inbox", "ইনবক্স"),
  "nav.try": S("Try It", "নিজে চেষ্টা"),
  "nav.dashboard": S("Dashboard", "ড্যাশবোর্ড"),
  "nav.evaluation": S("Evaluation", "মূল্যায়ন"),
  "nav.preferences": S("Preferences", "পছন্দ"),
  "nav.openInbox": S("Open inbox", "ইনবক্স খুলুন"),
  "nav.language": S("Language", "ভাষা"),
  "nav.appearance": S("Appearance", "রূপ"),

  /* ── hero ─────────────────────────────────────────────────────────── */
  "hero.tagline": S("Your shop's inbox, sorted", "আপনার দোকানের ইনবক্স, সাজানো"),
  "hero.feed": S("simulated Page feed", "সিমুলেটেড পেজ ফিড"),
  "hero.t1a": S("Sort the", "গোলমাল"),
  "hero.t1b": S("noise.", "সরান।"),
  "hero.t2a": S("Keep the", "বিক্রি"),
  "hero.t2b": S("sale.", "রাখুন।"),
  "hero.lede": S(
    "Every customer message, read, sorted and labelled for you, so you only see the ones that need you.",
    "প্রতিটি কাস্টমার মেসেজ আপনার জন্য পড়া, সাজানো ও লেবেল দেওয়া হয়, তাই দেখতে হয় শুধু যেগুলোতে আপনার দরকার।",
  ),
  "hero.ctaInbox": S("Open the live inbox", "লাইভ ইনবক্স খুলুন"),
  "hero.ctaEval": S("See the evaluation", "মূল্যায়ন দেখুন"),
  "hero.legend": S("six classes", "ছয় ধরন"),

  /* ── the problem ──────────────────────────────────────────────────── */
  "problem.t1": S("Hundreds of messages a day.", "দিনে শত শত মেসেজ।"),
  "problem.t2": S("Every one read by hand.", "সব পড়তে হয় নিজে হাতে।"),
  "problem.lede": S(
    "Orders hide under price questions. A scam looks like small talk. Nobody signed up to sort all of it by hand.",
    "অর্ডার লুকিয়ে থাকে দামের প্রশ্নে। স্ক্যাম দেখতে আড্ডার মতো। হাতে হাতে সাজানোর কাজ কেউ চায়নি।",
  ),
  "problem.quote": S(
    "Wrong but confident is the real risk. So the system asks for a person instead of guessing.",
    "ভুল হয়েও নিশ্চিত — এটাই আসল ঝুঁকি। তাই সিস্টেম অনুমান না করে একজন মানুষকে জিজ্ঞেস করে।",
  ),
  "fact.scripts": S("languages", "ভাষা"),
  "fact.scripts.body": S(
    "All sorts of languages: be it Bangla, English or Banglish.",
    "যেকোনো ভাষা: বাংলা হোক, ইংরেজি বা বাংলিশ।",
  ),
  "fact.classes": S("classes", "ধরন"),
  "fact.classes.body": S(
    "Every message is classified and labelled into 6 groups: Order · Price · Delivery · Complaint · Scam · Other",
    "প্রতিটি মেসেজ ৬টি গ্রুপে ভাগ ও লেবেল করা হয়: Order · Price · Delivery · Complaint · Scam · Other",
  ),
  "fact.rule": S("hard rule", "কঠিন নিয়ম"),
  "fact.rule.body": S("We never handle scams automatically.", "স্ক্যাম কখনও নিজে থেকে সামলানো হয় না।"),

  /* ── how it works ─────────────────────────────────────────────────── */
  "how.t1": S("A pipeline that never", "যে পাইপলাইন কখনও"),
  "how.t2": S("guesses its way past a scam.", "অনুমানে স্ক্যাম পেরোয় না।"),
  "how.lede": S(
    "One small container. No server-side rendering, no extra services, no API key in your browser. If the language model is down, the scam guard still runs.",
    "ছোট একটি কন্টেইনার। সার্ভার-সাইড রেন্ডারিং নেই, বাড়তি সার্ভিস নেই, ব্রাউজারে কোনো API key নেই। ভাষার মডেল বন্ধ থাকলেও স্ক্যাম গার্ড চলে।",
  ),
  "how.1.title": S("Clean up, spot the script", "পরিচ্ছন্ন করুন, ভাষা চিনুন"),
  "how.1.body": S(
    "Trim the whitespace, then decide: Bangla, Banglish, English or mixed. Plain Unicode ranges, no network.",
    "বাড়তি স্পেস সরিয়ে ঠিক করা হয় — বাংলা, বাংলিশ, ইংরেজি নাকি মিশ্র। শুধুই Unicode, নেটওয়ার্ক নেই।",
  ),
  "how.2.title": S("Score the five classes", "পাঁচটি ধরন স্কোর করুন"),
  "how.2.body": S(
    "One pass returns a probability for Order, Price, Delivery, Complaint and Other, plus an escalate signal.",
    "একবারেই Order, Price, Delivery, Complaint ও Other-এর সম্ভাবনা, সাথে escalate সংকেত।",
  ),
  "how.3.title": S("Run the scam guard", "স্ক্যাম গার্ড চালান"),
  "how.3.body": S(
    "A separate binary head. Above 0.70 a message can never be handled automatically. It runs before routing, and it has a test.",
    "আলাদা একটি বাইনারি হেড। ০.৫০-এর উপরে গেলে মেসেজ কখনও নিজে থেকে সামলানো হয় না। রাউটিংয়ের আগেই চলে, আর এর একটি টেস্ট আছে।",
  ),
  "how.4.title": S("Ask for a second opinion", "দ্বিতীয় মত নিন"),
  "how.4.body": S(
    "One independent model is asked once, and never shown the first answer. When the two disagree, a person decides.",
    "একটি স্বতন্ত্র মডেলকে একবার জিজ্ঞেস করা হয়, প্রথম উত্তরটি দেখানো হয় না। দুটো আলাদা মত হলে সিদ্ধান্ত নেন একজন মানুষ।",
  ),
  "how.5.title": S("Route to a lane", "লেনে পাঠান"),
  "how.5.body": S(
    "The policy is a plain function of the stored signals and the threshold. The same code runs on the server and in your browser.",
    "নীতিটি শুধুই সিগন্যাল আর থ্রেশহোল্ডের একটি ফাংশন। একই কোড চলে সার্ভারে ও আপনার ব্রাউজারে।",
  ),

  /* ── the lanes ────────────────────────────────────────────────────── */
  "lanes.t1": S("Three places a message can land.", "মেসেজ থামতে পারে তিন জায়গায়।"),
  "lanes.t2": S("Two of them are not your problem.", "দুটো নিয়ে আপনার ভাবতে হবে না।"),
  "lanes.lede": S(
    "Each message gets one lane and one line saying why. The reason travels with it, so you always know what the system was thinking.",
    "প্রতিটি মেসেজ পায় একটি লেন, আর কেন এমন — সেই একটি লাইন। কারণটা মেসেজের সাথেই চলে, তাই সিস্টেম কী ভেবেছে তা জানা থাকে।",
  ),
  "lanes.note": S(
    "Lanes are recomputed in your browser from the stored signals, so the threshold slider costs zero network.",
    "লেনগুলো আপনার ব্রাউজারেই আবার হিসাব হয়, তাই থ্রেশহোল্ড স্লাইডার নেটওয়ার্ক খরচ করে না।",
  ),
  "lanes.specimen": S("specimen", "নমুনা"),

  "lane.all": S("All", "সব"),
  "lane.auto": S("Handled for you", "আপনার হয়ে শেষ"),
  "lane.review": S("Needs your eyes", "আপনার চোখ দরকার"),
  "lane.scam": S("Scam alerts", "স্ক্যাম সতর্কতা"),
  "lane.auto.short": S("Auto", "অটো"),
  "lane.review.short": S("Review", "রিভিউ"),
  "lane.scam.short": S("Scam", "স্ক্যাম"),
  "lane.auto.blurb": S(
    "Confident, and the second opinion agrees. Off your desk.",
    "নিশ্চিত, আর দ্বিতীয় মতও এক। আপনার টেবিল থেকে সরানো।",
  ),
  "lane.review.blurb": S(
    "Unsure, angry or conflicting. You make the call.",
    "অনিশ্চিত, রাগী, বা মতবিরোধ। সিদ্ধান্ত আপনার।",
  ),
  "lane.scam.blurb": S(
    "Suspicious. Never handled automatically — a hard rule with a test.",
    "সন্দেহজনক। কখনও নিজে থেকে সামলানো হয় না — নিয়মটা কঠিন, আর টেস্ট করা।",
  ),

  /* ── the safety dial ──────────────────────────────────────────────── */
  "dial.t1": S("One number decides how much", "একটি সংখ্যাই ঠিক করে"),
  "dial.t2": S("gets handled for you.", "কতটা আপনি ছাড়বেন।"),
  "dial.lede": S(
    "τ is yours to set. Raise it and more messages come to you; what stays automatic gets more accurate. You pick where to sit.",
    "τ আপনার হাতে। বাড়ালে বেশি মেসেজ আপনার কাছে আসে; যেগুলো অটো থাকে, সেগুলোর নির্ভুলতা বাড়ে। কোথায় বসবেন, আপনি ঠিক করুন।",
  ),
  "dial.threshold": S("Threshold τ", "থ্রেশহোল্ড τ"),
  "dial.illustration": S(
    "Illustration · the same route() the server runs, applied to example messages. Nothing here is written to the database.",
    "উদাহরণ · সার্ভার যে route() চালায়, সেটাই নমুনা মেসেজে প্রয়োগ করা। এখান থেকে ডেটাবেসে কিছু যায় না।",
  ),
  "dial.classes": S("classes", "ধরন"),

  /* ── rigor ────────────────────────────────────────────────────────── */
  "rigor.t1": S("One honest set of numbers.", "সৎ সংখ্যা, এক সেট।"),
  "rigor.t2": S("Or none at all.", "নয়তো কিছুই না।"),
  "rigor.lede": S(
    "Every number on the Evaluation page comes from a single offline run, read from artifacts/eval.json. Nothing is hardcoded and nothing shows until it has actually run.",
    "মূল্যায়ন পাতার প্রতিটি সংখ্যা আসে একটি অফলাইন রান থেকে — artifacts/eval.json ফাইল থেকে। কিছুই হার্ডকোড করা নেই, আর রান না হলে কিছু দেখানো হয় না।",
  ),
  "rigor.pending": S("Not yet evaluated", "এখনও মূল্যায়ন হয়নি"),
  "rigor.pendingBody": S(
    "The evaluation has not run, so there are no numbers to show. That is on purpose: a placeholder passed off as a result would be a lie. They appear the moment the notebook writes the file.",
    "মূল্যায়ন এখনও চলে নি, তাই দেখানোর মতো সংখ্যা নেই। এটা ইচ্ছাকৃত — ভান করা সংখ্যা একটা মিথ্যা। নোটবুক ফাইল লেখার সাথে সাথেই এগুলো আসবে।",
  ),
  "rigor.openEval": S("open evaluation", "মূল্যায়ন খুলুন"),
  "rigor.systems": S("systems compared", "তুলনা করা সিস্টেম"),

  /* ── built honest ─────────────────────────────────────────────────── */
  "honest.t1": S("We say what the data is.", "ডেটা কী, তা বলি।"),
  "honest.t2": S("And what it is not.", "আর কী নয়, তাও বলি।"),
  "honest.provenance": S("provenance", "উৎস"),
  "honest.limits": S("known limits", "জানা সীমা"),
  "honest.allLimits": S("all limitations", "সব সীমাবদ্ধতা"),
  "honest.data.1": S(
    "Intent data is a public Bangla e-commerce customer-message corpus (CC BY-NC-SA 4.0, non-commercial).",
    "ইনটেন্ট ডেটা একটি পাবলিক বাংলা ই-কমার্স কাস্টমার-মেসেজ কর্পাস (CC BY-NC-SA 4.0, অবাণিজ্যিক)।",
  ),
  "honest.data.2": S(
    "Scam data is a Bengali SMS smishing corpus (MIT).",
    "স্ক্যাম ডেটা একটি বাংলা SMS স্মিশিং কর্পাস (MIT)।",
  ),
  "honest.data.3": S(
    "The inbox is simulated. There is no live Facebook or Meta integration.",
    "ইনবক্স সিমুলেটেড। কোনো লাইভ Facebook বা Meta সংযোগ নেই।",
  ),
  "honest.limit.1": S(
    "Real typos, dialects and disfluencies are under-represented.",
    "আসল বানান-ভুল, আঞ্চলিক ভাষা ও এলোমেলো কথা কম আছে।",
  ),
  "honest.limit.2": S(
    "The escalate flag is derived from policy, not ground truth.",
    "escalate সংকেতটি নীতি থেকে আসে, সত্য-লেবেল থেকে নয়।",
  ),
  "honest.limit.3": S(
    "Scam data is SMS-style, not shop-chat messages.",
    "স্ক্যাম ডেটা SMS-ধাঁচের, দোকানের চ্যাট নয়।",
  ),

  /* ── closing call to action + footer ──────────────────────────────── */
  "cta.kicker": S("the risky decisions stay with you", "ঝুঁকির সিদ্ধান্ত আপনার কাছেই থাকে"),
  "cta.try": S("Classify your own message", "নিজের মেসেজ যাচাই করুন"),
  "footer.blurb": S(
    "A triage inbox for small online shops in Bangladesh. Built in 48 hours: Next.js static export and FastAPI in one free Hugging Face Space.",
    "বাংলাদেশের ছোট অনলাইন দোকানের জন্য একটি ইনবক্স। ৪৮ ঘণ্টায় বানানো: Next.js স্ট্যাটিক এক্সপোর্ট আর FastAPI, একটি ফ্রি Hugging Face Space-এ।",
  ),
  "footer.product": S("product", "প্রোডাক্ট"),
  "footer.proof": S("proof", "প্রমাণ"),
  "footer.credits": S(
    "Datasets: public Bangla e-commerce customer-message corpus (CC BY-NC-SA 4.0) · Bengali SMS smishing corpus (MIT)",
    "ডেটাসেট: পাবলিক বাংলা ই-কমার্স কাস্টমার-মেসেজ কর্পাস (CC BY-NC-SA 4.0) · বাংলা SMS স্মিশিং কর্পাস (MIT)",
  ),
  "footer.note": S("demo uses a simulated Page feed", "ডেমোতে সিমুলেটেড পেজ ফিড"),
  "footer.legal": S(
    "Order Khata · 2026 · not real seller messages",
    "Order Khata · ২০২৬ · আসল সেলার মেসেজ নয়",
  ),

  /* ── preferences screen ───────────────────────────────────────────── */
  "pref.title": S("How should this read?", "কীভাবে পড়তে চান?"),
  "pref.lede": S(
    "Two choices, saved on this device, applied everywhere.",
    "দুটি পছন্দ। এই ডিভাইসে সেভ হয়, সব জায়গায় লাগে।",
  ),
  "pref.language": S("Language", "ভাষা"),
  "pref.languageHint": S("How the app talks to you.", "অ্যাপ কীভাবে কথা বলবে।"),
  "pref.appearance": S("Appearance", "রূপ"),
  "pref.appearanceHint": S("Light for daylight, dark for late nights.", "দিনের আলোয় লাইট, রাত জাগলে ডার্ক।"),
  "pref.english": S("English", "English"),
  "pref.bangla": S("বাংলা", "বাংলা"),
  "pref.light": S("Light", "লাইট"),
  "pref.dark": S("Dark", "ডার্ক"),
  "pref.lightHint": S("Bright paper, dark ink.", "উজ্জ্বল কাগজ, গাঢ় কালি।"),
  "pref.darkHint": S("Dark paper, bright ink.", "গাঢ় কাগজ, উজ্জ্বল কালি।"),
  "pref.saved": S("Saved on this device.", "এই ডিভাইসে সেভ করা আছে।"),
  "pref.note": S(
    "This changes the interface only. The classifier reads Bangla, Banglish and English whichever you pick, and no message you paste is stored with your choice.",
    "এটা শুধু ইন্টারফেস বদলায়। আপনি যা-ই বাছুন, ক্লাসিফায়ার বাংলা, বাংলিশ ও ইংরেজি পড়ে — আর আপনার পছন্দের সাথে কোনো মেসেজ জমা হয় না।",
  ),

  /* ── app screens ──────────────────────────────────────────────────── */
  "page.try.title": S("Try It", "নিজে চেষ্টা করুন"),
  "page.try.kicker": S("classify", "যাচাই"),
  "page.dashboard.kicker": S("today", "আজ"),
  "page.evaluation.kicker": S("proof", "প্রমাণ"),
};

/** Look up a string. Unknown keys fall back to English, then to the key. */
export function t(lang: Lang, key: string): string {
  const row = STRINGS[key];
  if (!row) return key;
  return row[lang] || row.en;
}
