"use client";

import { useState, useMemo } from "react";
import { Check, ChevronsUpDown } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { CategoryIcon } from "@/components/ui/category-icon";
import { cn } from "@/lib/utils";
import type { CategoryOption } from "@/lib/types/transactions";

// ────────────────────────────────────────────
// Types
// ────────────────────────────────────────────

interface CategoryGroup {
  id: string;
  name: string;
  categories: CategoryOption[];
}

interface CategoryComboboxProps {
  categories: CategoryOption[];
  value: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
  emptyLabel?: string;
}

// ────────────────────────────────────────────
// Component
// ────────────────────────────────────────────

export function CategoryCombobox({
  categories,
  value,
  onValueChange,
  placeholder = "Select category",
  emptyLabel = "No categories found",
}: CategoryComboboxProps) {
  const [open, setOpen] = useState(false);

  // Group categories by group_name, preserving sort order from server
  const grouped = useMemo(() => {
    const groups: CategoryGroup[] = [];
    const groupMap = new Map<string, CategoryGroup>();

    for (const cat of categories) {
      const key = cat.group_id ?? "__ungrouped__";
      let group = groupMap.get(key);
      if (!group) {
        group = { id: cat.group_id ?? key, name: cat.group_name ?? "Other", categories: [] };
        groupMap.set(key, group);
        groups.push(group);
      }
      group.categories.push(cat);
    }

    return groups;
  }, [categories]);

  // Find the selected category for display
  const selected = useMemo(
    () => categories.find((c) => c.id === value),
    [categories, value]
  );

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between font-normal"
        >
          {selected ? (
            <span className="flex items-center gap-2 truncate">
              <span style={{ color: selected.color }}>
                <CategoryIcon name={selected.icon} className="size-4" />
              </span>
              {selected.name}
            </span>
          ) : (
            <span className="text-muted-foreground">{placeholder}</span>
          )}
          <ChevronsUpDown className="size-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
        <Command>
          <CommandInput placeholder="Search categories..." />
          <CommandList onWheel={(e) => e.stopPropagation()}>
            <CommandEmpty>{emptyLabel}</CommandEmpty>
            {grouped.map((group) => (
              <CommandGroup key={group.id} heading={group.name}>
                {group.categories.map((cat) => (
                  <CommandItem
                    key={cat.id}
                    value={`${cat.name} ${group.name}`}
                    onSelect={() => {
                      onValueChange(cat.id);
                      setOpen(false);
                    }}
                  >
                    <span style={{ color: cat.color }}>
                      <CategoryIcon name={cat.icon} className="size-4" />
                    </span>
                    {cat.name}
                    <Check
                      className={cn(
                        "ml-auto size-4",
                        value === cat.id ? "opacity-100" : "opacity-0"
                      )}
                    />
                  </CommandItem>
                ))}
              </CommandGroup>
            ))}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
