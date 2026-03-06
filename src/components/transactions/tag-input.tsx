"use client";

import { useState, useMemo } from "react";
import { Plus } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";

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
import { TagPill } from "./tag-pill";
import { TAG_COLORS, MAX_TAGS_PER_TRANSACTION } from "@/lib/config/tags";
import type { TagData } from "@/lib/types/tags";

interface TagInputProps {
  selectedTags: TagData[];
  availableTags: TagData[];
  onTagAdd: (tag: TagData) => void;
  onTagRemove: (tagId: string) => void;
  onCreateTag: (name: string, color: string) => Promise<TagData | null>;
  disabled?: boolean;
}

export function TagInput({
  selectedTags,
  availableTags,
  onTagAdd,
  onTagRemove,
  onCreateTag,
  disabled = false,
}: TagInputProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [creatingName, setCreatingName] = useState<string | null>(null);

  const atLimit = selectedTags.length >= MAX_TAGS_PER_TRANSACTION;
  const selectedIds = useMemo(
    () => new Set(selectedTags.map((t) => t.id)),
    [selectedTags]
  );

  const filteredTags = useMemo(() => {
    const unselected = availableTags.filter((t) => !selectedIds.has(t.id));
    if (!search.trim()) return unselected;
    const q = search.toLowerCase();
    return unselected.filter((t) => t.name.toLowerCase().includes(q));
  }, [availableTags, selectedIds, search]);

  const showCreateOption =
    search.trim().length > 0 &&
    !availableTags.some(
      (t) => t.name.toLowerCase() === search.trim().toLowerCase()
    );

  function handleSelect(tag: TagData) {
    onTagAdd(tag);
    setSearch("");
    setOpen(false);
  }

  function handleCreateClick() {
    setCreatingName(search.trim());
  }

  async function handleColorPick(color: string) {
    if (!creatingName) return;
    const newTag = await onCreateTag(creatingName, color);
    if (newTag) {
      onTagAdd(newTag);
    }
    setCreatingName(null);
    setSearch("");
    setOpen(false);
  }

  return (
    <div className="flex flex-wrap items-center gap-1">
      <AnimatePresence mode="popLayout">
        {selectedTags.map((tag) => (
          <motion.div
            key={tag.id}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            transition={{ duration: 0.15 }}
          >
            <TagPill tag={tag} onRemove={() => onTagRemove(tag.id)} />
          </motion.div>
        ))}
      </AnimatePresence>

      {atLimit ? (
        <span className="text-[11px] text-muted-foreground">
          {MAX_TAGS_PER_TRANSACTION}/{MAX_TAGS_PER_TRANSACTION} tags
        </span>
      ) : (
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="ghost"
              size="xs"
              className="h-5 gap-0.5 rounded-full px-1.5 text-[11px] text-muted-foreground"
              disabled={disabled || atLimit}
              aria-label="Add tags"
            >
              <Plus className="size-3" />
              Tags
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-56 p-0" align="start">
            {creatingName ? (
              <div className="p-3" data-testid="color-palette">
                <p className="mb-2 text-xs font-medium text-muted-foreground">
                  Pick a color for &quot;{creatingName}&quot;
                </p>
                <div className="grid grid-cols-6 gap-1.5">
                  {TAG_COLORS.map((color) => (
                    <button
                      key={color}
                      type="button"
                      className="flex size-6 items-center justify-center rounded-full border transition-transform hover:scale-110"
                      style={{ backgroundColor: color }}
                      onClick={() => handleColorPick(color)}
                      aria-label={color}
                    />
                  ))}
                </div>
              </div>
            ) : (
              <Command>
                <CommandInput
                  placeholder="Search tags..."
                  value={search}
                  onValueChange={setSearch}
                />
                <CommandList>
                  <CommandEmpty>No tags found</CommandEmpty>
                  <CommandGroup>
                    {filteredTags.map((tag) => (
                      <CommandItem
                        key={tag.id}
                        value={tag.name}
                        onSelect={() => handleSelect(tag)}
                      >
                        <span
                          className="size-2.5 rounded-full"
                          style={{ backgroundColor: tag.color }}
                        />
                        {tag.name}
                      </CommandItem>
                    ))}
                    {showCreateOption && (
                      <CommandItem
                        value={`create-${search}`}
                        onSelect={handleCreateClick}
                      >
                        <Plus className="size-3" />
                        Create &quot;{search.trim()}&quot;
                      </CommandItem>
                    )}
                  </CommandGroup>
                </CommandList>
              </Command>
            )}
          </PopoverContent>
        </Popover>
      )}
    </div>
  );
}
