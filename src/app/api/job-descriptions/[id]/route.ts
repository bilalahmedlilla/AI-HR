import { NextResponse } from "next/server";
import { requireCompany } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const company = await requireCompany();
    const { id } = await params;
    const jdId = parseInt(id);

    const jobDescription = await prisma.jobDescription.findFirst({
      where: { id: jdId, companyId: company.id },
      include: {
        interviews: {
          include: {
            _count: { select: { questions: true } },
          },
          orderBy: { createdAt: "desc" },
        },
      },
    });

    if (!jobDescription) {
      return NextResponse.json(
        { error: "Job description not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      id: jobDescription.id,
      title: jobDescription.title,
      description: jobDescription.description,
      experienceLevel: jobDescription.experienceLevel,
      skills: JSON.parse(jobDescription.requiredSkills),
      interviews: jobDescription.interviews.map((i) => ({
        id: i.id,
        candidateName: i.candidateName,
        candidateEmail: i.candidateEmail,
        status: i.status,
        overallScore: i.overallScore,
        createdAt: i.createdAt.toISOString(),
        totalQuestions: i._count.questions,
      })),
      createdAt: jobDescription.createdAt.toISOString(),
    });
  } catch (error) {
    console.error("Error fetching job description:", error);
    return NextResponse.json(
      { error: "Failed to fetch job description" },
      { status: 500 }
    );
  }
}
