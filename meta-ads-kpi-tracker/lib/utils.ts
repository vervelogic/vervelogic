export interface Settings {
  budget: number;
  aov: number;
  targetROAS: number;
  autoRevenue: boolean;
}

export interface DailyEntry {
  date: string;
  spend: number;
  impressions: number;
  clicks: number;
  sessions: number;
  atc: number;
  checkouts: number;
  purchases: number;
  revenue?: number;
}

export interface ComputedEntry extends DailyEntry {
  revenue: number;
  ctr: number;
  cpc: number;
  cpm: number;
  atcRate: number;
  icRate: number;
  cvr: number;
  cpa: number;
  roas: number;
}

export const benchmarks = {
  ctr: { good: 1.5, warn: 1.0 },
  cpc: { good: 20, warn: 25 },
  cpm: { good: 200, warn: 250 },
  atcRate: { good: 8, warn: 5 },
  icRate: { good: 4, warn: 2 },
  cvr: { good: 2.5, warn: 1.5 },
  cpa: { good: 650, warn: 800 },
  roas: { good: 3, warn: 2 },
};

export type MetricKey = keyof typeof benchmarks;

const higherBetter: MetricKey[] = ["ctr", "atcRate", "icRate", "cvr", "roas"];

export function getStatus(metric: MetricKey, value: number): "good" | "warn" | "poor" {
  const { good, warn } = benchmarks[metric];
  if (higherBetter.includes(metric)) {
    if (value >= good) return "good";
    if (value >= warn) return "warn";
    return "poor";
  }
  if (value <= good) return "good";
  if (value <= warn) return "warn";
  return "poor";
}

export function computeMetrics(entry: DailyEntry, settings: Settings): ComputedEntry {
  const revenue = settings.autoRevenue
    ? entry.purchases * settings.aov
    : entry.revenue ?? 0;
  const ctr = entry.impressions ? (entry.clicks / entry.impressions) * 100 : 0;
  const cpc = entry.clicks ? entry.spend / entry.clicks : 0;
  const cpm = entry.impressions ? (entry.spend / entry.impressions) * 1000 : 0;
  const atcRate = entry.sessions ? (entry.atc / entry.sessions) * 100 : 0;
  const icRate = entry.sessions ? (entry.checkouts / entry.sessions) * 100 : 0;
  const cvr = entry.clicks ? (entry.purchases / entry.clicks) * 100 : 0;
  const cpa = entry.purchases ? entry.spend / entry.purchases : 0;
  const roas = entry.spend ? revenue / entry.spend : 0;
  return {
    ...entry,
    revenue,
    ctr,
    cpc,
    cpm,
    atcRate,
    icRate,
    cvr,
    cpa,
    roas,
  };
}

export const optimizationTips: Record<MetricKey, string[]> = {
  ctr: ["Test new creatives", "Refine audience targeting"],
  cpc: ["Improve ad relevance", "Use cost cap bidding"],
  cpm: ["Narrow audience", "Use campaign budget optimization"],
  atcRate: ["Improve product page", "Use compelling offers"],
  icRate: ["Simplify checkout", "Offer discounts"],
  cvr: ["Optimize landing page", "Use social proof"],
  cpa: ["Exclude poor audiences", "Use retargeting"],
  roas: ["Increase AOV", "Pause low ROAS ads"],
};

export function ordersNeeded(settings: Settings): number {
  return Math.ceil((settings.budget * settings.targetROAS) / settings.aov);
}
