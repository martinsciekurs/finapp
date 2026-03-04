import type { Metadata } from "next";
import Link from "next/link";
import { Tags, User, Palette, Bell } from "lucide-react";

export const metadata: Metadata = {
  title: "Settings",
};

interface SettingsLink {
  href: string;
  label: string;
  description: string;
  icon: React.ElementType;
  available: boolean;
}

const SETTINGS_LINKS: SettingsLink[] = [
  {
    href: "/dashboard/settings/categories",
    label: "Categories",
    description: "Organize your expense and income categories into groups.",
    icon: Tags,
    available: true,
  },
  {
    href: "/dashboard/settings/profile",
    label: "Profile",
    description: "Display name, currency, and account details.",
    icon: User,
    available: false,
  },
  {
    href: "/dashboard/settings/appearance",
    label: "Appearance",
    description: "Theme, colors, and display preferences.",
    icon: Palette,
    available: false,
  },
  {
    href: "/dashboard/settings/notifications",
    label: "Notifications",
    description: "Email and in-app notification preferences.",
    icon: Bell,
    available: false,
  },
];

export default function SettingsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-serif text-xl font-bold sm:text-2xl">Settings</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Manage your account, preferences, and categories.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {SETTINGS_LINKS.map((item) => {
          const Icon = item.icon;

          if (!item.available) {
            return (
              <div
                key={item.href}
                className="flex items-start gap-4 rounded-xl border bg-card p-4 opacity-50 shadow-sm"
              >
                <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-muted">
                  <Icon className="size-5 text-muted-foreground" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium">{item.label}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    Coming soon
                  </p>
                </div>
              </div>
            );
          }

          return (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-start gap-4 rounded-xl border bg-card p-4 shadow-sm transition-colors hover:bg-accent/50"
            >
              <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-muted">
                <Icon className="size-5 text-muted-foreground" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium">{item.label}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {item.description}
                </p>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
