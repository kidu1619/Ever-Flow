import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db/connect";
import { UserModel } from "@/lib/models/User";

export const dynamic = "force-dynamic";

// FR-01: Email verification flow
export async function POST(req: NextRequest) {
  try {
    await connectToDatabase();
    const body = await req.json().catch(() => ({}));
    const { token, email } = body;

    let user = null;
    if (token) {
      user = await UserModel.findOne({ verificationToken: token });
    } else if (email) {
      user = await UserModel.findOne({ email: email.trim().toLowerCase() });
    }

    if (!user) {
      return NextResponse.json(
        { error: "NOT_FOUND", message: "User not found or invalid verification token." },
        { status: 404 }
      );
    }

    user.emailVerified = true;
    user.verificationToken = undefined;
    await user.save();

    return NextResponse.json({
      success: true,
      message: "Email verified successfully.",
      user: {
        id: user._id,
        email: user.email,
        name: user.name,
        emailVerified: user.emailVerified,
      },
    });
  } catch (error) {
    console.error("Verify Email Error:", error);
    return NextResponse.json({ error: "INTERNAL_ERROR", message: "Failed to verify email." }, { status: 500 });
  }
}
