import {
  Baby,
  Banknote,
  BookOpen,
  Briefcase,
  Building2,
  Car,
  Circle,
  CirclePlus,
  Dog,
  Dumbbell,
  Film,
  Gift,
  GraduationCap,
  HeartPulse,
  Home,
  Key,
  Landmark,
  Laptop,
  Plane,
  Repeat,
  RotateCcw,
  Shield,
  ShoppingBag,
  ShoppingCart,
  Sparkles,
  TrendingUp,
  Utensils,
  Zap,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Map of Lucide icon name strings (kebab-case, as stored in DB)
 * to their React component. Covers all category presets.
 */
const iconMap: Record<string, LucideIcon> = {
  baby: Baby,
  banknote: Banknote,
  "book-open": BookOpen,
  briefcase: Briefcase,
  "building-2": Building2,
  car: Car,
  circle: Circle,
  "circle-plus": CirclePlus,
  dog: Dog,
  dumbbell: Dumbbell,
  film: Film,
  gift: Gift,
  "graduation-cap": GraduationCap,
  "heart-pulse": HeartPulse,
  home: Home,
  key: Key,
  landmark: Landmark,
  laptop: Laptop,
  plane: Plane,
  repeat: Repeat,
  "rotate-ccw": RotateCcw,
  shield: Shield,
  "shopping-bag": ShoppingBag,
  "shopping-cart": ShoppingCart,
  sparkles: Sparkles,
  "trending-up": TrendingUp,
  utensils: Utensils,
  zap: Zap,
};

interface CategoryIconProps {
  /** Lucide icon name in kebab-case (e.g. "shopping-cart") */
  name: string;
  /** Additional class names for the <svg> element */
  className?: string;
  /** aria-label for accessibility */
  "aria-label"?: string;
}

/**
 * Renders a Lucide icon by its kebab-case name string.
 * Falls back to a generic Circle icon for unknown names.
 */
export function CategoryIcon({
  name,
  className,
  "aria-label": ariaLabel,
}: CategoryIconProps) {
  const Icon = iconMap[name] ?? Circle;

  return (
    <Icon
      className={cn("size-4", className)}
      strokeWidth={1.75}
      aria-hidden={!ariaLabel}
      aria-label={ariaLabel}
    />
  );
}
