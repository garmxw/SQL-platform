import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET);

export async function proxy(req: NextRequest) {
  const url = req.nextUrl;
  const hostname = req.headers.get("host") || "";
  const token = req.cookies.get("token")?.value;

  const isAdminHost = hostname.startsWith("admin.");
  const isLoginPage = url.pathname === "/login";

  /* for debugging purposes, you can uncomment this block to see the request details in the console when the middleware runs
  console.log("=== MIDDLEWARE DEBUG ===");
  console.log("Hostname:", hostname);
  console.log("Path:", url.pathname);
  console.log("Is Admin Host:", isAdminHost);
  console.log("Token exists:", !!token);
  */
  // 1. ADMIN SUBDOMAIN PROTECTION
  if (isAdminHost) {
    //console.log("→ Entering Admin protection block");

    if (!token && !isLoginPage) {
      //console.log("→ No token + not login page → redirecting to /login");
      return NextResponse.redirect(new URL("/login", req.url));
    }

    if (token) {
      try {
        const { payload } = await jwtVerify(token, JWT_SECRET);
        /*
        console.log("→ Token found, verifying JWT...");
        console.log("JWT VERIFIED SUCCESSFULLY");
        console.log("   Role in token:", payload.role);
        */
        if (payload.role !== "admin") {
          //console.log("→ Role is not admin → unauthorized redirect");
          return NextResponse.redirect(
            new URL("http://actualdomain.com/unauthorized"),
          );
        }
      } catch (err: any) {
        //console.error("JWT VERIFY FAILED:", err.message);
        return NextResponse.redirect(new URL("/login", req.url));
      }
    }

    //console.log("→ Admin auth passed → rewriting to /admin folder");
    return NextResponse.rewrite(new URL(`/admin${url.pathname}`, req.url));
  }

  // 2. MAIN DOMAIN PROTECTION (Regular Users)
  const isProtectedRoute =
    url.pathname.startsWith("/dashboard") ||
    url.pathname.startsWith("/home") ||
    url.pathname.startsWith("/learning") ||
    url.pathname.startsWith("/leaderboard") ||
    url.pathname.startsWith("/profile") ||
    url.pathname.startsWith("/problems");

  if (isProtectedRoute && !token) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  return NextResponse.rewrite(new URL(`/main${url.pathname}`, req.url));
}

export const config = {
  // Only exclude API routes (auth/login must be reachable)
  matcher: ["/((?!api|auth|_next/static|_next/image|favicon.ico).*)"],
};
