import { NextResponse } from "next/server";
import { SESSION_COOKIE_NAME, ACTIVE_ORG_COOKIE_NAME } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

export async function POST() {
  const res = NextResponse.json({ success: true, message: "Logged out successfully" });
  res.cookies.set(SESSION_COOKIE_NAME, "", { maxAge: 0, path: "/" });
  res.cookies.set(ACTIVE_ORG_COOKIE_NAME, "", { maxAge: 0, path: "/" });
  return res;
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const redirectUrl = new URL("/?tab=welcome", url.origin);
  const res = NextResponse.redirect(redirectUrl);
  res.cookies.set(SESSION_COOKIE_NAME, "", { maxAge: 0, path: "/" });
  res.cookies.set(ACTIVE_ORG_COOKIE_NAME, "", { maxAge: 0, path: "/" });
  return res;
}
