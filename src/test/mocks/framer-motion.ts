/**
 * Shared framer-motion mock for Vitest.
 *
 * Renders every `motion.X` as its plain HTML counterpart, stripping
 * animation-specific props so React doesn't warn about unknown DOM attrs.
 *
 * Usage:
 *   vi.mock("framer-motion", async () => import("@/test/mocks/framer-motion"));
 */
import React from "react";

const ANIMATION_PROPS = new Set([
  "initial",
  "animate",
  "exit",
  "transition",
  "variants",
  "whileHover",
  "whileTap",
  "whileFocus",
  "whileDrag",
  "whileInView",
  "layout",
  "layoutId",
  "onAnimationStart",
  "onAnimationComplete",
]);

function createMotionComponent(tag: string) {
  const Component = React.forwardRef(function MotionProxy(
    props: Record<string, unknown>,
    ref: React.Ref<unknown>
  ) {
    const domProps: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(props)) {
      if (!ANIMATION_PROPS.has(key)) {
        domProps[key] = value;
      }
    }
    return React.createElement(tag, { ...domProps, ref });
  });
  Component.displayName = `motion.${tag}`;
  return Component;
}

const componentCache = new Map<string, ReturnType<typeof createMotionComponent>>();

export const motion = new Proxy(
  {} as Record<string, ReturnType<typeof createMotionComponent>>,
  {
    get: (_target, prop: string) => {
      if (!componentCache.has(prop)) {
        componentCache.set(prop, createMotionComponent(prop));
      }
      return componentCache.get(prop)!;
    },
  }
);

export const AnimatePresence = ({ children }: { children: React.ReactNode }) =>
  React.createElement(React.Fragment, null, children);

export const useReducedMotion = () => true;
