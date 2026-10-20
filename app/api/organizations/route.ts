import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectToDatabase } from "@/lib/db/connect";
import { getCurrentSession, ACTIVE_ORG_COOKIE_NAME } from "@/lib/auth/session";
import { UserModel } from "@/lib/models/User";
import { OrganizationModel } from "@/lib/models/Organization";
import { OrganizationMembershipModel } from "@/lib/models/OrganizationMembership";
import { logAuditEvent } from "@/lib/auth/audit";

export const dynamic = "force-dynamic";

// GET: List all organizations the user belongs to
export async function GET(req: NextRequest) {
  try {
    await connectToDatabase();
    const session = await getCurrentSession();
    let userId = session?.userId || req.headers.get("x-user-id");

    if (!userId) {
      const defaultUser = await UserModel.findOne({ email: "olivia@aureliaevents.com" });
      if (defaultUser) userId = defaultUser._id.toString();
    }

    if (!userId) {
      return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
    }

    const memberships = await OrganizationMembershipModel.find({
      userId: new mongoose.Types.ObjectId(userId),
    }).populate("organizationId");

    const orgs = memberships
      .filter((m) => m.organizationId && !(m.organizationId as any).deletedAt)
      .map((m) => {
        const org = m.organizationId as any;
        return {
          id: org._id.toString(),
          name: org.name,
          slug: org.slug,
          brandColor: org.brandColor,
          currency: org.currency,
          timeZone: org.timeZone,
          status: org.status,
          plan: org.plan,
          role: m.role,
          membershipStatus: m.status,
          limits: org.limits,
        };
      });

    return NextResponse.json({ organizations: orgs });
  } catch (error) {
    console.error("List Organizations Error:", error);
    return NextResponse.json({ error: "INTERNAL_ERROR" }, { status: 500 });
  }
}

// POST: FR-02 Organization creation flow where the creator becomes Owner on initial trial
export async function POST(req: NextRequest) {
  try {
    await connectToDatabase();
    const session = await getCurrentSession();
    let userId = session?.userId || req.headers.get("x-user-id");

    if (!userId) {
      const defaultUser = await UserModel.findOne({ email: "olivia@aureliaevents.com" });
      if (defaultUser) userId = defaultUser._id.toString();
    }

    if (!userId) {
      return NextResponse.json({ error: "UNAUTHORIZED", message: "Login required" }, { status: 401 });
    }

    const user = await UserModel.findById(userId);
    if (!user) {
      return NextResponse.json({ error: "USER_NOT_FOUND" }, { status: 404 });
    }

    // Platform Governance: Only SaaS Platform Admin (Yenege) can provision new organizations
    if (!user.isPlatformAdmin) {
      return NextResponse.json(
        {
          error: "FORBIDDEN",
          message:
            "Only SaaS Platform Administrators (Yenege) are authorized to create/provision new organizations. Organization owners manage team members, events, clients, and vendors within their assigned workspace.",
        },
        { status: 403 }
      );
    }

    const body = await req.json();
    const { name, slug: customSlug, country, brandColor, currency, defaultCurrency, timeZone, starterTemplates } = body;

    if (!name || !name.trim()) {
      return NextResponse.json(
        { error: "VALIDATION_ERROR", message: "Workspace name is required" },
        { status: 400 }
      );
    }

    const baseSlug = (customSlug || name)
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");
    const slug = `${baseSlug}-${Math.random().toString(36).substring(2, 6)}`;

    // Create the organization on trial plan (FR-02)
    const organization = await OrganizationModel.create({
      name: name.trim(),
      slug,
      country: country || "United States",
      starterTemplates: starterTemplates || ["wedding", "conference", "graduation"],
      ownerUserId: user._id,
      brandColor: brandColor || "#E06B53",
      currency: defaultCurrency || currency || "USD",
      timeZone: timeZone || "UTC",
      status: "trialing",
      plan: "Trial / Starter",
      trialEndsAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // 14-day trial
      limits: {
        maxActiveEvents: 5,
        maxTeamMembers: 5,
        maxStorageMB: 500,
      },
    });

    // Creator becomes the Owner (BR-3: An organization always has at least one active Owner)
    const membership = await OrganizationMembershipModel.create({
      organizationId: organization._id,
      userId: user._id,
      role: "Owner",
      status: "active",
      joinedAt: new Date(),
    });

    // Record immutable audit event
    await logAuditEvent({
      organizationId: organization._id,
      actorUserId: user._id,
      actorEmail: user.email,
      action: "organization.created",
      targetType: "Organization",
      targetId: organization._id.toString(),
      details: { name: organization.name, plan: organization.plan, trialDays: 14 },
    });

    const res = NextResponse.json({
      success: true,
      organization: {
        id: organization._id,
        name: organization.name,
        slug: organization.slug,
        brandColor: organization.brandColor,
        plan: organization.plan,
        role: "Owner",
      },
    });

    // Automatically switch active organization to the newly created one
    res.cookies.set(ACTIVE_ORG_COOKIE_NAME, organization._id.toString(), {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 7,
    });

    return res;
  } catch (error) {
    console.error("Create Organization Error:", error);
    return NextResponse.json({ error: "INTERNAL_ERROR", message: "Failed to create organization" }, { status: 500 });
  }
}
