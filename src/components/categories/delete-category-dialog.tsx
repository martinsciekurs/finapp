"use client";

import { useState, useEffect } from "react";
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
import { CategoryIcon } from "@/components/ui/category-icon";
import {
  deleteCategory,
  getCategoryTransactionCount,
} from "@/app/dashboard/settings/categories/actions";
import type { CategoryData, CategoryGroupData } from "@/lib/types/categories";

interface DeleteCategoryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  category: CategoryData;
  groups: CategoryGroupData[];
}

export function DeleteCategoryDialog({
  open,
  onOpenChange,
  category,
  groups,
}: DeleteCategoryDialogProps) {
  const [isDeleting, setIsDeleting] = useState(false);
  const [transactionCount, setTransactionCount] = useState<number | null>(null);
  const [reassignTo, setReassignTo] = useState<string>("");
  const [isLoading, setIsLoading] = useState(true);

  // Get all other categories of the same type for reassignment
  const otherCategories = groups
    .flatMap((g) => g.categories)
    .filter((c) => c.id !== category.id && c.type === category.type);

  useEffect(() => {
    if (!open) return;

    setIsLoading(true);
    setReassignTo("");

    getCategoryTransactionCount(category.id)
      .then((result) =>
        setTransactionCount(result.success ? result.data?.count ?? 0 : 0)
      )
      .catch(() => setTransactionCount(0))
      .finally(() => setIsLoading(false));
  }, [open, category.id]);

  const hasTransactions = (transactionCount ?? 0) > 0;

  async function handleDelete() {
    if (hasTransactions && !reassignTo) {
      toast.error("Select a category to reassign transactions to");
      return;
    }

    setIsDeleting(true);

    try {
      const result = await deleteCategory({
        id: category.id,
        reassign_to: hasTransactions ? reassignTo : undefined,
      });

      if (!result.success) {
        toast.error(result.error ?? "Failed to delete category");
        return;
      }

      toast.success("Category deleted");
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
          <DialogTitle className="font-serif">Delete Category</DialogTitle>
          <DialogDescription>
            Are you sure you want to delete &ldquo;{category.name}&rdquo;?
            This action cannot be undone.
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-4">
            <Loader2 className="size-5 animate-spin text-muted-foreground" />
          </div>
        ) : hasTransactions ? (
          <div className="space-y-3">
            <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 dark:border-amber-900 dark:bg-amber-950/50">
              <AlertTriangle className="mt-0.5 size-4 shrink-0 text-amber-600 dark:text-amber-500" />
              <p className="text-sm text-amber-800 dark:text-amber-200">
                This category has{" "}
                <span className="font-semibold">{transactionCount}</span>{" "}
                transaction{transactionCount !== 1 ? "s" : ""}. Choose a
                category to reassign them to.
              </p>
            </div>
            <Select value={reassignTo} onValueChange={setReassignTo}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Reassign to..." />
              </SelectTrigger>
              <SelectContent>
                {otherCategories.map((cat) => (
                  <SelectItem key={cat.id} value={cat.id}>
                    <CategoryIcon
                      name={cat.icon}
                      className="size-4 text-muted-foreground"
                    />
                    {cat.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        ) : null}

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
            disabled={isDeleting || isLoading || (hasTransactions && !reassignTo)}
          >
            {isDeleting && <Loader2 className="size-4 animate-spin" />}
            Delete
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
