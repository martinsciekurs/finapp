"use client";

import { useState, useMemo } from "react";
import { Check, Filter } from "lucide-react";

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
import type { CategoryOption, TransactionData } from "@/lib/types/transactions";

interface CategoryGroup {
  id: string;
  name: string;
  categories: CategoryOption[];
}

interface TransactionCategoryFilterProps {
  categories: CategoryOption[];
  value: string | null;
  onChange: (categoryId: string | null) => void;
}

export function filterByCategory(
  transactions: TransactionData[],
  categoryId: string | null
): TransactionData[] {
  if (!categoryId) return transactions;
  return transactions.filter((tx) => tx.categoryId === categoryId);
}

export function TransactionCategoryFilter({
  categories,
  value,
  onChange,
}: TransactionCategoryFilterProps) {
  const [open, setOpen] = useState(false);

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

  const selected = useMemo(
    () => categories.find((c) => c.id === value),
    [categories, value]
  );

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="max-w-full min-w-0 gap-2"
        >
          <Filter className="size-4" />
          {selected ? (
            <span className="flex min-w-0 items-center gap-2 truncate">
              <span
                style={{ "--cat-color": selected.color } as React.CSSProperties}
                className="text-[color:var(--cat-color)]"
              >
                <CategoryIcon name={selected.icon} className="size-4" />
              </span>
              {selected.name}
            </span>
          ) : (
            <span>All Categories</span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
        <Command>
          <CommandInput placeholder="Search categories..." />
          <CommandList onWheel={(e) => e.stopPropagation()}>
            <CommandEmpty>No categories found</CommandEmpty>
            <CommandItem
              value="all-categories"
              onSelect={() => {
                onChange(null);
                setOpen(false);
              }}
            >
              <Check
                className={cn(
                  "size-4",
                  value === null ? "opacity-100" : "opacity-0"
                )}
              />
              All Categories
            </CommandItem>
            {grouped.map((group) => (
              <CommandGroup key={group.id} heading={group.name}>
                {group.categories.map((cat) => (
                  <CommandItem
                    key={cat.id}
                    value={`${cat.name} ${group.name}`}
                    onSelect={() => {
                      onChange(cat.id);
                      setOpen(false);
                    }}
                  >
                    <span
                      style={{ "--cat-color": cat.color } as React.CSSProperties}
                      className="text-[color:var(--cat-color)]"
                    >
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
