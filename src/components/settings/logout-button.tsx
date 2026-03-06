"use client";

import { useState } from "react";
import { LogOut, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { logout } from "@/app/dashboard/settings/actions";

export function LogoutButton() {
  const [isLoading, setIsLoading] = useState(false);

  async function handleLogout() {
    setIsLoading(true);
    const result = await logout();

    if (!result.success) {
      setIsLoading(false);
    }
  }

  return (
    <Button
      variant="outline"
      onClick={handleLogout}
      disabled={isLoading}
      className="text-destructive hover:bg-destructive/10 hover:text-destructive"
    >
      {isLoading ? (
        <Loader2 className="size-4 animate-spin" />
      ) : (
        <LogOut className="size-4" />
      )}
      Log out
    </Button>
  );
}
