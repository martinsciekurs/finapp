"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, Save } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { CategoryCombobox } from "./category-combobox";
import { TransactionTypeToggle } from "./transaction-type-toggle";
import { TagInput } from "./tag-input";
import {
  transactionFormSchema,
  type TransactionFormValues,
} from "@/lib/validations/transaction";
import { updateTransaction } from "@/app/dashboard/transactions/actions";
import { createTag, assignTagToTransaction, removeTagFromTransaction } from "@/app/dashboard/transactions/tag-actions";
import type { TransactionData, CategoryOption } from "@/lib/types/transactions";
import type { TagData } from "@/lib/types/tags";
import {
  filterCategoriesByType,
  parseAmountInput,
} from "@/lib/utils/transactions";

// ────────────────────────────────────────────
// Props
// ────────────────────────────────────────────

interface EditTransactionDialogProps {
  transaction: TransactionData;
  categories: CategoryOption[];
  userTags: TagData[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function toFormDefaults(transaction: TransactionData): TransactionFormValues {
  return {
    type: transaction.type,
    amount: transaction.amount,
    category_id: transaction.categoryId,
    description: transaction.description,
    date: transaction.date,
  };
}

// ────────────────────────────────────────────
// Component
// ────────────────────────────────────────────

export function EditTransactionDialog({
  transaction,
  categories,
  userTags,
  open,
  onOpenChange,
}: EditTransactionDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [localTags, setLocalTags] = useState<TagData[]>(transaction.tags);
  const [pendingAddIds, setPendingAddIds] = useState<Set<string>>(new Set());
  const [pendingRemoveIds, setPendingRemoveIds] = useState<Set<string>>(new Set());
  const [pendingNewTags, setPendingNewTags] = useState<TagData[]>([]);

  const form = useForm<TransactionFormValues>({
    resolver: zodResolver(transactionFormSchema),
    defaultValues: toFormDefaults(transaction),
  });

  useEffect(() => {
    form.reset(toFormDefaults(transaction));
  }, [form, transaction]);

  useEffect(() => {
    setLocalTags(transaction.tags);
    setPendingAddIds(new Set());
    setPendingRemoveIds(new Set());
    setPendingNewTags([]);
  }, [transaction]);

  const currentType = form.watch("type");

  const filteredCategories = filterCategoriesByType(categories, currentType);

  function handleTypeChange(type: "expense" | "income") {
    form.setValue("type", type);
    form.setValue("category_id", "");
  }

  function handleTagAdd(tag: TagData) {
    setLocalTags((prev) => [...prev, tag]);
    setPendingRemoveIds((prev) => {
      const next = new Set(prev);
      next.delete(tag.id);
      return next;
    });
    if (!transaction.tags.some((t) => t.id === tag.id)) {
      setPendingAddIds((prev) => new Set(prev).add(tag.id));
    }
  }

  function handleTagRemove(tagId: string) {
    setLocalTags((prev) => prev.filter((t) => t.id !== tagId));
    setPendingAddIds((prev) => {
      const next = new Set(prev);
      next.delete(tagId);
      return next;
    });
    const isNewTag = pendingNewTags.some((t) => t.id === tagId);
    if (isNewTag) {
      setPendingNewTags((prev) => prev.filter((t) => t.id !== tagId));
    } else if (transaction.tags.some((t) => t.id === tagId)) {
      setPendingRemoveIds((prev) => new Set(prev).add(tagId));
    }
  }

  function handleCreateTag(name: string, color: string): Promise<TagData | null> {
    const tempId = `temp-${crypto.randomUUID()}`;
    const tempTag: TagData = { id: tempId, name, color };
    setLocalTags((prev) => [...prev, tempTag]);
    setPendingNewTags((prev) => [...prev, tempTag]);
    return Promise.resolve(tempTag);
  }

  async function onSubmit(values: TransactionFormValues) {
    setIsSubmitting(true);

    try {
      const result = await updateTransaction(transaction.id, values);

      if (!result.success) {
        toast.error(result.error ?? "Failed to update transaction");
        return;
      }

      const errors: string[] = [];

      // Create new tags and replace temp IDs with real IDs
      const createdTagIdMap = new Map<string, string>();
      for (const newTag of pendingNewTags) {
        const createResult = await createTag({ name: newTag.name, color: newTag.color });
        if (!createResult.success || !createResult.data) {
          errors.push(createResult.error ?? `Failed to create tag "${newTag.name}"`);
        } else {
          createdTagIdMap.set(newTag.id, createResult.data.id);
        }
      }

      // Assign tags (both existing and newly created)
      const idsToAssign = new Set<string>();
      for (const id of pendingAddIds) idsToAssign.add(id);
      for (const newTag of pendingNewTags) {
        const realId = createdTagIdMap.get(newTag.id);
        if (realId) idsToAssign.add(realId);
      }

      const assignResults = await Promise.all(
        [...idsToAssign].map((tagId) => assignTagToTransaction(transaction.id, tagId))
      );
      for (const r of assignResults) {
        if (!r.success) errors.push(r.error ?? "Failed to assign tag");
      }

      // Remove tags
      const removeResults = await Promise.all(
        [...pendingRemoveIds].map((tagId) => removeTagFromTransaction(transaction.id, tagId))
      );
      for (const r of removeResults) {
        if (!r.success) errors.push(r.error ?? "Failed to remove tag");
      }

      if (errors.length > 0) {
        toast.error(errors[0]);
        return;
      }

      toast.success("Transaction updated");
      onOpenChange(false);
    } catch {
      toast.error("Something went wrong");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Transaction</DialogTitle>
          <DialogDescription>
            Update the details of this transaction.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="space-y-4"
          >
            {/* Type toggle */}
            <TransactionTypeToggle
              currentType={currentType}
              onChange={handleTypeChange}
            />

            {/* Amount */}
            <FormField
              control={form.control}
              name="amount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Amount</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      step="0.01"
                      min="0.01"
                      placeholder="0.00"
                      {...field}
                      value={field.value ?? ""}
                      onChange={(e) => {
                        field.onChange(parseAmountInput(e.target.value));
                      }}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Category */}
            <FormField
              control={form.control}
              name="category_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Category</FormLabel>
                  <FormControl>
                    <CategoryCombobox
                      categories={filteredCategories}
                      value={field.value}
                      onValueChange={field.onChange}
                      emptyLabel={`No ${currentType} categories`}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Description */}
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="What was this for?"
                      maxLength={500}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Date */}
            <FormField
              control={form.control}
              name="date"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Date</FormLabel>
                  <FormControl>
                    <Input type="date" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div>
              <label className="text-sm font-medium">Tags</label>
              <TagInput
                selectedTags={localTags}
                availableTags={userTags}
                onTagAdd={handleTagAdd}
                onTagRemove={handleTagRemove}
                onCreateTag={handleCreateTag}
              />
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting} size="sm">
                {isSubmitting ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Save className="size-4" />
                )}
                Save Changes
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
