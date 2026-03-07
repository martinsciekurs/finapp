import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { AiPanel } from "../ai-panel";

const closeMock = vi.fn();
const fetchMock = vi.fn();
const createTransactionMock = vi.fn();
const toastSuccessMock = vi.fn();
let pathnameMock = "/dashboard";

vi.mock("next/navigation", () => ({
  usePathname: () => pathnameMock,
}));

vi.mock("../ai-panel-provider", () => ({
  useAiPanel: () => ({
    open: true,
    close: closeMock,
  }),
}));

vi.mock("@/app/dashboard/transactions/actions", () => ({
  createTransaction: (...args: unknown[]) => createTransactionMock(...args),
}));

vi.mock("sonner", () => ({
  toast: {
    success: (...args: unknown[]) => toastSuccessMock(...args),
  },
}));

describe("AiPanel", () => {
  beforeEach(() => {
    closeMock.mockClear();
    fetchMock.mockReset();
    createTransactionMock.mockReset();
    toastSuccessMock.mockReset();
    pathnameMock = "/dashboard";
    window.localStorage.clear();
    vi.stubGlobal("fetch", fetchMock);
  });

  it("restores chat session from localStorage", async () => {
    window.localStorage.setItem(
      "dashboard.aiPanel.messages",
      JSON.stringify([
        {
          role: "assistant",
          content: "Welcome back!",
          draft: null,
          draftStatus: null,
        },
        {
          role: "user",
          content: "Show me my draft",
          draft: null,
          draftStatus: null,
        },
      ])
    );

    render(<AiPanel />);

    await waitFor(() => {
      expect(screen.getByText("Welcome back!")).toBeInTheDocument();
    });
    expect(screen.getByText("Show me my draft")).toBeInTheDocument();
  });

  it("renders the starter assistant message", () => {
    render(<AiPanel />);

    expect(screen.getByText("AI Assistant")).toBeInTheDocument();
    expect(
      screen.getByText(
        "Hi! Ask about budgeting, saving ideas, or tell me to add a transaction in natural language."
      )
    ).toBeInTheDocument();
  });

  it("renders a mobile overlay backdrop and closes from it", async () => {
    const user = userEvent.setup();

    render(<AiPanel />);

    await user.click(screen.getByRole("button", { name: "Close AI panel overlay" }));

    expect(closeMock).toHaveBeenCalledTimes(1);
  });

  it("shows a validation error when the input is too long", async () => {
    const user = userEvent.setup();

    render(<AiPanel />);

    await user.type(
      screen.getByLabelText("Ask AI Assistant"),
      Array.from({ length: 101 }, () => "word").join(" ")
    );
    await user.click(screen.getByRole("button", { name: "Send message" }));

    expect(
      screen.getByText("Input must be at most 100 words")
    ).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("autofocuses the input on open, after response, and on route change", async () => {
    const user = userEvent.setup();

    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({
        message: {
          role: "assistant",
          content: "Got it.",
        },
      }),
    });

    const { rerender } = render(<AiPanel />);

    await waitFor(() => {
      expect(screen.getByLabelText("Ask AI Assistant")).toHaveFocus();
    });

    await user.type(screen.getByLabelText("Ask AI Assistant"), "Help me budget");
    await user.click(screen.getByRole("button", { name: "Send message" }));

    await waitFor(() => {
      expect(screen.getByLabelText("Ask AI Assistant")).toHaveFocus();
    });

    pathnameMock = "/dashboard/transactions";
    rerender(<AiPanel />);

    await waitFor(() => {
      expect(screen.getByLabelText("Ask AI Assistant")).toHaveFocus();
    });
  });

  it("submits a message and renders the assistant reply", async () => {
    const user = userEvent.setup();

    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({
        message: {
          role: "assistant",
          content: "Try reviewing your Food and Transport categories first.",
        },
      }),
    });

    render(<AiPanel />);

    await user.type(screen.getByLabelText("Ask AI Assistant"), "How can I cut spending?");
    await user.click(screen.getByRole("button", { name: "Send message" }));

    expect(fetchMock).toHaveBeenCalledTimes(1);

    await waitFor(() => {
      expect(
        screen.getByText("Try reviewing your Food and Transport categories first.")
      ).toBeInTheDocument();
    });

    const [, requestInit] = fetchMock.mock.calls[0] ?? [];
    expect(fetchMock.mock.calls[0]?.[0]).toBe("/api/ai/chat");
    expect(requestInit).toMatchObject({
      method: "POST",
      headers: { "Content-Type": "application/json" },
    });
    expect(JSON.parse(String(requestInit?.body))).toMatchObject({
      messages: [
        {
          role: "assistant",
          content:
            "Hi! Ask about budgeting, saving ideas, or tell me to add a transaction in natural language.",
        },
        {
          role: "user",
          content: "How can I cut spending?",
        },
      ],
    });
  });

  it("renders markdown formatting in assistant replies", async () => {
    const user = userEvent.setup();

    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({
        message: {
          role: "assistant",
          content:
            "I can assist with **Budgeting tips** and **Saving ideas**.\n\n- Track subscriptions\n- Set a weekly limit",
        },
      }),
    });

    render(<AiPanel />);

    await user.type(screen.getByLabelText("Ask AI Assistant"), "help");
    await user.click(screen.getByRole("button", { name: "Send message" }));

    await waitFor(() => {
      expect(screen.getByText("Budgeting tips", { selector: "strong" })).toBeInTheDocument();
    });

    expect(screen.getByText("Track subscriptions")).toBeInTheDocument();
    expect(screen.queryByText(/\*\*Budgeting tips\*\*/)).not.toBeInTheDocument();
  });

  it("clears chat history with the clear button", async () => {
    const user = userEvent.setup();

    render(<AiPanel />);

    await user.type(screen.getByLabelText("Ask AI Assistant"), "Hello there");
    await user.click(screen.getByRole("button", { name: "Send message" }));

    expect(screen.getByText("Hello there")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Clear chat history" }));

    expect(screen.queryByText("Hello there")).not.toBeInTheDocument();
    expect(
      screen.getByText(
        "Hi! Ask about budgeting, saving ideas, or tell me to add a transaction in natural language."
      )
    ).toBeInTheDocument();
    expect(window.localStorage.getItem("dashboard.aiPanel.messages")).toContain(
      "Hi! Ask about budgeting, saving ideas, or tell me to add a transaction in natural language."
    );
  });

  it("renders a transaction draft card and confirms it", async () => {
    const user = userEvent.setup();

    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({
        message: {
          role: "assistant",
          content: "I drafted this transaction.",
        },
        draft: {
          type: "expense",
          amount: 12.5,
          category_id: "550e8400-e29b-41d4-a716-446655440000",
          category_name: "Food",
          description: "Coffee",
          date: "2026-03-07",
          confidence: 0.92,
          missing_fields: [],
          needs_confirmation: true,
        },
      }),
    });

    createTransactionMock.mockResolvedValue({
      success: true,
      data: { id: "tx-1" },
    });

    render(<AiPanel />);

    await user.type(screen.getByLabelText("Ask AI Assistant"), "12.5 coffee today");
    await user.click(screen.getByRole("button", { name: "Send message" }));

    await waitFor(() => {
      expect(screen.getByText("Draft transaction")).toBeInTheDocument();
    });

    await user.click(screen.getByRole("button", { name: "Confirm and save" }));

    await waitFor(() => {
      expect(createTransactionMock).toHaveBeenCalledWith({
        category_id: "550e8400-e29b-41d4-a716-446655440000",
        amount: 12.5,
        type: "expense",
        description: "Coffee",
        date: "2026-03-07",
        source: "web",
        ai_generated: true,
      });
    });

    expect(toastSuccessMock).toHaveBeenCalledWith("Transaction added");
  });

  it("sends current draft when user asks for corrections", async () => {
    const user = userEvent.setup();

    fetchMock
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          message: {
            role: "assistant",
            content: "Draft v1.",
          },
          draft: {
            type: "expense",
            amount: 12.5,
            category_id: "550e8400-e29b-41d4-a716-446655440000",
            category_name: "Food",
            description: "Coffee",
            date: "2026-03-07",
            confidence: 0.9,
            missing_fields: [],
            needs_confirmation: true,
          },
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          message: {
            role: "assistant",
            content: "Draft v2 updated to Groceries.",
          },
          draft: {
            type: "expense",
            amount: 12.5,
            category_id: "650e8400-e29b-41d4-a716-446655440000",
            category_name: "Groceries",
            description: "Coffee",
            date: "2026-03-07",
            confidence: 0.93,
            missing_fields: [],
            needs_confirmation: true,
          },
        }),
      });

    render(<AiPanel />);

    await user.type(screen.getByLabelText("Ask AI Assistant"), "12.5 coffee today");
    await user.click(screen.getByRole("button", { name: "Send message" }));

    await waitFor(() => {
      expect(screen.getByText("Draft v1.")).toBeInTheDocument();
    });

    await user.type(screen.getByLabelText("Ask AI Assistant"), "Actually category groceries");
    await user.click(screen.getByRole("button", { name: "Send message" }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledTimes(2);
    });

    const [, secondRequestInit] = fetchMock.mock.calls[1] ?? [];
    expect(JSON.parse(String(secondRequestInit?.body))).toMatchObject({
      currentDraft: {
        type: "expense",
        amount: 12.5,
        category_id: "550e8400-e29b-41d4-a716-446655440000",
        category_name: "Food",
        description: "Coffee",
        date: "2026-03-07",
      },
    });
  });

  it("treats 'yes' as draft confirmation without another chat request", async () => {
    const user = userEvent.setup();

    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({
        message: {
          role: "assistant",
          content: "I drafted this transaction.",
        },
        draft: {
          type: "expense",
          amount: 50,
          category_id: "550e8400-e29b-41d4-a716-446655440000",
          category_name: "Dining Out",
          description: "Latte",
          date: "2026-03-06",
          confidence: 0.95,
          missing_fields: [],
          needs_confirmation: true,
        },
      }),
    });

    createTransactionMock.mockResolvedValue({
      success: true,
      data: { id: "tx-yes" },
    });

    render(<AiPanel />);

    await user.type(screen.getByLabelText("Ask AI Assistant"), "I spent yesterday 50$ on latte");
    await user.click(screen.getByRole("button", { name: "Send message" }));

    await waitFor(() => {
      expect(screen.getByText("Draft transaction")).toBeInTheDocument();
    });

    await user.type(screen.getByLabelText("Ask AI Assistant"), "yes");
    await user.click(screen.getByRole("button", { name: "Send message" }));

    await waitFor(() => {
      expect(createTransactionMock).toHaveBeenCalledTimes(1);
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
