"use client";

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  useRef,
} from "react";

interface AiPanelContextValue {
  open: boolean;
  toggle: () => void;
  close: () => void;
}

const AiPanelContext = createContext<AiPanelContextValue | null>(null);
const AI_PANEL_STORAGE_KEY = "dashboard.aiPanel.open";

export function AiPanelProvider({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const hasHydratedRef = useRef(false);

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(AI_PANEL_STORAGE_KEY);
      if (stored === "true") {
        setOpen(true);
      }
    } catch {
    } finally {
      hasHydratedRef.current = true;
    }
  }, []);

  useEffect(() => {
    if (!hasHydratedRef.current) {
      return;
    }

    try {
      window.localStorage.setItem(AI_PANEL_STORAGE_KEY, String(open));
    } catch {
    }
  }, [open]);

  const toggle = useCallback(() => setOpen((prev) => !prev), []);
  const close = useCallback(() => setOpen(false), []);

  return (
    <AiPanelContext.Provider value={{ open, toggle, close }}>
      {children}
    </AiPanelContext.Provider>
  );
}

export function useAiPanel() {
  const ctx = useContext(AiPanelContext);
  if (!ctx) throw new Error("useAiPanel must be used within AiPanelProvider");
  return ctx;
}
