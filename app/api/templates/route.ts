import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db/connect";
import { PREDEFINED_TEMPLATES } from "@/lib/templates/predefined";
import { EventTemplateModel } from "@/lib/models/EventTemplate";

export const dynamic = "force-dynamic";

// GET: List all available predefined event templates (FR-11: Wedding, Conference, Graduation)
export async function GET() {
  try {
    await connectToDatabase();

    // Ensure predefined templates exist in DB or fallback to constants
    const templatesInDb = await EventTemplateModel.find({}).lean();
    if (!templatesInDb || templatesInDb.length === 0) {
      // Seed the templates collection
      for (const tmpl of PREDEFINED_TEMPLATES) {
        await EventTemplateModel.findOneAndUpdate(
          { slug: tmpl.slug },
          tmpl,
          { upsert: true, new: true }
        );
      }
    }

    const allTemplates = await EventTemplateModel.find({}).lean();

    return NextResponse.json({
      success: true,
      templates: (allTemplates.length > 0 ? allTemplates : PREDEFINED_TEMPLATES).map((t: any) => ({
        id: t._id ? t._id.toString() : t.slug,
        slug: t.slug,
        name: t.name,
        category: t.category,
        description: t.description,
        badge: t.badge,
        defaultBudget: t.defaultBudget,
        defaultCapacity: t.defaultCapacity,
        taskCount: t.tasks?.length || 0,
        tasks: t.tasks,
      })),
    });
  } catch (error) {
    console.error("List Templates Error:", error);
    // Graceful fallback to in-memory templates
    return NextResponse.json({
      success: true,
      templates: PREDEFINED_TEMPLATES.map((t) => ({
        id: t.slug,
        slug: t.slug,
        name: t.name,
        category: t.category,
        description: t.description,
        badge: t.badge,
        defaultBudget: t.defaultBudget,
        defaultCapacity: t.defaultCapacity,
        taskCount: t.tasks.length,
        tasks: t.tasks,
      })),
    });
  }
}
