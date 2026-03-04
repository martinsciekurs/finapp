"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { createClient } from "@/lib/supabase/client";
import {
  loginSchema,
  signUpSchema,
  type LoginValues,
  type SignUpValues,
} from "@/lib/validations";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { toast } from "sonner";
import { Loader2, Leaf } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

// ── Main Component ─────────────────────────────────────────
interface AuthPageProps {
  defaultTab?: "sign-in" | "create-account";
}

export function AuthPage({ defaultTab = "sign-in" }: AuthPageProps) {
  const [activeTab, setActiveTab] = useState(defaultTab);

  function switchTab(tab: "sign-in" | "create-account") {
    setActiveTab(tab);
    window.history.replaceState(
      null,
      "",
      tab === "sign-in" ? "/auth/login" : "/auth/sign-up"
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4 py-12">
      {/* Logo & Branding */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="flex flex-col items-center mb-8"
      >
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary text-primary-foreground mb-4 shadow-md">
          <Leaf className="h-7 w-7" />
        </div>
        <h1 className="font-serif text-4xl">FinApp</h1>
        <p className="text-muted-foreground mt-1.5 text-sm tracking-wide">
          Cultivate your wealth gracefully.
        </p>
      </motion.div>

      {/* Auth Card */}
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.15, ease: "easeOut" }}
        className="w-full max-w-[440px] rounded-2xl bg-card p-8 shadow-xl border border-border/40"
      >
        {/* Tab Switcher */}
        <div className="flex mb-8 rounded-xl bg-muted p-1">
          <button
            type="button"
            onClick={() => switchTab("sign-in")}
            className={cn(
              "relative flex-1 rounded-lg py-2.5 text-sm font-medium transition-all duration-200",
              activeTab === "sign-in"
                ? "bg-card text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => switchTab("create-account")}
            className={cn(
              "relative flex-1 rounded-lg py-2.5 text-sm font-medium transition-all duration-200",
              activeTab === "create-account"
                ? "bg-card text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            Create Account
          </button>
        </div>

        {/* Form Content */}
        <AnimatePresence mode="wait">
          {activeTab === "sign-in" ? (
            <motion.div
              key="sign-in"
              initial={{ opacity: 0, x: -16 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 16 }}
              transition={{ duration: 0.2, ease: "easeInOut" }}
            >
              <LoginForm />
            </motion.div>
          ) : (
            <motion.div
              key="create-account"
              initial={{ opacity: 0, x: 16 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -16 }}
              transition={{ duration: 0.2, ease: "easeInOut" }}
            >
              <SignUpForm />
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}

// ── Login Form ─────────────────────────────────────────────
function LoginForm() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  async function onSubmit(values: LoginValues) {
    setIsLoading(true);

    try {
      const supabase = createClient();

      const { error } = await supabase.auth.signInWithPassword({
        email: values.email,
        password: values.password,
      });

      if (error) {
        toast.error(error.message);
        return;
      }

      router.push("/dashboard");
      router.refresh();
    } catch {
      toast.error("Something went wrong");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-sm font-semibold">
                Email Address
              </FormLabel>
              <FormControl>
                <Input
                  type="email"
                  placeholder="you@example.com"
                  autoComplete="email"
                  className="h-12 rounded-xl bg-muted/50 border-border/50 px-4 text-base"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="password"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-sm font-semibold">Password</FormLabel>
              <FormControl>
                <Input
                  type="password"
                  placeholder="••••••••"
                  autoComplete="current-password"
                  className="h-12 rounded-xl bg-muted/50 border-border/50 px-4 text-base"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button
          type="submit"
          className="w-full h-12 rounded-xl text-base font-semibold active:scale-[0.98] transition-all"
          disabled={isLoading}
        >
          {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Welcome Back
        </Button>
      </form>

      <p className="mt-5 text-center text-xs text-muted-foreground">
        <button
          type="button"
          className="hover:text-foreground transition-colors underline-offset-4 hover:underline"
          onClick={() =>
            toast.info(
              "Password reset is not yet available. Contact support."
            )
          }
        >
          Forgot password?
        </button>
      </p>
    </Form>
  );
}

// ── Sign Up Form ───────────────────────────────────────────
function SignUpForm() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<SignUpValues>({
    resolver: zodResolver(signUpSchema),
    defaultValues: { displayName: "", email: "", password: "" },
  });

  async function onSubmit(values: SignUpValues) {
    setIsLoading(true);

    try {
      const supabase = createClient();

      const { error } = await supabase.auth.signUp({
        email: values.email,
        password: values.password,
        options: {
          data: { display_name: values.displayName },
        },
      });

      if (error) {
        toast.error(error.message);
        return;
      }

      router.push("/onboarding");
      router.refresh();
    } catch {
      toast.error("Something went wrong");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
        <FormField
          control={form.control}
          name="displayName"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-sm font-semibold">
                Display Name
              </FormLabel>
              <FormControl>
                <Input
                  placeholder="How should we call you?"
                  autoComplete="name"
                  className="h-12 rounded-xl bg-muted/50 border-border/50 px-4 text-base"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-sm font-semibold">
                Email Address
              </FormLabel>
              <FormControl>
                <Input
                  type="email"
                  placeholder="you@example.com"
                  autoComplete="email"
                  className="h-12 rounded-xl bg-muted/50 border-border/50 px-4 text-base"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="password"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-sm font-semibold">Password</FormLabel>
              <FormControl>
                <Input
                  type="password"
                  placeholder="••••••••"
                  autoComplete="new-password"
                  className="h-12 rounded-xl bg-muted/50 border-border/50 px-4 text-base"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button
          type="submit"
          className="w-full h-12 rounded-xl text-base font-semibold active:scale-[0.98] transition-all"
          disabled={isLoading}
        >
          {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Start Journey
        </Button>
      </form>
    </Form>
  );
}
