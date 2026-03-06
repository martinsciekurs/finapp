import { Skeleton } from "@/components/ui/skeleton";

export default function OnboardingLoading() {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="px-4 pt-8 pb-4">
        <div className="mx-auto max-w-2xl">
          <div className="flex items-center justify-center gap-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton
                key={i}
                className="h-1.5 rounded-full"
                style={{ width: i === 0 ? "48px" : "24px" }}
              />
            ))}
          </div>
          <Skeleton className="h-4 w-48 mx-auto mt-3" />
        </div>
      </header>

      <main className="flex-1 overflow-y-auto px-4 pb-28">
        <div className="mx-auto max-w-2xl space-y-6">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-5/6" />

          <div className="mt-8 space-y-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-20 w-full rounded-xl" />
            ))}
          </div>
        </div>
      </main>

      <footer className="fixed bottom-0 left-0 right-0 bg-background/80 backdrop-blur-lg border-t border-border/50">
        <div className="mx-auto max-w-2xl flex items-center justify-between px-4 py-4">
          <Skeleton className="h-10 w-20 rounded-xl" />
          <Skeleton className="h-10 w-24 rounded-xl" />
          <Skeleton className="h-10 w-24 rounded-xl" />
        </div>
      </footer>
    </div>
  );
}
