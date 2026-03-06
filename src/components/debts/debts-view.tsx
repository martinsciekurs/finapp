"use client";

import { useEffect, useMemo, useState, type ComponentType } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  HandCoins,
  Landmark,
  Loader2,
  Paperclip,
  Pencil,
  Plus,
  Scale,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";

import { CategoryCombobox } from "@/components/transactions/category-combobox";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
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

import { formatCurrency } from "@/lib/utils/currency";
import { formatDate } from "@/lib/utils/date";
import {
  createDebtSchema,
  createDebtPaymentSchema,
  updateDebtSchema,
  updateDebtPaymentSchema,
  type CreateDebtValues,
  type CreateDebtPaymentValues,
  type UpdateDebtValues,
  type UpdateDebtPaymentValues,
} from "@/lib/validations/debt";
import type { DebtData, DebtsPageData, DebtType } from "@/lib/types/debt";
import type { CategoryOption } from "@/lib/types/transactions";
import {
  createDebt,
  deleteDebt,
  deleteDebtPayment,
  recordDebtPayment,
  updateDebt,
  updateDebtPayment,
} from "@/app/dashboard/debts/actions";
import { cn } from "@/lib/utils";
import { formatDateForInput } from "@/lib/utils/date";
import { Attachments } from "@/components/attachments/attachments";

interface DebtsViewProps {
  data: DebtsPageData;
  categories: CategoryOption[];
  currency: string;
}

function debtToFormValues(debt: DebtData): UpdateDebtValues {
  return {
    id: debt.id,
    counterparty: debt.counterparty,
    type: debt.type,
    category_id: debt.categoryId ?? "",
    debt_date: debt.debtDate,
    original_amount: debt.originalAmount,
    description: debt.description ?? "",
  };
}

function debtExpectedCategoryType(debtType: DebtType): "expense" | "income" {
  return debtType === "i_owe" ? "expense" : "income";
}

function SummaryCard({
  label,
  value,
  currency,
  icon: Icon,
  className,
}: {
  label: string;
  value: number;
  currency: string;
  icon: ComponentType<{ className?: string }>;
  className?: string;
}) {
  return (
    <Card className="gap-0 py-4">
      <CardContent className="space-y-2">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Icon className="size-4" />
          <span>{label}</span>
        </div>
        <p className={cn("text-xl font-semibold tabular-nums", className)}>
          {formatCurrency(value, currency)}
        </p>
      </CardContent>
    </Card>
  );
}

function AddDebtDialog({
  open,
  onOpenChange,
  categories,
  debt,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  categories: CategoryOption[];
  debt?: DebtData;
}) {
  const isEditing = !!debt;
  const [isSubmitting, setIsSubmitting] = useState(false);

  const debtFormSchema = isEditing ? updateDebtSchema : createDebtSchema;

  const form = useForm<CreateDebtValues | UpdateDebtValues>({
    resolver: zodResolver(debtFormSchema),
    defaultValues: {
      ...(isEditing && debt
        ? debtToFormValues(debt)
        : {
            counterparty: "",
            type: "i_owe",
            category_id: "",
            debt_date: formatDateForInput(new Date()),
            original_amount: undefined,
            description: "",
          }),
    },
  });

  const type = form.watch("type") as DebtType;
  const selectedCategoryId = form.watch("category_id") as string;

  const filteredCategories = useMemo(() => {
    const expectedType = debtExpectedCategoryType(type);
    return categories.filter((category) => category.type === expectedType);
  }, [categories, type]);

  useEffect(() => {
    if (!selectedCategoryId) return;
    const stillValid = filteredCategories.some(
      (category) => category.id === selectedCategoryId
    );
    if (!stillValid) {
      form.setValue("category_id", "", { shouldValidate: true });
    }
  }, [filteredCategories, form, selectedCategoryId]);

  useEffect(() => {
    if (open) {
      if (isEditing && debt) {
        form.reset(debtToFormValues(debt));
      } else {
        form.reset({
          counterparty: "",
          type: "i_owe",
          category_id: "",
          debt_date: formatDateForInput(new Date()),
          original_amount: undefined,
          description: "",
        });
      }
    }
  }, [debt, form, isEditing, open]);

  async function onSubmit(values: CreateDebtValues | UpdateDebtValues) {
    setIsSubmitting(true);
    try {
      const result = isEditing
        ? await updateDebt(values as UpdateDebtValues)
        : await createDebt(values as CreateDebtValues);

      if (!result.success) {
        toast.error(result.error ?? `Failed to ${isEditing ? "update" : "create"} debt`);
        return;
      }

      toast.success(isEditing ? "Debt updated" : "Debt added");
      form.reset();
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
          <DialogTitle>{isEditing ? "Edit Debt" : "Add Debt"}</DialogTitle>
          <DialogDescription>
            Track money you owe or money others owe you.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="counterparty"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Counterparty</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="e.g. John, Bank, Landlord"
                      maxLength={100}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Direction</FormLabel>
                  <div className="flex rounded-lg border bg-muted p-0.5">
                    <button
                      type="button"
                      onClick={() => field.onChange("i_owe")}
                      className={cn(
                        "flex-1 rounded-md px-3 py-1.5 text-sm font-medium transition-all",
                        field.value === "i_owe"
                          ? "bg-background text-foreground shadow-sm"
                          : "text-muted-foreground"
                      )}
                    >
                      I owe
                    </button>
                    <button
                      type="button"
                      onClick={() => field.onChange("they_owe")}
                      className={cn(
                        "flex-1 rounded-md px-3 py-1.5 text-sm font-medium transition-all",
                        field.value === "they_owe"
                          ? "bg-background text-foreground shadow-sm"
                          : "text-muted-foreground"
                      )}
                    >
                      They owe me
                    </button>
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="original_amount"
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
                          const val = e.target.value;
                          field.onChange(val === "" ? undefined : Number(val));
                        }}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="debt_date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Debt Date</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
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
                        categories={filteredCategories}
                        value={field.value ?? ""}
                        onValueChange={field.onChange}
                        placeholder="Select category"
                        emptyLabel={`No ${debtExpectedCategoryType(type)} categories`}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description (optional)</FormLabel>
                  <FormControl>
                    <Input placeholder="Context or note" maxLength={500} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                disabled={isSubmitting}
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="size-4 animate-spin" />}
                {isEditing ? "Save changes" : "Add Debt"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

function LogPaymentDialog({
  debt,
  payment,
  currency,
  open,
  onOpenChange,
}: {
  debt: DebtData;
  payment?: DebtData["payments"][number];
  currency: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const isEditing = !!payment;
  const [isSubmitting, setIsSubmitting] = useState(false);

  const paymentSchema = isEditing ? updateDebtPaymentSchema : createDebtPaymentSchema;

  const form = useForm<CreateDebtPaymentValues | UpdateDebtPaymentValues>({
    resolver: zodResolver(paymentSchema),
    defaultValues: {
      ...(isEditing && payment
        ? {
            id: payment.id,
            amount: payment.amount,
            payment_date: payment.paymentDate,
            note: payment.note ?? "",
          }
        : {
            debt_id: debt.id,
            amount: undefined,
            payment_date: formatDateForInput(new Date()),
            note: "",
          }),
    },
  });

  useEffect(() => {
    if (!open) return;

    if (isEditing && payment) {
      form.reset({
        id: payment.id,
        amount: payment.amount,
        payment_date: payment.paymentDate,
        note: payment.note ?? "",
      });
      return;
    }

    form.reset({
      debt_id: debt.id,
      amount: undefined,
      payment_date: formatDateForInput(new Date()),
      note: "",
    });
  }, [debt.id, form, isEditing, open, payment]);

  async function onSubmit(values: CreateDebtPaymentValues | UpdateDebtPaymentValues) {
    setIsSubmitting(true);
    try {
      const result = isEditing
        ? await updateDebtPayment(values as UpdateDebtPaymentValues)
        : await recordDebtPayment(values as CreateDebtPaymentValues);

      if (!result.success) {
        toast.error(result.error ?? `Failed to ${isEditing ? "update" : "record"} payment`);
        return;
      }

      toast.success(isEditing ? "Payment updated" : "Payment recorded");
      form.reset();
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
          <DialogTitle>{isEditing ? "Edit Payment" : "Log Payment"}</DialogTitle>
          <DialogDescription>
            {debt.type === "i_owe"
              ? `Record a payment you made to ${debt.counterparty}.`
              : `Record a payment received from ${debt.counterparty}.`}
            {isEditing ? " Updating the payment amount will also update the related transaction amount." : ""}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="rounded-md border bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
              Remaining: <span className="font-medium">{formatCurrency(debt.remainingAmount + (payment?.amount ?? 0), currency)}</span>
            </div>

            <FormField
              control={form.control}
              name="amount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Payment Amount</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      step="0.01"
                      min="0.01"
                      max={debt.remainingAmount + (payment?.amount ?? 0)}
                      placeholder="0.00"
                      value={field.value ?? ""}
                      onChange={(e) => {
                        const val = e.target.value;
                        field.onChange(val === "" ? undefined : Number(val));
                      }}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="payment_date"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Payment Date</FormLabel>
                  <FormControl>
                    <Input type="date" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="note"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Note (optional)</FormLabel>
                  <FormControl>
                    <Input placeholder="Add a short note" maxLength={500} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                disabled={isSubmitting}
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="size-4 animate-spin" />}
                {isEditing ? "Save changes" : "Save Payment"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

function DeleteDebtPaymentDialog({
  debt,
  payment,
  currency,
  open,
  onOpenChange,
}: {
  debt: DebtData;
  payment: DebtData["payments"][number];
  currency: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [isDeleting, setIsDeleting] = useState(false);

  async function handleDelete() {
    setIsDeleting(true);
    try {
      const result = await deleteDebtPayment({ id: payment.id });
      if (!result.success) {
        toast.error(result.error ?? "Failed to delete payment");
        return;
      }

      toast.success("Payment deleted");
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
          <DialogTitle>Delete Payment</DialogTitle>
          <DialogDescription>
            Delete {formatCurrency(payment.amount, currency)} payment for {debt.counterparty}? The
            linked transaction will also be deleted.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button
            variant="outline"
            disabled={isDeleting}
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button variant="destructive" disabled={isDeleting} onClick={handleDelete}>
            {isDeleting && <Loader2 className="size-4 animate-spin" />}
            Delete payment
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function DeleteDebtDialog({
  debt,
  open,
  onOpenChange,
}: {
  debt: DebtData;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [isDeleting, setIsDeleting] = useState(false);

  const linkedTransactionCount = debt.payments.filter((payment) => payment.transactionId).length;
  const hasLinkedTransactions = linkedTransactionCount > 0;

  async function handleDelete(deleteLinkedTransactions = false) {
    setIsDeleting(true);
    try {
      const result = await deleteDebt({
        id: debt.id,
        delete_linked_transactions: deleteLinkedTransactions,
      });
      if (!result.success) {
        toast.error(result.error ?? "Failed to delete debt");
        return;
      }

      toast.success("Debt deleted");
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
          <DialogTitle>Delete Debt</DialogTitle>
          <DialogDescription>
            Delete debt with {debt.counterparty}? This action cannot be undone.
          </DialogDescription>
        </DialogHeader>
        {hasLinkedTransactions ? (
          <div className="space-y-3">
            <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 dark:border-amber-900 dark:bg-amber-950/50">
              <AlertTriangle className="mt-0.5 size-4 shrink-0 text-amber-600 dark:text-amber-500" />
              <p className="text-sm text-amber-800 dark:text-amber-200">
                This debt has <span className="font-semibold">{linkedTransactionCount}</span>{" "}
                linked transaction{linkedTransactionCount !== 1 ? "s" : ""}. Choose whether
                to keep them in Transactions or delete them too.
              </p>
            </div>
          </div>
        ) : null}
        <DialogFooter>
          <Button
            variant="outline"
            disabled={isDeleting}
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          {hasLinkedTransactions ? (
            <>
              <Button variant="outline" disabled={isDeleting} onClick={() => handleDelete(false)}>
                {isDeleting && <Loader2 className="size-4 animate-spin" />}
                Delete debt only
              </Button>
              <Button variant="destructive" disabled={isDeleting} onClick={() => handleDelete(true)}>
                {isDeleting && <Loader2 className="size-4 animate-spin" />}
                Delete debt and transactions
              </Button>
            </>
          ) : (
            <Button variant="destructive" disabled={isDeleting} onClick={() => handleDelete(false)}>
              {isDeleting && <Loader2 className="size-4 animate-spin" />}
              Delete
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function DebtCard({
  debt,
  currency,
  onLogPayment,
  onEditDebt,
  onDelete,
  onEditPayment,
  onDeletePayment,
}: {
  debt: DebtData;
  currency: string;
  onLogPayment: (debt: DebtData) => void;
  onEditDebt: (debt: DebtData) => void;
  onDelete: (debt: DebtData) => void;
  onEditPayment: (debt: DebtData, payment: DebtData["payments"][number]) => void;
  onDeletePayment: (debt: DebtData, payment: DebtData["payments"][number]) => void;
}) {
  const [attachmentsExpanded, setAttachmentsExpanded] = useState(false);
  const paidAmount = debt.originalAmount - debt.remainingAmount;
  const progress = debt.originalAmount > 0 ? Math.min((paidAmount / debt.originalAmount) * 100, 100) : 0;
  const isSettled = debt.remainingAmount === 0;
  const attachmentCount = debt.attachments.length;

  return (
    <Card className="gap-0 py-4">
      <CardHeader className="gap-2">
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardTitle className="text-base">{debt.counterparty}</CardTitle>
            {debt.description && (
              <p className="mt-1 text-xs text-muted-foreground">{debt.description}</p>
            )}
          </div>

          <div className="flex items-center gap-2">
            {isSettled ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-success/15 px-2 py-0.5 text-xs font-medium text-success">
                <CheckCircle2 className="size-3.5" />
                Settled
              </span>
            ) : null}
            <Button size="icon-xs" variant="ghost" onClick={() => onEditDebt(debt)} aria-label="Edit debt">
              <Pencil className="size-3.5" />
            </Button>
            <Button size="icon-xs" variant="ghost" className="text-destructive" onClick={() => onDelete(debt)} aria-label="Delete debt">
              <Trash2 className="size-3.5" />
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        <div className="space-y-1">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>Remaining</span>
            <span className="tabular-nums">
              {formatCurrency(debt.remainingAmount, currency)} / {formatCurrency(debt.originalAmount, currency)}
            </span>
          </div>
          <div className="h-2 rounded-full bg-muted" role="progressbar" aria-valuenow={Math.round(progress)} aria-valuemin={0} aria-valuemax={100} aria-label={`${debt.counterparty}: ${Math.round(progress)}% repaid`}>
            <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${progress}%` }} />
          </div>
        </div>

        <div className="flex items-center justify-between gap-3 text-xs text-muted-foreground">
          <span>Debt date {formatDate(debt.debtDate)}</span>
          {!isSettled ? (
            <Button size="sm" variant="outline" onClick={() => onLogPayment(debt)}>
              Log payment
            </Button>
          ) : null}
        </div>

        {debt.payments.length > 0 ? (
          <div className="space-y-1 rounded-md border bg-muted/25 p-2">
            <p className="text-xs font-medium text-muted-foreground">Payment history</p>
            {debt.payments.map((payment) => (
              <div key={payment.id} className="space-y-1 rounded-md bg-background/70 p-2 text-xs">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-muted-foreground">{formatDate(payment.createdAt.slice(0, 10))}</span>
                  <span className="tabular-nums font-medium">{formatCurrency(payment.amount, currency)}</span>
                </div>
                {payment.note ? <p className="text-muted-foreground">{payment.note}</p> : null}
                <div className="flex items-center justify-end gap-1">
                  <Button size="icon-xs" variant="ghost" onClick={() => onEditPayment(debt, payment)} aria-label="Edit payment">
                    <Pencil className="size-3.5" />
                  </Button>
                  <Button size="icon-xs" variant="ghost" className="text-destructive" onClick={() => onDeletePayment(debt, payment)} aria-label="Delete payment">
                    <Trash2 className="size-3.5" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        ) : null}

        <button
          type="button"
          className="flex w-full items-center gap-1.5 rounded-md px-1 py-1 text-xs text-muted-foreground transition-colors hover:text-foreground"
          onClick={() => setAttachmentsExpanded((prev) => !prev)}
        >
          <Paperclip className="size-3" />
          <span>Attachments{attachmentCount > 0 ? ` (${attachmentCount})` : ""}</span>
          {attachmentsExpanded ? (
            <ChevronUp className="ml-auto size-3" />
          ) : (
            <ChevronDown className="ml-auto size-3" />
          )}
        </button>
        {attachmentsExpanded ? (
          <Attachments
            recordType="debt"
            recordId={debt.id}
            initialAttachments={debt.attachments}
          />
        ) : null}
      </CardContent>
    </Card>
  );
}

function DebtSection({
  title,
  debts,
  currency,
  onLogPayment,
  onEditDebt,
  onDelete,
  onEditPayment,
  onDeletePayment,
}: {
  title: string;
  debts: DebtData[];
  currency: string;
  onLogPayment: (debt: DebtData) => void;
  onEditDebt: (debt: DebtData) => void;
  onDelete: (debt: DebtData) => void;
  onEditPayment: (debt: DebtData, payment: DebtData["payments"][number]) => void;
  onDeletePayment: (debt: DebtData, payment: DebtData["payments"][number]) => void;
}) {
  if (debts.length === 0) {
    return (
      <div className="rounded-lg border border-dashed px-4 py-3 text-sm text-muted-foreground">
        No debts in this section.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold">{title}</h3>
      <div className="space-y-3">
        {debts.map((debt) => (
          <DebtCard
            key={debt.id}
            debt={debt}
            currency={currency}
            onLogPayment={onLogPayment}
            onEditDebt={onEditDebt}
            onDelete={onDelete}
            onEditPayment={onEditPayment}
            onDeletePayment={onDeletePayment}
          />
        ))}
      </div>
    </div>
  );
}

export function DebtsView({ data, categories, currency }: DebtsViewProps) {
  const [addOpen, setAddOpen] = useState(false);
  const [editingDebt, setEditingDebt] = useState<DebtData | null>(null);
  const [paymentDebt, setPaymentDebt] = useState<DebtData | null>(null);
  const [editingPayment, setEditingPayment] = useState<{
    debt: DebtData;
    payment: DebtData["payments"][number];
  } | null>(null);
  const [deletingPayment, setDeletingPayment] = useState<{
    debt: DebtData;
    payment: DebtData["payments"][number];
  } | null>(null);
  const [deletingDebt, setDeletingDebt] = useState<DebtData | null>(null);

  const hasAnyDebt = useMemo(
    () => data.iOweActive.length + data.theyOweActive.length + data.settled.length > 0,
    [data.iOweActive.length, data.settled.length, data.theyOweActive.length]
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-serif text-xl font-bold sm:text-2xl">Debts</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Track what you owe and what others owe you.
          </p>
        </div>

        <Button onClick={() => setAddOpen(true)}>
          <Plus className="size-4" />
          Add Debt
        </Button>
      </div>

      {!hasAnyDebt ? (
        <EmptyState
          icon={Landmark}
          title="No debts yet"
          description="Add a debt to track payments and settlement progress."
          action={
            <Button onClick={() => setAddOpen(true)}>
              <Plus className="size-4" />
              Add your first debt
            </Button>
          }
        />
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-3">
            <SummaryCard
              label="You owe"
              value={data.summary.totalOwed}
              currency={currency}
              icon={Landmark}
            />
            <SummaryCard
              label="You're owed"
              value={data.summary.totalLent}
              currency={currency}
              icon={HandCoins}
            />
            <SummaryCard
              label="Net"
              value={data.summary.net}
              currency={currency}
              icon={Scale}
              className={
                data.summary.net > 0
                  ? "text-success"
                  : data.summary.net < 0
                    ? "text-destructive"
                    : undefined
              }
            />
          </div>

          <DebtSection
            title="I owe"
            debts={data.iOweActive}
            currency={currency}
            onLogPayment={setPaymentDebt}
            onEditDebt={setEditingDebt}
            onDelete={setDeletingDebt}
            onEditPayment={(debt, payment) => setEditingPayment({ debt, payment })}
            onDeletePayment={(debt, payment) => setDeletingPayment({ debt, payment })}
          />

          <DebtSection
            title="They owe me"
            debts={data.theyOweActive}
            currency={currency}
            onLogPayment={setPaymentDebt}
            onEditDebt={setEditingDebt}
            onDelete={setDeletingDebt}
            onEditPayment={(debt, payment) => setEditingPayment({ debt, payment })}
            onDeletePayment={(debt, payment) => setDeletingPayment({ debt, payment })}
          />

          {data.settled.length > 0 ? (
            <details className="rounded-xl border bg-card px-4 py-3">
              <summary className="cursor-pointer text-sm font-semibold">
                Settled ({data.settled.length})
              </summary>
              <div className="mt-3 space-y-3">
                {data.settled.map((debt) => (
                  <DebtCard
                    key={debt.id}
                    debt={debt}
                    currency={currency}
                    onLogPayment={setPaymentDebt}
                    onEditDebt={setEditingDebt}
                    onDelete={setDeletingDebt}
                    onEditPayment={(selectedDebt, payment) =>
                      setEditingPayment({ debt: selectedDebt, payment })
                    }
                    onDeletePayment={(selectedDebt, payment) =>
                      setDeletingPayment({ debt: selectedDebt, payment })
                    }
                  />
                ))}
              </div>
            </details>
          ) : null}
        </>
      )}

      <AddDebtDialog open={addOpen} onOpenChange={setAddOpen} categories={categories} />

      {editingDebt ? (
        <AddDebtDialog
          debt={editingDebt}
          open={!!editingDebt}
          onOpenChange={(open) => {
            if (!open) setEditingDebt(null);
          }}
          categories={categories}
        />
      ) : null}

      {paymentDebt ? (
        <LogPaymentDialog
          key={paymentDebt.id}
          debt={paymentDebt}
          currency={currency}
          open={!!paymentDebt}
          onOpenChange={(open) => {
            if (!open) setPaymentDebt(null);
          }}
        />
      ) : null}

      {editingPayment ? (
        <LogPaymentDialog
          key={editingPayment.payment.id}
          debt={editingPayment.debt}
          payment={editingPayment.payment}
          currency={currency}
          open={!!editingPayment}
          onOpenChange={(open) => {
            if (!open) setEditingPayment(null);
          }}
        />
      ) : null}

      {deletingPayment ? (
        <DeleteDebtPaymentDialog
          debt={deletingPayment.debt}
          payment={deletingPayment.payment}
          currency={currency}
          open={!!deletingPayment}
          onOpenChange={(open) => {
            if (!open) setDeletingPayment(null);
          }}
        />
      ) : null}

      {deletingDebt ? (
        <DeleteDebtDialog
          debt={deletingDebt}
          open={!!deletingDebt}
          onOpenChange={(open) => {
            if (!open) setDeletingDebt(null);
          }}
        />
      ) : null}
    </div>
  );
}
