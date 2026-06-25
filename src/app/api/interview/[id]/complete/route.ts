import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const interviewId = parseInt(id);

  const interview = await prisma.interview.findUnique({
    where: { id: interviewId },
    include: {
      questions: {
        include: {
          answers: { orderBy: { createdAt: "desc" }, take: 1 },
        },
      },
    },
  });

  if (!interview) {
    return NextResponse.json({ error: "Interview not found" }, { status: 404 });
  }

  // Calculate overall score from all answered questions
  const scores = interview.questions
    .map((q) => q.answers[0]?.score)
    .filter((s): s is number => s !== null && s !== undefined);

  const overallScore = scores.length > 0
    ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
    : null;

  // Update interview
  const updated = await prisma.interview.update({
    where: { id: interviewId },
    data: {
      status: "completed",
      overallScore,
      completedAt: new Date(),
    },
  });

  return NextResponse.json({
    id: updated.id,
    overallScore: updated.overallScore,
    status: updated.status,
  });
}
