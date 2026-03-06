import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { TagInput } from "../tag-input";
import type { TagData } from "@/lib/types/tags";
import { MAX_TAGS_PER_TRANSACTION } from "@/lib/config/tags";

vi.mock("framer-motion", async () => import("@/test/mocks/framer-motion"));

vi.mock("@/components/ui/popover", () => ({
  Popover: ({ children }: React.PropsWithChildren) => <div>{children}</div>,
  PopoverTrigger: ({
    children,
    asChild,
    ...props
  }: React.PropsWithChildren<{ asChild?: boolean }>) =>
    asChild ? <>{children}</> : <div {...props}>{children}</div>,
  PopoverContent: ({ children }: React.PropsWithChildren) => (
    <div data-testid="popover-content">{children}</div>
  ),
}));

vi.mock("@/components/ui/command", () => ({
  Command: ({ children, ...props }: React.PropsWithChildren) => (
    <div data-testid="command" {...props}>
      {children}
    </div>
  ),
  CommandInput: ({
    placeholder,
    value,
    onValueChange,
  }: {
    placeholder?: string;
    value?: string;
    onValueChange?: (v: string) => void;
  }) => (
    <input
      data-testid="command-input"
      placeholder={placeholder}
      value={value ?? ""}
      onChange={(e) => onValueChange?.(e.target.value)}
    />
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
    disabled,
  }: React.PropsWithChildren<{
    onSelect?: () => void;
    value?: string;
    disabled?: boolean;
  }>) => (
    <button
      type="button"
      role="option"
      aria-selected={false}
      data-value={value}
      disabled={disabled}
      onClick={onSelect}
    >
      {children}
    </button>
  ),
}));

const availableTags: TagData[] = [
  { id: "t1", name: "Food", color: "#22c55e" },
  { id: "t2", name: "Travel", color: "#3b82f6" },
  { id: "t3", name: "Work", color: "#ef4444" },
];

describe("TagInput", () => {
  const onTagAdd = vi.fn();
  const onTagRemove = vi.fn();
  const onCreateTag = vi.fn<(name: string, color: string) => Promise<TagData | null>>();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  function renderTagInput(overrides: Partial<Parameters<typeof TagInput>[0]> = {}) {
    return render(
      <TagInput
        selectedTags={[]}
        availableTags={availableTags}
        onTagAdd={onTagAdd}
        onTagRemove={onTagRemove}
        onCreateTag={onCreateTag}
        {...overrides}
      />
    );
  }

  it("renders trigger button", () => {
    renderTagInput();
    expect(screen.getByRole("button", { name: /add tags/i })).toBeInTheDocument();
  });

  it("shows existing tags as options in dropdown", () => {
    renderTagInput();
    expect(screen.getByText("Food")).toBeInTheDocument();
    expect(screen.getByText("Travel")).toBeInTheDocument();
    expect(screen.getByText("Work")).toBeInTheDocument();
  });

  it("filters tag options when typing in search input", async () => {
    const user = userEvent.setup();
    renderTagInput();

    const input = screen.getByTestId("command-input");
    await user.clear(input);
    await user.type(input, "Foo");

    expect(screen.getByText("Food")).toBeInTheDocument();
    expect(screen.queryByText("Travel")).not.toBeInTheDocument();
    expect(screen.queryByText("Work")).not.toBeInTheDocument();
  });

  it("calls onTagAdd when selecting a tag", async () => {
    const user = userEvent.setup();
    renderTagInput();

    await user.click(screen.getByText("Food"));
    expect(onTagAdd).toHaveBeenCalledWith(availableTags[0]);
  });

  it('shows "Create new tag" option when search doesn\'t match', async () => {
    const user = userEvent.setup();
    renderTagInput();

    const input = screen.getByTestId("command-input");
    await user.clear(input);
    await user.type(input, "Vacation");

    expect(screen.getByText(/create "vacation"/i)).toBeInTheDocument();
  });

  it("shows color palette when creating a new tag", async () => {
    const user = userEvent.setup();
    renderTagInput();

    const input = screen.getByTestId("command-input");
    await user.clear(input);
    await user.type(input, "Vacation");

    await user.click(screen.getByText(/create "vacation"/i));
    expect(screen.getByTestId("color-palette")).toBeInTheDocument();
  });

  it("displays selected tags as TagPill elements", () => {
    renderTagInput({
      selectedTags: [availableTags[0], availableTags[1]],
    });

    expect(screen.getByText("Food")).toBeInTheDocument();
    expect(screen.getByText("Travel")).toBeInTheDocument();
  });

  it("calls onTagRemove when clicking X on a pill", async () => {
    const user = userEvent.setup();
    renderTagInput({
      selectedTags: [availableTags[0]],
    });

    await user.click(screen.getByRole("button", { name: /remove food tag/i }));
    expect(onTagRemove).toHaveBeenCalledWith("t1");
  });

  it("hides add button when at MAX_TAGS_PER_TRANSACTION", () => {
    const fiveTags: TagData[] = Array.from({ length: MAX_TAGS_PER_TRANSACTION }, (_, i) => ({
      id: `tag-${i}`,
      name: `Tag ${i}`,
      color: "#22c55e",
    }));

    renderTagInput({ selectedTags: fiveTags });

    expect(screen.queryByRole("button", { name: /add tags/i })).not.toBeInTheDocument();
  });

  it("shows count indicator when at limit", () => {
    const fiveTags: TagData[] = Array.from({ length: MAX_TAGS_PER_TRANSACTION }, (_, i) => ({
      id: `tag-${i}`,
      name: `Tag ${i}`,
      color: "#22c55e",
    }));

    renderTagInput({ selectedTags: fiveTags });
    expect(screen.getByText(`${MAX_TAGS_PER_TRANSACTION}/${MAX_TAGS_PER_TRANSACTION} tags`)).toBeInTheDocument();
  });

  it("excludes already-selected tags from dropdown options", () => {
    renderTagInput({
      selectedTags: [availableTags[0]],
    });

    const options = screen.getAllByRole("option");
    const optionTexts = options.map((o) => o.textContent);
    expect(optionTexts).not.toContain(expect.stringContaining("Food"));
  });

  it("calls onCreateTag with name and color when completing new tag flow", async () => {
    const user = userEvent.setup();
    const newTag: TagData = { id: "new-1", name: "Vacation", color: "#ef4444" };
    onCreateTag.mockResolvedValueOnce(newTag);

    renderTagInput();

    const input = screen.getByTestId("command-input");
    await user.clear(input);
    await user.type(input, "Vacation");
    await user.click(screen.getByText(/create "vacation"/i));

    const colorButton = screen.getByLabelText("#ef4444");
    await user.click(colorButton);

    expect(onCreateTag).toHaveBeenCalledWith("Vacation", "#ef4444");
  });
});
