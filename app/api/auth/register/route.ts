import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { connectToDatabase } from "@/lib/db/connect";
import { UserModel } from "@/lib/models/User";
import { OrganizationModel } from "@/lib/models/Organization";
import { OrganizationMembershipModel } from "@/lib/models/OrganizationMembership";
import { createSessionCookieValue, SESSION_COOKIE_NAME, ACTIVE_ORG_COOKIE_NAME } from "@/lib/auth/session";
import { logAuditEvent } from "@/lib/auth/audit";

export const dynamic = "force-dynamic";

// FR-01: Email/password registration with initial organization creation (FR-02)
export async function POST(req: NextRequest) {
  try {
    await connectToDatabase();
    const body = await req.json();
    const { name, email, password, organizationName, role } = body;

    if (!name || !email || !password) {
      return NextResponse.json(
        { error: "VALIDATION_ERROR", message: "Name, email, and password are required." },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: "VALIDATION_ERROR", message: "Password must be at least 6 characters long." },
        { status: 400 }
      );
    }

    const normalizedEmail = email.trim().toLowerCase();
    const existingUser = await UserModel.findOne({ email: normalizedEmail });
    if (existingUser) {
      return NextResponse.json(
        { error: "USER_EXISTS", message: "An account with this email address already exists." },
        { status: 409 }
      );
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    const user = await UserModel.create({
      name: name.trim(),
      email: normalizedEmail,
      passwordHash,
      emailVerified: true,
      status: "active",
    });

    // Auto-create initial Organization if provided (FR-02)
    const orgName = organizationName?.trim() || `${name.trim()}'s Workspace`;
    const baseSlug = orgName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");
    const slug = `${baseSlug}-${Math.random().toString(36).substring(2, 6)}`;

    const organization = await OrganizationModel.create({
      name: orgName,
      slug,
      ownerUserId: user._id,
      brandColor: "#E06B53",
      status: "trialing",
      plan: "Trial / Starter",
      trialEndsAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // 14-day trial
      limits: {
        maxActiveEvents: 5,
        maxTeamMembers: 5,
        maxStorageMB: 500,
      },
    });

    const chosenRole = role || "Owner";

    // Creator membership with chosen role (FR-02, BR-3)
    const membership = await OrganizationMembershipModel.create({
      organizationId: organization._id,
      userId: user._id,
      role: chosenRole,
      status: "active",
      joinedAt: new Date(),
    });

    // Audit log
    await logAuditEvent({
      organizationId: organization._id,
      actorUserId: user._id,
      actorEmail: user.email,
      action: "organization.created",
      targetType: "Organization",
      targetId: organization._id.toString(),
      details: { organizationName: organization.name, plan: organization.plan, role: "Owner" },
    });

    const sessionPayload = {
      userId: user._id.toString(),
      email: user.email,
      name: user.name,
      activeOrgId: organization._id.toString(),
    };

    const cookieVal = createSessionCookieValue(sessionPayload);
    const res = NextResponse.json({
      success: true,
      user: { id: user._id, name: user.name, email: user.email },
      organization: { id: organization._id, name: organization.name, slug: organization.slug, role: "Owner" },
    });

    res.cookies.set(SESSION_COOKIE_NAME, cookieVal, {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 7, // 7 days
    });

    res.cookies.set(ACTIVE_ORG_COOKIE_NAME, organization._id.toString(), {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 7,
    });

    return res;
  } catch (error) {
    console.error("Register Error:", error);
    return NextResponse.json({ error: "INTERNAL_ERROR", message: "Failed to register user." }, { status: 500 });
  }
}
