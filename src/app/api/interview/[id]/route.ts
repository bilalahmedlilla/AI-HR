import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const interviewId = parseInt(id);

  const interview = await prisma.interview.findUnique({
    where: { id: interviewId },
    include: {
      jobDescription: {
        select: { title: true, requiredSkills: true, experienceLevel: true },
      },
      questions: {
        orderBy: { orderIndex: "asc" },
        include: {
          answers: {
            orderBy: { createdAt: "desc" },
            take: 1,
          },
        },
      },
    },
  });

  if (!interview) {
    return NextResponse.json({ error: "Interview not found" }, { status: 404 });
  }

  return NextResponse.json({
    id: interview.id,
    candidateName: interview.candidateName,
    candidateEmail: interview.candidateEmail,
    status: interview.status,
    overallScore: interview.overallScore,
    createdAt: interview.createdAt.toISOString(),
    jobDescription: interview.jobDescription,
    questions: interview.questions.map((q) => ({
      id: q.id,
      subject: q.subject,
      questionText: q.questionText,
      orderIndex: q.orderIndex,
      answer: q.answers[0]
        ? {
            answerText: q.answers[0].answerText,
            score: q.answers[0].score,
            feedback: q.answers[0].feedback,
          }
        : null,
    })),
  });
}
