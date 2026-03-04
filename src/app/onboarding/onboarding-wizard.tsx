"use client";

import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { ArrowLeft, ArrowRight, Check, Loader2 } from "lucide-react";
import { toast } from "sonner";
import {
  EXPENSE_CATEGORIES,
  INCOME_CATEGORIES,
  getExpenseCategoryGroups,
  type CategoryPreset,
} from "@/lib/config/categories";
import { ONBOARDING_BANNER_PRESETS } from "@/lib/config/banners";
import { completeOnboarding, updateOnboardingStep } from "./actions";
import { WelcomeStep } from "./steps/welcome-step";
import { CategoriesStep } from "./steps/categories-step";
import { BannerStep } from "./steps/banner-step";
import { cn } from "@/lib/utils";

const STEPS = ["welcome", "categories", "banner"] as const;
const STEP_LABELS = ["Welcome", "Categories", "Theme"] as const;

interface OnboardingWizardProps {
  displayName: string;
  initialStep: number;
}

export function OnboardingWizard({
  displayName,
  initialStep,
}: OnboardingWizardProps) {
  const clampStep = (step: number) =>
    Math.min(Math.max(step, 0), STEPS.length - 1);
  const [currentStep, setCurrentStep] = useState(() => clampStep(initialStep));
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [direction, setDirection] = useState(1); // 1 = forward, -1 = back

  // Category state
  const [selectedExpense, setSelectedExpense] = useState<CategoryPreset[]>(
    EXPENSE_CATEGORIES.filter((c) => c.defaultSelected)
  );
  const [selectedIncome, setSelectedIncome] = useState<CategoryPreset[]>(
    INCOME_CATEGORIES.filter((c) => c.defaultSelected)
  );

  // Banner state
  const [selectedBanner, setSelectedBanner] = useState<{
    type: "color" | "gradient";
    value: string;
  }>({ type: "color", value: "#2d4a3e" });

  const toggleCategory = useCallback((category: CategoryPreset) => {
    if (category.type === "expense") {
      setSelectedExpense((prev) => {
        const exists = prev.some((c) => c.name === category.name);
        if (exists) return prev.filter((c) => c.name !== category.name);
        return [...prev, category];
      });
    } else {
      setSelectedIncome((prev) => {
        const exists = prev.some((c) => c.name === category.name);
        if (exists) return prev.filter((c) => c.name !== category.name);
        return [...prev, category];
      });
    }
  }, []);

  const handleNext = async () => {
    if (currentStep === 1 && selectedExpense.length < 2) {
      toast.error("Please select at least 2 expense categories");
      return;
    }

    try {
      const result = await updateOnboardingStep(STEPS[currentStep]);

      if (!result.success) {
        toast.error(result.error || "Failed to save progress");
        return;
      }

      if (currentStep < STEPS.length - 1) {
        setDirection(1);
        setCurrentStep((prev) => prev + 1);
      }
    } catch {
      toast.error("Failed to save progress");
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setDirection(-1);
      setCurrentStep((prev) => prev - 1);
    }
  };

  const handleComplete = async () => {
    setIsSubmitting(true);

    try {
      const allCategories = [...selectedExpense, ...selectedIncome];
      const result = await completeOnboarding({
        categories: allCategories,
        banner: selectedBanner,
      });

      if (result && !result.success) {
        toast.error(result.error || "Something went wrong");
        setIsSubmitting(false);
      }
    } catch (error) {
      // Re-throw Next.js internal errors (redirect, notFound, etc.)
      if (error instanceof Error && "digest" in error) throw error;
      toast.error("Something went wrong");
      setIsSubmitting(false);
    }
  };

  const slideVariants = {
    enter: (dir: number) => ({
      opacity: 0,
      y: dir > 0 ? 24 : -24,
    }),
    center: {
      opacity: 1,
      y: 0,
    },
    exit: (dir: number) => ({
      opacity: 0,
      y: dir > 0 ? -24 : 24,
    }),
  };

  return (
    <div className="flex min-h-screen flex-col bg-background">
      {/* Progress header */}
      <motion.header
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="px-4 pt-8 pb-4"
      >
        <div className="mx-auto max-w-2xl">
          {/* Step indicators */}
          <div className="flex items-center justify-center gap-2">
            {STEPS.map((_, index) => (
              <motion.div
                key={index}
                className={cn(
                  "h-1.5 rounded-full transition-all duration-500",
                  index <= currentStep ? "bg-primary" : "bg-primary/15"
                )}
                animate={{
                  width: index === currentStep ? 48 : 24,
                }}
                transition={{ duration: 0.4, ease: "easeInOut" }}
              />
            ))}
          </div>
          <p className="mt-3 text-center text-sm text-muted-foreground">
            <span className="font-medium text-foreground">
              {STEP_LABELS[currentStep]}
            </span>{" "}
            &middot; Step {currentStep + 1} of {STEPS.length}
          </p>
        </div>
      </motion.header>

      {/* Scrollable content */}
      <main className="flex-1 overflow-y-auto px-4 pb-28">
        <div className="mx-auto max-w-2xl">
          <AnimatePresence mode="wait" custom={direction}>
            <motion.div
              key={currentStep}
              custom={direction}
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.3, ease: "easeOut" }}
            >
              {currentStep === 0 && <WelcomeStep displayName={displayName} />}
              {currentStep === 1 && (
                <CategoriesStep
                  expenseGroups={getExpenseCategoryGroups()}
                  incomeCategories={INCOME_CATEGORIES}
                  selectedExpense={selectedExpense}
                  selectedIncome={selectedIncome}
                  onToggle={toggleCategory}
                />
              )}
              {currentStep === 2 && (
                <BannerStep
                  presets={ONBOARDING_BANNER_PRESETS}
                  selected={selectedBanner}
                  onSelect={setSelectedBanner}
                />
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </main>

      {/* Fixed bottom navigation */}
      <motion.footer
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.3 }}
        className="fixed bottom-0 left-0 right-0 bg-background/80 backdrop-blur-lg border-t border-border/50"
      >
        <div className="mx-auto max-w-2xl flex items-center justify-between px-4 py-4">
          <Button
            variant="ghost"
            size="lg"
            onClick={handleBack}
            disabled={currentStep === 0}
            className={cn(
              "rounded-xl transition-all active:scale-[0.98]",
              currentStep === 0 && "invisible"
            )}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>

          {currentStep < STEPS.length - 1 ? (
            <Button
              size="lg"
              onClick={handleNext}
              className="rounded-xl px-8 font-semibold active:scale-[0.98] transition-all"
            >
              Next
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          ) : (
            <Button
              size="lg"
              onClick={handleComplete}
              disabled={isSubmitting}
              className="rounded-xl px-8 font-semibold active:scale-[0.98] transition-all"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Setting up...
                </>
              ) : (
                <>
                  Complete
                  <Check className="ml-2 h-4 w-4" />
                </>
              )}
            </Button>
          )}
        </div>
      </motion.footer>
    </div>
  );
}
