import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { connectToDatabase } from "@/lib/db/connect";
import { UserModel } from "@/lib/models/User";

export const dynamic = "force-dynamic";

// FR-01: Confirm password reset using valid time-limited token
export async function POST(req: NextRequest) {
  try {
    await connectToDatabase();
    const body = await req.json().catch(() => ({}));
    const { token, newPassword } = body;

    if (!token || !newPassword) {
      return NextResponse.json(
        { error: "VALIDATION_ERROR", message: "Token and new password are required." },
        { status: 400 }
      );
    }

    if (newPassword.length < 6) {
      return NextResponse.json(
        { error: "VALIDATION_ERROR", message: "Password must be at least 6 characters long." },
        { status: 400 }
      );
    }

    const user = await UserModel.findOne({
      resetPasswordToken: token,
      resetPasswordExpires: { $gt: new Date() },
    });

    if (!user) {
      return NextResponse.json(
        { error: "INVALID_OR_EXPIRED_TOKEN", message: "Password reset link is invalid or has expired." },
        { status: 400 }
      );
    }

    // Securely hash the new password
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(newPassword, salt);

    user.passwordHash = passwordHash;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    await user.save();

    return NextResponse.json({
      success: true,
      message: "Password has been successfully updated. You may now log in with your new credentials.",
    });
  } catch (error) {
    console.error("Reset Password Error:", error);
    return NextResponse.json({ error: "INTERNAL_ERROR", message: "Failed to reset password." }, { status: 500 });
  }
}
