import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { connectToDatabase } from "@/lib/db/connect";
import { UserModel } from "@/lib/models/User";
import { OrganizationModel } from "@/lib/models/Organization";
import { OrganizationMembershipModel } from "@/lib/models/OrganizationMembership";
import { InvitationModel } from "@/lib/models/Invitation";
import { EventModel } from "@/lib/models/Event";
import { TaskModel } from "@/lib/models/Task";
import { EventTemplateModel } from "@/lib/models/EventTemplate";
import { AuditLogModel } from "@/lib/models/AuditLog";
import { VendorModel } from "@/lib/models/Vendor";
import { VendorBookingModel } from "@/lib/models/VendorBooking";
import { ClientModel } from "@/lib/models/Client";
import { BudgetItemModel } from "@/lib/models/BudgetItem";
import { ExpenseModel } from "@/lib/models/Expense";
import { InvoiceModel } from "@/lib/models/Invoice";
import { DocumentRecordModel } from "@/lib/models/Document";
import { MessageModel } from "@/lib/models/Message";
import { AttendeeModel } from "@/lib/models/Attendee";
import { NotificationModel } from "@/lib/models/Notification";
import { SupportAccessGrantModel } from "@/lib/models/SupportAccessGrant";
import { PREDEFINED_TEMPLATES } from "@/lib/templates/predefined";
import { createSessionCookieValue, SESSION_COOKIE_NAME, ACTIVE_ORG_COOKIE_NAME } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    await connectToDatabase();

    const url = new URL(req.url);
    const force = url.searchParams.get("force") === "true";

    // Non-destructive guard: if database already has users/organizations, do NOT wipe user data
    const existingUsers = await UserModel.countDocuments();
    const existingOrgs = await OrganizationModel.countDocuments();

    if (!force && existingUsers > 0 && existingOrgs > 0) {
      const defaultUser =
        (await UserModel.findOne({ email: "olivia@aureliaevents.com" })) ||
        (await UserModel.findOne({}));

      if (defaultUser) {
        const membership = await OrganizationMembershipModel.findOne({
          userId: defaultUser._id,
          status: "active",
        });
        const orgId = membership?.organizationId?.toString();

        const cookieVal = createSessionCookieValue({
          userId: defaultUser._id.toString(),
          email: defaultUser.email,
          name: defaultUser.name,
          activeOrgId: orgId,
        });

        const res = NextResponse.json({
          success: true,
          message: "Database already contains active data. Existing data preserved safely.",
          alreadySeeded: true,
        });

        res.cookies.set(SESSION_COOKIE_NAME, cookieVal, {
          httpOnly: true,
          sameSite: "lax",
          path: "/",
          maxAge: 60 * 60 * 24 * 7,
        });

        if (orgId) {
          res.cookies.set(ACTIVE_ORG_COOKIE_NAME, orgId, {
            httpOnly: true,
            sameSite: "lax",
            path: "/",
            maxAge: 60 * 60 * 24 * 7,
          });
        }

        return res;
      }
    }

    // Clear existing sample collections for clean seed only if empty or force=true
    await Promise.all([
      UserModel.deleteMany({}),

      OrganizationModel.deleteMany({}),
      OrganizationMembershipModel.deleteMany({}),
      InvitationModel.deleteMany({}),
      EventModel.deleteMany({}),
      TaskModel.deleteMany({}),
      EventTemplateModel.deleteMany({}),
      AuditLogModel.deleteMany({}),
      VendorModel.deleteMany({}),
      VendorBookingModel.deleteMany({}),
      ClientModel.deleteMany({}),
      BudgetItemModel.deleteMany({}),
      ExpenseModel.deleteMany({}),
      InvoiceModel.deleteMany({}),
      DocumentRecordModel.deleteMany({}),
      MessageModel.deleteMany({}),
      AttendeeModel.deleteMany({}),
      NotificationModel.deleteMany({}),
      SupportAccessGrantModel.deleteMany({}),
    ]);

    // 0. Seed Predefined Templates (All 5 templates per Objective O2)
    for (const tmpl of PREDEFINED_TEMPLATES) {
      await EventTemplateModel.create(tmpl);
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash("password123", salt);

    // 1. Create Primary Users
    // Olivia Sterling (Owner)
    const olivia = await UserModel.create({
      name: "Olivia Sterling",
      email: "olivia@aureliaevents.com",
      passwordHash,
      avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop&q=80",
      emailVerified: true,
      status: "active",
      isPlatformAdmin: false,
    });

    // Team Members
    const marcus = await UserModel.create({
      name: "Marcus Vance",
      email: "marcus@aureliaevents.com",
      passwordHash,
      avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&auto=format&fit=crop&q=80",
      emailVerified: true,
      status: "active",
    });

    const sophia = await UserModel.create({
      name: "Sophia Chen",
      email: "sophia@aureliaevents.com",
      passwordHash,
      avatar: "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=200&auto=format&fit=crop&q=80",
      emailVerified: true,
      status: "active",
    });

    const julian = await UserModel.create({
      name: "Julian Drake",
      email: "julian@aureliaevents.com",
      passwordHash,
      avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200&auto=format&fit=crop&q=80",
      emailVerified: true,
      status: "active",
    });

    const claire = await UserModel.create({
      name: "Claire Bennett",
      email: "claire@aureliaevents.com",
      passwordHash,
      avatar: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=200&auto=format&fit=crop&q=80",
      emailVerified: true,
      status: "active",
    });

    // External Vendor Partner User
    const vendorUser = await UserModel.create({
      name: "Alex Rivera (Grand Cru Catering)",
      email: "vendor@grandcrucatering.com",
      passwordHash,
      avatar: "https://images.unsplash.com/photo-1577219491135-ce391730fb2c?w=200&auto=format&fit=crop&q=80",
      emailVerified: true,
      status: "active",
    });

    // Client Stakeholder User
    const clientUser = await UserModel.create({
      name: "Victoria Sterling (Aura Endowment)",
      email: "client@aureliaguest.com",
      passwordHash,
      avatar: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=200&auto=format&fit=crop&q=80",
      emailVerified: true,
      status: "active",
    });

    // Platform Super Admin (Separate from tenant users) - Yenege Academy
    const platformAdmin = await UserModel.create({
      name: "Yenege Academy (SaaS Platform Owner)",
      email: "superadmin@yenegeacademy.com",
      passwordHash,
      avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop&q=80",
      emailVerified: true,
      status: "active",
      isPlatformAdmin: true,
    });

    // Also seed alias for backward compatibility
    await UserModel.create({
      name: "Yenege Academy System Admin",
      email: "superadmin@everflow.io",
      passwordHash,
      avatar: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=200&auto=format&fit=crop&q=80",
      emailVerified: true,
      status: "active",
      isPlatformAdmin: true,
    });

    // 2. Create Organizations for Multi-Tenant Demonstration (FR-02, FR-05)
    // Org 1: Primary workspace (Aurelia)
    const aureliaOrg = await OrganizationModel.create({
      name: "Aurelia Events & Galas",
      slug: "aurelia-events",
      brandColor: "#E06B53",
      country: "United States",
      starterTemplates: ["wedding", "conference", "graduation", "gala"],
      currency: "USD",
      timeZone: "America/New_York",
      status: "trialing",
      plan: "Professional",
      trialEndsAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
      limits: {
        maxActiveEvents: 10,
        maxTeamMembers: 8,
        maxStorageMB: 2000,
      },
      ownerUserId: olivia._id,
    });

    // Org 2: Secondary workspace (Vanguard)
    const vanguardOrg = await OrganizationModel.create({
      name: "Vanguard Productions",
      slug: "vanguard-productions",
      brandColor: "#2563EB",
      country: "United States",
      starterTemplates: ["conference", "concert"],
      currency: "USD",
      timeZone: "America/Chicago",
      status: "active",
      plan: "Business",
      limits: {
        maxActiveEvents: 25,
        maxTeamMembers: 20,
        maxStorageMB: 5000,
      },
      ownerUserId: marcus._id,
    });

    // Org 3: Tertiary workspace (Nordic)
    const nordicOrg = await OrganizationModel.create({
      name: "Nordic Heritage Festival",
      slug: "nordic-heritage",
      brandColor: "#059669",
      country: "Sweden",
      starterTemplates: ["wedding", "graduation"],
      currency: "EUR",
      timeZone: "Europe/Stockholm",
      status: "active",
      plan: "Basic",
      limits: {
        maxActiveEvents: 3,
        maxTeamMembers: 4,
        maxStorageMB: 1000,
      },
      ownerUserId: sophia._id,
    });

    // 3. Create Memberships (FR-02, FR-04, FR-05, FR-06, FR-07)
    await OrganizationMembershipModel.create([
      {
        organizationId: aureliaOrg._id,
        userId: olivia._id,
        role: "Owner",
        status: "active",
        joinedAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
      },
      {
        organizationId: aureliaOrg._id,
        userId: marcus._id,
        role: "EventManager",
        status: "active",
        joinedAt: new Date(Date.now() - 25 * 24 * 60 * 60 * 1000),
      },
      {
        organizationId: aureliaOrg._id,
        userId: sophia._id,
        role: "FinanceManager",
        status: "active",
        joinedAt: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000),
      },
      {
        organizationId: aureliaOrg._id,
        userId: julian._id,
        role: "VendorCoordinator",
        status: "active",
        joinedAt: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000),
      },
      {
        organizationId: aureliaOrg._id,
        userId: vendorUser._id,
        role: "Vendor",
        status: "active",
        joinedAt: new Date(Date.now() - 12 * 24 * 60 * 60 * 1000),
      },
      {
        organizationId: aureliaOrg._id,
        userId: clientUser._id,
        role: "Client",
        status: "active",
        joinedAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
      },
      {
        organizationId: aureliaOrg._id,
        userId: claire._id,
        role: "Staff",
        status: "active",
        joinedAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
      },
      // Cross-tenant memberships for switcher
      {
        organizationId: vanguardOrg._id,
        userId: olivia._id,
        role: "EventManager",
        status: "active",
        joinedAt: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000),
      },
      {
        organizationId: nordicOrg._id,
        userId: olivia._id,
        role: "Staff",
        status: "active",
        joinedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
      },
    ]);

    // 4. Seed Pending Invitations (FR-03)
    await InvitationModel.create([
      {
        organizationId: aureliaOrg._id,
        email: "david.wright@cateringsolutions.com",
        role: "Vendor Coordinator",
        token: crypto.randomBytes(16).toString("hex"),
        status: "pending",
        expiresAt: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
        invitedByUserId: olivia._id,
      },
      {
        organizationId: aureliaOrg._id,
        email: "isabella.hart@luxuryweddings.io",
        role: "EventManager",
        token: crypto.randomBytes(16).toString("hex"),
        status: "pending",
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        invitedByUserId: olivia._id,
      },
    ]);

    // 5. Seed Clients for Aurelia (FR-30, FR-31)
    const clientPhilanthropy = await ClientModel.create({
      organizationId: aureliaOrg._id,
      name: "Aura Endowment Board",
      type: "Institution",
      primaryContact: "Eleanor Vance",
      email: "eleanor.vance@aurafoundation.org",
      phone: "+1 (212) 555-0192",
      address: "650 Madison Ave, New York, NY",
      preferences: "Prefers black-tie aesthetic, formal place cards, and low centerpiece florals for sightlines.",
      requirements: "Requires all vendor certificates of insurance submitted 3 weeks prior.",
      status: "active",
      communications: [
        {
          id: "c1",
          date: new Date(Date.now() - 12 * 24 * 60 * 60 * 1000),
          type: "meeting",
          summary: "Initial gala walkthrough at Glasshouse; approved floor plan and key sponsor tables.",
          authorName: "Olivia Sterling",
        },
        {
          id: "c2",
          date: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000),
          type: "call",
          summary: "Discussed live auction item consignment agreements and sound engineer staging.",
          authorName: "Marcus Vance",
        },
      ],
    });

    const clientCouple = await ClientModel.create({
      organizationId: aureliaOrg._id,
      name: "Julian & Claire Montgomery",
      type: "Couple",
      primaryContact: "Julian Montgomery",
      email: "julian.montgomery@luxeclient.com",
      phone: "+1 (310) 555-0144",
      address: "Montecito, CA",
      preferences: "Warm ambient candlelight, bespoke champagne pairings, strict gluten-free appetizers.",
      requirements: "Private security at gate entrance; strict NDA for event photos.",
      status: "active",
      communications: [
        {
          id: "c3",
          date: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000),
          type: "meeting",
          summary: "Estate walkthrough with bridal party; finalized oceanfront ceremony positioning.",
          authorName: "Sophia Chen",
        },
      ],
    });

    const clientCorp = await ClientModel.create({
      organizationId: aureliaOrg._id,
      name: "Apex Technologies Corp",
      type: "Company",
      primaryContact: "Robert Sterling",
      email: "robert.s@apextech.com",
      phone: "+1 (415) 555-8833",
      address: "500 Howard St, San Francisco, CA",
      preferences: "High-speed multi-gigabit mesh wifi; continuous espresso stations during break sessions.",
      requirements: "Detailed run sheet down to 5-minute precision for global investor broadcast.",
      status: "active",
      communications: [
        {
          id: "c4",
          date: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
          type: "meeting",
          summary: "Reviewed keynote deck timings and verified backup satellite internet connection.",
          authorName: "Olivia Sterling",
        },
      ],
    });

    // 6. Seed Events with Run Sheet and Readiness Checklist (FR-10, FR-11, FR-44, FR-83)
    const gala = await EventModel.create({
      organizationId: aureliaOrg._id,
      name: "Aura Foundation Gala",
      category: "Gala",
      description: "Annual luxury black-tie philanthropic fundraiser for modern arts endowment.",
      venue: "The Glasshouse, 54th St Manhattan, NY",
      startDate: new Date("2026-11-14T19:00:00Z"),
      endDate: new Date("2026-11-15T01:00:00Z"),
      status: "Preparation",
      capacity: 450,
      budget: 185000,
      readinessScore: 82,
      imageUrl: "https://images.unsplash.com/photo-1519671482749-fd09be7ccebf?w=800&auto=format&fit=crop&q=80",
      ownerUserId: olivia._id,
      clientId: clientPhilanthropy._id,
      clientName: clientPhilanthropy.name,
      templateSlug: "gala",
      readinessChecklist: [
        { id: "rc1", title: "Venue permit & liquor license verified", category: "Compliance", isCompleted: true, isRequired: true },
        { id: "rc2", title: "Catering tasting sign-off and menu finalized", category: "Catering", isCompleted: true, isRequired: true },
        { id: "rc3", title: "Acoustic line-array audio soundcheck passed", category: "Production", isCompleted: true, isRequired: true },
        { id: "rc4", title: "Emergency medical personnel and security on-site brief", category: "Logistics", isCompleted: true, isRequired: true },
        { id: "rc5", title: "VIP seating chart and place cards placed", category: "Logistics", isCompleted: false, isRequired: true },
        { id: "rc6", title: "Auction lot paddles and bidding system live test", category: "Program", isCompleted: false, isRequired: true },
      ],
      runSheet: [
        { id: "rs1", time: "16:00", activity: "Vendor load-in & AV line check", location: "Grand Hall", responsible: "Marcus Vance", vendor: "Apex Sound & Lighting", notes: "Loading dock gate 3" },
        { id: "rs2", time: "18:30", activity: "Red carpet media arrival & cocktail hour", location: "Glass Terrace", responsible: "Sophia Chen", vendor: "Grand Cru Catering", notes: "Serve signature champagne" },
        { id: "rs3", time: "19:45", activity: "Welcome keynote & opening remarks", location: "Main Stage", responsible: "Olivia Sterling", vendor: "None", notes: "Teleprompter ready" },
        { id: "rs4", time: "20:30", activity: "Michelin four-course dinner service", location: "Dining Salon", responsible: "Marcus Vance", vendor: "Grand Cru Catering", notes: "Table 12 dietary VIP" },
        { id: "rs5", time: "21:45", activity: "Live art auction & endowment pledges", location: "Main Stage", responsible: "Olivia Sterling", vendor: "Sotheby's Auctioneer", notes: "Paddles distributed" },
        { id: "rs6", time: "23:00", activity: "Orchestra dancing & dessert lounge", location: "Lounge B", responsible: "Julian Drake", vendor: "Metropolitan Strings", notes: "Sound level 85dB" },
      ],
    });

    const wedding = await EventModel.create({
      organizationId: aureliaOrg._id,
      name: "Luxe Coastal Wedding: Julian & Claire",
      category: "Wedding",
      description: "Intimate 3-day cliffside estate wedding with bespoke catering and floral pavilions.",
      venue: "Montecito Sanctuary Estate, CA",
      startDate: new Date("2026-12-04T16:00:00Z"),
      endDate: new Date("2026-12-06T12:00:00Z"),
      status: "Planning",
      capacity: 180,
      budget: 220000,
      readinessScore: 65,
      imageUrl: "https://images.unsplash.com/photo-1519741497674-611481863552?w=800&auto=format&fit=crop&q=80",
      ownerUserId: sophia._id,
      clientId: clientCouple._id,
      clientName: clientCouple.name,
      templateSlug: "wedding",
      readinessChecklist: [
        { id: "rw1", title: "Estate rental agreement and noise curfew confirmed", category: "Compliance", isCompleted: true, isRequired: true },
        { id: "rw2", title: "Floral arbor mock-up approved by bride", category: "Design", isCompleted: true, isRequired: true },
        { id: "rw3", title: "Guest shuttle bus route and timing confirmed", category: "Logistics", isCompleted: false, isRequired: true },
        { id: "rw4", title: "Wireless lapel microphone for vows soundcheck", category: "Production", isCompleted: false, isRequired: true },
      ],
      runSheet: [
        { id: "ws1", time: "14:00", activity: "Bridal suite hair & makeup styling", location: "Villa Suite A", responsible: "Sophia Chen", vendor: "Glamour Atelier", notes: "Fruit & mimosa bar" },
        { id: "ws2", time: "16:00", activity: "Cliffside ceremony & vow exchange", location: "Lawn Overlook", responsible: "Sophia Chen", vendor: "Acoustic Trio", notes: "Rose petal toss" },
        { id: "ws3", time: "17:30", activity: "Sunset cocktail reception & family portraits", location: "Estate Terrace", responsible: "Julian Drake", vendor: "Lumiere Photography", notes: "Golden hour photo list" },
        { id: "ws4", time: "19:00", activity: "Marquee tent dinner & toasts", location: "Pavilion", responsible: "Marcus Vance", vendor: "Grand Cru Catering", notes: "First dance at 20:15" },
      ],
    });

    const summit = await EventModel.create({
      organizationId: aureliaOrg._id,
      name: "Apex Global Tech Summit 2026",
      category: "Conference",
      description: "Enterprise software keynote, multi-track exhibition and investor networking lounge.",
      venue: "Metropolitan Convention Center, Hall B",
      startDate: new Date("2026-10-28T08:30:00Z"),
      endDate: new Date("2026-10-30T18:00:00Z"),
      status: "Execution",
      capacity: 1200,
      budget: 340000,
      readinessScore: 100,
      imageUrl: "https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=800&auto=format&fit=crop&q=80",
      ownerUserId: olivia._id,
      clientId: clientCorp._id,
      clientName: clientCorp.name,
      templateSlug: "conference",
      readinessChecklist: [
        { id: "rt1", title: "Redundant fiber internet lines tested", category: "Production", isCompleted: true, isRequired: true },
        { id: "rt2", title: "RFID badge printing stations calibrated", category: "Logistics", isCompleted: true, isRequired: true },
        { id: "rt3", title: "Keynote presentation decks rehearsal completed", category: "Program", isCompleted: true, isRequired: true },
      ],
      runSheet: [
        { id: "ss1", time: "07:30", activity: "Attendee registration & breakfast lounge", location: "Foyer", responsible: "Julian Drake", vendor: "Convention Staff", notes: "6 check-in lanes open" },
        { id: "ss2", time: "09:00", activity: "Opening Keynote: Future of Autonomous Tech", location: "Auditorium A", responsible: "Olivia Sterling", vendor: "Apex AV Crew", notes: "Live streamed worldwide" },
        { id: "ss3", time: "11:00", activity: "Track 1: Cloud Architecture / Track 2: AI Security", location: "Breakout 1 & 2", responsible: "Marcus Vance", vendor: "Speaker Bureau", notes: "Q&A via mobile app" },
      ],
    });

    const graduation = await EventModel.create({
      organizationId: aureliaOrg._id,
      name: "Empire State University Commencement",
      category: "Graduation",
      description: "Academic ceremony for 850 graduating scholars, honorary degrees, and courtyard reception.",
      venue: "Avery Fisher Hall, Lincoln Center, NY",
      startDate: new Date("2027-01-18T10:00:00Z"),
      endDate: new Date("2027-01-18T16:00:00Z"),
      status: "Draft",
      capacity: 850,
      budget: 55000,
      readinessScore: 30,
      imageUrl: "https://images.unsplash.com/photo-1523050854058-8df90110c9f1?w=800&auto=format&fit=crop&q=80",
      ownerUserId: olivia._id,
      templateSlug: "graduation",
    });

    // Org 3: Events for Nordic Heritage Festival (Staff Demonstration)
    const nordicFestival = await EventModel.create({
      organizationId: nordicOrg._id,
      name: "Midsummer Folk & Arts Celebration",
      category: "Festival",
      description: "Traditional Scandinavian midsummer folk dances, artisanal crafts market, and acoustic stage.",
      venue: "Skansen Open-Air Museum, Djurgården, Stockholm",
      startDate: new Date("2026-11-20T10:00:00Z"),
      endDate: new Date("2026-11-21T22:00:00Z"),
      status: "Preparation",
      capacity: 1200,
      budget: 65000,
      readinessScore: 75,
      imageUrl: "https://images.unsplash.com/photo-1533174072545-7a4b6ad7a6c3?w=800&auto=format&fit=crop&q=80",
      ownerUserId: sophia._id,
      templateSlug: "wedding",
      readinessChecklist: [
        { id: "nf1", title: "Skansen open-air permit and fire safety clearance", category: "Compliance", isCompleted: true, isRequired: true },
        { id: "nf2", title: "Acoustic stage rigging and sound check completed", category: "Production", isCompleted: true, isRequired: true },
        { id: "nf3", title: "Artisan crafts market booth electrical runs", category: "Logistics", isCompleted: false, isRequired: true },
        { id: "nf4", title: "Midsummer floral maypole assembly verified", category: "Design", isCompleted: false, isRequired: true },
      ],
      runSheet: [
        { id: "nrs1", time: "08:00", activity: "Staff operational briefing & radio check", location: "Welcome Pavilion", responsible: "Olivia Sterling", notes: "Channel 2 for staff operations" },
        { id: "nrs2", time: "10:00", activity: "Public gates open & crafts market starts", location: "Main Gate", responsible: "Staff Team", notes: "Verify QR attendee tickets" },
        { id: "nrs3", time: "12:00", activity: "Traditional maypole folk dance & live accordion", location: "Djurgården Green", responsible: "Olivia Sterling", notes: "Sound level capped at 85dB" },
        { id: "nrs4", time: "17:30", activity: "Acoustic folk showcase & evening twilight toast", location: "Acoustic Amphitheater", responsible: "Staff Team", notes: "Lamps and fairy lights on" },
      ],
    });

    const nordicGala = await EventModel.create({
      organizationId: nordicOrg._id,
      name: "Nordic Winter Solstice Gala",
      category: "Gala",
      description: "Black-tie cultural preservation fundraiser with live orchestra under the glass roof.",
      venue: "Grand Hôtel Vinterträdgården, Södra Blasieholmshamnen, Stockholm",
      startDate: new Date("2026-12-21T18:30:00Z"),
      endDate: new Date("2026-12-22T01:00:00Z"),
      status: "Planning",
      capacity: 320,
      budget: 85000,
      readinessScore: 45,
      imageUrl: "https://images.unsplash.com/photo-1464366400600-7168b8af9bc3?w=800&auto=format&fit=crop&q=80",
      ownerUserId: sophia._id,
      templateSlug: "gala",
    });

    // Link events to clients
    clientPhilanthropy.linkedEventIds = [gala._id];
    await clientPhilanthropy.save();
    clientCouple.linkedEventIds = [wedding._id];
    await clientCouple.save();
    clientCorp.linkedEventIds = [summit._id];
    await clientCorp.save();

    // 7. Seed Vendors (FR-20, FR-23)
    const cateringVendor = await VendorModel.create({
      organizationId: aureliaOrg._id,
      name: "Grand Cru Catering & Sommelier Co.",
      category: "Catering",
      contactName: "Chef Antoine Laurent",
      email: "antoine@grandcrucatering.com",
      phone: "+1 (212) 555-4491",
      address: "142 West 26th St, New York, NY",
      description: "Michelin-trained bespoke culinary team specializing in fine dining galas, farm-to-table weddings, and artisanal wine pairings.",
      isVerified: true,
      rating: 4.9,
      packages: [
        { id: "p1", name: "Executive 4-Course Gala Tasting", description: "Seasonal amuse-bouche, dry-aged beef fillet or Chilean sea bass, artisan cheeses, dessert", price: 185 },
        { id: "p2", name: "Coastal Estate Wedding Buffet", description: "Pacific seafood raw bar, grilled lamb chops, organic salads, late-night sliders", price: 145 },
      ],
      reviews: [
        { id: "r1", eventId: gala._id, eventName: "Aura Foundation Gala", rating: 5, feedback: "Unbelievable culinary execution. All 450 guests received warm entrees in under 12 minutes.", authorName: "Olivia Sterling", createdAt: new Date() },
      ],
      status: "active",
    });

    const soundVendor = await VendorModel.create({
      organizationId: aureliaOrg._id,
      name: "Apex Sound & Production Rigging",
      category: "Sound & Lighting",
      contactName: "Damon Kelly",
      email: "damon@apexproduction.com",
      phone: "+1 (646) 555-8820",
      address: "320 Hudson St, New York, NY",
      description: "Concert-grade d&b audiotechnik line-arrays, robotic moving-head fixtures, wireless Shure Axient microphones, and certified rigging engineers.",
      isVerified: true,
      rating: 4.8,
      packages: [
        { id: "p3", name: "Concert Arena Rig & Audio System", description: "Full line array, digital consoles, lighting programmer, certified riggers", price: 28000 },
        { id: "p4", name: "Black-Tie Gala Acoustic & Lighting Package", description: "Wireless mic package, pinspot table lighting, ambient architectural uplighting", price: 14500 },
      ],
      reviews: [
        { id: "r2", eventId: gala._id, eventName: "Aura Foundation Gala", rating: 5, feedback: "Zero acoustic feedback and crisp speech projection across the entire hall.", authorName: "Marcus Vance", createdAt: new Date() },
      ],
      status: "active",
    });

    const photoVendor = await VendorModel.create({
      organizationId: aureliaOrg._id,
      name: "Lumiere Fine Art Photography & Cinema",
      category: "Photography",
      contactName: "Elena Rostova",
      email: "elena@lumiereart.com",
      phone: "+1 (310) 555-9012",
      address: "Venice Beach Studio, Los Angeles, CA",
      description: "Editorial documentary photography and 4K cinema drone captures for high-profile weddings and luxury brand galas.",
      isVerified: true,
      rating: 5.0,
      packages: [
        { id: "p5", name: "Cinematic Wedding Collection", description: "Two lead photographers, 4K drone cinematography, teaser film, and archival album", price: 12000 },
      ],
      status: "active",
    });

    const floralVendor = await VendorModel.create({
      organizationId: aureliaOrg._id,
      name: "Botanica Flora & Scenic Architecture",
      category: "Florals",
      contactName: "Mateo Silva",
      email: "mateo@botanicafloral.com",
      phone: "+1 (212) 555-3211",
      address: "Flower District, 28th St, New York, NY",
      description: "Architectural floral installations, suspended hanging ceiling gardens, and bespoke seasonal blooms.",
      isVerified: true,
      rating: 4.7,
      packages: [
        { id: "p6", name: "Grand Ballroom Floral Architecture", description: "24 tall centerpieces, red carpet entrance arch, stage backdrop styling", price: 24000 },
      ],
      status: "active",
    });

    // 8. Seed Vendor Bookings with Conflict Detection (FR-21, FR-22, BR-7)
    // Booking 1: Catering for Gala (Confirmed)
    await VendorBookingModel.create({
      organizationId: aureliaOrg._id,
      vendorId: cateringVendor._id,
      eventId: gala._id,
      service: "Four-Course Michelin Plated Dinner for 450 guests",
      startDate: new Date("2026-11-14T17:00:00Z"),
      endDate: new Date("2026-11-15T02:00:00Z"),
      agreedAmount: 83250,
      status: "confirmed",
      hasConflict: false,
    });

    // Booking 2: Sound & Lighting for Gala (Confirmed)
    await VendorBookingModel.create({
      organizationId: aureliaOrg._id,
      vendorId: soundVendor._id,
      eventId: gala._id,
      service: "Line array audio, wireless podium mics, ballroom pinspots",
      startDate: new Date("2026-11-14T15:00:00Z"),
      endDate: new Date("2026-11-15T01:30:00Z"),
      agreedAmount: 18500,
      status: "confirmed",
      hasConflict: false,
    });

    // Booking 3: Catering for Wedding (Confirmed)
    await VendorBookingModel.create({
      organizationId: aureliaOrg._id,
      vendorId: cateringVendor._id,
      eventId: wedding._id,
      service: "Estate Welcome Dinner & Wedding Day Banquet",
      startDate: new Date("2026-12-04T12:00:00Z"),
      endDate: new Date("2026-12-05T23:00:00Z"),
      agreedAmount: 42000,
      status: "confirmed",
      hasConflict: false,
    });

    // Booking 4: Double-Booking Conflict Example (FR-22, BR-7)!
    // Apex Sound booked for another concurrent slot on 2026-11-14 with documented override
    await VendorBookingModel.create({
      organizationId: aureliaOrg._id,
      vendorId: soundVendor._id,
      eventId: wedding._id,
      service: "Secondary Acoustic Rig & Wireless Lapel System",
      startDate: new Date("2026-11-14T18:00:00Z"),
      endDate: new Date("2026-11-14T23:00:00Z"),
      agreedAmount: 4500,
      status: "tentative",
      hasConflict: true,
      conflictDetails: "Schedule overlap with Aura Foundation Gala (11/14/2026)",
      conflictOverrideReason: "Apex Sound deployed secondary dispatch team B with duplicate independent audio kit.",
      conflictOverriddenBy: "Olivia Sterling",
    });

    // 9. Seed Financial Ledger: Budgets, Expenses, Invoices (FR-50, FR-51, FR-52, FR-53, BR-5, BR-11)
    // Budget items for Gala
    const bVenue = await BudgetItemModel.create({
      organizationId: aureliaOrg._id,
      eventId: gala._id,
      category: "Venue",
      title: "The Glasshouse Hall Rental & Terrace Fee",
      estimatedCost: 45000,
      contractedCost: 45000,
      actualCost: 45000,
      notes: "Full deposit paid",
    });

    const bCatering = await BudgetItemModel.create({
      organizationId: aureliaOrg._id,
      eventId: gala._id,
      category: "Catering",
      title: "Grand Cru Catering 450 Guest Plated Tasting",
      estimatedCost: 85000,
      contractedCost: 83250,
      actualCost: 41625, // First half deposit paid
      vendorName: "Grand Cru Catering",
    });

    const bProduction = await BudgetItemModel.create({
      organizationId: aureliaOrg._id,
      eventId: gala._id,
      category: "Production",
      title: "Apex Audio & Staging Lighting Truss",
      estimatedCost: 20000,
      contractedCost: 18500,
      actualCost: 18500,
      vendorName: "Apex Sound & Lighting",
    });

    await BudgetItemModel.create({
      organizationId: aureliaOrg._id,
      eventId: gala._id,
      category: "Design & Florals",
      title: "Botanica Suspended Floral Installations",
      estimatedCost: 25000,
      contractedCost: 22000,
      actualCost: 11000,
      vendorName: "Botanica Flora",
    });

    // Actual Expenses with Receipts (FR-51)
    await ExpenseModel.create([
      {
        organizationId: aureliaOrg._id,
        eventId: gala._id,
        budgetItemId: bVenue._id,
        title: "Glasshouse Venue Rental Final Settlement",
        category: "Venue",
        amount: 45000,
        currency: "USD",
        date: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000),
        paidTo: "The Glasshouse Management LLC",
        paymentMethod: "Bank Transfer",
        receiptRef: "REC-GH-99824",
        status: "reconciled",
        recordedByUserName: "Olivia Sterling",
      },
      {
        organizationId: aureliaOrg._id,
        eventId: gala._id,
        budgetItemId: bCatering._id,
        title: "Grand Cru Catering 50% Deposit",
        category: "Catering",
        amount: 41625,
        currency: "USD",
        date: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
        paidTo: "Grand Cru Catering & Sommelier Co.",
        paymentMethod: "Bank Transfer",
        receiptRef: "REC-GCC-4412",
        status: "cleared",
        recordedByUserName: "Marcus Vance",
      },
      {
        organizationId: aureliaOrg._id,
        eventId: gala._id,
        budgetItemId: bProduction._id,
        title: "Apex Sound AV Load-in Deposit",
        category: "Production",
        amount: 18500,
        currency: "USD",
        date: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000),
        paidTo: "Apex Sound & Production Rigging",
        paymentMethod: "Bank Transfer",
        receiptRef: "REC-APX-8109",
        status: "cleared",
        recordedByUserName: "Olivia Sterling",
      },
    ]);

    // Client Invoices & Payment Milestones (FR-51, FR-53)
    await InvoiceModel.create([
      {
        organizationId: aureliaOrg._id,
        eventId: gala._id,
        clientId: clientPhilanthropy._id,
        clientName: clientPhilanthropy.name,
        invoiceNumber: "INV-2026-0881",
        title: "Gala Deposit (50% Event Contract)",
        totalAmount: 110000,
        paidAmount: 110000,
        currency: "USD",
        issueDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        dueDate: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000),
        status: "Paid",
        isSharedWithClient: true,
        payments: [
          {
            id: "pay1",
            date: new Date(Date.now() - 18 * 24 * 60 * 60 * 1000),
            amount: 110000,
            currency: "USD",
            paymentMethod: "Wire",
            reference: "WIRE-JPMC-99812",
            notes: "Received in full via J.P. Morgan wire",
            recordedBy: "Olivia Sterling",
          },
        ],
      },
      {
        organizationId: aureliaOrg._id,
        eventId: gala._id,
        clientId: clientPhilanthropy._id,
        clientName: clientPhilanthropy.name,
        invoiceNumber: "INV-2026-0899",
        title: "Final Event Balance & Sommelier Wine Pairing Surcharge",
        totalAmount: 95000,
        paidAmount: 0,
        currency: "USD",
        issueDate: new Date(),
        dueDate: new Date("2026-11-10T17:00:00Z"),
        status: "Issued",
        isSharedWithClient: true,
        payments: [],
      },
    ]);

    // 10. Seed Documents, Versions & Approvals (FR-60, FR-61, FR-62, BR-8)
    await DocumentRecordModel.create([
      {
        organizationId: aureliaOrg._id,
        eventId: gala._id,
        eventName: "Aura Foundation Gala",
        title: "Master Gala Services Agreement & NDA",
        category: "Contract",
        tags: ["Legal", "Executed", "SLA"],
        visibility: "shared_with_client",
        currentVersion: 2,
        fileUrl: "https://images.unsplash.com/photo-1450133064473-71024230f91b?w=800",
        storageKey: `org/${aureliaOrg._id}/docs/v2-master-gala-services-agreement.pdf`,
        fileSizeKB: 320,
        fileType: "PDF",
        uploadedByName: "Olivia Sterling",
        versions: [
          {
            versionNumber: 1,
            fileUrl: "https://images.unsplash.com/photo-1450133064473-71024230f91b?w=800",
            storageKey: `org/${aureliaOrg._id}/docs/v1-master-gala-services-agreement.pdf`,
            fileSizeKB: 290,
            uploadedByName: "Olivia Sterling",
            uploadedAt: new Date(Date.now() - 25 * 24 * 60 * 60 * 1000),
            notes: "Initial draft contract",
          },
          {
            versionNumber: 2,
            fileUrl: "https://images.unsplash.com/photo-1450133064473-71024230f91b?w=800",
            storageKey: `org/${aureliaOrg._id}/docs/v2-master-gala-services-agreement.pdf`,
            fileSizeKB: 320,
            uploadedByName: "Marcus Vance",
            uploadedAt: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000),
            notes: "Incorporated Eleanor Vance's indemnity addendum",
          },
        ],
        approval: {
          requestedToName: "Eleanor Vance",
          requestedAt: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000),
          status: "approved",
          decidedByName: "Eleanor Vance (Client Board)",
          decidedAt: new Date(Date.now() - 12 * 24 * 60 * 60 * 1000),
          decisionComment: "Approved on behalf of the Board of Trustees.",
          disclaimer: "Recorded approval in EverFlow; does not constitute a legally binding electronic signature (BR-8).",
        },
      },
      {
        organizationId: aureliaOrg._id,
        eventId: gala._id,
        eventName: "Aura Foundation Gala",
        title: "The Glasshouse Grand Hall Floorplan & Emergency Egress",
        category: "Brief",
        tags: ["Logistics", "Rigging", "Seating"],
        visibility: "internal",
        currentVersion: 1,
        fileUrl: "https://images.unsplash.com/photo-1503387762-592deb58ef4e?w=800",
        storageKey: `org/${aureliaOrg._id}/docs/v1-glasshouse-floorplan.pdf`,
        fileSizeKB: 850,
        fileType: "PDF",
        uploadedByName: "Marcus Vance",
        versions: [
          {
            versionNumber: 1,
            fileUrl: "https://images.unsplash.com/photo-1503387762-592deb58ef4e?w=800",
            storageKey: `org/${aureliaOrg._id}/docs/v1-glasshouse-floorplan.pdf`,
            fileSizeKB: 850,
            uploadedByName: "Marcus Vance",
            uploadedAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
            notes: "Certified with 45 tables of 10",
          },
        ],
      },
      // Nordic documents for Staff view
      {
        organizationId: nordicOrg._id,
        eventId: nordicFestival._id,
        eventName: "Midsummer Folk & Arts Celebration",
        title: "Skansen Open-Air Festival Site Map & Emergency Egress Plan",
        category: "Brief",
        tags: ["Safety", "Staff", "Logistics"],
        visibility: "internal",
        currentVersion: 1,
        fileUrl: "https://images.unsplash.com/photo-1524368535928-5b5e00ddc76b?w=800",
        storageKey: `org/${nordicOrg._id}/docs/v1-skansen-site-map.pdf`,
        fileSizeKB: 620,
        fileType: "PDF",
        uploadedByName: "Sophia Chen",
        versions: [
          {
            versionNumber: 1,
            fileUrl: "https://images.unsplash.com/photo-1524368535928-5b5e00ddc76b?w=800",
            storageKey: `org/${nordicOrg._id}/docs/v1-skansen-site-map.pdf`,
            fileSizeKB: 620,
            uploadedByName: "Sophia Chen",
            uploadedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
            notes: "Approved stage and first-aid locations",
          },
        ],
      },
      {
        organizationId: nordicOrg._id,
        eventId: nordicFestival._id,
        eventName: "Midsummer Folk & Arts Celebration",
        title: "Staff Operational Handbook & Shift Schedule",
        category: "RunSheet",
        tags: ["Staff", "RunSheet", "Brief"],
        visibility: "internal",
        currentVersion: 1,
        fileUrl: "https://images.unsplash.com/photo-1450133064473-71024230f91b?w=800",
        storageKey: `org/${nordicOrg._id}/docs/v1-staff-handbook.pdf`,
        fileSizeKB: 410,
        fileType: "PDF",
        uploadedByName: "Sophia Chen",
        versions: [
          {
            versionNumber: 1,
            fileUrl: "https://images.unsplash.com/photo-1450133064473-71024230f91b?w=800",
            storageKey: `org/${nordicOrg._id}/docs/v1-staff-handbook.pdf`,
            fileSizeKB: 410,
            uploadedByName: "Sophia Chen",
            uploadedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
            notes: "Radio channels, emergency codes, and task rosters",
          },
        ],
      },
    ]);

    // 11. Seed Threaded Messages across 3 Strict Channels (FR-70, FR-71)
    await MessageModel.create([
      // Channel 1: Internal Staff
      {
        organizationId: aureliaOrg._id,
        eventId: gala._id,
        channel: "internal",
        senderUserId: olivia._id,
        senderName: "Olivia Sterling",
        senderRole: "Owner",
        senderAvatar: olivia.avatar,
        content: "Team, VIP ticket sales are at 92% capacity. Marcus, please double check security briefing at 16:00.",
      },
      {
        organizationId: aureliaOrg._id,
        eventId: gala._id,
        channel: "internal",
        senderUserId: marcus._id,
        senderName: "Marcus Vance",
        senderRole: "Admin",
        senderAvatar: marcus.avatar,
        content: "Understood Olivia. Dock 3 gate clearance confirmed with Glasshouse security team.",
      },
      // Channel 2: Client Channel
      {
        organizationId: aureliaOrg._id,
        eventId: gala._id,
        channel: "client",
        senderUserId: olivia._id,
        senderName: "Olivia Sterling",
        senderRole: "Owner",
        senderAvatar: olivia.avatar,
        content: "Dear Eleanor, the four-course tasting menu has been locked in with Chef Antoine Laurent. Invoice #0881 is marked settled.",
      },
      // Channel 3: Vendor Channel
      {
        organizationId: aureliaOrg._id,
        eventId: gala._id,
        channel: "vendor",
        senderUserId: marcus._id,
        senderName: "Marcus Vance",
        senderRole: "Admin",
        senderAvatar: marcus.avatar,
        content: "Grand Cru team, loading dock 3 will be open promptly at 15:30. Kitchen prep staging is on the mezzanine.",
      },
      // Nordic Staff Internal Channel
      {
        organizationId: nordicOrg._id,
        eventId: nordicFestival._id,
        channel: "internal",
        senderUserId: sophia._id,
        senderName: "Sophia Chen",
        senderRole: "Owner",
        senderAvatar: sophia.avatar,
        content: "Welcome to the Nordic Heritage Festival team! All event tasks have been loaded for Skansen. Please check your assigned tasks and update progress.",
      },
      {
        organizationId: nordicOrg._id,
        eventId: nordicFestival._id,
        channel: "internal",
        senderUserId: olivia._id,
        senderName: "Olivia Sterling",
        senderRole: "Staff",
        senderAvatar: olivia.avatar,
        content: "Received! Will head down to inspect stage rigging and first aid kiosk first thing in the morning.",
      },
    ]);

    // 12. Seed Attendees / Guest List (FR-80)
    await AttendeeModel.create([
      {
        organizationId: aureliaOrg._id,
        eventId: gala._id,
        fullName: "Dr. Alistair Finch",
        email: "afinch@manhattanarts.org",
        phone: "+1 (212) 555-1100",
        rsvpStatus: "attending",
        dietaryRequirements: "Pescatarian",
        tableOrGroup: "Patron Table 1 (Front Stage)",
        vipStatus: true,
        notes: "Honorary award recipient",
      },
      {
        organizationId: aureliaOrg._id,
        eventId: gala._id,
        fullName: "Lady Vivienne Westwood-Cole",
        email: "vivienne@colefoundation.co.uk",
        phone: "+44 20 7946 0912",
        rsvpStatus: "attending",
        dietaryRequirements: "Gluten-Free, No Peanuts",
        tableOrGroup: "Patron Table 1 (Front Stage)",
        vipStatus: true,
      },
      {
        organizationId: aureliaOrg._id,
        eventId: gala._id,
        fullName: "Kenneth Vance Jr.",
        email: "kvance@vanceholdings.com",
        phone: "+1 (212) 555-2233",
        rsvpStatus: "attending",
        dietaryRequirements: "None",
        tableOrGroup: "Sponsor Table 4",
        vipStatus: false,
      },
      {
        organizationId: aureliaOrg._id,
        eventId: gala._id,
        fullName: "Mayor Thomas Gallagher",
        email: "mayor.gallagher@cityofny.gov",
        phone: "+1 (212) 555-0100",
        rsvpStatus: "tentative",
        dietaryRequirements: "None",
        tableOrGroup: "Dignitary Table 2",
        vipStatus: true,
        notes: "Awaiting final confirmation from chief of staff",
      },
      // Nordic Attendees
      {
        organizationId: nordicOrg._id,
        eventId: nordicFestival._id,
        fullName: "Freja Lindqvist",
        email: "freja.lindqvist@scandiculture.se",
        phone: "+46 8 123 4567",
        rsvpStatus: "attending",
        dietaryRequirements: "Vegetarian",
        tableOrGroup: "Artisans Guild 1",
        vipStatus: true,
        notes: "Lead coordinator for traditional folk dance troupe",
      },
      {
        organizationId: nordicOrg._id,
        eventId: nordicFestival._id,
        fullName: "Lars Johansson",
        email: "lars.j@stockholmfolk.se",
        phone: "+46 8 234 5678",
        rsvpStatus: "attending",
        dietaryRequirements: "None",
        tableOrGroup: "General Gate A",
        vipStatus: false,
      },
      {
        organizationId: nordicOrg._id,
        eventId: nordicFestival._id,
        fullName: "Astrid Nygren",
        email: "astrid@nygrencrafts.com",
        phone: "+46 8 345 6789",
        rsvpStatus: "attending",
        dietaryRequirements: "Gluten-Free",
        tableOrGroup: "Artisans Guild 2",
        vipStatus: false,
      },
    ]);

    // 13. Seed In-App Notifications (FR-90)
    await NotificationModel.create([
      {
        organizationId: aureliaOrg._id,
        userId: olivia._id,
        title: "Vendor Double-Booking Overridden",
        message: "Apex Sound scheduling conflict was verified and overridden with dispatch team B deployment note.",
        type: "conflict",
        isRead: false,
        actionUrl: "/?tab=vendors",
      },
      {
        organizationId: aureliaOrg._id,
        userId: olivia._id,
        title: "Client Approval Recorded",
        message: "Eleanor Vance approved 'Master Gala Services Agreement & NDA' with board sign-off comment.",
        type: "approval",
        isRead: false,
        actionUrl: "/?tab=documents",
      },
      {
        organizationId: aureliaOrg._id,
        userId: olivia._id,
        title: "Milestone Payment Due in 25 Days",
        message: "Invoice INV-2026-0899 for $95,000 due on November 10, 2026.",
        type: "payment",
        isRead: false,
        actionUrl: "/?tab=finances",
      },
      {
        organizationId: aureliaOrg._id,
        userId: olivia._id,
        title: "Readiness Checklist Updated",
        message: "Aura Foundation Gala is at 82% execution readiness. 2 items remaining.",
        type: "readiness",
        isRead: true,
        actionUrl: "/?tab=overview",
      },
    ]);

    // 14. Seed Support Access Grant (FR-105, BR-9)
    await SupportAccessGrantModel.create({
      organizationId: aureliaOrg._id,
      grantedByUserId: olivia._id,
      grantedByEmail: olivia.email,
      supportAdminEmail: "support@everflow.io",
      reason: "Investigation of calendar timezone display and vendor quotation synchronization",
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      isActive: true,
    });

    // 15. Seed Tasks for Gala, Wedding, Summit
    await TaskModel.create([
      {
        organizationId: aureliaOrg._id,
        eventId: gala._id,
        title: "VIP patron table allocation and host seating list",
        category: "Logistics",
        priority: "high",
        status: "completed",
        assignedToName: "Olivia Sterling",
        isBlocked: false,
        completedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
      },
      {
        organizationId: aureliaOrg._id,
        eventId: gala._id,
        title: "Live auctioneer contract confirmation and lot consignment review",
        category: "Program",
        priority: "high",
        status: "completed",
        assignedToName: "Marcus Vance",
        isBlocked: false,
        completedAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000),
      },
      {
        organizationId: aureliaOrg._id,
        eventId: gala._id,
        title: "Michelin star tasting menu sign-off with Executive Chef",
        category: "Vendors",
        priority: "high",
        status: "completed",
        assignedToName: "Sophia Chen",
        isBlocked: false,
        completedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
      },
      {
        organizationId: aureliaOrg._id,
        eventId: gala._id,
        title: "Soundcheck, microphone setup & DJ ceremony playlist check",
        category: "Program",
        priority: "high",
        status: "in_progress",
        assignedToName: "Julian Drake",
        isBlocked: false,
      },
      {
        organizationId: aureliaOrg._id,
        eventId: gala._id,
        title: "Floral installation load-in and black-tie red carpet stanchions",
        category: "Design",
        priority: "medium",
        status: "todo",
        assignedToName: "Sophia Chen",
        isBlocked: true,
        blockedReason: "Awaiting Glasshouse morning window load-in elevator permit from building engineers.",
      },
      // Wedding tasks
      {
        organizationId: aureliaOrg._id,
        eventId: wedding._id,
        title: "Guest RSVP dietary requirements compiled for catering staff",
        category: "Logistics",
        priority: "high",
        status: "completed",
        assignedToName: "Sophia Chen",
        completedAt: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000),
      },
      {
        organizationId: aureliaOrg._id,
        eventId: wedding._id,
        title: "Coastal estate floral arbor & aisle runner mockup approval",
        category: "Design",
        priority: "medium",
        status: "completed",
        assignedToName: "Sophia Chen",
        completedAt: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000),
      },
      {
        organizationId: aureliaOrg._id,
        eventId: wedding._id,
        title: "Bridal party transport shuttle schedule and driver coordination",
        category: "Logistics",
        priority: "medium",
        status: "in_progress",
        assignedToName: "Julian Drake",
      },
      // Tasks for Nordic Heritage Festival (Staff Demonstration - Olivia Sterling is Staff)
      {
        organizationId: nordicOrg._id,
        eventId: nordicFestival._id,
        title: "Verify open-air stage soundcheck & acoustic violin microphone levels",
        category: "Production",
        priority: "high",
        status: "in_progress",
        assignedToName: "Olivia Sterling",
        isBlocked: false,
      },
      {
        organizationId: nordicOrg._id,
        eventId: nordicFestival._id,
        title: "Assemble traditional midsummer maypole and inspect safety ground anchors",
        category: "Logistics",
        priority: "high",
        status: "completed",
        assignedToName: "Olivia Sterling",
        isBlocked: false,
        completedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
      },
      {
        organizationId: nordicOrg._id,
        eventId: nordicFestival._id,
        title: "Set up first aid emergency station & calibrate walkie-talkie channel 2",
        category: "Logistics",
        priority: "high",
        status: "todo",
        assignedToName: "Olivia Sterling",
        isBlocked: false,
      },
      {
        organizationId: nordicOrg._id,
        eventId: nordicFestival._id,
        title: "Inspect artisan craft vendor booths & confirm electrical junction safety",
        category: "Logistics",
        priority: "medium",
        status: "todo",
        assignedToName: "Olivia Sterling",
        isBlocked: false,
      },
      {
        organizationId: nordicOrg._id,
        eventId: nordicFestival._id,
        title: "Welcome gate signage & QR code scanner terminal setup",
        category: "Logistics",
        priority: "medium",
        status: "completed",
        assignedToName: "Staff Team",
        isBlocked: false,
        completedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
      },
      {
        organizationId: nordicOrg._id,
        eventId: nordicFestival._id,
        title: "Swedish lingonberry pastry drop-off and refrigeration temperature check",
        category: "Vendors",
        priority: "low",
        status: "completed",
        assignedToName: "Staff Team",
        isBlocked: false,
        completedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
      },
      {
        organizationId: nordicOrg._id,
        eventId: nordicGala._id,
        title: "Vinterträdgården glass roof ambient lighting check & table pinspots",
        category: "Production",
        priority: "high",
        status: "todo",
        assignedToName: "Olivia Sterling",
        isBlocked: false,
      },
      {
        organizationId: nordicOrg._id,
        eventId: nordicGala._id,
        title: "Stockholm Philharmonic string quartet arrival & dressing room setup",
        category: "Program",
        priority: "medium",
        status: "todo",
        assignedToName: "Olivia Sterling",
        isBlocked: false,
      },
    ]);

    // 16. Seed Audit Logs
    await AuditLogModel.create([
      {
        organizationId: aureliaOrg._id,
        actorUserId: olivia._id,
        actorEmail: olivia.email,
        action: "organization.created",
        targetType: "Organization",
        targetId: aureliaOrg._id.toString(),
        details: { plan: "Professional", initialTrialDays: 14, owner: olivia.name, brand: "EverFlow" },
        ipAddress: "192.168.1.10",
        createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
      },
      {
        organizationId: aureliaOrg._id,
        actorUserId: olivia._id,
        actorEmail: olivia.email,
        action: "event.created",
        targetType: "Event",
        details: { name: "Aura Foundation Gala", category: "Gala", budget: 185000 },
        ipAddress: "192.168.1.10",
        createdAt: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000),
      },
      {
        organizationId: aureliaOrg._id,
        actorUserId: olivia._id,
        actorEmail: olivia.email,
        action: "vendor.booking_conflict_override",
        targetType: "VendorBooking",
        details: { vendor: "Apex Sound & Lighting", reason: "Secondary dispatch team B deployed" },
        ipAddress: "192.168.1.10",
        createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
      },
    ]);

    const sessionPayload = {
      userId: olivia._id.toString(),
      email: olivia.email,
      name: olivia.name,
      activeOrgId: aureliaOrg._id.toString(),
    };

    const cookieVal = createSessionCookieValue(sessionPayload);
    const res = NextResponse.json({
      success: true,
      message: "EverFlow Release 1 (MVP) database successfully seeded with all core modules!",
      activeUser: { name: olivia.name, email: olivia.email },
      activeOrganization: { name: aureliaOrg.name, slug: aureliaOrg.slug, role: "Owner" },
      seededCounts: {
        users: 6,
        organizations: 3,
        events: 4,
        templates: PREDEFINED_TEMPLATES.length,
        vendors: 4,
        clients: 3,
        tasks: 8,
        invoices: 2,
        documents: 2,
        messages: 4,
        attendees: 4,
      },
    });

    res.cookies.set(SESSION_COOKIE_NAME, cookieVal, {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 7,
    });

    res.cookies.set(ACTIVE_ORG_COOKIE_NAME, aureliaOrg._id.toString(), {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 7,
    });

    return res;
  } catch (error) {
    console.error("Seed Data Error:", error);
    return NextResponse.json({ error: "INTERNAL_ERROR", message: "Failed to seed database" }, { status: 500 });
  }
}
