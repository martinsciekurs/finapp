import { type NextRequest, NextResponse } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

// Routes that require specific validation (not session-based)
const webhookRoutes = [
  "/api/telegram/webhook",
  "/api/stripe/webhook",
  "/api/cron/",
];

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Skip webhook/cron routes — they have their own auth
  const isWebhookRoute = webhookRoutes.some((route) =>
    route.endsWith("/")
      ? pathname.startsWith(route)
      : pathname === route || pathname.startsWith(route + "/")
  );
  if (isWebhookRoute) {
    return NextResponse.next();
  }

  // Refresh session and get user
  const { user, error, supabaseResponse, supabase } = await updateSession(request);

  // Public routes: if authenticated and visiting auth pages, redirect to dashboard
  if (pathname.startsWith("/auth/")) {
    if (user) {
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }
    return supabaseResponse;
  }

  // Known route prefixes that require authentication
  const protectedPrefixes = ["/dashboard", "/onboarding", "/api/"];
  const isProtected = protectedPrefixes.some((p) => pathname.startsWith(p));

  // Unprotected routes (landing, unknown paths, etc.) — pass through.
  // Next.js will render 404 for routes that don't match any page.
  if (!isProtected) {
    return supabaseResponse;
  }

  // Auth service error — don't misclassify as unauthenticated
  if (error) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json(
        { error: "Authentication service error" },
        { status: 500 }
      );
    }
    return NextResponse.redirect(new URL("/auth/login", request.url));
  }

  // Protected routes require authentication
  if (!user) {
    // API routes: return 401 instead of redirect
    if (pathname.startsWith("/api/")) {
      return NextResponse.json(
        { error: "Unauthenticated" },
        { status: 401 }
      );
    }
    const redirectUrl = new URL("/auth/login", request.url);
    redirectUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(redirectUrl);
  }

  // Dashboard routes — check onboarding + admin
  if (pathname.startsWith("/dashboard")) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("onboarding_completed_at, role")
      .eq("id", user.id)
      .single();

    // Redirect to onboarding if not completed
    if (!profile?.onboarding_completed_at) {
      return NextResponse.redirect(new URL("/onboarding", request.url));
    }

    // Admin route protection — 404 so non-admins can't discover these routes
    if (pathname.startsWith("/dashboard/admin") && profile?.role !== "admin") {
      return NextResponse.rewrite(new URL("/not-found", request.url));
    }
  }

  // Onboarding route: redirect to dashboard if already completed
  if (pathname === "/onboarding") {
    const { data: profile } = await supabase
      .from("profiles")
      .select("onboarding_completed_at")
      .eq("id", user.id)
      .single();

    if (profile?.onboarding_completed_at) {
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization)
     * - favicon.ico, sitemap.xml, robots.txt
     * - public files (images, etc.)
     */
    "/((?!_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
