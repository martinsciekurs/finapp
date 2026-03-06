"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
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
  FormDescription,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CategoryCombobox } from "@/components/transactions/category-combobox";
import {
  reminderFormSchema,
  type ReminderFormValues,
} from "@/lib/validations/reminder";
import {
  createReminder,
  updateReminder,
} from "@/app/dashboard/reminders/actions";
import type { ReminderData } from "@/lib/types/reminder";
import type { CategoryOption } from "@/lib/types/transactions";
import { formatDateForInput } from "@/lib/utils/date";
import { FREQUENCY_OPTIONS } from "@/lib/config/reminders";
import { parseAmountInput } from "@/lib/utils/transactions";

interface ReminderFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  categories: CategoryOption[];
  /** If provided, we're editing this reminder. Otherwise creating new. */
  reminder?: ReminderData;
}

export function ReminderFormDialog({
  open,
  onOpenChange,
  categories,
  reminder,
}: ReminderFormDialogProps) {
  const isEditing = !!reminder;
  const [isSubmitting, setIsSubmitting] = useState(false);

  function getFormDefaults(r?: ReminderData) {
    return {
      title: r?.title ?? "",
      amount: r?.amount, // undefined when creating — Zod validates on submit
      due_date: r?.due_date ?? formatDateForInput(new Date()),
      frequency: r?.frequency ?? "monthly",
      category_id: r?.category_id ?? "",
      auto_create_transaction: r?.auto_create_transaction ?? true,
    };
  }

  const form = useForm<ReminderFormValues>({
    resolver: zodResolver(reminderFormSchema),
    defaultValues: getFormDefaults(reminder),
  });

  // Reset form when dialog opens or reminder prop changes to avoid stale state
  useEffect(() => {
    if (open) {
      form.reset(getFormDefaults(reminder));
    }
  }, [open, reminder, form]);

  async function onSubmit(values: ReminderFormValues) {
    setIsSubmitting(true);

    try {
      const submission = isEditing && reminder
        ? {
            run: () => updateReminder(reminder.id, values),
            successMessage: "Reminder updated",
            failureMessage: "Failed to update reminder",
          }
        : {
            run: () => createReminder(values),
            successMessage: "Reminder created",
            failureMessage: "Failed to create reminder",
          };

      const result = await submission.run();
      if (!result.success) {
        toast.error(result.error ?? submission.failureMessage);
        return;
      }
      toast.success(submission.successMessage);

      onOpenChange(false);
    } catch {
      toast.error("Something went wrong");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="font-serif">
            {isEditing ? "Edit Reminder" : "Add Reminder"}
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {/* Title */}
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Title</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="e.g. Rent, Netflix, Gym"
                      maxLength={100}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Amount & Due Date row */}
            <div className="grid gap-4 sm:grid-cols-2">
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

              <FormField
                control={form.control}
                name="due_date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Due Date</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Frequency & Category row */}
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="frequency"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Frequency</FormLabel>
                    <Select
                      value={field.value}
                      onValueChange={field.onChange}
                    >
                      <FormControl>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Select frequency" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {FREQUENCY_OPTIONS.map((opt) => (
                          <SelectItem key={opt.value} value={opt.value}>
                            {opt.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="category_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Category</FormLabel>
                    <FormControl>
                      <CategoryCombobox
                        categories={categories}
                        value={field.value}
                        onValueChange={field.onChange}
                        placeholder="Select category"
                        emptyLabel="No expense categories"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Auto-create transaction toggle */}
            <FormField
              control={form.control}
              name="auto_create_transaction"
              render={({ field }) => (
                <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-3">
                  <FormControl>
                    <input
                      type="checkbox"
                      checked={field.value}
                      onChange={field.onChange}
                      className="mt-0.5 size-4 rounded border-input accent-primary"
                    />
                  </FormControl>
                  <div className="space-y-1 leading-none">
                    <FormLabel className="cursor-pointer">
                      Auto-create transaction
                    </FormLabel>
                    <FormDescription>
                      Automatically log an expense when marking this reminder
                      as paid
                    </FormDescription>
                  </div>
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
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && (
                  <Loader2 className="size-4 animate-spin" />
                )}
                {isEditing ? "Save" : "Add"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
