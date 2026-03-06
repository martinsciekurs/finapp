import type { DriveStep } from "driver.js";

function isMobileViewport(): boolean {
  return typeof window !== "undefined" && window.innerWidth < 1024;
}

export function getWelcomeTourSteps(): DriveStep[] {
  const mobile = isMobileViewport();

  return [
    {
      element: '[data-tour="hero-banner"]',
      popover: {
        title: "Welcome to your dashboard",
        description:
          "This is your personal space. The banner reflects the theme you picked during setup.",
        side: "bottom",
        align: "center",
      },
    },
    {
      element: '[data-tour="summary-cards"]',
      popover: {
        title: "Your financial snapshot",
        description:
          "Income, spending, and upcoming payments at a glance. Use the dropdowns to switch between time periods.",
        side: "bottom",
        align: "center",
      },
    },
    {
      element: mobile
        ? '[data-tour="bottom-nav"]'
        : '[data-tour="sidebar-nav"]',
      popover: {
        title: "Navigate your finances",
        description:
          "Transactions, budgets, reminders, debts, and settings — everything lives here.",
        side: mobile ? "top" : "right",
        align: "center",
      },
    },
    {
      element: '[data-tour="recent-transactions"]',
      popover: {
        title: "Start by adding a transaction",
        description:
          "Head to Transactions to log your first expense or income. It only takes a few seconds.",
        side: "top",
        align: "center",
      },
    },
  ];
}
