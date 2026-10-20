import { NextRequest, NextResponse } from "next/server";
import { requireTenantGuard } from "@/lib/auth/tenantGuard";
import { VendorModel } from "@/lib/models/Vendor";
import { logAuditEvent } from "@/lib/auth/audit";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const guard = await requireTenantGuard(req, "vendor:view");
  if (!guard.success) return guard.response;
  const { context } = guard;

  try {
    const { searchParams } = new URL(req.url);
    const category = searchParams.get("category");
    const search = searchParams.get("search");
    const status = searchParams.get("status") || "active";

    const filter: Record<string, unknown> = {
      organizationId: context.organizationId,
      deletedAt: null,
    };

    if (status !== "all") {
      filter.status = status;
    }

    // Role-based privacy: Vendor role can ONLY view their own vendor profile and packages
    if (context.role === "Vendor") {
      const user = context.user;
      const userEmail = (user?.email || "").toLowerCase().trim();
      const userName = (user?.name || "").trim();
      const domain = userEmail.includes("@") ? userEmail.split("@")[1] : "";
      const baseName = userName.replace(/\s*\(.*?\)\s*/g, "").trim();

      filter.$or = [
        { email: userEmail },
        ...(domain ? [{ email: { $regex: `@${domain}$`, $options: "i" } }] : []),
        ...(baseName ? [{ contactName: { $regex: baseName, $options: "i" } }] : []),
      ];
    }
    if (category && category !== "All") {
      const decoded = decodeURIComponent(category).trim();
      if (decoded.toLowerCase() === "sound" || decoded.toLowerCase() === "sound & lighting") {
        filter.category = { $regex: /^Sound\s*(&|and)?\s*Lighting/i };
      } else {
        filter.category = { $regex: new RegExp(`^${decoded.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i") };
      }
    }
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: "i" } },
        { contactName: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
      ];
    }

    const vendors = await VendorModel.find(filter).sort({ name: 1 }).lean();

    return NextResponse.json({
      success: true,
      vendors: vendors.map((v) => ({
        id: v._id.toString(),
        name: v.name,
        category: v.category,
        contactName: v.contactName,
        email: v.email,
        phone: v.phone,
        address: v.address,
        website: v.website,
        description: v.description,
        isVerified: v.isVerified,
        rating: v.rating,
        reviewsCount: v.reviews?.length || 0,
        packages: v.packages || [],
        reviews: v.reviews || [],
        status: v.status,
      })),
    });
  } catch (error) {
    console.error("Fetch Vendors Error:", error);
    return NextResponse.json({ error: "INTERNAL_ERROR", message: "Failed to fetch vendors" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const guard = await requireTenantGuard(req, "vendor:manage");
  if (!guard.success) return guard.response;
  const { context } = guard;

  try {
    const body = await req.json();
    const { name, category, contactName, email, phone, address, website, description, isVerified, packages } = body;

    if (!name || !category || !contactName || !email) {
      return NextResponse.json(
        { error: "VALIDATION_FAILED", message: "Vendor name, category, contact person, and email are required." },
        { status: 400 }
      );
    }

    const vendor = await VendorModel.create({
      organizationId: context.organizationId,
      name: name.trim(),
      category: category.trim(),
      contactName: contactName.trim(),
      email: email.trim().toLowerCase(),
      phone: phone?.trim() || "",
      address: address?.trim() || "",
      website: website?.trim() || "",
      description: description?.trim() || "",
      isVerified: Boolean(isVerified),
      rating: 5,
      packages: Array.isArray(packages) ? packages : [],
      reviews: [],
      status: "active",
    });

    await logAuditEvent({
      organizationId: context.organizationId,
      actorUserId: context.user._id,
      actorEmail: context.user.email,
      action: "vendor.created",
      targetType: "Vendor",
      targetId: vendor._id.toString(),
      details: { name: vendor.name, category: vendor.category, isVerified: vendor.isVerified },
      ipAddress: req.headers.get("x-forwarded-for") || "127.0.0.1",
    });

    return NextResponse.json({
      success: true,
      vendor: {
        id: vendor._id.toString(),
        name: vendor.name,
        category: vendor.category,
        contactName: vendor.contactName,
        email: vendor.email,
        phone: vendor.phone,
        isVerified: vendor.isVerified,
        rating: vendor.rating,
      },
    });
  } catch (error) {
    console.error("Create Vendor Error:", error);
    return NextResponse.json({ error: "INTERNAL_ERROR", message: "Failed to create vendor" }, { status: 500 });
  }
}
