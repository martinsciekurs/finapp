import { Skeleton } from "@/components/ui/skeleton";

export default function AuthLoading() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4 py-12">
      <div className="flex flex-col items-center mb-8">
        <Skeleton className="h-14 w-14 rounded-2xl mb-4" />
        <Skeleton className="h-10 w-32" />
        <Skeleton className="h-4 w-48 mt-2" />
      </div>

      <div className="w-full max-w-[440px] rounded-2xl bg-card p-8 shadow-xl border border-border/40">
        <div className="flex mb-8 rounded-xl bg-muted p-1">
          <Skeleton className="flex-1 h-10 rounded-lg" />
          <Skeleton className="flex-1 h-10 rounded-lg ml-1" />
        </div>

        <div className="space-y-5">
          <div className="space-y-2">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-12 w-full rounded-xl" />
          </div>

          <div className="space-y-2">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-12 w-full rounded-xl" />
          </div>

          <Skeleton className="h-12 w-full rounded-xl" />
        </div>

        <Skeleton className="h-3 w-32 mx-auto mt-5" />
      </div>
    </div>
  );
}
