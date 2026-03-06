import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import type {
  GroupedOccurrences,
  ReminderData,
  ReminderOccurrence,
} from "@/lib/types/reminder";
import type { CategoryOption } from "@/lib/types/transactions";

// Mock server actions
vi.mock("@/app/dashboard/reminders/actions", () => ({
  createReminder: vi.fn().mockResolvedValue({ success: true }),
  updateReminder: vi.fn().mockResolvedValue({ success: true }),
  deleteReminder: vi.fn().mockResolvedValue({ success: true }),
  markOccurrencePaid: vi.fn().mockResolvedValue({ success: true }),
  markOccurrenceUnpaid: vi.fn().mockResolvedValue({ success: true }),
}));

// Shared mocks
vi.mock("framer-motion", async () => import("@/test/mocks/framer-motion"));
vi.mock("@/components/ui/category-icon", async () => import("@/test/mocks/category-icon"));
vi.mock("@/components/attachments/attachments", () => ({
  Attachments: () => <div data-testid="attachments" />,
}));

// Mock next/navigation
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
}));

import { ReminderList } from "../reminder-list";

// ---------------------------------------------------------------------------
// Test data helpers
// ---------------------------------------------------------------------------

function makeOccurrence(overrides: Partial<ReminderOccurrence> = {}): ReminderOccurrence {
  return {
    reminder_id: "r1",
    title: "Test Reminder",
    amount: 100,
    due_date: "2026-04-01",
    frequency: "monthly",
    auto_create_transaction: true,
    category_id: "cat-1",
    category_name: "Bills",
    category_icon: "banknote",
    category_color: "#FF5722",
    status: "upcoming",
    payment_id: null,
    paid_at: null,
    days_diff: 10,
    attachments: [],
    ...overrides,
  };
}

function makeTemplate(overrides: Partial<ReminderData> = {}): ReminderData {
  return {
    id: "r1",
    title: "Test Reminder",
    amount: 100,
    due_date: "2026-04-01",
    frequency: "monthly",
    auto_create_transaction: true,
    category_id: "cat-1",
    category_name: "Bills",
    category_icon: "banknote",
    category_color: "#FF5722",
    attachments: [],
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const emptyData: GroupedOccurrences = {
  overdue: [],
  upcoming: [],
  paid: [],
};

const categories: CategoryOption[] = [
  { id: "cat-1", name: "Bills", icon: "banknote", color: "#FF5722", type: "expense", group_id: "g1", group_name: "Essential" },
  { id: "cat-2", name: "Subscriptions", icon: "repeat", color: "#2196F3", type: "expense", group_id: "g1", group_name: "Essential" },
];

const sampleData: GroupedOccurrences = {
  overdue: [
    makeOccurrence({
      reminder_id: "r1",
      title: "Electricity Bill",
      amount: 75,
      due_date: "2026-02-15",
      category_id: "cat-1",
      category_name: "Bills",
      category_icon: "banknote",
      category_color: "#FF5722",
      status: "overdue",
      days_diff: -18,
    }),
  ],
  upcoming: [
    makeOccurrence({
      reminder_id: "r2",
      title: "Rent",
      amount: 800,
      due_date: "2026-04-01",
      category_id: "cat-1",
      category_name: "Bills",
      category_icon: "banknote",
      category_color: "#FF5722",
      status: "upcoming",
      days_diff: 27,
    }),
    makeOccurrence({
      reminder_id: "r3",
      title: "Netflix",
      amount: 15.99,
      due_date: "2026-04-05",
      category_id: "cat-2",
      category_name: "Subscriptions",
      category_icon: "repeat",
      category_color: "#2196F3",
      status: "upcoming",
      days_diff: 31,
    }),
  ],
  paid: [
    makeOccurrence({
      reminder_id: "r4",
      title: "Annual Insurance",
      amount: 1200,
      due_date: "2026-01-15",
      frequency: "one_time",
      category_id: "cat-1",
      category_name: "Bills",
      category_icon: "banknote",
      category_color: "#FF5722",
      status: "paid",
      payment_id: "pay-1",
      paid_at: "2026-01-15T10:00:00Z",
      days_diff: -49,
    }),
  ],
};

const sampleReminders: ReminderData[] = [
  makeTemplate({
    id: "r1",
    title: "Electricity Bill",
    amount: 75,
    due_date: "2026-02-15",
    category_id: "cat-1",
    category_name: "Bills",
    category_icon: "banknote",
    category_color: "#FF5722",
  }),
  makeTemplate({
    id: "r2",
    title: "Rent",
    amount: 800,
    due_date: "2026-04-01",
    category_id: "cat-1",
    category_name: "Bills",
    category_icon: "banknote",
    category_color: "#FF5722",
  }),
  makeTemplate({
    id: "r3",
    title: "Netflix",
    amount: 15.99,
    due_date: "2026-04-05",
    category_id: "cat-2",
    category_name: "Subscriptions",
    category_icon: "repeat",
    category_color: "#2196F3",
  }),
  makeTemplate({
    id: "r4",
    title: "Annual Insurance",
    amount: 1200,
    due_date: "2026-01-15",
    frequency: "one_time",

  }),
];

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("ReminderList", () => {
  it("shows empty state when no reminders exist", () => {
    render(
      <ReminderList
        data={emptyData}
        reminders={[]}
        categories={categories}
        currency="USD"
      />
    );
    expect(screen.getByText("No reminders yet")).toBeInTheDocument();
  });

  it("shows Add Reminder button in empty state", () => {
    render(
      <ReminderList
        data={emptyData}
        reminders={[]}
        categories={categories}
        currency="USD"
      />
    );
    const addButtons = screen.getAllByText("Add Reminder");
    expect(addButtons.length).toBeGreaterThanOrEqual(1);
  });

  it("renders Overdue section with correct count", () => {
    render(
      <ReminderList
        data={sampleData}
        reminders={sampleReminders}
        categories={categories}
        currency="USD"
      />
    );
    expect(screen.getByText("Overdue (1)")).toBeInTheDocument();
  });

  it("renders Upcoming section with correct count", () => {
    render(
      <ReminderList
        data={sampleData}
        reminders={sampleReminders}
        categories={categories}
        currency="USD"
      />
    );
    expect(screen.getByText("Upcoming (2)")).toBeInTheDocument();
  });

  it("renders Paid section with correct count", () => {
    render(
      <ReminderList
        data={sampleData}
        reminders={sampleReminders}
        categories={categories}
        currency="USD"
      />
    );
    expect(screen.getByText("Paid (1)")).toBeInTheDocument();
  });

  it("renders reminder titles", () => {
    render(
      <ReminderList
        data={sampleData}
        reminders={sampleReminders}
        categories={categories}
        currency="USD"
      />
    );
    expect(screen.getByText("Electricity Bill")).toBeInTheDocument();
    expect(screen.getByText("Rent")).toBeInTheDocument();
    expect(screen.getByText("Netflix")).toBeInTheDocument();
    expect(screen.getByText("Annual Insurance")).toBeInTheDocument();
  });

  it("renders frequency badges", () => {
    render(
      <ReminderList
        data={sampleData}
        reminders={sampleReminders}
        categories={categories}
        currency="USD"
      />
    );
    const monthlyBadges = screen.getAllByText("Monthly");
    expect(monthlyBadges.length).toBe(3); // 3 monthly reminders
    expect(screen.getByText("One-time")).toBeInTheDocument();
  });

  it("renders category badges for reminders with categories", () => {
    render(
      <ReminderList
        data={sampleData}
        reminders={sampleReminders}
        categories={categories}
        currency="USD"
      />
    );
    const billsBadges = screen.getAllByText("Bills");
    expect(billsBadges.length).toBe(3); // Electricity + Rent + Annual Insurance
    expect(screen.getByText("Subscriptions")).toBeInTheDocument();
  });

  it("renders Mark Paid button for unpaid reminders only", () => {
    render(
      <ReminderList
        data={sampleData}
        reminders={sampleReminders}
        categories={categories}
        currency="USD"
      />
    );
    const markPaidButtons = screen.getAllByText("Mark Paid");
    // 3 unpaid occurrences (1 overdue + 2 upcoming), 1 paid shows Undo instead
    expect(markPaidButtons).toHaveLength(3);
  });

  it("does not show section when no reminders in that group", () => {
    const dataNoOverdue: GroupedOccurrences = {
      overdue: [],
      upcoming: sampleData.upcoming,
      paid: [],
    };
    render(
      <ReminderList
        data={dataNoOverdue}
        reminders={sampleReminders}
        categories={categories}
        currency="USD"
      />
    );
    expect(screen.queryByText(/Overdue \(/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Paid \(/)).not.toBeInTheDocument();
    expect(screen.getByText("Upcoming (2)")).toBeInTheDocument();
  });

  it("renders page heading", () => {
    render(
      <ReminderList
        data={sampleData}
        reminders={sampleReminders}
        categories={categories}
        currency="USD"
      />
    );
    expect(screen.getByText("Reminders")).toBeInTheDocument();
    expect(
      screen.getByText("Upcoming bills and due dates")
    ).toBeInTheDocument();
  });
});
