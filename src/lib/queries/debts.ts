import "server-only";

import { createClient } from "@/lib/supabase/server";
import { fetchAttachmentsByRecordIds } from "@/lib/queries/attachments";
import type { DebtData, DebtPaymentData, DebtsPageData } from "@/lib/types/debt";
import { parseCategoryJoin } from "@/lib/types/dashboard";

export async function fetchDebtsPageData(): Promise<DebtsPageData> {
  const supabase = await createClient();

  const [debtsResult, paymentsResult] = await Promise.all([
    supabase
      .from("debts")
      .select(
        "id, counterparty, type, category_id, debt_date, original_amount, remaining_amount, description, created_at, categories(name, icon, color)"
      )
      .order("created_at", { ascending: false })
      .order("id", { ascending: false }),
    supabase
      .from("debt_payments")
      .select("id, debt_id, amount, note, transaction_id, created_at, transactions(date)")
      .order("created_at", { ascending: false })
      .order("id", { ascending: false }),
  ]);

  if (debtsResult.error) {
    throw new Error(`Failed to fetch debts: ${debtsResult.error.message}`);
  }
  if (paymentsResult.error) {
    throw new Error(`Failed to fetch debt payments: ${paymentsResult.error.message}`);
  }

  const attachmentsByRecord = await fetchAttachmentsByRecordIds(
    "debt",
    (debtsResult.data ?? []).map((debt) => debt.id)
  );

  const paymentsByDebt = new Map<string, DebtPaymentData[]>();
  for (const payment of paymentsResult.data ?? []) {
    const txDate = Array.isArray(payment.transactions)
      ? payment.transactions[0]?.date
      : (payment.transactions as { date: string } | null)?.date;

    const item: DebtPaymentData = {
      id: payment.id,
      debtId: payment.debt_id,
      amount: payment.amount,
      note: payment.note,
      transactionId: payment.transaction_id,
      paymentDate: txDate ?? payment.created_at.slice(0, 10),
      createdAt: payment.created_at,
    };

    const list = paymentsByDebt.get(payment.debt_id);
    if (list) {
      list.push(item);
    } else {
      paymentsByDebt.set(payment.debt_id, [item]);
    }
  }

  const debts: DebtData[] = (debtsResult.data ?? []).map((debt) => {
    const category = parseCategoryJoin(debt.categories);

    return {
      id: debt.id,
      counterparty: debt.counterparty,
      type: debt.type,
      categoryId: debt.category_id,
      categoryName: category?.name ?? null,
      categoryIcon: category?.icon ?? null,
      categoryColor: category?.color ?? null,
      originalAmount: debt.original_amount,
      remainingAmount: debt.remaining_amount,
      description: debt.description,
      debtDate: debt.debt_date,
      createdAt: debt.created_at,
      payments: paymentsByDebt.get(debt.id) ?? [],
      attachments: attachmentsByRecord.get(debt.id) ?? [],
    };
  });

  const iOweActive = debts.filter(
    (debt) => debt.type === "i_owe" && debt.remainingAmount > 0
  );
  const theyOweActive = debts.filter(
    (debt) => debt.type === "they_owe" && debt.remainingAmount > 0
  );
  const settled = debts.filter((debt) => debt.remainingAmount === 0);

  const totalOwed = debts
    .filter((debt) => debt.type === "i_owe")
    .reduce((sum, debt) => sum + debt.remainingAmount, 0);

  const totalLent = debts
    .filter((debt) => debt.type === "they_owe")
    .reduce((sum, debt) => sum + debt.remainingAmount, 0);

  return {
    summary: {
      totalOwed,
      totalLent,
      net: totalLent - totalOwed,
    },
    iOweActive,
    theyOweActive,
    settled,
  };
}

export async function fetchHasDebts(): Promise<boolean> {
  const supabase = await createClient();
  const { count, error } = await supabase
    .from("debts")
    .select("id", { count: "exact", head: true })
    .limit(1);

  if (error) {
    throw new Error(`Failed to check debts existence: ${error.message}`);
  }

  return (count ?? 0) > 0;
}
