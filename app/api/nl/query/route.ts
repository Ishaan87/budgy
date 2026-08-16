import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUserId } from "@/lib/supabase/server";
import { AllProvidersExhausted, complete } from "@/lib/llm/router";
import { querySpecSchema } from "@/lib/analytics/querySpec";
import { runAnalyticsQuery } from "@/lib/analytics/compile";
import {
  buildAnswerSystemPrompt,
  buildAnswerUserPrompt,
  buildQuerySpecSystemPrompt,
  buildQuerySpecUserPrompt,
} from "@/lib/analytics/prompts";

const bodySchema = z.object({ question: z.string().trim().min(1).max(300) });
const answerSchema = z.object({ answer: z.string() });

export async function POST(request: Request) {
  const userId = await requireUserId();
  const { question } = bodySchema.parse(await request.json());

  const todayIso = new Date().toISOString().slice(0, 10);

  try {
    const { data: spec } = await complete({
      userId,
      purpose: "nl_analytics_query",
      schema: querySpecSchema,
      schemaName: "analytics_query_spec",
      system: buildQuerySpecSystemPrompt({ todayIso }),
      user: buildQuerySpecUserPrompt(question),
    });

    const rows = await runAnalyticsQuery(userId, spec);

    const { data: answerData } = await complete({
      userId,
      purpose: "nl_analytics_answer",
      schema: answerSchema,
      schemaName: "analytics_answer",
      system: buildAnswerSystemPrompt(),
      user: buildAnswerUserPrompt(question, rows),
    });

    return NextResponse.json({ answer: answerData.answer, rows, spec });
  } catch (err) {
    if (err instanceof AllProvidersExhausted) {
      return NextResponse.json(
        {
          error: "All configured AI models are currently unavailable.",
          attempts: err.attempts,
        },
        { status: 503 },
      );
    }
    throw err;
  }
}
