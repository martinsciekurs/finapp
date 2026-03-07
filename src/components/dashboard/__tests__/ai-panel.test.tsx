import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { AiPanel } from "../ai-panel";

const closeMock = vi.fn();
const fetchMock = vi.fn();
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

describe("AiPanel", () => {
  beforeEach(() => {
    closeMock.mockClear();
    fetchMock.mockReset();
    pathnameMock = "/dashboard";
    vi.stubGlobal("fetch", fetchMock);
  });

  it("renders the starter assistant message", () => {
    render(<AiPanel />);

    expect(screen.getByText("AI Assistant")).toBeInTheDocument();
    expect(
      screen.getByText(
        "Hi! Ask about budgeting, saving ideas, category choices, or how to use Simplony."
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
            "Hi! Ask about budgeting, saving ideas, category choices, or how to use Simplony.",
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
});
