"use client";

import { useState } from "react";
import { Loader2, Send, MessagesSquare } from "lucide-react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatINR } from "@/lib/inr";
import { CATEGORICAL_COLORS, CHART_INK } from "@/lib/dashboard/colors";
import type { AnalyticsRow } from "@/lib/analytics/compile";

type Entry = {
  question: string;
  answer?: string;
  rows?: AnalyticsRow[];
  error?: string;
};

const SUGGESTIONS = [
  "How much did I spend on food this month?",
  "What's my total income this year?",
  "Which category did I spend the most on last month?",
];

export function AskClient() {
  const [question, setQuestion] = useState("");
  const [entries, setEntries] = useState<Entry[]>([]);
  const [loading, setLoading] = useState(false);

  async function ask(q: string) {
    if (!q.trim() || loading) return;
    setLoading(true);
    setQuestion("");
    setEntries((prev) => [...prev, { question: q }]);

    try {
      const res = await fetch("/api/nl/query", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: q }),
      });
      const data = await res.json();
      setEntries((prev) =>
        prev.map((e, i) =>
          i === prev.length - 1
            ? res.ok
              ? { ...e, answer: data.answer, rows: data.rows }
              : { ...e, error: data.error ?? "Something went wrong" }
            : e,
        ),
      );
    } catch {
      setEntries((prev) =>
        prev.map((e, i) => (i === prev.length - 1 ? { ...e, error: "Something went wrong" } : e)),
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto flex h-[calc(100vh-8rem)] w-full max-w-2xl flex-col px-3 sm:px-4">
      <div className="flex-1 space-y-6 overflow-y-auto py-4">
        {entries.length === 0 && (
          <div className="flex h-full flex-col items-center justify-center gap-4 text-center text-muted-foreground">
            <MessagesSquare className="size-8" />
            <p>Ask anything about your spending in plain English.</p>
            <div className="flex flex-wrap justify-center gap-2">
              {SUGGESTIONS.map((s) => (
                <Button key={s} variant="outline" size="sm" onClick={() => ask(s)}>
                  {s}
                </Button>
              ))}
            </div>
          </div>
        )}
        {entries.map((entry, i) => (
          <div key={i} className="space-y-2">
            <div className="ml-auto w-fit max-w-[90%] rounded-2xl rounded-br-sm bg-primary px-4 py-2 text-sm break-words text-primary-foreground sm:max-w-[85%]">
              {entry.question}
            </div>
            <div className="w-fit max-w-[90%] space-y-3 rounded-2xl rounded-bl-sm bg-muted px-4 py-3 text-sm break-words sm:max-w-[85%]">
              {entry.error ? (
                <p className="text-destructive">{entry.error}</p>
              ) : entry.answer ? (
                <>
                  <p>{entry.answer}</p>
                  {entry.rows && entry.rows.length > 1 && (
                    <div className="h-48 w-full max-w-full sm:w-80">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={entry.rows} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                          <CartesianGrid vertical={false} stroke={CHART_INK.gridline} />
                          <XAxis
                            dataKey="label"
                            tick={{ fill: CHART_INK.muted, fontSize: 10 }}
                            axisLine={{ stroke: CHART_INK.baseline }}
                            tickLine={false}
                          />
                          <YAxis tick={{ fill: CHART_INK.muted, fontSize: 10 }} axisLine={false} tickLine={false} width={40} />
                          <Tooltip formatter={(v) => formatINR(Number(v), { showDecimals: true })} contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                          <Bar dataKey="value" fill={CATEGORICAL_COLORS[0]} radius={[4, 4, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                </>
              ) : (
                <Loader2 className="size-4 animate-spin" />
              )}
            </div>
          </div>
        ))}
      </div>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          ask(question);
        }}
        className="flex gap-2 border-t pt-3"
      >
        <Input
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder="Ask about your spending…"
          disabled={loading}
          className="min-w-0 flex-1"
        />
        <Button type="submit" disabled={loading || !question.trim()} className="shrink-0">
          <Send className="size-4" />
        </Button>
      </form>
    </div>
  );
}
