import { cookies } from "next/headers";
import mongoose from "mongoose";
import { connectToDatabase } from "@/lib/db/connect";
import { UserModel, IUser } from "@/lib/models/User";
import { OrganizationModel, IOrganization } from "@/lib/models/Organization";
import { OrganizationMembershipModel, IOrganizationMembership } from "@/lib/models/OrganizationMembership";

export interface UserSession {
  userId: string;
  email: string;
  name: string;
  activeOrgId?: string;
}

export const SESSION_COOKIE_NAME = "everflow_session";
export const ACTIVE_ORG_COOKIE_NAME = "everflow_active_org";

export async function getCurrentSession(): Promise<UserSession | null> {
  const cookieStore = await cookies();
  const sessionVal = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  if (!sessionVal) return null;

  try {
    const parsed = JSON.parse(Buffer.from(sessionVal, "base64").toString("utf-8"));
    const activeOrgId = cookieStore.get(ACTIVE_ORG_COOKIE_NAME)?.value || parsed.activeOrgId;
    return {
      userId: parsed.userId,
      email: parsed.email,
      name: parsed.name,
      activeOrgId,
    };
  } catch {
    return null;
  }
}

export function createSessionCookieValue(session: UserSession): string {
  return Buffer.from(JSON.stringify(session)).toString("base64");
}

export async function getActiveUserAndMemberships(userId: string) {
  await connectToDatabase();
  const user = await UserModel.findById(userId).lean();
  if (!user || user.status === "suspended") {
    return null;
  }

  const memberships = await OrganizationMembershipModel.find({
    userId: new mongoose.Types.ObjectId(userId),
    status: "active",
  })
    .populate("organizationId")
    .lean();

  return {
    user,
    memberships,
  };
}
