import { generateObject, gateway } from "ai";
import { NextResponse } from "next/server";
import * as Sentry from "@sentry/nextjs";

import { buildAiChatSystemPrompt } from "@/lib/ai/chat";
import {
  normalizeTransactionDraft,
  parseCategoryContext,
  splitCategoriesByType,
} from "@/lib/ai/transaction-draft";
import { createClient } from "@/lib/supabase/server";
import {
  aiAssistantResponseSchema,
  aiChatRequestSchema,
  aiInputSchema,
  type AiChatMessage,
} from "@/lib/validations/ai";

export const runtime = "nodejs";
export const maxDuration = 30;

const DEFAULT_MODEL = "google/gemini-2.5-flash";

const isProduction = process.env.NODE_ENV === "production";

function parseBooleanEnv(value: string | undefined, fallback: boolean): boolean {
  if (!value) return fallback;

  const normalized = value.trim().toLowerCase();
  if (normalized === "1" || normalized === "true") return true;
  if (normalized === "0" || normalized === "false") return false;

  return fallback;
}

export async function POST(request: Request): Promise<NextResponse> {
  if (!process.env.VERCEL && !process.env.AI_GATEWAY_API_KEY) {
    return NextResponse.json(
      {
        error:
          "AI Gateway is not configured. Add AI_GATEWAY_API_KEY to your environment.",
      },
      { status: 503 }
    );
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const parsed = aiChatRequestSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid chat payload" },
      { status: 400 }
    );
  }

  const lastMessage = parsed.data.messages.at(-1);
  if (!lastMessage || lastMessage.role !== "user") {
    return NextResponse.json(
      { error: "The last message must be from the user" },
      { status: 400 }
    );
  }

  const inputValidation = aiInputSchema.safeParse({ text: lastMessage.content });
  if (!inputValidation.success) {
    return NextResponse.json(
      { error: inputValidation.error.issues[0]?.message ?? "Invalid input" },
      { status: 400 }
    );
  }

  const [profileResult, categoriesResult] = await Promise.all([
    supabase
      .from("profiles")
      .select("display_name, currency")
      .eq("id", user.id)
      .maybeSingle(),
    supabase
      .from("categories")
      .select("id, name, type")
      .order("sort_order", { ascending: true }),
  ]);

  if (profileResult.error) {
    return NextResponse.json(
      { error: "Failed to load profile context" },
      { status: 500 }
    );
  }

  if (categoriesResult.error) {
    return NextResponse.json(
      { error: "Failed to load category context" },
      { status: 500 }
    );
  }

  const categories = parseCategoryContext(categoriesResult.data ?? []);
  const { expenseCategories, incomeCategories } = splitCategoriesByType(categories);

  const shouldRecordRawTelemetry = parseBooleanEnv(
    process.env.AI_TELEMETRY_RECORD_CONTENT,
    !isProduction
  );

  const systemPrompt = buildAiChatSystemPrompt({
    displayName: profileResult.data?.display_name ?? null,
    currency: profileResult.data?.currency ?? null,
    expenseCategories,
    incomeCategories,
    currentDraft: parsed.data.currentDraft
      ? {
          type: parsed.data.currentDraft.type,
          amount: parsed.data.currentDraft.amount,
          category_name: parsed.data.currentDraft.category_name,
          description: parsed.data.currentDraft.description,
          date: parsed.data.currentDraft.date,
        }
      : null,
  });

  try {
    const model = gateway(process.env.AI_CHAT_MODEL ?? DEFAULT_MODEL);
    const result = await generateObject({
      model,
      system: [
        systemPrompt,
        "Use the draft object whenever a transaction draft is relevant.",
        "Do not include JSON blobs, field lists, or markdown draft tables in the message text.",
      ].join("\n"),
      messages: parsed.data.messages,
      schema: aiAssistantResponseSchema,
      schemaName: "ai_assistant_response",
      schemaDescription:
        "Response for Simplony AI chat with optional transaction draft payload.",
      experimental_telemetry: {
        isEnabled: true,
        functionId: "ai-chat",
        recordInputs: shouldRecordRawTelemetry,
        recordOutputs: shouldRecordRawTelemetry,
        metadata: {
          userId: user.id,
          environment: process.env.NODE_ENV,
          mode: "structured-only",
        },
      },
    });

    const draft = normalizeTransactionDraft(result.object.draft, categories);
    const missingFields = draft?.missing_fields ?? [];

    const text = draft
      ? missingFields.length === 0
        ? "I prepared a draft. Confirm to save, or tell me what to change."
        : `I drafted what I could. Please provide: ${missingFields.join(", ")}.`
      : result.object.message.trim();

    if (!text) {
      return NextResponse.json(
        { error: "The AI did not return a response" },
        { status: 502 }
      );
    }

    return NextResponse.json({
      message: {
        role: "assistant",
        content: text,
      } satisfies AiChatMessage,
      draft,
    });
  } catch (error) {
    Sentry.captureException(error, {
      tags: {
        functionId: "ai-chat",
      },
      extra: {
        userId: user.id,
        environment: process.env.NODE_ENV,
        telemetry: {
          recordInputs: shouldRecordRawTelemetry,
          recordOutputs: shouldRecordRawTelemetry,
        },
      },
    });

    console.error("AI chat request failed", error);

    return NextResponse.json(
      {
        error:
          "The assistant could not produce a structured response. Please try again with a shorter, clearer message.",
      },
      { status: 502 }
    );
  }
}
