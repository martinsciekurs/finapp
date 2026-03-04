"use client";

import { motion } from "framer-motion";
import { Sparkles, Tags, Palette } from "lucide-react";

interface WelcomeStepProps {
  displayName: string;
}

export function WelcomeStep({ displayName }: WelcomeStepProps) {
  return (
    <div className="flex flex-col items-center text-center py-12 md:py-20">
      {/* Animated icon */}
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{
          type: "spring",
          stiffness: 200,
          damping: 14,
          delay: 0.15,
        }}
      >
        <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-primary/10 text-primary mb-8">
          <Sparkles className="h-10 w-10" />
        </div>
      </motion.div>

      {/* Heading */}
      <motion.h1
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.35, duration: 0.5, ease: "easeOut" }}
        className="font-serif text-4xl font-bold md:text-5xl leading-tight"
      >
        Welcome, {displayName}!
      </motion.h1>

      {/* Subtitle */}
      <motion.p
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5, duration: 0.5, ease: "easeOut" }}
        className="mt-4 max-w-md text-lg text-muted-foreground leading-relaxed"
      >
        Let&apos;s set up your personal finance dashboard in just a couple of
        steps. It&apos;ll only take a minute.
      </motion.p>

      {/* What's coming - step preview cards */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.7, duration: 0.5, ease: "easeOut" }}
        className="mt-14 grid grid-cols-1 sm:grid-cols-2 gap-5 w-full max-w-lg"
      >
        <div className="flex items-center gap-4 rounded-2xl bg-card p-5 border border-border/50 shadow-sm">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Tags className="h-6 w-6" />
          </div>
          <div className="text-left">
            <p className="text-base font-semibold">Categories</p>
            <p className="text-sm text-muted-foreground">
              Pick your spending types
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4 rounded-2xl bg-card p-5 border border-border/50 shadow-sm">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Palette className="h-6 w-6" />
          </div>
          <div className="text-left">
            <p className="text-base font-semibold">Theme</p>
            <p className="text-sm text-muted-foreground">
              Choose your banner
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
