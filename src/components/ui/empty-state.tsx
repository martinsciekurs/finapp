import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface EmptyStateProps {
  /** Lucide icon to display */
  icon: LucideIcon;
  /** Main heading */
  title: string;
  /** Supporting description */
  description: string;
  /** Optional call-to-action (render a Button or Link) */
  action?: React.ReactNode;
  /** Additional class names */
  className?: string;
}

/**
 * Reusable empty state component.
 * Displays a line-art icon, contextual message, and optional CTA.
 * Used across dashboard sections when no data exists.
 */
export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center rounded-xl border border-dashed bg-card px-6 py-12 text-center",
        className
      )}
    >
      <div className="flex size-14 items-center justify-center rounded-full bg-muted">
        <Icon className="size-7 text-muted-foreground" strokeWidth={1.5} />
      </div>
      <h3 className="mt-4 font-serif text-lg font-semibold">{title}</h3>
      <p className="mt-1.5 max-w-sm text-sm text-muted-foreground">
        {description}
      </p>
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
