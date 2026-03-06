"use client";

import { useEffect, useRef } from "react";
import { driver } from "driver.js";
import "driver.js/dist/driver.css";
import { getWelcomeTourSteps } from "./tour-steps";
import { completeTour } from "@/app/dashboard/tour-actions";

interface TourLauncherProps {
    showTour: boolean;
}

export function TourLauncher({ showTour }: TourLauncherProps) {
  const hasLaunched = useRef(false);

  useEffect(() => {
    if (!showTour || hasLaunched.current) return;
    hasLaunched.current = true;

    // Delay lets the dashboard paint before tour overlay measures element rects
    const timer = setTimeout(() => {
      const steps = getWelcomeTourSteps();

      const driverObj = driver({
        showProgress: true,
        progressText: "{{current}} of {{total}}",
        nextBtnText: "Next",
        prevBtnText: "Back",
        doneBtnText: "Got it!",
        showButtons: ["next", "previous", "close"],
        animate: true,
        allowClose: true,
        overlayColor: "black",
        overlayOpacity: 0.5,
        stagePadding: 8,
        stageRadius: 12,
        popoverOffset: 12,
        steps,
        onDestroyStarted: () => {
          driverObj.destroy();
          void completeTour();
        },
      });

      driverObj.drive();
    }, 600);

    return () => clearTimeout(timer);
  }, [showTour]);

  return null;
}
