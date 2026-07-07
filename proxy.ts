import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function proxy(request: NextRequest) {
  if (!request.nextUrl.pathname.startsWith("/admin")) {
    return NextResponse.next();
  }

  const validPassword = process.env.ADMIN_PASSWORD;

  if (!validPassword) {
    return new NextResponse(
      "ADMIN_PASSWORD env var is not configured on the server.",
      { status: 500 }
    );
  }

  const cookieAuth = request.cookies.get("admin_auth")?.value;
  if (cookieAuth === validPassword) {
    return NextResponse.next();
  }

  const queryAuth = request.nextUrl.searchParams.get("password");
  if (queryAuth === validPassword) {
    const cleanUrl = new URL(request.nextUrl);
    cleanUrl.searchParams.delete("password");
    const response = NextResponse.redirect(cleanUrl);
    response.cookies.set("admin_auth", validPassword, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 30,
    });
    return response;
  }

  return new NextResponse(
    `<html><body style="font-family: system-ui; padding: 40px; text-align: center; color: #333;">
      <h2 style="font-weight: 600;">Access restricted</h2>
      <p>Add <code>?password=YOUR_PASSWORD</code> to the URL to unlock this page.</p>
    </body></html>`,
    {
      status: 401,
      headers: { "Content-Type": "text/html" },
    }
  );
}

export const config = {
  matcher: "/admin/:path*",
};
