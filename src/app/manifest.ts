import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Simplony - Personal Finance Dashboard",
    short_name: "Simplony",
    description:
      "Track your expenses, manage budgets, and stay on top of your finances.",
    start_url: "/dashboard",
    display: "standalone",
    background_color: "#fdf6ee",
    theme_color: "#2d4a3e",
    orientation: "portrait-primary",
    icons: [
      {
        src: "/icons/icon-192.png",
        sizes: "192x192",
        type: "image/png",
      },
      {
        src: "/icons/icon-512.png",
        sizes: "512x512",
        type: "image/png",
      },
      {
        src: "/icons/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
