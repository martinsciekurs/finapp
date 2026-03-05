"use client";

import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { useState } from "react";
import { Check } from "lucide-react";

/**
 * Earthy preset colors matching the design system.
 * Pulled from the category config defaults.
 */
const PRESET_COLORS = [
  "#2d4a3e",
  "#4a8c6f",
  "#5b9a82",
  "#6b8e7b",
  "#7ab8a0",
  "#4a6a5e",
  "#5a7d8c",
  "#7ab8c9",
  "#5a8cc9",
  "#c9a84c",
  "#8b6a3a",
  "#a08c6a",
  "#c97b5e",
  "#c4a0a0",
  "#c97ba0",
  "#b08caa",
  "#9a6fb0",
  "#dc3545",
  "#8b3a3a",
  "#7a8c6f",
  "#6b6b6b",
  "#9a9a9a",
] as const;

interface ColorPickerProps {
  value: string;
  onChange: (color: string) => void;
}

export function ColorPicker({ value, onChange }: ColorPickerProps) {
  const [open, setOpen] = useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          className="size-10 p-0"
          aria-label="Pick color"
        >
          <span
            className="size-5 rounded-full border"
            style={{ backgroundColor: value }}
          />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-3" align="start">
        <p className="mb-2 text-xs font-medium text-muted-foreground">
          Choose a color
        </p>
        <div className="grid grid-cols-7 gap-1.5">
          {PRESET_COLORS.map((color) => (
            <button
              key={color}
              type="button"
              className={cn(
                "flex size-8 items-center justify-center rounded-full border transition-transform hover:scale-110",
                value === color && "ring-2 ring-primary ring-offset-2 ring-offset-background"
              )}
              style={{ backgroundColor: color }}
              onClick={() => {
                onChange(color);
                setOpen(false);
              }}
              aria-label={color}
            >
              {value === color && (
                <Check className="size-3.5 text-white" strokeWidth={3} />
              )}
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}
