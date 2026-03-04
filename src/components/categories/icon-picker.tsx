"use client";

import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { CategoryIcon } from "@/components/ui/category-icon";
import { categoryIconNames } from "@/lib/validations/category";
import { cn } from "@/lib/utils";
import { useState } from "react";

interface IconPickerProps {
  value: string;
  onChange: (icon: string) => void;
  color?: string;
}

export function IconPicker({ value, onChange, color }: IconPickerProps) {
  const [open, setOpen] = useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          className="size-10 p-0"
          aria-label="Pick icon"
        >
          <span style={color ? { color } : undefined}>
            <CategoryIcon name={value} className="size-5" />
          </span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-3" align="start">
        <p className="mb-2 text-xs font-medium text-muted-foreground">
          Choose an icon
        </p>
        <div className="grid grid-cols-7 gap-1">
          {categoryIconNames.map((iconName) => (
            <button
              key={iconName}
              type="button"
              className={cn(
                "flex size-8 items-center justify-center rounded-md transition-colors hover:bg-accent",
                value === iconName && "bg-accent ring-2 ring-primary"
              )}
              onClick={() => {
                onChange(iconName);
                setOpen(false);
              }}
              aria-label={iconName}
            >
              <span style={color ? { color } : undefined}>
                <CategoryIcon name={iconName} className="size-4" />
              </span>
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}
