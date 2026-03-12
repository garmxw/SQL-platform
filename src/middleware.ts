import { NextRequest, NextResponse } from "next/server";

export function middleware(req: NextRequest) {
  const url = req.nextUrl;
  const hostname = req.headers.get("host") || "";
  //defining admin host (e.g., admin.localhost:3000)
  const isAdminHost = hostname.startsWith("admin.");

  if (isAdminHost) {
    // Rewrite internal path to the (admin) group
    // Example: admin.localhost:3000/dashboard -> /dashboard (but inside (admin) folder)
    return NextResponse.rewrite(new URL(`/admin${url.pathname}`, req.url));
  }
  return NextResponse.rewrite(new URL(`/main${url.pathname}`, req.url));
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
