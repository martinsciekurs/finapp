/** Fallback color used when a category has no color (e.g., deleted/orphaned join). */
export const DEFAULT_CATEGORY_COLOR = "#888888";

/**
 * Default category presets shown during onboarding.
 * Users select which to keep. Categories are created per-user in the database.
 */

export interface CategoryPreset {
  name: string;
  icon: string;
  color: string;
  type: "expense" | "income";
  group?: string;
  defaultSelected: boolean;
}

export const EXPENSE_CATEGORIES: CategoryPreset[] = [
  // Essentials
  { name: "Groceries", icon: "shopping-cart", color: "#4a8c6f", type: "expense", group: "Essentials", defaultSelected: true },
  { name: "Rent & Housing", icon: "home", color: "#5a7d8c", type: "expense", group: "Essentials", defaultSelected: true },
  { name: "Utilities", icon: "zap", color: "#c9a84c", type: "expense", group: "Essentials", defaultSelected: true },
  { name: "Transport", icon: "car", color: "#6b8e7b", type: "expense", group: "Essentials", defaultSelected: true },
  { name: "Insurance", icon: "shield", color: "#7a8c6f", type: "expense", group: "Essentials", defaultSelected: true },

  // Lifestyle
  { name: "Dining Out", icon: "utensils", color: "#c97b5e", type: "expense", group: "Lifestyle", defaultSelected: true },
  { name: "Entertainment", icon: "film", color: "#9a6fb0", type: "expense", group: "Lifestyle", defaultSelected: true },
  { name: "Shopping", icon: "shopping-bag", color: "#c4a0a0", type: "expense", group: "Lifestyle", defaultSelected: true },
  { name: "Subscriptions", icon: "repeat", color: "#5b9a82", type: "expense", group: "Lifestyle", defaultSelected: true },
  { name: "Personal Care", icon: "sparkles", color: "#b08caa", type: "expense", group: "Lifestyle", defaultSelected: true },

  // Health & Growth
  { name: "Health & Medical", icon: "heart-pulse", color: "#dc3545", type: "expense", group: "Health & Growth", defaultSelected: true },
  { name: "Fitness", icon: "dumbbell", color: "#4a8c6f", type: "expense", group: "Health & Growth", defaultSelected: true },
  { name: "Education", icon: "book-open", color: "#5a7d8c", type: "expense", group: "Health & Growth", defaultSelected: true },

  // Financial
  { name: "Debt Payment", icon: "banknote", color: "#8b3a3a", type: "expense", group: "Financial", defaultSelected: true },
  { name: "Taxes", icon: "landmark", color: "#6b6b6b", type: "expense", group: "Financial", defaultSelected: true },

  // Savings & Investments
  { name: "Savings", icon: "shield", color: "#4f8a7a", type: "expense", group: "Savings & Investments", defaultSelected: true },
  { name: "Investments", icon: "trending-up", color: "#c9a84c", type: "expense", group: "Savings & Investments", defaultSelected: true },

  // Other
  { name: "Travel", icon: "plane", color: "#5a8cc9", type: "expense", group: "Other", defaultSelected: true },
  { name: "Gifts & Donations", icon: "gift", color: "#c97ba0", type: "expense", group: "Other", defaultSelected: true },
  { name: "Pets", icon: "dog", color: "#a08c6a", type: "expense", group: "Other", defaultSelected: true },
  { name: "Kids & Family", icon: "baby", color: "#7ab8c9", type: "expense", group: "Other", defaultSelected: true },
  { name: "Other", icon: "circle", color: "#9a9a9a", type: "expense", group: "Other", defaultSelected: true },
];

export const INCOME_CATEGORIES: CategoryPreset[] = [
  { name: "Salary", icon: "briefcase", color: "#2d4a3e", type: "income", defaultSelected: true },
  { name: "Freelance", icon: "laptop", color: "#5b9a82", type: "income", defaultSelected: false },
  { name: "Business Income", icon: "building-2", color: "#4a6a5e", type: "income", defaultSelected: false },
  { name: "Investments", icon: "trending-up", color: "#c9a84c", type: "income", defaultSelected: false },
  { name: "Rental Income", icon: "key", color: "#5a7d8c", type: "income", defaultSelected: false },
  { name: "Scholarship", icon: "graduation-cap", color: "#6b8e7b", type: "income", defaultSelected: false },
  { name: "Gifts Received", icon: "gift", color: "#c97ba0", type: "income", defaultSelected: false },
  { name: "Refunds", icon: "rotate-ccw", color: "#7ab8a0", type: "income", defaultSelected: false },
  { name: "Debt Repayment", icon: "banknote", color: "#8b6a3a", type: "income", defaultSelected: true },
  { name: "Other Income", icon: "circle-plus", color: "#9a9a9a", type: "income", defaultSelected: false },
];

/**
 * Group expense categories by their group label.
 */
export function getExpenseCategoryGroups(): Record<string, CategoryPreset[]> {
  const groups: Record<string, CategoryPreset[]> = {};
  for (const cat of EXPENSE_CATEGORIES) {
    const group = cat.group || "Other";
    if (!groups[group]) groups[group] = [];
    groups[group].push(cat);
  }
  return groups;
}
