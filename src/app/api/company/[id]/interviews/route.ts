import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const companyId = parseInt(id);

  const interviews = await prisma.interview.findMany({
    where: { jobDescription: { companyId } },
    include: {
      jobDescription: { select: { title: true } },
      questions: {
        include: {
          answers: { orderBy: { createdAt: "desc" }, take: 1 },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(
    interviews.map((i) => ({
      id: i.id,
      candidateName: i.candidateName,
      candidateEmail: i.candidateEmail,
      jobTitle: i.jobDescription.title,
      status: i.status,
      overallScore: i.overallScore,
      questionsAnswered: i.questions.filter((q) => q.answers.length > 0).length,
      totalQuestions: i.questions.length,
      createdAt: i.createdAt.toISOString(),
    }))
  );
}
