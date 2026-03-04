"use client";

import { useMemo } from "react";
import { useSortable } from "@dnd-kit/sortable";
import {
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  MoreHorizontal,
  Pencil,
  Trash2,
  Plus,
  GripVertical,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { CategoryRow } from "./category-row";
import type { CategoryData, CategoryGroupData } from "@/lib/types/categories";

interface CategoryGroupSectionProps {
  group: CategoryGroupData;
  allGroups: CategoryGroupData[];
  onEditGroup: (group: CategoryGroupData) => void;
  onDeleteGroup: (group: CategoryGroupData) => void;
  onAddCategory: (groupId: string) => void;
  onEditCategory: (category: CategoryData) => void;
  onDeleteCategory: (category: CategoryData) => void;
  onMoveCategory: (category: CategoryData, newGroupId: string) => void;
  /** When true, renders as a static overlay (no sortable hooks). */
  isOverlay?: boolean;
}

export function CategoryGroupSection({
  group,
  allGroups,
  onEditGroup,
  onDeleteGroup,
  onAddCategory,
  onEditCategory,
  onDeleteCategory,
  onMoveCategory,
  isOverlay,
}: CategoryGroupSectionProps) {
  // Make the group card itself sortable (for reordering groups)
  const {
    attributes,
    listeners,
    setNodeRef: setSortableNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: group.id,
    data: { type: "group" as const, group },
    disabled: isOverlay,
  });

  const categoryIds = useMemo(
    () => group.categories.map((c) => c.id),
    [group.categories]
  );

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setSortableNodeRef}
      style={style}
      className={
        "rounded-xl border bg-card shadow-sm" +
        (isDragging ? " opacity-40" : "") +
        (isOverlay ? " shadow-lg ring-2 ring-primary/20" : "")
      }
      {...attributes}
    >
      {/* Group header */}
      <div className="flex items-center justify-between border-b px-4 py-3">
        <div className="flex items-center gap-2">
          {/* Drag handle for group reordering */}
          <button
            ref={setActivatorNodeRef}
            type="button"
            className="touch-none cursor-grab text-muted-foreground/50 hover:text-muted-foreground active:cursor-grabbing"
            aria-label={`Drag ${group.name} group`}
            {...listeners}
          >
            <GripVertical className="size-4" />
          </button>
          <h3 className="font-serif text-sm font-semibold">{group.name}</h3>
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="size-7 text-muted-foreground"
            onClick={() => onAddCategory(group.id)}
            aria-label={`Add category to ${group.name}`}
          >
            <Plus className="size-4" />
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="size-7 text-muted-foreground"
                aria-label={`Actions for ${group.name} group`}
              >
                <MoreHorizontal className="size-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onEditGroup(group)}>
                <Pencil className="size-4" />
                Rename group
              </DropdownMenuItem>
              <DropdownMenuItem
                variant="destructive"
                onClick={() => onDeleteGroup(group)}
              >
                <Trash2 className="size-4" />
                Delete group
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Category rows — sortable within the group */}
      <div className="min-h-[2.5rem]">
        {isOverlay ? (
          /* Overlay: static markup — no sortable hooks needed */
          group.categories.length > 0 ? (
            <div className="divide-y">
              {group.categories.map((category) => (
                <CategoryRow
                  key={category.id}
                  category={category}
                  groups={allGroups}
                  onEdit={onEditCategory}
                  onDelete={onDeleteCategory}
                  onMove={onMoveCategory}
                  isOverlay
                />
              ))}
            </div>
          ) : (
            <div className="px-4 py-6 text-center text-sm text-muted-foreground">
              No categories in this group
            </div>
          )
        ) : (
          <SortableContext
            items={categoryIds}
            strategy={verticalListSortingStrategy}
          >
            {group.categories.length > 0 ? (
              <div className="divide-y">
                {group.categories.map((category) => (
                  <CategoryRow
                    key={category.id}
                    category={category}
                    groups={allGroups}
                    onEdit={onEditCategory}
                    onDelete={onDeleteCategory}
                    onMove={onMoveCategory}
                  />
                ))}
              </div>
            ) : (
              <div className="px-4 py-6 text-center text-sm text-muted-foreground">
                No categories in this group
              </div>
            )}
          </SortableContext>
        )}
      </div>
    </div>
  );
}
