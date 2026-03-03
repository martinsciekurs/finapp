# Implementation Plan

# Project Specification: Personal Finance Dashboard

**Target Audience**: Busy Young Professionals

**Core Philosophy**: Clean, fast, inline-first UX with a warm, sophisticated aesthetic. AI-augmented where it genuinely helps. Subtle animations that make the experience feel alive. Mobile-first, installable as a PWA.

---

## Plan Structure

The full implementation plan is split into the following documents:

### [1. Design & UI](plan/01-design-and-ui.md)
Color palette, typography, animations, dark mode, application structure (file tree + routing), responsive layout, all UI components and screens, hero banner system, and reference examples.

### [2. Database & Authentication](plan/02-database-and-auth.md)
Complete Supabase schema (16 migrations), timestamps convention, currency handling, roles & permissions (admin/user), RLS policies, authentication flow (no email confirmation), route protection middleware, onboarding wizard, and guided tour.

### [3. AI & Voice](plan/03-ai-and-voice.md)
Voice input (MediaRecorder + Gemini transcription), AI integration via Vercel AI SDK (provider-agnostic), strict input limits, system prompt context, AI credits, inline transaction suggestions, AI actions (auto-classify intent), Telegram bot (text/voice/image, account linking, conversation state), and AI memories (LLM-synthesized per-user learning).

### [4. Features](plan/04-features.md)
Debts tracking (with linked transactions), file attachments (reusable across record types), notifications & reminders (per-channel email/in-app toggles, recurring lifecycle, Resend + Vercel Cron), billing & plan limits (free/pro tiers, Stripe, enforcement, promo codes), and data export & account deletion.

### [5. Infrastructure](plan/05-infrastructure.md)
Tech stack overview, PWA configuration, environment variables, technical notes (state management, pagination, search, Supabase type generation, SEO), and rationale for choosing Supabase.

### [6. Testing & Roadmap](plan/06-testing-and-roadmap.md)
Testing strategy (unit, integration, E2E), coverage targets, and the 5-phase implementation roadmap (Foundation → Core App → AI & Intelligence → Monetization & Notifications → Optimization).
