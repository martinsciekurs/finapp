import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { CategoryManager } from "../category-manager";
import type { CategoryGroupData } from "@/lib/types/categories";

// Shared mock — Proxy strips animation props automatically
vi.mock("framer-motion", async () => import("@/test/mocks/framer-motion"));

// ── Mock @dnd-kit ──
vi.mock("@dnd-kit/core", () => ({
  DndContext: ({ children }: React.PropsWithChildren) => <>{children}</>,
  DragOverlay: ({ children }: React.PropsWithChildren) => (
    <div data-testid="drag-overlay">{children}</div>
  ),
  closestCenter: vi.fn(),
  PointerSensor: class {},
  KeyboardSensor: class {},
  useSensor: vi.fn(() => ({})),
  useSensors: vi.fn(() => []),
}));

vi.mock("@dnd-kit/modifiers", () => ({
  restrictToVerticalAxis: vi.fn(),
}));

vi.mock("@dnd-kit/sortable", () => ({
  SortableContext: ({ children }: React.PropsWithChildren) => <>{children}</>,
  verticalListSortingStrategy: {},
  arrayMove: vi.fn(
    <T,>(arr: T[], from: number, to: number) => {
      const result = [...arr];
      const [item] = result.splice(from, 1);
      result.splice(to, 0, item);
      return result;
    }
  ),
  sortableKeyboardCoordinates: vi.fn(),
  useSortable: vi.fn(() => ({
    attributes: {},
    listeners: {},
    setNodeRef: vi.fn(),
    setActivatorNodeRef: vi.fn(),
    setDroppableNodeRef: vi.fn(),
    setDraggableNodeRef: vi.fn(),
    transform: null,
    transition: undefined,
    isDragging: false,
    active: null,
    activeIndex: -1,
    data: {},
    rect: { current: null },
    index: 0,
    newIndex: 0,
    items: [],
    isOver: false,
    isSorting: false,
    node: { current: null },
    overIndex: -1,
    over: null,
  })),
}));

vi.mock("@dnd-kit/utilities", () => ({
  CSS: {
    Transform: {
      toString: vi.fn(() => undefined),
    },
  },
}));

// ── Mock server actions ──
vi.mock("@/app/dashboard/settings/categories/actions", () => ({
  createCategory: vi.fn(),
  updateCategory: vi.fn(),
  deleteCategory: vi.fn(),
  createGroup: vi.fn(),
  updateGroup: vi.fn(),
  deleteGroup: vi.fn(),
  reorderCategories: vi.fn(),
  reorderGroups: vi.fn(),
  getCategoryTransactionCount: vi.fn(),
}));

// ---------------------------------------------------------------------------
// Test data
// ---------------------------------------------------------------------------

const mockExpenseGroups: CategoryGroupData[] = [
  {
    id: "group-1",
    name: "Essentials",
    type: "expense",
    sort_order: 0,
    categories: [
      {
        id: "cat-1",
        name: "Groceries",
        icon: "shopping-cart",
        color: "#4a8c6f",
        type: "expense",
        group_id: "group-1",
        sort_order: 0,
      },
      {
        id: "cat-2",
        name: "Rent",
        icon: "home",
        color: "#5a7d8c",
        type: "expense",
        group_id: "group-1",
        sort_order: 1,
      },
    ],
  },
  {
    id: "group-2",
    name: "Lifestyle",
    type: "expense",
    sort_order: 1,
    categories: [
      {
        id: "cat-3",
        name: "Dining Out",
        icon: "utensils",
        color: "#c97b5e",
        type: "expense",
        group_id: "group-2",
        sort_order: 0,
      },
    ],
  },
];

const mockIncomeGroups: CategoryGroupData[] = [
  {
    id: "group-3",
    name: "Income",
    type: "income",
    sort_order: 0,
    categories: [
      {
        id: "cat-4",
        name: "Salary",
        icon: "briefcase",
        color: "#2d4a3e",
        type: "income",
        group_id: "group-3",
        sort_order: 0,
      },
    ],
  },
];

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("CategoryManager", () => {
  it("renders expense tab as active by default", () => {
    render(
      <CategoryManager
        expenseGroups={mockExpenseGroups}
        incomeGroups={mockIncomeGroups}
      />
    );

    const expenseTab = screen.getByRole("tab", { name: "Expense" });
    expect(expenseTab).toHaveAttribute("aria-selected", "true");
  });

  it("renders expense groups and categories", () => {
    render(
      <CategoryManager
        expenseGroups={mockExpenseGroups}
        incomeGroups={mockIncomeGroups}
      />
    );

    expect(screen.getByText("Essentials")).toBeInTheDocument();
    expect(screen.getByText("Lifestyle")).toBeInTheDocument();
    expect(screen.getByText("Groceries")).toBeInTheDocument();
    expect(screen.getByText("Rent")).toBeInTheDocument();
    expect(screen.getByText("Dining Out")).toBeInTheDocument();
  });

  it("does not render income groups when expense tab is active", () => {
    render(
      <CategoryManager
        expenseGroups={mockExpenseGroups}
        incomeGroups={mockIncomeGroups}
      />
    );

    expect(screen.queryByText("Salary")).not.toBeInTheDocument();
  });

  it("switches to income tab and shows income groups", async () => {
    const user = userEvent.setup();

    render(
      <CategoryManager
        expenseGroups={mockExpenseGroups}
        incomeGroups={mockIncomeGroups}
      />
    );

    await user.click(screen.getByRole("tab", { name: "Income" }));

    expect(screen.getByText("Salary")).toBeInTheDocument();
    expect(screen.queryByText("Groceries")).not.toBeInTheDocument();
  });

  it("renders Add Category and Add Group buttons", () => {
    render(
      <CategoryManager
        expenseGroups={mockExpenseGroups}
        incomeGroups={mockIncomeGroups}
      />
    );

    // Top-level "Add Category" button + per-group "+" buttons
    const addCategoryButtons = screen.getAllByRole("button", {
      name: /add category/i,
    });
    expect(addCategoryButtons.length).toBeGreaterThanOrEqual(1);
    expect(
      screen.getByRole("button", { name: /add group/i })
    ).toBeInTheDocument();
  });

  it("renders empty state when no groups exist", () => {
    render(
      <CategoryManager expenseGroups={[]} incomeGroups={mockIncomeGroups} />
    );

    expect(screen.getByText(/no expense groups yet/i)).toBeInTheDocument();
  });

  it("renders category action buttons for each category", () => {
    render(
      <CategoryManager
        expenseGroups={mockExpenseGroups}
        incomeGroups={mockIncomeGroups}
      />
    );

    expect(
      screen.getByRole("button", { name: "Actions for Groceries" })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Actions for Rent" })
    ).toBeInTheDocument();
  });

  it("renders group action buttons", () => {
    render(
      <CategoryManager
        expenseGroups={mockExpenseGroups}
        incomeGroups={mockIncomeGroups}
      />
    );

    expect(
      screen.getByRole("button", { name: "Actions for Essentials group" })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Actions for Lifestyle group" })
    ).toBeInTheDocument();
  });

  it("renders add-to-group buttons for each group", () => {
    render(
      <CategoryManager
        expenseGroups={mockExpenseGroups}
        incomeGroups={mockIncomeGroups}
      />
    );

    expect(
      screen.getByRole("button", { name: "Add category to Essentials" })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Add category to Lifestyle" })
    ).toBeInTheDocument();
  });

  it("shows 'No categories in this group' for empty groups", () => {
    const emptyGroups: CategoryGroupData[] = [
      {
        id: "group-empty",
        name: "Empty Group",
        type: "expense",
        sort_order: 0,
        categories: [],
      },
    ];

    render(
      <CategoryManager
        expenseGroups={emptyGroups}
        incomeGroups={mockIncomeGroups}
      />
    );

    expect(
      screen.getByText("No categories in this group")
    ).toBeInTheDocument();
  });

  // ── DnD-specific tests ──

  it("renders drag handles for each category", () => {
    render(
      <CategoryManager
        expenseGroups={mockExpenseGroups}
        incomeGroups={mockIncomeGroups}
      />
    );

    expect(
      screen.getByRole("button", { name: "Drag Groceries" })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Drag Rent" })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Drag Dining Out" })
    ).toBeInTheDocument();
  });

  it("renders drag handles for each group", () => {
    render(
      <CategoryManager
        expenseGroups={mockExpenseGroups}
        incomeGroups={mockIncomeGroups}
      />
    );

    expect(
      screen.getByRole("button", { name: "Drag Essentials group" })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Drag Lifestyle group" })
    ).toBeInTheDocument();
  });

  it("renders DragOverlay container", () => {
    render(
      <CategoryManager
        expenseGroups={mockExpenseGroups}
        incomeGroups={mockIncomeGroups}
      />
    );

    expect(screen.getByTestId("drag-overlay")).toBeInTheDocument();
  });
});
