export type SampleAudit = {
  brandName: string;
  category: string;
  market: string;
  citationScore: number;
  totalPrompts: number;
  citationRate: number;
  competitors: Array<{ name: string; score: number }>;
  winners: Array<{ name: string; score: number }>;
  recommendations: string[];
};

export const oatkindSample: SampleAudit = {
  brandName: "Oatkind",
  category: "D2C protein bars & healthy snacks",
  market: "India",
  citationScore: 2,
  totalPrompts: 9,
  citationRate: 22,
  competitors: [
    { name: "MacroCraft", score: 5 },
    { name: "GreenPulse", score: 4 },
    { name: "PulseBar", score: 3 },
    { name: "TrueSlice", score: 3 },
    { name: "FitFuel", score: 2 },
  ],
  winners: [
    { name: "ProtiNaut", score: 5 },
    { name: "SnackMill", score: 4 },
    { name: "MorningLift", score: 3 },
  ],
  recommendations: [
    "Get Oatkind listed in Reddit r/IndianFood protein threads",
    "Publish a Wikipedia entry",
    "Increase G2 and Trustpilot review count",
    "Publish comparison content on tier-1 lifestyle publications",
    "Pitch top food bloggers with EEAT authority",
  ],
};
