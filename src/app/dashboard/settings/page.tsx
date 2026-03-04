import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Settings",
};

export default function SettingsPage() {
  return (
    <div>
      <h2 className="font-serif text-xl font-bold sm:text-2xl">Settings</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Profile, appearance, notifications, and account management coming in later phases.
      </p>
    </div>
  );
}
