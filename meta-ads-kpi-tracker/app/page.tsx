"use client";

import { useState, useEffect, FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { computeMetrics, getStatus, ordersNeeded, optimizationTips, benchmarks, Settings, DailyEntry, MetricKey } from "@/lib/utils";
import { LineChart, Line, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { Download } from "lucide-react";

const statusEmoji = (status: "good" | "warn" | "poor") =>
  status === "good" ? "✅" : status === "warn" ? "⚠️" : "❌";

const metricLabels: Record<MetricKey, string> = {
  ctr: "CTR%",
  cpc: "CPC",
  cpm: "CPM",
  atcRate: "ATC%",
  icRate: "IC%",
  cvr: "CVR%",
  cpa: "CPA",
  roas: "ROAS",
};

export default function Page() {
  const [settings, setSettings] = useState<Settings>({
    budget: 0,
    aov: 0,
    targetROAS: 3,
    autoRevenue: true,
  });
  const [entries, setEntries] = useState<DailyEntry[]>([]);
  const [form, setForm] = useState<DailyEntry>({
    date: "",
    spend: 0,
    impressions: 0,
    clicks: 0,
    sessions: 0,
    atc: 0,
    checkouts: 0,
    purchases: 0,
    revenue: 0,
  });

  useEffect(() => {
    const savedSettings = localStorage.getItem("settings");
    const savedEntries = localStorage.getItem("entries");
    if (savedSettings) setSettings(JSON.parse(savedSettings));
    if (savedEntries) setEntries(JSON.parse(savedEntries));
  }, []);

  useEffect(() => {
    localStorage.setItem("settings", JSON.stringify(settings));
  }, [settings]);
  useEffect(() => {
    localStorage.setItem("entries", JSON.stringify(entries));
  }, [entries]);

  const handleAdd = (e: FormEvent) => {
    e.preventDefault();
    setEntries([...entries, form]);
    setForm({ ...form, date: "" });
  };

  const computed = entries.map((entry) => computeMetrics(entry, settings));
  const totals = computed.reduce(
    (acc, cur) => {
      acc.spend += cur.spend;
      acc.revenue += cur.revenue;
      acc.purchases += cur.purchases;
      return acc;
    },
    { spend: 0, revenue: 0, purchases: 0 }
  );
  const totalROAS = totals.spend ? totals.revenue / totals.spend : 0;

  const averages: Record<MetricKey, number> = {
    ctr: 0,
    cpc: 0,
    cpm: 0,
    atcRate: 0,
    icRate: 0,
    cvr: 0,
    cpa: 0,
    roas: 0,
  };
  computed.forEach((c) => {
    averages.ctr += c.ctr;
    averages.cpc += c.cpc;
    averages.cpm += c.cpm;
    averages.atcRate += c.atcRate;
    averages.icRate += c.icRate;
    averages.cvr += c.cvr;
    averages.cpa += c.cpa;
    averages.roas += c.roas;
  });
  const count = computed.length || 1;
  (Object.keys(averages) as MetricKey[]).forEach((k) => (averages[k] /= count));

  const insightMetrics = (Object.keys(averages) as MetricKey[])
    .map((k) => ({ key: k, status: getStatus(k, averages[k]) }))
    .filter((m) => m.status !== "good")
    .sort((a, b) =>
      a.status === b.status ? 0 : a.status === "poor" ? -1 : 1
    )
    .slice(0, 3);

  const exportCSV = () => {
    const header = [
      "date",
      "spend",
      "impressions",
      "clicks",
      "sessions",
      "atc",
      "checkouts",
      "purchases",
      "revenue",
      "ctr",
      "cpc",
      "cpm",
      "atcRate",
      "icRate",
      "cvr",
      "cpa",
      "roas",
    ];
    const rows = computed.map((c) =>
      [
        c.date,
        c.spend,
        c.impressions,
        c.clicks,
        c.sessions,
        c.atc,
        c.checkouts,
        c.purchases,
        c.revenue,
        c.ctr.toFixed(2),
        c.cpc.toFixed(2),
        c.cpm.toFixed(2),
        c.atcRate.toFixed(2),
        c.icRate.toFixed(2),
        c.cvr.toFixed(2),
        c.cpa.toFixed(2),
        c.roas.toFixed(2),
      ].join(",")
    );
    const csv = [header.join(","), ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "meta-ads-kpi.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="p-4 space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Settings</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <Label htmlFor="budget">Monthly Budget</Label>
            <Input
              id="budget"
              type="number"
              value={settings.budget}
              onChange={(e) =>
                setSettings({ ...settings, budget: Number(e.target.value) })
              }
            />
          </div>
          <div>
            <Label htmlFor="aov">AOV</Label>
            <Input
              id="aov"
              type="number"
              value={settings.aov}
              onChange={(e) =>
                setSettings({ ...settings, aov: Number(e.target.value) })
              }
            />
          </div>
          <div>
            <Label htmlFor="target">Target ROAS</Label>
            <Input
              id="target"
              type="number"
              value={settings.targetROAS}
              onChange={(e) =>
                setSettings({ ...settings, targetROAS: Number(e.target.value) })
              }
            />
          </div>
          <div className="flex items-center space-x-2">
            <Switch
              id="autoRevenue"
              checked={settings.autoRevenue}
              onCheckedChange={(v) =>
                setSettings({ ...settings, autoRevenue: v as boolean })
              }
            />
            <Label htmlFor="autoRevenue">Auto-compute Revenue</Label>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Add Daily Entry</CardTitle>
        </CardHeader>
        <CardContent>
          <form
            onSubmit={handleAdd}
            className="grid grid-cols-1 md:grid-cols-9 gap-2"
          >
            <Input
              type="date"
              value={form.date}
              onChange={(e) => setForm({ ...form, date: e.target.value })}
              required
            />
            <Input
              type="number"
              placeholder="Spend"
              value={form.spend}
              onChange={(e) => setForm({ ...form, spend: Number(e.target.value) })}
            />
            <Input
              type="number"
              placeholder="Impr"
              value={form.impressions}
              onChange={(e) =>
                setForm({ ...form, impressions: Number(e.target.value) })
              }
            />
            <Input
              type="number"
              placeholder="Clicks"
              value={form.clicks}
              onChange={(e) => setForm({ ...form, clicks: Number(e.target.value) })}
            />
            <Input
              type="number"
              placeholder="Sessions"
              value={form.sessions}
              onChange={(e) =>
                setForm({ ...form, sessions: Number(e.target.value) })
              }
            />
            <Input
              type="number"
              placeholder="ATC"
              value={form.atc}
              onChange={(e) => setForm({ ...form, atc: Number(e.target.value) })}
            />
            <Input
              type="number"
              placeholder="Checkouts"
              value={form.checkouts}
              onChange={(e) =>
                setForm({ ...form, checkouts: Number(e.target.value) })
              }
            />
            <Input
              type="number"
              placeholder="Purchases"
              value={form.purchases}
              onChange={(e) =>
                setForm({ ...form, purchases: Number(e.target.value) })
              }
            />
            {!settings.autoRevenue && (
              <Input
                type="number"
                placeholder="Revenue"
                value={form.revenue}
                onChange={(e) =>
                  setForm({ ...form, revenue: Number(e.target.value) })
                }
              />
            )}
            <Button type="submit" className="md:col-span-9">
              Add
            </Button>
          </form>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Total Spend</CardTitle>
          </CardHeader>
          <CardContent>₹{totals.spend.toFixed(2)}</CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Revenue</CardTitle>
          </CardHeader>
          <CardContent>₹{totals.revenue.toFixed(2)}</CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>ROAS</CardTitle>
          </CardHeader>
          <CardContent>
            {totalROAS.toFixed(2)} {statusEmoji(getStatus("roas", totalROAS))}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Orders</CardTitle>
          </CardHeader>
          <CardContent>
            {totals.purchases}/{ordersNeeded(settings)}
          </CardContent>
        </Card>
      </div>

      {insightMetrics.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Insights</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="list-disc pl-5 space-y-2">
              {insightMetrics.map((m) => (
                <li key={m.key}>
                  {metricLabels[m.key]} {statusEmoji(m.status)}
                  <ul className="list-disc pl-5">
                    {optimizationTips[m.key].slice(0, 2).map((tip) => (
                      <li key={tip}>{tip}</li>
                    ))}
                  </ul>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {computed.length > 0 && (
        <Card>
          <CardHeader className="flex justify-between items-center">
            <CardTitle>Daily Metrics</CardTitle>
            <Button variant="outline" onClick={exportCSV}>
              <Download className="h-4 w-4 mr-2" /> CSV
            </Button>
          </CardHeader>
          <CardContent>
            <div className="overflow-auto max-h-96">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-white">
                  <tr>
                    <th className="p-2 text-left">Date</th>
                    <th className="p-2 text-left">Spend</th>
                    <th className="p-2 text-left">Impr</th>
                    <th className="p-2 text-left">Clicks</th>
                    <th className="p-2 text-left">Sessions</th>
                    <th className="p-2 text-left">ATC</th>
                    <th className="p-2 text-left">Checkouts</th>
                    <th className="p-2 text-left">Purchases</th>
                    <th className="p-2 text-left">Revenue</th>
                    { (Object.keys(benchmarks) as MetricKey[]).map((k) => (
                      <th key={k} className="p-2 text-left">{metricLabels[k]}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {computed.map((c) => (
                    <tr key={c.date} className="border-t">
                      <td className="p-2">{c.date}</td>
                      <td className="p-2">₹{c.spend}</td>
                      <td className="p-2">{c.impressions}</td>
                      <td className="p-2">{c.clicks}</td>
                      <td className="p-2">{c.sessions}</td>
                      <td className="p-2">{c.atc}</td>
                      <td className="p-2">{c.checkouts}</td>
                      <td className="p-2">{c.purchases}</td>
                      <td className="p-2">₹{c.revenue.toFixed(2)}</td>
                      <td className="p-2">
                        {c.ctr.toFixed(2)}% {statusEmoji(getStatus("ctr", c.ctr))}
                      </td>
                      <td className="p-2">
                        ₹{c.cpc.toFixed(2)} {statusEmoji(getStatus("cpc", c.cpc))}
                      </td>
                      <td className="p-2">
                        ₹{c.cpm.toFixed(2)} {statusEmoji(getStatus("cpm", c.cpm))}
                      </td>
                      <td className="p-2">
                        {c.atcRate.toFixed(2)}% {statusEmoji(getStatus("atcRate", c.atcRate))}
                      </td>
                      <td className="p-2">
                        {c.icRate.toFixed(2)}% {statusEmoji(getStatus("icRate", c.icRate))}
                      </td>
                      <td className="p-2">
                        {c.cvr.toFixed(2)}% {statusEmoji(getStatus("cvr", c.cvr))}
                      </td>
                      <td className="p-2">
                        ₹{c.cpa.toFixed(2)} {statusEmoji(getStatus("cpa", c.cpa))}
                      </td>
                      <td className="p-2">
                        {c.roas.toFixed(2)} {statusEmoji(getStatus("roas", c.roas))}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {computed.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>ROAS & CPA Over Time</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={computed}>
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="roas" stroke="#2563eb" />
                <Line type="monotone" dataKey="cpa" stroke="#dc2626" />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
