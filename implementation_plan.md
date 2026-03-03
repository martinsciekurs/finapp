# Implementation plan

# Project Specification: Personal Finance Dashboard
**Target Audience**: Busy Young Professionals
**Core Philosophy**: Clean, fast, inline-first UX with a warm, sophisticated aesthetic.
* * *
## 1\. Design & Aesthetic Direction
The application will move away from "tech-cold" blues and whites toward a warm, earthy palette that feels grounded and premium.
### Color Palette

| Role | Hex Code | Usage |
| ---| ---| --- |
| Background | `#fdf6ee` | Main page background (Warm Cream) |
| Card | `#ffffff` | Surface areas and containers |
| Primary | `#2d4a3e` | Buttons, active states (Dark Olive) |
| Accent | `#c9a84c` | Chart highlights, gold accents |
| Muted | `#f5ede0` | Secondary backgrounds (Light Beige) |
| Foreground | `#1a1a1a` | High-contrast body text |
| Destructive | `#dc3545` | Error states and delete actions |

### Typography
*   Headings: `Playfair Display` (Serif) – Adds an elegant, editorial feel.
*   Body: `Geist Sans` (Sans-serif) – Maintains readability and modern speed.
* * *
## 2\. Database Schema (Supabase)
The backend uses Supabase with Row Level Security (RLS) enabled on all tables to ensure data privacy.
### Migration Sequence
1. `001_profiles.sql`: Extends `auth.users` with `display_name`, `currency`, and `monthly_budget`.
2. `002_trigger.sql`: Automation to create a profile entry immediately upon user signup.
3. `003_categories.sql`: User-defined budget buckets (e.g., Food, Transport).
4. `004_expenses.sql`: Transactional data linked to categories and users.
5. `005_reminders.sql`: Tracking for bills, EMIs, and recurring payments.
6. `006_seeds.sql`: Default category injection (Food, Bills, etc.) for new users.
* * *
## 3\. Authentication & Routing
The dashboard uses a standard Supabase Auth scaffold. All `/dashboard/*` routes are protected by middleware.
### Auth File Mapping

| Source Reference | Destination Path |
| ---| --- |
| `lib/supabase/client.ts` | Browser-side client initialization |
| `lib/supabase/server.ts` | Server-side client for SSR/Actions |
| `middleware.ts` | Session validation and route protection |

### Auth Pages

*   `/auth/login`: Email/Password entry with a hero image background.
*   `/auth/sign-up`: Account creation with display name capture.
*   `/auth/sign-up-success`: Post-registration "Check your email" landing.
* * *
## 4\. Application Structure

```plain
app/
├── layout.tsx             # Root: Fonts, Global CSS, Providers
├── page.tsx               # Logic: Redirect to /dashboard or /auth/login
├── auth/                  # Authentication route group
└── dashboard/             # Protected route group
    ├── layout.tsx         # Dashboard Shell: Hero Banner + Floating Nav
    ├── page.tsx           # Overview: Summary Cards + Charts
    ├── expenses/          # CRUD: Expense List + Inline Add
    ├── budget/            # Management: Category Cards + Progress
    ├── reminders/         # Tracking: Bills + Due Dates
    └── settings/          # Profile: Preferences + Sign Out
```

* * *
## 5\. UI Layout & Key Components
### The Dashboard Shell
*   Hero Banner: A full-width nature-inspired image (Greens/Golds) at the top of the dashboard with a serif title overlay.
*   Floating Navigation: A mobile-friendly "pill" bar fixed at the bottom. Features semi-transparent backdrop blur and Lucide icons.
### Core Components

| Component | Function |
| ---| --- |
| `BottomNav` | Floating navigation with active state labels. |
| `SummaryCard` | Displays "Total Spent," "Weekly Average," and "Reminders." |
| `BudgetChart` | Recharts-powered bar chart comparing Budget vs. Actual. |
| `ExpenseForm` | Ultra-fast inline input row for adding expenses without modals. |
| `InlineEdit` | Click-to-edit pattern for budgets and profile details. |

## 6\. Implementation Roadmap
1. Database Layer: Execute SQL migrations and verify RLS policies.
2. Authentication: Implement Supabase middleware and branded auth pages.
3. Styling: Configure `globals.css` with the earthy palette and typography.
4. Core Layout: Build the Hero Banner and Floating Bottom Nav.
5. Feature Build-out:
  *   Dashboard: Connect Recharts to live Supabase data.
  *   Expenses: Build the inline "Add" row and grouped list.
  *   Budget/Reminders: Implement progress bars and "Mark as Paid" logic.
6. Optimization: Add `Sonner` toasts and `Skeleton` loading states.
* * *
## 7\. Technical Notes
*   State Management: Rely on React state and Server Components; no heavy external stores.
*   Performance: Use Optimistic Updates for inline editing to make the app feel "local-first."
    Libraries: `date-fns` (formatting), `lucide-react` (icons), `recharts` (viz).

Examples: Here are some examples, but you don't have to follow strictly. Make it better.

![](https://t9012383169.p.clickup-attachments.com/t9012383169/8cf23b2a-fe2c-4218-8abe-9da859050544/image.png)
![](https://t9012383169.p.clickup-attachments.com/t9012383169/2d5e5ec0-1d65-415c-9cef-c61ca6356b09/image.png)
![](https://t9012383169.p.clickup-attachments.com/t9012383169/1acae7d0-89fd-4f1a-a315-d3126bbb4483/image.png)
![](https://t9012383169.p.clickup-attachments.com/t9012383169/69c6a77f-07ec-4980-ae29-4d8ff89b728b/image.png)
![](https://t9012383169.p.clickup-attachments.com/t9012383169/ce06cbac-2ac4-4982-bb76-ee321bc96cdd/image.png)
![](https://t9012383169.p.clickup-attachments.com/t9012383169/c2e40225-159c-4161-ad24-e4a311a01a2c/image.png)![](https://t9012383169.p.clickup-attachments.com/t9012383169/94b7d2fe-094d-4bbb-b7c4-e574a0433498/image.png)
