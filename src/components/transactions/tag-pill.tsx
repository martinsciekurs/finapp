"use client";

import { X } from "lucide-react";
import type { TagData } from "@/lib/types/tags";

interface TagPillProps {
  tag: TagData;
  onRemove?: () => void;
}

export function TagPill({ tag, onRemove }: TagPillProps) {
  return (
    <span
      className="inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[11px] font-medium leading-none"
      style={{
        backgroundColor: `${tag.color}20`,
        color: tag.color,
      }}
    >
      {tag.name}
      {onRemove ? (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          className="ml-0.5 rounded-full p-0.5 hover:bg-foreground/10"
          aria-label={`Remove ${tag.name} tag`}
        >
          <X className="size-2.5" />
        </button>
      ) : null}
    </span>
  );
}
