import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { TagPill } from "../tag-pill";
import type { TagData } from "@/lib/types/tags";

const tag: TagData = {
  id: "tag-1",
  name: "Groceries",
  color: "#22c55e",
};

describe("TagPill", () => {
  it("renders tag name text", () => {
    render(<TagPill tag={tag} />);
    expect(screen.getByText("Groceries")).toBeInTheDocument();
  });

  it("applies background color with low opacity (tinted badge)", () => {
    render(<TagPill tag={tag} />);
    const pill = screen.getByText("Groceries").closest("span")!;
    expect(pill.style.backgroundColor).toBeTruthy();
  });

  it("applies the tag color as text color", () => {
    render(<TagPill tag={tag} />);
    const pill = screen.getByText("Groceries").closest("span")!;
    expect(pill.style.color).toBe("rgb(34, 197, 94)");
  });

  it("has small font size (text-[11px] class)", () => {
    render(<TagPill tag={tag} />);
    const pill = screen.getByText("Groceries").closest("span")!;
    expect(pill.className).toContain("text-[11px]");
  });

  it("renders as an inline element (span)", () => {
    render(<TagPill tag={tag} />);
    const pill = screen.getByText("Groceries").closest("span")!;
    expect(pill.tagName).toBe("SPAN");
  });

  it("renders remove button when onRemove prop is provided", () => {
    const onRemove = vi.fn();
    render(<TagPill tag={tag} onRemove={onRemove} />);
    expect(
      screen.getByRole("button", { name: /remove groceries tag/i })
    ).toBeInTheDocument();
  });

  it("does NOT render remove button when onRemove is undefined", () => {
    render(<TagPill tag={tag} />);
    expect(
      screen.queryByRole("button", { name: /remove/i })
    ).not.toBeInTheDocument();
  });

  it("calls onRemove when X button is clicked", async () => {
    const user = userEvent.setup();
    const onRemove = vi.fn();
    render(<TagPill tag={tag} onRemove={onRemove} />);

    await user.click(
      screen.getByRole("button", { name: /remove groceries tag/i })
    );
    expect(onRemove).toHaveBeenCalledOnce();
  });

  it("stops event propagation on remove click", async () => {
    const user = userEvent.setup();
    const onRemove = vi.fn();
    const outerClick = vi.fn();

    render(
      <div onClick={outerClick}>
        <TagPill tag={tag} onRemove={onRemove} />
      </div>
    );

    await user.click(
      screen.getByRole("button", { name: /remove groceries tag/i })
    );
    expect(onRemove).toHaveBeenCalledOnce();
    expect(outerClick).not.toHaveBeenCalled();
  });
});
