import { NextRequest, NextResponse } from "next/server";
import { requireCompany } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { parseJobDescription } from "@/lib/ai";

export async function POST(request: NextRequest) {
  try {
    const company = await requireCompany();
    const { title, description } = await request.json();

    if (!title || !description) {
      return NextResponse.json(
        { error: "Title and description are required" },
        { status: 400 }
      );
    }

    // Parse JD with AI
    const parsedJD = await parseJobDescription(description);

    // Create job description
    const jobDescription = await prisma.jobDescription.create({
      data: {
        companyId: company.id,
        title,
        description,
        requiredSkills: JSON.stringify(parsedJD.skills),
        experienceLevel: parsedJD.experienceLevel,
      },
    });

    return NextResponse.json({
      id: jobDescription.id,
      title: jobDescription.title,
      experienceLevel: jobDescription.experienceLevel,
      skills: parsedJD.skills,
    });
  } catch (error) {
    console.error("Error creating job description:", error);
    return NextResponse.json(
      { error: "Failed to create job description" },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    const company = await requireCompany();

    const jobDescriptions = await prisma.jobDescription.findMany({
      where: { companyId: company.id },
      include: {
        _count: { select: { interviews: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(
      jobDescriptions.map((jd) => ({
        id: jd.id,
        title: jd.title,
        experienceLevel: jd.experienceLevel,
        skills: JSON.parse(jd.requiredSkills),
        interviewCount: jd._count.interviews,
        createdAt: jd.createdAt.toISOString(),
      }))
    );
  } catch (error) {
    console.error("Error listing job descriptions:", error);
    return NextResponse.json(
      { error: "Failed to list job descriptions" },
      { status: 500 }
    );
  }
}
