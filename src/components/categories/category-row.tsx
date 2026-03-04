"use client";

import { CSS } from "@dnd-kit/utilities";
import { useSortable } from "@dnd-kit/sortable";
import {
  MoreHorizontal,
  Pencil,
  Trash2,
  ArrowRightLeft,
  GripVertical,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { CategoryIcon } from "@/components/ui/category-icon";
import type { CategoryData, CategoryGroupData } from "@/lib/types/categories";

interface CategoryRowProps {
  category: CategoryData;
  groups: CategoryGroupData[];
  onEdit: (category: CategoryData) => void;
  onDelete: (category: CategoryData) => void;
  onMove: (category: CategoryData, newGroupId: string) => void;
  /** When true the row is rendered as a static overlay (no sortable hook). */
  isOverlay?: boolean;
}

export function CategoryRow({
  category,
  groups,
  onEdit,
  onDelete,
  onMove,
  isOverlay,
}: CategoryRowProps) {
  const otherGroups = groups.filter((g) => g.id !== category.group_id);

  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: category.id,
    data: { type: "category" as const, category },
    disabled: isOverlay,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={
        "flex items-center gap-2 px-3 py-2.5" +
        (isDragging ? " opacity-40" : "") +
        (isOverlay
          ? " rounded-lg border bg-card shadow-lg"
          : "")
      }
      {...attributes}
    >
      {/* Drag handle */}
      <button
        ref={setActivatorNodeRef}
        type="button"
        className="touch-none cursor-grab text-muted-foreground/50 hover:text-muted-foreground active:cursor-grabbing"
        aria-label={`Drag ${category.name}`}
        {...listeners}
      >
        <GripVertical className="size-4" />
      </button>

      {/* Icon */}
      <span
        className="flex size-8 shrink-0 items-center justify-center rounded-lg"
        style={{ backgroundColor: category.color + "1a" }}
      >
        <span style={{ color: category.color }}>
          <CategoryIcon name={category.icon} className="size-4" />
        </span>
      </span>

      {/* Name */}
      <span className="min-w-0 flex-1 truncate text-sm font-medium">
        {category.name}
      </span>

      {/* Actions */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="size-7 text-muted-foreground"
            aria-label={`Actions for ${category.name}`}
          >
            <MoreHorizontal className="size-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => onEdit(category)}>
            <Pencil className="size-4" />
            Edit
          </DropdownMenuItem>

          {otherGroups.length > 0 && (
            <DropdownMenuSub>
              <DropdownMenuSubTrigger>
                <ArrowRightLeft className="size-4" />
                Move to group
              </DropdownMenuSubTrigger>
              <DropdownMenuSubContent>
                {otherGroups.map((group) => (
                  <DropdownMenuItem
                    key={group.id}
                    onClick={() => onMove(category, group.id)}
                  >
                    {group.name}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuSubContent>
            </DropdownMenuSub>
          )}

          <DropdownMenuItem
            variant="destructive"
            onClick={() => onDelete(category)}
          >
            <Trash2 className="size-4" />
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
