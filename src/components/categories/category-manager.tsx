"use client";

import { useState, useCallback, useMemo, useEffect, useId } from "react";
import { Plus, Layers } from "lucide-react";
import { toast } from "sonner";
import { motion, useReducedMotion } from "framer-motion";
import {
  DndContext,
  DragOverlay,
  closestCenter,
  pointerWithin,
  getFirstCollision,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import type {
  DragStartEvent,
  DragOverEvent,
  DragEndEvent,
  CollisionDetection,
  UniqueIdentifier,
} from "@dnd-kit/core";
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
// Helpers
// ────────────────────────────────────────────

/** Find which group contains a given category id. */
function findGroupByCategory(
  groups: CategoryGroupData[],
  categoryId: UniqueIdentifier
): CategoryGroupData | undefined {
  return groups.find((g) =>
    g.categories.some((c) => c.id === categoryId)
  );
}

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

  // ── Collision detection ──
  // Use pointerWithin for categories (better for nested containers)
  // and closestCenter for groups
  const collisionDetection: CollisionDetection = useCallback(
    (args) => {
      // If dragging a group, use closestCenter on groups only
      if (activeDrag?.type === "group") {
        return closestCenter(args);
      }

      // For categories, use pointerWithin first, then fall back to closestCenter
      const pointerCollisions = pointerWithin(args);
      const collision = getFirstCollision(pointerCollisions);

      if (collision) {
        return pointerCollisions;
      }

      return closestCenter(args);
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
    async (category: CategoryData, newGroupId: string) => {
      const result = await updateCategory(category.id, {
        group_id: newGroupId,
      });
      if (!result.success) {
        toast.error(result.error ?? "Failed to move category");
        return;
      }
      toast.success(`Moved "${category.name}" to new group`);
    },
    []
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

  const handleDragOver = useCallback(
    (event: DragOverEvent) => {
      const { active, over } = event;
      if (!over || !active.data.current) return;

      // Only handle cross-group category movement here
      if (active.data.current.type !== "category") return;

      const activeCatId = active.id;
      const overData = over.data.current;

      // Determine the target group
      let targetGroupId: string | undefined;

      if (overData?.type === "category") {
        // Dragged over another category — find its group
        const overGroup = findGroupByCategory(groups, over.id);
        targetGroupId = overGroup?.id;
      } else if (overData?.type === "group-droppable") {
        // Dragged over an empty group droppable zone
        targetGroupId = overData.groupId;
      } else if (overData?.type === "group") {
        // Dragged over a group header
        targetGroupId = over.id as string;
      }

      if (!targetGroupId) return;

      // Find the source group
      const sourceGroup = findGroupByCategory(groups, activeCatId);
      if (!sourceGroup || sourceGroup.id === targetGroupId) return;

      // Move category between groups optimistically
      setGroups((prev) => {
        const newGroups = prev.map((g) => ({ ...g, categories: [...g.categories] }));
        const srcGroup = newGroups.find((g) => g.id === sourceGroup.id);
        const destGroup = newGroups.find((g) => g.id === targetGroupId);
        if (!srcGroup || !destGroup) return prev;

        const catIndex = srcGroup.categories.findIndex(
          (c) => c.id === activeCatId
        );
        if (catIndex === -1) return prev;

        const [movedCat] = srcGroup.categories.splice(catIndex, 1);
        const movedWithNewGroup = { ...movedCat, group_id: targetGroupId };

        // Determine insertion index
        if (overData?.type === "category") {
          const overIndex = destGroup.categories.findIndex(
            (c) => c.id === over.id
          );
          if (overIndex !== -1) {
            destGroup.categories.splice(overIndex, 0, movedWithNewGroup);
          } else {
            destGroup.categories.push(movedWithNewGroup);
          }
        } else {
          destGroup.categories.push(movedWithNewGroup);
        }

        return newGroups;
      });
    },
    [groups, setGroups]
  );

  const handleDragEnd = useCallback(
    async (event: DragEndEvent) => {
      const { active, over } = event;
      setActiveDrag(null);

      if (!over || active.id === over.id) return;

      const activeData = active.data.current;

      // ── Group reorder ──
      if (activeData?.type === "group") {
        const oldIndex = groups.findIndex((g) => g.id === active.id);
        const newIndex = groups.findIndex((g) => g.id === over.id);

        if (oldIndex === -1 || newIndex === -1 || oldIndex === newIndex) return;

        const reordered = arrayMove(groups, oldIndex, newIndex);

        // Optimistic update
        setGroups(reordered);

        // Persist — uses `reordered` (the computed array), NOT stale `groups`
        const items = reordered.map((g, i) => ({
          id: g.id,
          sort_order: i,
        }));

        const result = await reorderGroups({ items });
        if (!result.success) {
          toast.error(result.error ?? "Failed to reorder groups");
        }
        return;
      }

      // ── Category reorder (same group or cross-group) ──
      if (activeData?.type === "category") {
        const originalCategory = activeData.category as CategoryData;
        const activeGroup = findGroupByCategory(groups, active.id);
        if (!activeGroup) return;

        // Track the resolved category list for persistence.
        // We must NOT read from `groups` after setGroups — it's stale in this closure.
        let resolvedCategories = activeGroup.categories;

        // Same-group reorder
        const overData = over.data.current;
        if (overData?.type === "category") {
          const overGroup = findGroupByCategory(groups, over.id);
          if (overGroup && overGroup.id === activeGroup.id) {
            const oldIdx = resolvedCategories.findIndex(
              (c) => c.id === active.id
            );
            const newIdx = resolvedCategories.findIndex(
              (c) => c.id === over.id
            );

            if (oldIdx !== -1 && newIdx !== -1 && oldIdx !== newIdx) {
              resolvedCategories = arrayMove(
                resolvedCategories,
                oldIdx,
                newIdx
              );

              // Optimistic update
              setGroups((prev) =>
                prev.map((g) =>
                  g.id === activeGroup.id
                    ? { ...g, categories: resolvedCategories }
                    : g
                )
              );
            }
          }
        }

        // Persist using `resolvedCategories` (the computed order, not stale state)
        const items = resolvedCategories.map((c, i) => ({
          id: c.id,
          sort_order: i,
        }));

        // Persist group_id change if the category was moved cross-group
        // (handleDragOver already moved it optimistically)
        if (originalCategory.group_id !== activeGroup.id) {
          const moveResult = await updateCategory(originalCategory.id, {
            group_id: activeGroup.id,
          });
          if (!moveResult.success) {
            toast.error(moveResult.error ?? "Failed to move category");
            return;
          }
        }

        if (items.length > 0) {
          const result = await reorderCategories({ items });
          if (!result.success) {
            toast.error(result.error ?? "Failed to reorder categories");
          }
        }

        // Also persist order in the source group if cross-group move
        if (originalCategory.group_id !== activeGroup.id) {
          const srcGroup = groups.find(
            (g) => g.id === originalCategory.group_id
          );
          if (srcGroup && srcGroup.categories.length > 0) {
            const srcItems = srcGroup.categories.map((c, i) => ({
              id: c.id,
              sort_order: i,
            }));
            await reorderCategories({ items: srcItems });
          }
        }
      }
    },
    [groups, setGroups]
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
            onDragStart={handleDragStart}
            onDragOver={handleDragOver}
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
