"use client";

import { useEffect, useRef } from "react";
import { driver } from "driver.js";
import type { Driver } from "driver.js";
import "driver.js/dist/driver.css";
import { getWelcomeTourSteps } from "./tour-steps";
import { completeTour } from "@/app/dashboard/tour-actions";

interface TourLauncherProps {
    showTour: boolean;
}

export function TourLauncher({ showTour }: TourLauncherProps) {
  const hasLaunched = useRef(false);
  const driverRef = useRef<Driver | null>(null);

  useEffect(() => {
    if (!showTour || hasLaunched.current) return;

    // Delay lets the dashboard paint before tour overlay measures element rects
    const timer = setTimeout(() => {
      if (hasLaunched.current) return;
      hasLaunched.current = true;

      const steps = getWelcomeTourSteps();
      const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

      function skipTour() {
        void completeTour();
        const activeDriver = driverRef.current;
        if (!activeDriver) return;
        driverRef.current = null;
        activeDriver.destroy();
      }

      driverRef.current = driver({
        showProgress: true,
        progressText: "{{current}} of {{total}}",
        nextBtnText: "Next",
        prevBtnText: "Back",
        doneBtnText: "Got it!",
        showButtons: ["next", "previous", "close"],
        animate: !prefersReducedMotion,
        allowClose: true,
        overlayColor: "var(--foreground)",
        overlayOpacity: 0.5,
        stagePadding: 8,
        stageRadius: 12,
        popoverOffset: 12,
        steps,
        onPopoverRender: (popover, { state }) => {
          if (state.activeIndex === steps.length - 1) return;
          const skipBtn = document.createElement("button");
          skipBtn.innerText = "Skip";
          skipBtn.className = "driver-popover-skip-btn";
          skipBtn.addEventListener("click", skipTour);
          popover.footerButtons.prepend(skipBtn);
        },
        onNextClick: (_, __, { driver: driverInstance }) => {
          if (!driverInstance.hasNextStep()) {
            void completeTour();
            driverRef.current = null;
            driverInstance.destroy();
            return;
          }

          driverInstance.moveNext();
        },
        onCloseClick: skipTour,
        onDestroyStarted: () => {
          const activeDriver = driverRef.current;
          if (!activeDriver) return;

          driverRef.current = null;
          activeDriver.destroy();
        },
      });

      driverRef.current.drive();
    }, 600);

    return () => {
      clearTimeout(timer);

      if (driverRef.current) {
        const activeDriver = driverRef.current;
        driverRef.current = null;
        activeDriver.destroy();
      }
    };
  }, [showTour]);

  return null;
}
