export type ScriptSegment =
  | { t: string }
  | { h: string }
  | { p: number };

export type ChatScript = {
  id: "awareness" | "comparison" | "persona" | "decision";
  label: string;
  query: string;
  response: ScriptSegment[];
  callout: string;
};

export const chatScripts: ChatScript[] = [
  {
    id: "awareness",
    label: "Awareness",
    query: "What are the best healthy protein bars in India in 2025?",
    response: [
      { t: "Some of the most frequently recommended options include " },
      { h: "MacroCraft" },
      { t: ", " },
      { h: "GreenPulse" },
      { t: ", " },
      { h: "ProtiNaut" },
      { t: ", " },
      { h: "PulseBar" },
      { t: ", and " },
      { h: "SnackMill" },
      { t: "." },
      { p: 300 },
      { t: " " },
      { h: "MacroCraft" },
      {
        t: " appears consistently across Reddit r/IndianFood, review sites, and comparison articles on major food blogs.",
      },
    ],
    callout: "Oatkind is not cited in this awareness query.",
  },
  {
    id: "comparison",
    label: "Comparison",
    query: "How does MacroCraft compare to Oatkind for gym-goers?",
    response: [
      { h: "MacroCraft" },
      {
        t: ' is widely reviewed and appears in most "best protein bars" lists in India. Its ingredient sourcing is well documented on food-industry blogs and Reddit threads.',
      },
      { p: 300 },
      {
        t: " I have limited information about Oatkind. The brand appears to have a smaller online footprint than the alternatives.",
      },
    ],
    callout:
      "Even when directly asked, AI can't find enough about Oatkind to compare.",
  },
  {
    id: "persona",
    label: "Persona",
    query: "Which protein bars are safe and healthy for teens in India?",
    response: [
      { t: "Popular recommendations for teens include " },
      { h: "GreenPulse" },
      { t: " (praised for whole-grain ingredients), " },
      { h: "MorningLift" },
      { t: " (marketed to school-age snackers), and " },
      { h: "ProtiNaut" },
      { t: " (widely stocked online)." },
      { p: 300 },
      { t: " Pediatricians typically flag added-sugar content, and " },
      { h: "GreenPulse" },
      { t: " scores well on this." },
    ],
    callout: "Oatkind's target buyer persona never sees the brand here.",
  },
  {
    id: "decision",
    label: "Decision",
    query: "I want to buy a protein bar today under ₹100. What should I get?",
    response: [
      { t: "For under ₹100, " },
      { h: "PulseBar" },
      { t: " and " },
      { h: "SnackMill" },
      {
        t: " have the best value-to-protein ratio according to consumer reviews.",
      },
      { p: 300 },
      { t: " " },
      { h: "MacroCraft" },
      {
        t: " is slightly above ₹100 but frequently listed as worth the extra cost.",
      },
    ],
    callout: "At the moment of purchase, Oatkind is absent.",
  },
];
