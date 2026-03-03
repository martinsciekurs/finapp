# AI & Voice

## Voice Input

In-app voice input for quick transaction entry, especially on mobile. Uses AI-powered transcription for accuracy and language flexibility.

### Implementation
- Record audio in the browser using the **MediaRecorder API** (`audio/webm` or `audio/mp4` depending on browser support).
- A microphone button appears next to the transaction input (or as a floating action button on mobile).
- Press to start recording. Pulsing animation on the mic icon while listening.
- **60-second hard cap**: A circular countdown timer around the mic icon shows remaining time. At 60 seconds, recording auto-stops and submits. No silence detection - keep it simple.
- Audio blob is sent to `POST /api/ai/transcribe` which uses the **Gemini model's audio input** capabilities via Vercel AI SDK to transcribe the speech. This gives us a single AI provider for both transcription and transaction parsing.
- The transcription endpoint can optionally combine transcription + transaction parsing into a single LLM call: send the audio, get back structured transaction data directly (amount, type, category, description, date). This saves a round-trip compared to transcribe-then-parse.
- If the combined approach is used, the result populates the `TransactionForm` fields with `AiSuggestChip` confirmation, same as the text flow.
- Fallback: If combined parsing fails or user just wants transcription, the plain transcript is inserted into the `TransactionForm` input field, triggering the normal text-based AI suggestion flow.

### UX States
1. **Idle**: Mic icon, muted color. Tap to start.
2. **Recording**: Mic icon pulses, circular timer counts down from 60s. Tap again to stop early and submit.
3. **Processing**: Spinner replaces mic icon. "Transcribing..." label.
4. **Done**: Result appears in `TransactionForm` with `AiSuggestChip` for confirmation. Mic returns to idle.
5. **Error**: Toast with "Couldn't transcribe - try again" message. Mic returns to idle.

### Considerations
- MediaRecorder API requires HTTPS (fine on Vercel) and a user gesture to start.
- Browser support: Chrome, Edge, Safari (iOS 14.5+), Firefox. Much broader than Web Speech API since we're not relying on the browser's speech recognition.
- Audio is not stored - it is streamed to the transcription endpoint and discarded after processing.
- Language: Gemini handles multilingual audio natively. No language config needed.
- The transcribed text (or the combined result) still goes through the same 100-word input validation before any DB writes.
- Each voice transcription costs 1 AI credit.

---

## AI Integration (Vercel AI SDK)

Provider-agnostic via Vercel AI SDK. Start with **Google Gemini 3.1 Pro Preview** (`gemini-3.1-pro-preview`) as the primary model - strong at thinking, structured output, tool usage, and multi-step execution. Optimized for software engineering and agentic workflows. 1M token input context, 65K output. Can swap to OpenAI, Anthropic, or others without code changes.

### Strict Input Limits

All AI inputs are validated before sending to the LLM:
- **Maximum 100 words** per message. Reject with a clear inline error if exceeded ("Keep it short - 100 words max").
- **Maximum 1000 characters** hard cap (safety net for languages with long words).
- Validation enforced both client-side (prevent submission) and server-side (reject at API route).
- Defined in `lib/validations/ai.ts` as a shared Zod schema.

### System Prompt Context

Every AI call includes a system prompt with user-specific context. The context varies by endpoint but follows a common structure:

**Base context** (included in every AI call):
- User's currency (e.g., "EUR")
- Today's date (for relative date parsing like "yesterday", "last Friday")
- User's expense categories (names + IDs, so the AI can match against them)
- User's income categories (names + IDs)
- User's AI memory rules (all auto + manual rules, up to the tier limit)

**Per-endpoint additions**:

| Endpoint             | Additional Context                                          |
| -------------------- | ----------------------------------------------------------- |
| `/api/ai/suggest`    | Base only. Lightweight — runs on every keystroke (debounced). |
| `/api/ai/action`     | Base + user's active debts (counterparty names + remaining amounts, for debt payment matching) + last 5 transactions (for continuity, e.g., "same as yesterday"). |
| `/api/ai/transcribe` | Base only. Audio is sent as input; response is structured transaction data. |
| Telegram webhook     | Base + last 5 conversation messages from `telegram_sessions` + active debts (same as action). |
| Memory synthesis     | All current `ai_memories` rules (with IDs and source labels) + the correction context. No transaction/debt data needed. Returns structured actions (add/update/delete), not a full replacement. |

The system prompt is assembled server-side in a shared helper (e.g., `lib/ai/build-context.ts`) to keep it consistent. Categories and memories are fetched from DB on each call (they're small queries). The prompt instructs the AI to: use the user's existing categories (never invent new ones), respect memory rules, default to today's date if none is mentioned, and always return structured output matching the Zod schema.

### AI Credits

All AI interactions use a unified credit system instead of per-feature counters. Each of the following costs **1 credit**:
- Inline transaction suggestion (`/api/ai/suggest`)
- AI action - create transaction (expense/income) or record debt payment (`/api/ai/action`)
- Voice transcription (`/api/ai/transcribe`)
- Telegram AI message (text, voice, or image parsing)

Credit usage tracked in `daily_usage` table: `UPSERT ... SET credits_used = credits_used + 1 WHERE credits_used < limit`. Atomic - no race conditions.

| Tier | Daily AI Credits |
| ---- | ---------------- |
| Free | 15               |
| Pro  | 500 (hidden cap) |

### Inline Transaction Suggestions (Web + Voice)

When a user types (or dictates via voice) in the `TransactionForm`, AI assists in real-time:
- User types natural text: `"45 euros lunch with the team yesterday"` or `"received 200 from client"`
- AI suggests: amount=45, type=expense, category=Food/Dining, description="Lunch with the team", date=yesterday (or: amount=200, type=income, category=Freelance, description="Client payment", date=today)
- Suggestions appear as subtle `AiSuggestChip` pills below the input fields, pre-filling form fields with a slight fade-in animation
- User can accept (click/tab) or ignore (keep typing)
- **Debounce**: Triggers after **800ms of no typing**, only when input meets minimum criteria: at least 2 words **and** contains at least one number (e.g., "45 lunch" qualifies, "hello" does not). This prevents firing on incomplete fragments while being responsive enough for natural input.
- **Endpoint**: `POST /api/ai/suggest` - uses Zod schema + structured output (JSON mode) for reliable parsing. Output includes a `type` field (`'expense' | 'income'`) so the AI distinguishes between spending and receiving.

### AI Actions (Web + Telegram)

AI can perform actions on the user's behalf. **The AI auto-classifies the user's intent from the text** - the user does not manually select an action type. The AI determines whether the input is a transaction (expense or income), a debt payment, or a query.

Supported actions:

1. **Create transaction** - Parse natural text into a structured transaction (expense or income) and save it. AI extracts amount, type (expense/income), category (matched against user's existing categories of the correct type), description, and date. Returns a confirmation the user must approve before saving. Examples: "45 lunch" → expense; "received 500 salary" → income; "refund 20 from Amazon" → income.

2. **Record debt payment** - Parse text like "paid John 50" or "Julie paid her debt 50" into a debt payment **plus a linked transaction**. AI matches the counterparty name against existing debts, determines direction, and records the payment. "paid John 50" → expense transaction (Debt Payment category) + debt payment reducing what I owe John. "Julie paid me 50" → income transaction (Debt Repayment category) + debt payment reducing what Julie owes me. If no matching debt exists for the counterparty, the AI asks the user to create one first. Returns confirmation before saving.

3. **Query data** - Answer questions like "how much did I spend this week?" or "what's my income this month?" by querying the user's data via tool calls. Returns a text response.

All write actions use structured output (Zod schemas) and require explicit user confirmation before writing to DB. No silent writes.

**Endpoint**: `POST /api/ai/action` - receives natural text, AI classifies intent and returns appropriate structured result.

### Telegram Bot

A Telegram bot (built with Grammy framework) for on-the-go input and queries. Supports text, voice messages, and images. Pro-tier feature.

**Bot commands** (registered via `bot.api.setMyCommands`):

| Command     | Description                                          |
| ----------- | ---------------------------------------------------- |
| `/start`    | Welcome message + instructions. If not linked, explains how to connect. If linked, shows a quick summary. |
| `/help`     | Lists what the bot can do: text, voice, photos. Shows examples. |
| `/balance`  | Replies with this month's spending total, income total, and net balance. |
| `/cancel`   | Cancels any pending confirmation (clears `pending_action`). |
| `/unlink`   | Disconnects the Telegram account (deletes `telegram_sessions` row). Confirms before acting. |

Any non-command text is treated as a natural language input and routed to the AI action flow.

**Input types:**

- **Text message**: User sends `"30 groceries"` or `"received 200 from client"` -> bot parses via AI (auto-classifies intent and transaction type), asks for confirmation via inline keyboard buttons (Yes / Edit / Cancel), saves on confirmation. Same 100-word input limit applies.
- **Voice message**: User sends a Telegram voice note -> bot downloads the `.oga` audio file (Telegram stores voice messages as Ogg Opus), sends to Gemini for transcription + transaction parsing (same combined flow as in-app voice input). Confirms before saving. **Max 60 seconds** - if the voice message exceeds 60 seconds, the bot replies with: "Voice messages up to 60 seconds are supported. Please send a shorter message." The audio file is **not stored** - it's streamed to Gemini and discarded after transcription, same as in-app voice. The transcription text is preserved as part of the conversation in `telegram_sessions.messages`.
- **Image / photo**: User sends a photo (e.g., a receipt) with an optional caption -> bot uses Gemini's vision capabilities to extract transaction details from the image (amount, vendor, date, type). The image is **stored as an attachment** on the created transaction in Supabase Storage (downloaded from Telegram's servers via `getFile` API, then uploaded to the `attachments` bucket). If a caption is provided, it's used as additional context for parsing. If parsing fails, the image is still saved and the user is asked to provide details manually.

**Account linking flow:**

Account linking connects a Telegram `chat_id` to a finapp `user_id`. It happens once per user:

1. User navigates to `/dashboard/settings` -> "Telegram" section -> clicks "Connect Telegram".
2. App generates a random 6-character alphanumeric code, stores it in the `profiles` table (with a 10-minute expiry timestamp), and displays it to the user with instructions: "Send this code to @FinAppBot on Telegram."
3. User opens Telegram, finds the bot, sends the code as a message.
4. Bot webhook receives the code, looks up the matching profile, validates the code hasn't expired, and saves the `chat_id` to `telegram_sessions.chat_id` + `user_id`.
5. Bot responds: "Connected! You can now add expenses by sending me a message."
6. Settings page polls or uses a realtime subscription to detect when linking completes, and updates the UI to show "Connected" status.
7. User can disconnect anytime from settings (deletes the `telegram_sessions` row).

**Conversation state:**

Grammy uses a **Supabase-backed session storage adapter** (`telegram_sessions` table) for reliable conversation context across serverless cold starts.

- Every message (user + bot response) is appended to the `messages` JSONB array in the session row for that `chat_id`. Voice transcriptions are stored as text messages (prefixed with "[Voice]:" for clarity). Image descriptions are stored similarly (prefixed with "[Photo]:").
- On each new message, Grammy loads the session, the handler fetches the **last 5 messages** from the array, and includes them as conversation history in the Gemini call. 5 messages is sufficient for immediate conversational continuity (confirmation flows, corrections, follow-ups) while keeping token usage and latency low.
- This enables natural follow-ups: "30 groceries" -> "yes" -> "also 15 coffee" -> "wait, make that 20".
- Pending confirmations (parsed transaction awaiting yes/no) are stored in the `pending_action` JSONB field.
- Messages are **never pruned** - the full history is retained for potential analytics or future features. Only the last 5 are loaded into LLM context.

### AI Memories (Per-User Learning)

The AI improves per user over time by learning their categorization preferences. Instead of mechanical keyword extraction, the **LLM itself synthesizes and manages memory rules**, producing more nuanced and context-aware learning.

**Auto-learning flow**:

1. User types in `TransactionForm` → AI suggests a category via `AiSuggestChip` (e.g., "Snacks" for "50 chocolate at store").
2. The AI-suggested category ID is stored temporarily in the form state (`aiSuggestedCategoryId`).
3. User changes the category from "Snacks" to "Groceries" and clicks Save.
4. The Server Action creates the transaction, then detects the correction (`aiSuggestedCategoryId !== savedCategoryId`).
5. If they differ, the Server Action fires a **background LLM synthesis call**:
   - Input: the user's current `ai_memories` rules (all of them, with IDs and source labels) + the correction context (description: "chocolate at store", AI suggested: "Snacks", user chose: "Groceries").
   - Prompt: *"Here are the user's current memory rules (with IDs). The user just categorized '[description]' as '[category]' — the AI had suggested '[old_category]'. Return only the changes needed. You may add new rules, update existing auto rules, merge overlapping auto rules (delete + add), or leave everything unchanged. Never modify or delete rules marked as [manual]."*
   - Output: a structured list of actions (Zod-validated), each one of:
     - `{ "action": "add", "rule": "..." }` — insert a new auto rule
     - `{ "action": "update", "id": "...", "rule": "..." }` — update an existing auto rule's text
     - `{ "action": "delete", "id": "..." }` — remove an existing auto rule (e.g., merged into another)
6. The Server Action applies each action individually to the `ai_memories` table. Only `source = 'auto'` rules can be updated or deleted by the LLM; manual rules are protected. Invalid IDs or attempts to touch manual rules are silently skipped.
7. Next time the AI runs, these rules are in the system prompt and it produces better suggestions.

This approach lets the LLM produce nuanced rules like *"When the user buys chocolate or sweets at a store, categorize as Groceries — but chocolate at a cinema is Entertainment"* rather than a flat `chocolate → Groceries` mapping. The LLM handles deduplication and conflict resolution naturally during synthesis, and the structured diff keeps changes safe and auditable — no wholesale replacement of rules.

**Cost**: Each synthesis call costs **1 AI credit**. It runs only when a correction is detected (not on every save), and runs in the background — the user doesn't wait for it.

**Manual rules**: In `/dashboard/settings`, an "AI Preferences" section shows a simple list of learned rules. Users can:
- View all rules with a badge showing source (auto/manual)
- Delete rules they don't want
- Add manual rules via a simple inline text field (e.g., "Always categorize Uber rides as Transport"). Manual rules are marked `source = 'manual'` and are never modified by the LLM synthesis.

**How rules are used**:
- Before every AI call (suggest, action, transcribe), the user's rules (max 50 on Pro, 20 on Free) are fetched and injected into the system prompt as context.
- Rules are free-text strings. The LLM interprets them naturally — no structured parsing needed.
- `source` field tracks whether a rule was `auto` (LLM-synthesized from corrections) or `manual` (user-created).
