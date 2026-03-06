export interface CurrencyOption {
  code: string;
  label: string;
  symbol: string;
}

export const CURRENCIES: CurrencyOption[] = [
  { code: "USD", label: "US Dollar", symbol: "$" },
  { code: "EUR", label: "Euro", symbol: "€" },
  { code: "GBP", label: "British Pound", symbol: "£" },
  { code: "CHF", label: "Swiss Franc", symbol: "CHF" },
  { code: "JPY", label: "Japanese Yen", symbol: "¥" },
  { code: "CAD", label: "Canadian Dollar", symbol: "CA$" },
  { code: "AUD", label: "Australian Dollar", symbol: "A$" },
  { code: "NZD", label: "New Zealand Dollar", symbol: "NZ$" },
  { code: "SEK", label: "Swedish Krona", symbol: "kr" },
  { code: "NOK", label: "Norwegian Krone", symbol: "kr" },
  { code: "DKK", label: "Danish Krone", symbol: "kr" },
  { code: "PLN", label: "Polish Zloty", symbol: "zł" },
  { code: "CZK", label: "Czech Koruna", symbol: "Kč" },
  { code: "HUF", label: "Hungarian Forint", symbol: "Ft" },
  { code: "RON", label: "Romanian Leu", symbol: "lei" },
  { code: "BGN", label: "Bulgarian Lev", symbol: "лв" },
  { code: "TRY", label: "Turkish Lira", symbol: "₺" },
  { code: "BRL", label: "Brazilian Real", symbol: "R$" },
  { code: "MXN", label: "Mexican Peso", symbol: "MX$" },
  { code: "INR", label: "Indian Rupee", symbol: "₹" },
  { code: "CNY", label: "Chinese Yuan", symbol: "¥" },
  { code: "KRW", label: "South Korean Won", symbol: "₩" },
  { code: "SGD", label: "Singapore Dollar", symbol: "S$" },
  { code: "HKD", label: "Hong Kong Dollar", symbol: "HK$" },
  { code: "ZAR", label: "South African Rand", symbol: "R" },
  { code: "ILS", label: "Israeli Shekel", symbol: "₪" },
  { code: "AED", label: "UAE Dirham", symbol: "د.إ" },
];
