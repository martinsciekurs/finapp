/**
 * Shared CategoryIcon mock for Vitest.
 *
 * Renders the icon name as text inside a <span> for easy assertions.
 *
 * Usage:
 *   vi.mock("@/components/ui/category-icon", async () => import("@/test/mocks/category-icon"));
 */
import React from "react";

export function CategoryIcon({
  name,
  "aria-label": ariaLabel,
  ...rest
}: {
  name: string;
  "aria-label"?: string;
  className?: string;
}) {
  return React.createElement(
    "span",
    { "data-testid": "category-icon", "aria-label": ariaLabel, ...rest },
    name
  );
}
