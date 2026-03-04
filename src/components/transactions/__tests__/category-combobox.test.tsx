import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { CategoryCombobox } from "../category-combobox";
import type { CategoryOption } from "@/lib/types/transactions";

// ── Mock Popover (portals don't work in jsdom) ──
vi.mock("@/components/ui/popover", () => ({
  Popover: ({ children }: React.PropsWithChildren) => <div>{children}</div>,
  PopoverTrigger: ({
    children,
    asChild,
    ...props
  }: React.PropsWithChildren<{ asChild?: boolean }>) =>
    asChild ? <>{children}</> : <div {...props}>{children}</div>,
  PopoverContent: ({
    children,
  }: React.PropsWithChildren) => <div data-testid="popover-content">{children}</div>,
}));

// ── Mock Command (cmdk renders through Radix primitives) ──
vi.mock("@/components/ui/command", () => ({
  Command: ({ children, ...props }: React.PropsWithChildren) => (
    <div data-testid="command" {...props}>
      {children}
    </div>
  ),
  CommandInput: ({ placeholder }: { placeholder?: string }) => (
    <input data-testid="command-input" placeholder={placeholder} />
  ),
  CommandList: ({ children }: React.PropsWithChildren) => (
    <div data-testid="command-list">{children}</div>
  ),
  CommandEmpty: ({ children }: React.PropsWithChildren) => (
    <div data-testid="command-empty">{children}</div>
  ),
  CommandGroup: ({
    children,
    heading,
  }: React.PropsWithChildren<{ heading?: string }>) => (
    <div data-testid="command-group" data-heading={heading}>
      {heading && <div data-testid="group-heading">{heading}</div>}
      {children}
    </div>
  ),
  CommandItem: ({
    children,
    onSelect,
    value,
  }: React.PropsWithChildren<{
    onSelect?: () => void;
    value?: string;
  }>) => (
    <button
      type="button"
      role="option"
      aria-selected={false}
      data-value={value}
      onClick={onSelect}
    >
      {children}
    </button>
  ),
}));

// ── Mock CategoryIcon ──
vi.mock("@/components/ui/category-icon", () => ({
  CategoryIcon: ({ name }: { name: string }) => (
    <span data-testid="category-icon">{name}</span>
  ),
}));

// ---------------------------------------------------------------------------
// Test data
// ---------------------------------------------------------------------------

const categories: CategoryOption[] = [
  {
    id: "cat-1",
    name: "Groceries",
    icon: "shopping-cart",
    color: "#4CAF50",
    type: "expense",
    group_id: "g1",
    group_name: "Essentials",
  },
  {
    id: "cat-2",
    name: "Rent",
    icon: "home",
    color: "#2196F3",
    type: "expense",
    group_id: "g1",
    group_name: "Essentials",
  },
  {
    id: "cat-3",
    name: "Dining Out",
    icon: "utensils",
    color: "#FF9800",
    type: "expense",
    group_id: "g2",
    group_name: "Lifestyle",
  },
  {
    id: "cat-4",
    name: "Misc",
    icon: "circle",
    color: "#9E9E9E",
    type: "expense",
    group_id: null,
    group_name: null,
  },
];

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("CategoryCombobox", () => {
  const onValueChange = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders placeholder when no value is selected", () => {
    render(
      <CategoryCombobox
        categories={categories}
        value=""
        onValueChange={onValueChange}
      />
    );

    expect(screen.getByText("Select category")).toBeInTheDocument();
  });

  it("renders selected category name and icon in the trigger when value is set", () => {
    render(
      <CategoryCombobox
        categories={categories}
        value="cat-1"
        onValueChange={onValueChange}
      />
    );

    // The combobox trigger should show the selected category
    const trigger = screen.getByRole("combobox");
    expect(trigger).toHaveTextContent("Groceries");

    // Should NOT show the placeholder
    expect(screen.queryByText("Select category")).not.toBeInTheDocument();
  });

  it("renders a search input", () => {
    render(
      <CategoryCombobox
        categories={categories}
        value=""
        onValueChange={onValueChange}
      />
    );

    expect(screen.getByTestId("command-input")).toBeInTheDocument();
    expect(screen.getByTestId("command-input")).toHaveAttribute(
      "placeholder",
      "Search categories..."
    );
  });

  it("groups categories by group_name", () => {
    render(
      <CategoryCombobox
        categories={categories}
        value=""
        onValueChange={onValueChange}
      />
    );

    const groups = screen.getAllByTestId("command-group");

    // Three groups: Essentials, Lifestyle, Other (for null group_name)
    expect(groups).toHaveLength(3);
    expect(groups[0]).toHaveAttribute("data-heading", "Essentials");
    expect(groups[1]).toHaveAttribute("data-heading", "Lifestyle");
    expect(groups[2]).toHaveAttribute("data-heading", "Other");
  });

  it("puts categories with null group_name under 'Other'", () => {
    render(
      <CategoryCombobox
        categories={categories}
        value=""
        onValueChange={onValueChange}
      />
    );

    const otherGroup = screen
      .getAllByTestId("command-group")
      .find((g) => g.getAttribute("data-heading") === "Other");
    expect(otherGroup).toBeDefined();
    expect(within(otherGroup!).getByText("Misc")).toBeInTheDocument();
  });

  it("renders correct categories under each group", () => {
    render(
      <CategoryCombobox
        categories={categories}
        value=""
        onValueChange={onValueChange}
      />
    );

    const groups = screen.getAllByTestId("command-group");
    const essentials = groups[0];
    const lifestyle = groups[1];

    expect(within(essentials).getByText("Groceries")).toBeInTheDocument();
    expect(within(essentials).getByText("Rent")).toBeInTheDocument();
    expect(within(lifestyle).getByText("Dining Out")).toBeInTheDocument();
  });

  it("calls onValueChange when a category is clicked", async () => {
    const user = userEvent.setup();

    render(
      <CategoryCombobox
        categories={categories}
        value=""
        onValueChange={onValueChange}
      />
    );

    await user.click(screen.getByText("Groceries"));
    expect(onValueChange).toHaveBeenCalledWith("cat-1");
  });

  it("shows empty label when categories list is empty", () => {
    render(
      <CategoryCombobox
        categories={[]}
        value=""
        onValueChange={onValueChange}
        emptyLabel="No expense categories"
      />
    );

    expect(screen.getByTestId("command-empty")).toHaveTextContent(
      "No expense categories"
    );
  });

  it("shows default empty label when emptyLabel prop is not provided", () => {
    render(
      <CategoryCombobox
        categories={[]}
        value=""
        onValueChange={onValueChange}
      />
    );

    expect(screen.getByTestId("command-empty")).toHaveTextContent(
      "No categories found"
    );
  });

  it("renders custom placeholder", () => {
    render(
      <CategoryCombobox
        categories={categories}
        value=""
        onValueChange={onValueChange}
        placeholder="Pick one"
      />
    );

    expect(screen.getByText("Pick one")).toBeInTheDocument();
  });

  it("renders combobox trigger as a button", () => {
    render(
      <CategoryCombobox
        categories={categories}
        value=""
        onValueChange={onValueChange}
      />
    );

    expect(screen.getByRole("combobox")).toBeInTheDocument();
  });
});
