import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { connectToDatabase } from "@/lib/db/connect";
import { UserModel } from "@/lib/models/User";

export const dynamic = "force-dynamic";

// FR-01: Initiate time-limited password reset via email
export async function POST(req: NextRequest) {
  try {
    await connectToDatabase();
    const body = await req.json().catch(() => ({}));
    const { email } = body;

    if (!email || !email.trim()) {
      return NextResponse.json(
        { error: "VALIDATION_ERROR", message: "Email address is required." },
        { status: 400 }
      );
    }

    const normalizedEmail = email.trim().toLowerCase();
    const user = await UserModel.findOne({ email: normalizedEmail });

    if (!user) {
      return NextResponse.json(
        {
          success: false,
          accountExists: false,
          error: "USER_NOT_FOUND",
          message: `No account exists with email "${normalizedEmail}". Please register this account first or enter a registered email address.`,
        },
        { status: 404 }
      );
    }

    if (user.status === "suspended") {
      return NextResponse.json(
        { error: "USER_SUSPENDED", message: "This account has been suspended. Please contact your workspace administrator." },
        { status: 403 }
      );
    }

    // Generate secure 1-hour time-limited reset token (FR-01)
    const resetToken = crypto.randomBytes(32).toString("hex");
    const resetExpires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour expiration

    user.resetPasswordToken = resetToken;
    user.resetPasswordExpires = resetExpires;
    await user.save();

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const resetUrl = `${appUrl}/#reset-password?token=${resetToken}`;

    return NextResponse.json({
      success: true,
      message: `Password reset instructions generated for ${normalizedEmail}.`,
      token: resetToken,
      expiresAt: resetExpires.toISOString(),
      resetUrl,
    });
  } catch (error) {
    console.error("Forgot Password Error:", error);
    return NextResponse.json({ error: "INTERNAL_ERROR", message: "Failed to process password reset request." }, { status: 500 });
  }
}
