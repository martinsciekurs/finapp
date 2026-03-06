import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";

export default function LandingPage() {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      {/* Header */}
      <header className="flex items-center justify-between px-6 py-4 md:px-12">
        <h1 className="font-serif text-xl font-bold text-primary">Simplony</h1>
        <div className="flex gap-3">
          <Button variant="ghost" asChild>
            <Link href="/auth/login">Sign in</Link>
          </Button>
          <Button asChild>
            <Link href="/auth/sign-up">Get started</Link>
          </Button>
        </div>
      </header>

      {/* Hero */}
      <main className="flex flex-1 flex-col items-center justify-center px-6 text-center">
        <h2 className="max-w-2xl font-serif text-4xl font-bold leading-tight tracking-tight md:text-5xl lg:text-6xl">
          Your finances,{" "}
          <span className="text-primary">beautifully simple</span>
        </h2>
        <p className="mt-6 max-w-lg text-lg text-muted-foreground">
          Track expenses, manage budgets, and stay on top of your money. AI-powered
          insights help you make smarter financial decisions.
        </p>
        <div className="mt-10 flex gap-4">
          <Button size="lg" asChild>
            <Link href="/auth/sign-up">
              Start for free
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </div>
      </main>

      {/* Footer */}
      <footer className="px-6 py-8 text-center text-sm text-muted-foreground">
        <p>Built with care for busy professionals.</p>
      </footer>
    </div>
  );
}
