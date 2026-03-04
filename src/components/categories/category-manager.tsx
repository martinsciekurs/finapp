"use client";

import { useState, useCallback, useMemo, useEffect, useId, useTransition } from "react";
import { Plus, Layers } from "lucide-react";
import { toast } from "sonner";
import { motion, useReducedMotion } from "framer-motion";
import {
  DndContext,
  DragOverlay,
  closestCenter,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import type { DragStartEvent, DragEndEvent, CollisionDetection } from "@dnd-kit/core";
import { restrictToVerticalAxis } from "@dnd-kit/modifiers";
import {
  SortableContext,
  verticalListSortingStrategy,
  arrayMove,
  sortableKeyboardCoordinates,
} from "@dnd-kit/sortable";

import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { cn } from "@/lib/utils";
import { CategoryGroupSection } from "./category-group-section";
import { CategoryRow } from "./category-row";
import { CategoryFormDialog } from "./category-form-dialog";
import { DeleteCategoryDialog } from "./delete-category-dialog";
import { GroupFormDialog } from "./group-form-dialog";
import { DeleteGroupDialog } from "./delete-group-dialog";
import {
  updateCategory,
  reorderCategories,
  reorderGroups,
} from "@/app/dashboard/settings/categories/actions";
import type { CategoryData, CategoryGroupData } from "@/lib/types/categories";

// ────────────────────────────────────────────
// Props
// ────────────────────────────────────────────

interface CategoryManagerProps {
  expenseGroups: CategoryGroupData[];
  incomeGroups: CategoryGroupData[];
}

// ────────────────────────────────────────────
// Dialog state types
// ────────────────────────────────────────────

type DialogState =
  | { kind: "none" }
  | { kind: "addCategory"; groupId?: string }
  | { kind: "editCategory"; category: CategoryData }
  | { kind: "deleteCategory"; category: CategoryData }
  | { kind: "addGroup" }
  | { kind: "editGroup"; group: CategoryGroupData }
  | { kind: "deleteGroup"; group: CategoryGroupData };

// ────────────────────────────────────────────
// Active drag item type
// ────────────────────────────────────────────

type ActiveDragItem =
  | { type: "category"; category: CategoryData }
  | { type: "group"; group: CategoryGroupData }
  | null;

// ────────────────────────────────────────────
// Component
// ────────────────────────────────────────────

export function CategoryManager({
  expenseGroups,
  incomeGroups,
}: CategoryManagerProps) {
  const dndId = useId();
  const prefersReducedMotion = useReducedMotion();
  const [activeTab, setActiveTab] = useState<"expense" | "income">("expense");
  const [dialog, setDialog] = useState<DialogState>({ kind: "none" });

  // Local optimistic state for DnD — mirrors server props until a drag occurs
  const [localExpenseGroups, setLocalExpenseGroups] =
    useState(expenseGroups);
  const [localIncomeGroups, setLocalIncomeGroups] =
    useState(incomeGroups);

  // Sync server props when they change (e.g. after revalidation)
  useEffect(() => {
    setLocalExpenseGroups(expenseGroups);
  }, [expenseGroups]);

  useEffect(() => {
    setLocalIncomeGroups(incomeGroups);
  }, [incomeGroups]);

  const groups =
    activeTab === "expense" ? localExpenseGroups : localIncomeGroups;
  const setGroups =
    activeTab === "expense" ? setLocalExpenseGroups : setLocalIncomeGroups;

  // Wrap server action calls in a transition so revalidatePath() does not
  // trigger the Suspense fallback from loading.tsx (prevents hydration error).
  const [, startTransition] = useTransition();

  // ── Active drag state ──
  const [activeDrag, setActiveDrag] = useState<ActiveDragItem>(null);

  // ── DnD sensors ──
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // ── Custom collision detection ──
  // Without filtering, closestCenter considers ALL sortable items (groups +
  // categories). When dragging a group the pointer often lands closer to a
  // small category row inside another group than to the group container
  // itself, causing handleDragEnd to receive a category id as `over` →
  // groups.findIndex returns -1 → nothing happens, and the sort strategy
  // oscillates transforms → visual jumping.
  //
  // Fix: partition droppable containers so groups only collide with groups,
  // and categories only collide with categories.
  const collisionDetection: CollisionDetection = useCallback(
    (args) => {
      const filtered = args.droppableContainers.filter((container) => {
        const data = container.data.current;
        if (activeDrag?.type === "group") return data?.type === "group";
        if (activeDrag?.type === "category") return data?.type === "category";
        return true;
      });

      return closestCenter({ ...args, droppableContainers: filtered });
    },
    [activeDrag]
  );

  // ── Memoized group IDs for SortableContext ──
  const groupIds = useMemo(() => groups.map((g) => g.id), [groups]);

  // ── Category handlers ──

  const handleAddCategory = useCallback((groupId: string) => {
    setDialog({ kind: "addCategory", groupId });
  }, []);

  const handleEditCategory = useCallback((category: CategoryData) => {
    setDialog({ kind: "editCategory", category });
  }, []);

  const handleDeleteCategory = useCallback((category: CategoryData) => {
    setDialog({ kind: "deleteCategory", category });
  }, []);

  const handleMoveCategory = useCallback(
    (category: CategoryData, newGroupId: string) => {
      startTransition(async () => {
        const result = await updateCategory(category.id, {
          group_id: newGroupId,
        });
        if (!result.success) {
          toast.error(result.error ?? "Failed to move category");
          return;
        }
        toast.success(`Moved "${category.name}" to new group`);
      });
    },
    [startTransition]
  );

  // ── Group handlers ──

  const handleAddGroup = useCallback(() => {
    setDialog({ kind: "addGroup" });
  }, []);

  const handleEditGroup = useCallback((group: CategoryGroupData) => {
    setDialog({ kind: "editGroup", group });
  }, []);

  const handleDeleteGroup = useCallback((group: CategoryGroupData) => {
    setDialog({ kind: "deleteGroup", group });
  }, []);

  const closeDialog = useCallback(() => {
    setDialog({ kind: "none" });
  }, []);

  // ── DnD handlers ──

  const handleDragStart = useCallback(
    (event: DragStartEvent) => {
      const { active } = event;
      const data = active.data.current;

      if (data?.type === "category") {
        setActiveDrag({ type: "category", category: data.category });
      } else if (data?.type === "group") {
        setActiveDrag({ type: "group", group: data.group });
      }
    },
    []
  );

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      setActiveDrag(null);

      if (!over || active.id === over.id) return;

      const activeData = active.data.current;

      // ── Group reorder ──
      if (activeData?.type === "group") {
        const oldIndex = groups.findIndex((g) => g.id === active.id);
        const newIndex = groups.findIndex((g) => g.id === over.id);

        if (oldIndex === -1 || newIndex === -1 || oldIndex === newIndex) return;

        const prevGroups = groups;
        const reordered = arrayMove(groups, oldIndex, newIndex);

        // Optimistic update (immediate)
        setGroups(reordered);

        // Persist inside transition so revalidatePath() won't trigger Suspense
        const items = reordered.map((g, i) => ({
          id: g.id,
          sort_order: i,
        }));
        startTransition(async () => {
          const result = await reorderGroups({ items });
          if (!result.success) {
            setGroups(prevGroups);
            toast.error(result.error ?? "Failed to reorder groups");
          }
        });
        return;
      }

      // ── Category reorder (within same group only) ──
      if (activeData?.type === "category") {
        const overData = over.data.current;
        if (overData?.type !== "category") return;

        // Both items must be in the same group
        const activeGroupId = (activeData.category as CategoryData).group_id;
        const overGroupId = (overData.category as CategoryData).group_id;
        if (activeGroupId !== overGroupId) return;

        const group = groups.find((g) => g.id === activeGroupId);
        if (!group) return;

        const oldIdx = group.categories.findIndex((c) => c.id === active.id);
        const newIdx = group.categories.findIndex((c) => c.id === over.id);

        if (oldIdx === -1 || newIdx === -1 || oldIdx === newIdx) return;

        const prevGroups = groups;
        const reordered = arrayMove(group.categories, oldIdx, newIdx);

        // Optimistic update (immediate)
        setGroups((prev) =>
          prev.map((g) =>
            g.id === activeGroupId ? { ...g, categories: reordered } : g
          )
        );

        // Persist inside transition
        const items = reordered.map((c, i) => ({
          id: c.id,
          sort_order: i,
        }));
        startTransition(async () => {
          const result = await reorderCategories({ items });
          if (!result.success) {
            setGroups(prevGroups);
            toast.error(result.error ?? "Failed to reorder categories");
          }
        });
      }
    },
    [groups, setGroups, startTransition]
  );

  const handleDragCancel = useCallback(() => {
    setActiveDrag(null);
    // Reset to server state
    setLocalExpenseGroups(expenseGroups);
    setLocalIncomeGroups(incomeGroups);
  }, [expenseGroups, incomeGroups]);

  return (
    <>
      <motion.div
        initial={prefersReducedMotion ? false : { opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={prefersReducedMotion ? { duration: 0 } : { duration: 0.2 }}
        className="space-y-5"
      >
        {/* Tab toggle + action buttons */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div
            className="inline-flex rounded-lg border bg-muted p-0.5"
            role="tablist"
            aria-label="Category type"
          >
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === "expense"}
              className={cn(
                "rounded-md px-4 py-1.5 text-sm font-medium transition-all",
                activeTab === "expense"
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
              onClick={() => setActiveTab("expense")}
            >
              Expense
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === "income"}
              className={cn(
                "rounded-md px-4 py-1.5 text-sm font-medium transition-all",
                activeTab === "income"
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
              onClick={() => setActiveTab("income")}
            >
              Income
            </button>
          </div>

          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleAddGroup}
            >
              <Layers className="size-4" />
              Add Group
            </Button>
            <Button
              size="sm"
              onClick={() => setDialog({ kind: "addCategory" })}
            >
              <Plus className="size-4" />
              Add Category
            </Button>
          </div>
        </div>

        {/* Groups list with DnD */}
        {groups.length > 0 ? (
          <DndContext
            id={dndId}
            sensors={sensors}
            collisionDetection={collisionDetection}
            modifiers={[restrictToVerticalAxis]}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
            onDragCancel={handleDragCancel}
          >
            <SortableContext
              items={groupIds}
              strategy={verticalListSortingStrategy}
            >
              <div className="space-y-4">
                {groups.map((group) => (
                  <CategoryGroupSection
                    key={group.id}
                    group={group}
                    allGroups={groups}
                    onEditGroup={handleEditGroup}
                    onDeleteGroup={handleDeleteGroup}
                    onAddCategory={handleAddCategory}
                    onEditCategory={handleEditCategory}
                    onDeleteCategory={handleDeleteCategory}
                    onMoveCategory={handleMoveCategory}
                  />
                ))}
              </div>
            </SortableContext>

            {/* Drag overlay — rendered outside the sortable tree */}
            <DragOverlay dropAnimation={null}>
              {activeDrag?.type === "category" && (
                <CategoryRow
                  category={activeDrag.category}
                  groups={groups}
                  onEdit={() => {}}
                  onDelete={() => {}}
                  onMove={() => {}}
                  isOverlay
                />
              )}
              {activeDrag?.type === "group" && (
                <CategoryGroupSection
                  group={activeDrag.group}
                  allGroups={groups}
                  onEditGroup={() => {}}
                  onDeleteGroup={() => {}}
                  onAddCategory={() => {}}
                  onEditCategory={() => {}}
                  onDeleteCategory={() => {}}
                  onMoveCategory={() => {}}
                  isOverlay
                />
              )}
            </DragOverlay>
          </DndContext>
        ) : (
          <EmptyState
            icon={Layers}
            title={`No ${activeTab} groups yet`}
            description="Create a group to organize your categories."
            action={
              <Button size="sm" onClick={handleAddGroup}>
                <Plus className="size-4" />
                Add Group
              </Button>
            }
          />
        )}
      </motion.div>

      {/* ── Dialogs ── */}

      {/* Add/Edit Category */}
      {(dialog.kind === "addCategory" || dialog.kind === "editCategory") && (
        <CategoryFormDialog
          open
          onOpenChange={(open) => !open && closeDialog()}
          type={activeTab}
          groups={groups}
          category={
            dialog.kind === "editCategory" ? dialog.category : undefined
          }
          defaultGroupId={
            dialog.kind === "addCategory" ? dialog.groupId : undefined
          }
        />
      )}

      {/* Delete Category */}
      {dialog.kind === "deleteCategory" && (
        <DeleteCategoryDialog
          open
          onOpenChange={(open) => !open && closeDialog()}
          category={dialog.category}
          groups={groups}
        />
      )}

      {/* Add/Edit Group */}
      {(dialog.kind === "addGroup" || dialog.kind === "editGroup") && (
        <GroupFormDialog
          open
          onOpenChange={(open) => !open && closeDialog()}
          type={activeTab}
          group={dialog.kind === "editGroup" ? dialog.group : undefined}
        />
      )}

      {/* Delete Group */}
      {dialog.kind === "deleteGroup" && (
        <DeleteGroupDialog
          open
          onOpenChange={(open) => !open && closeDialog()}
          group={dialog.group}
          allGroups={groups}
        />
      )}
    </>
  );
}
