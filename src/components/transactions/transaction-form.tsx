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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CategoryIcon } from "@/components/ui/category-icon";
import { cn } from "@/lib/utils";
import { formatDateForInput } from "@/lib/utils/date";
import {
  transactionFormSchema,
  type TransactionFormValues,
} from "@/lib/validations/transaction";
import { createTransaction } from "@/app/dashboard/transactions/actions";
import type { CategoryOption } from "@/lib/types/transactions";

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
  const filteredCategories = categories.filter(
    (cat) => cat.type === currentType
  );

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
        date: today,
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
            <div
              className="inline-flex rounded-lg border bg-muted p-0.5"
              role="radiogroup"
              aria-label="Transaction type"
            >
              <button
                type="button"
                role="radio"
                aria-checked={currentType === "expense"}
                className={cn(
                  "rounded-md px-4 py-1.5 text-sm font-medium transition-all",
                  currentType === "expense"
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                )}
                onClick={() => handleTypeChange("expense")}
              >
                Expense
              </button>
              <button
                type="button"
                role="radio"
                aria-checked={currentType === "income"}
                className={cn(
                  "rounded-md px-4 py-1.5 text-sm font-medium transition-all",
                  currentType === "income"
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                )}
                onClick={() => handleTypeChange("income")}
              >
                Income
              </button>
            </div>
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
                  <Select
                    value={field.value}
                    onValueChange={field.onChange}
                  >
                    <FormControl>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {filteredCategories.map((cat) => (
                        <SelectItem key={cat.id} value={cat.id}>
                          <CategoryIcon
                            name={cat.icon}
                            className="size-4 text-muted-foreground"
                          />
                          {cat.name}
                        </SelectItem>
                      ))}
                      {filteredCategories.length === 0 && (
                        <div className="px-2 py-4 text-center text-sm text-muted-foreground">
                          No {currentType} categories
                        </div>
                      )}
                    </SelectContent>
                  </Select>
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
