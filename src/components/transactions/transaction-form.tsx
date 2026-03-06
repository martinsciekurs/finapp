"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, Plus } from "lucide-react";
import { toast } from "sonner";
import { motion, useReducedMotion } from "framer-motion";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { formatDateForInput } from "@/lib/utils/date";
import {
  transactionFormSchema,
  type TransactionFormValues,
} from "@/lib/validations/transaction";
import { createTransaction } from "@/app/dashboard/transactions/actions";
import type { CategoryOption } from "@/lib/types/transactions";
import {
  filterCategoriesByType,
  parseAmountInput,
} from "@/lib/utils/transactions";

// ────────────────────────────────────────────
// Props
// ────────────────────────────────────────────

interface TransactionFormProps {
  categories: CategoryOption[];
}

// ────────────────────────────────────────────
// Component
// ────────────────────────────────────────────

export function TransactionForm({ categories }: TransactionFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const prefersReducedMotion = useReducedMotion();

  const today = formatDateForInput(new Date());

  const form = useForm<TransactionFormValues>({
    resolver: zodResolver(transactionFormSchema),
    defaultValues: {
      type: "expense",
      amount: undefined,
      category_id: "",
      description: "",
      date: today,
    },
  });

  const currentType = form.watch("type");

  // Filter categories to match the selected type
  const filteredCategories = filterCategoriesByType(categories, currentType);

  async function onSubmit(values: TransactionFormValues) {
    setIsSubmitting(true);

    try {
      const result = await createTransaction({
        ...values,
        source: "web",
        ai_generated: false,
      });

      if (!result.success) {
        toast.error(result.error ?? "Failed to add transaction");
        return;
      }

      toast.success(
        `${values.type === "expense" ? "Expense" : "Income"} added`
      );

      // Reset form but keep type and date
      form.reset({
        type: currentType,
        amount: undefined,
        category_id: "",
        description: "",
        date: values.date,
      });
    } catch {
      toast.error("Something went wrong");
    } finally {
      setIsSubmitting(false);
    }
  }

  // Reset category when type changes (categories are type-specific)
  function handleTypeChange(type: "expense" | "income") {
    form.setValue("type", type);
    form.setValue("category_id", "");
  }

  return (
    <motion.div
      initial={prefersReducedMotion ? false : { opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={prefersReducedMotion ? { duration: 0 } : { duration: 0.2 }}
    >
      <Form {...form}>
        <form
          onSubmit={form.handleSubmit(onSubmit)}
          className="rounded-xl border bg-card p-4 shadow-sm sm:p-6"
        >
          {/* Type toggle */}
          <div className="mb-4">
            <TransactionTypeToggle
              currentType={currentType}
              onChange={handleTypeChange}
            />
          </div>

          {/* Form fields */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
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
                      autoFocus
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
          </div>

          {/* Submit */}
          <div className="mt-4 flex justify-end">
            <Button type="submit" disabled={isSubmitting} size="sm">
              {isSubmitting ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Plus className="size-4" />
              )}
              Add {currentType === "expense" ? "Expense" : "Income"}
            </Button>
          </div>
        </form>
      </Form>
    </motion.div>
  );
}
