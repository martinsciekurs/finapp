"use client";

import { useState } from "react";
import { Loader2, AlertTriangle } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { deleteGroup } from "@/app/dashboard/settings/categories/actions";
import type { CategoryGroupData } from "@/lib/types/categories";

interface DeleteGroupDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  group: CategoryGroupData;
  allGroups: CategoryGroupData[];
}

export function DeleteGroupDialog({
  open,
  onOpenChange,
  group,
  allGroups,
}: DeleteGroupDialogProps) {
  const [isDeleting, setIsDeleting] = useState(false);
  const [reassignTo, setReassignTo] = useState<string>("");

  const otherGroups = allGroups.filter(
    (g) => g.id !== group.id && g.type === group.type
  );
  const hasCategories = group.categories.length > 0;

  async function handleDelete() {
    if (hasCategories && !reassignTo) {
      toast.error("Select a group to move categories to");
      return;
    }

    setIsDeleting(true);

    try {
      const result = await deleteGroup({
        id: group.id,
        reassign_to: hasCategories ? reassignTo : undefined,
      });

      if (!result.success) {
        toast.error(result.error ?? "Failed to delete group");
        return;
      }

      toast.success("Group deleted");
      onOpenChange(false);
    } catch {
      toast.error("Something went wrong");
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="font-serif">Delete Group</DialogTitle>
          <DialogDescription>
            Are you sure you want to delete the &ldquo;{group.name}&rdquo;
            group? This action cannot be undone.
          </DialogDescription>
        </DialogHeader>

        {hasCategories && (
          <div className="space-y-3">
            <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 dark:border-amber-900 dark:bg-amber-950/50">
              <AlertTriangle className="mt-0.5 size-4 shrink-0 text-amber-600 dark:text-amber-500" />
              <p className="text-sm text-amber-800 dark:text-amber-200">
                This group has{" "}
                <span className="font-semibold">
                  {group.categories.length}
                </span>{" "}
                categor{group.categories.length !== 1 ? "ies" : "y"}. Choose a
                group to move them to.
              </p>
            </div>
            <Select value={reassignTo} onValueChange={setReassignTo}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Move categories to..." />
              </SelectTrigger>
              <SelectContent>
                {otherGroups.map((g) => (
                  <SelectItem key={g.id} value={g.id}>
                    {g.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isDeleting}
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={handleDelete}
            disabled={isDeleting || (hasCategories && !reassignTo)}
          >
            {isDeleting && <Loader2 className="size-4 animate-spin" />}
            Delete
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
