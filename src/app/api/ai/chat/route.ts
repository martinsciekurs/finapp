import { generateText, gateway } from "ai";
import { createHash } from "node:crypto";
import { NextResponse } from "next/server";

import { buildAiChatSystemPrompt } from "@/lib/ai/chat";
import { createClient } from "@/lib/supabase/server";
import {
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

function pseudonymizeUserId(userId: string): string {
  return createHash("sha256").update(userId).digest("hex").slice(0, 16);
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
      .select("name, type")
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

  const categories = categoriesResult.data ?? [];
  const expenseCategories = categories
    .filter((category) => category.type === "expense")
    .map((category) => category.name);
  const incomeCategories = categories
    .filter((category) => category.type === "income")
    .map((category) => category.name);

  try {
    const shouldRecordRawTelemetry = parseBooleanEnv(
      process.env.AI_TELEMETRY_RECORD_CONTENT,
      !isProduction
    );

    const result = await generateText({
      model: gateway(process.env.AI_CHAT_MODEL ?? DEFAULT_MODEL),
      system: buildAiChatSystemPrompt({
        displayName: profileResult.data?.display_name ?? null,
        currency: profileResult.data?.currency ?? null,
        expenseCategories,
        incomeCategories,
      }),
      messages: parsed.data.messages,
      experimental_telemetry: {
        isEnabled: true,
        functionId: "ai-chat",
        recordInputs: shouldRecordRawTelemetry,
        recordOutputs: shouldRecordRawTelemetry,
        metadata: {
          userHash: pseudonymizeUserId(user.id),
          environment: process.env.NODE_ENV,
        },
      },
    });

    const text = result.text.trim();

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
    });
  } catch (error) {
    console.error("AI chat request failed", error);

    return NextResponse.json(
      {
        error:
          "The AI assistant is unavailable right now. Please try again in a moment.",
      },
      { status: 500 }
    );
  }
}
