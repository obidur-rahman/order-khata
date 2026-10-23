/** Landing (docs/06 §4.1): a long-form product story, not a hero-and-buttons
 * page. Six sections carry the reader from the problem to the proof:
 *
 *   the problem · how it works · the lanes
 *   the safety dial · rigor · built honest
 *
 * The accent is used consistently to mean "this needs your eyes / your
 * action". Colour never carries meaning alone. No metric is hardcoded:
 * the rigor section reads the same artifacts/eval.json the Evaluation page
 * does. */
import { BuiltHonest, Closing, SiteFooter } from "@/components/landing/Close";
import { Hero, LandingBar } from "@/components/landing/Hero";
import { HowItWorks } from "@/components/landing/Pipeline";
import { Rigor } from "@/components/landing/Rigor";
import { SafetyDial } from "@/components/landing/SafetyDial";
import { TheLanes, TheProblem } from "@/components/landing/Story";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-paper">
      <LandingBar />
      <main id="main">
        <Hero />
        <TheProblem />
        <HowItWorks />
        <TheLanes />
        <SafetyDial />
        <Rigor />
        <BuiltHonest />
        <Closing />
      </main>
      <SiteFooter />
    </div>
  );
}
