export type DebtType = "i_owe" | "they_owe";

export interface DebtPaymentData {
  id: string;
  debtId: string;
  amount: number;
  note: string | null;
  transactionId: string | null;
  paymentDate: string;
  createdAt: string;
}

export interface DebtData {
  id: string;
  counterparty: string;
  type: DebtType;
  categoryId: string | null;
  categoryName: string | null;
  categoryIcon: string | null;
  categoryColor: string | null;
  originalAmount: number;
  remainingAmount: number;
  description: string | null;
  debtDate: string;
  createdAt: string;
  payments: DebtPaymentData[];
}

export interface DebtsSummary {
  totalOwed: number;
  totalLent: number;
  net: number;
}

export interface DebtsPageData {
  summary: DebtsSummary;
  iOweActive: DebtData[];
  theyOweActive: DebtData[];
  settled: DebtData[];
}
