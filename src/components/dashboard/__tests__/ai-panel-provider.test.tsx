import { beforeEach, describe, expect, it } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { AiPanelProvider, useAiPanel } from "../ai-panel-provider";

function TestConsumer() {
  const { open, toggle, close } = useAiPanel();

  return (
    <div>
      <p data-testid="open-state">{String(open)}</p>
      <button type="button" onClick={toggle}>
        Toggle
      </button>
      <button type="button" onClick={close}>
        Close
      </button>
    </div>
  );
}

describe("AiPanelProvider", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("defaults to closed when no persisted state exists", () => {
    render(
      <AiPanelProvider>
        <TestConsumer />
      </AiPanelProvider>
    );

    expect(screen.getByTestId("open-state")).toHaveTextContent("false");
  });

  it("hydrates open state from localStorage", async () => {
    window.localStorage.setItem("dashboard.aiPanel.open", "true");

    render(
      <AiPanelProvider>
        <TestConsumer />
      </AiPanelProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId("open-state")).toHaveTextContent("true");
    });
  });

  it("persists open state changes", async () => {
    const user = userEvent.setup();

    render(
      <AiPanelProvider>
        <TestConsumer />
      </AiPanelProvider>
    );

    await user.click(screen.getByRole("button", { name: "Toggle" }));
    expect(window.localStorage.getItem("dashboard.aiPanel.open")).toBe("true");

    await user.click(screen.getByRole("button", { name: "Close" }));
    expect(window.localStorage.getItem("dashboard.aiPanel.open")).toBe("false");
  });
});
