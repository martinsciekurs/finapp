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
import {
  transactionFormSchema,
  type TransactionFormValues,
} from "@/lib/validations/transaction";
import { updateTransaction } from "@/app/dashboard/transactions/actions";
import type { TransactionData, CategoryOption } from "@/lib/types/transactions";

// ────────────────────────────────────────────
// Props
// ────────────────────────────────────────────

interface EditTransactionDialogProps {
  transaction: TransactionData;
  categories: CategoryOption[];
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
  open,
  onOpenChange,
}: EditTransactionDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<TransactionFormValues>({
    resolver: zodResolver(transactionFormSchema),
    defaultValues: toFormDefaults(transaction),
  });

  useEffect(() => {
    form.reset(toFormDefaults(transaction));
  }, [form, transaction]);

  const currentType = form.watch("type");

  const filteredCategories = categories.filter(
    (cat) => cat.type === currentType
  );

  function handleTypeChange(type: "expense" | "income") {
    form.setValue("type", type);
    form.setValue("category_id", "");
  }

  async function onSubmit(values: TransactionFormValues) {
    setIsSubmitting(true);

    try {
      const result = await updateTransaction(transaction.id, values);

      if (!result.success) {
        toast.error(result.error ?? "Failed to update transaction");
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
                        const val = e.target.value;
                        field.onChange(val === "" ? undefined : parseFloat(val));
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
