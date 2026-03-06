"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/utils/currency";
import type { TransactionData } from "@/lib/types/transactions";

function fuzzyContains(haystack: string, needle: string): boolean {
  if (haystack.includes(needle)) return true;
  if (needle.length < 3) return false;

  for (let i = 0; i < haystack.length - needle.length + 1; i++) {
    let mismatches = 0;
    for (let j = 0; j < needle.length; j++) {
      if (haystack[i + j] !== needle[j]) {
        mismatches++;
        if (mismatches > 1) break;
      }
    }
    if (mismatches <= 1) return true;
  }

  return false;
}

function wordMatchesTransaction(
  word: string,
  description: string,
  categoryName: string,
  formattedAmount: string
): boolean {
  return (
    fuzzyContains(description, word) ||
    fuzzyContains(categoryName, word) ||
    formattedAmount.includes(word)
  );
}

export function filterTransactions(
  transactions: TransactionData[],
  query: string,
  currency: string = "USD"
): TransactionData[] {
  const trimmed = query.trim().toLowerCase();
  if (!trimmed) return transactions;

  const words = trimmed.split(/\s+/).filter(Boolean);
  if (words.length === 0) return transactions;

  return transactions.filter((tx) => {
    const description = (tx.description ?? "").toLowerCase();
    const categoryName = tx.categoryName.toLowerCase();
    const formattedAmount = formatCurrency(tx.amount, currency).toLowerCase();

    return words.every((word) =>
      wordMatchesTransaction(word, description, categoryName, formattedAmount)
    );
  });
}

interface TransactionSearchBarProps {
  value: string;
  onChange: (value: string) => void;
}

export function TransactionSearchBar({
  value,
  onChange,
}: TransactionSearchBarProps) {
  const [localValue, setLocalValue] = useState(value);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => {
    setLocalValue(value);
  }, [value]);

  useEffect(() => {
    return () => clearTimeout(debounceRef.current);
  }, []);

  const debouncedOnChange = useCallback(
    (val: string) => {
      clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        onChange(val);
      }, 300);
    },
    [onChange]
  );

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const val = e.target.value;
    setLocalValue(val);
    debouncedOnChange(val);
  }

  function handleClear() {
    clearTimeout(debounceRef.current);
    setLocalValue("");
    onChange("");
  }

  return (
    <div className="relative">
      <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        type="text"
        placeholder="Search transactions..."
        value={localValue}
        onChange={handleChange}
        className="pl-9 pr-9"
      />
      {localValue ? (
        <Button
          variant="ghost"
          size="icon-xs"
          className="absolute right-1.5 top-1/2 -translate-y-1/2"
          onClick={handleClear}
          aria-label="Clear search"
        >
          <X className="size-3.5" />
        </Button>
      ) : null}
    </div>
  );
}
