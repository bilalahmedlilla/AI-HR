import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { evaluateAnswer } from "@/lib/ai";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const interviewId = parseInt(id);

  const { questionId, answerText } = await request.json();

  // Verify question belongs to this interview
  const question = await prisma.question.findFirst({
    where: { id: questionId, interviewId },
    include: { interview: { include: { jobDescription: true } } },
  });

  if (!question) {
    return NextResponse.json({ error: "Question not found" }, { status: 404 });
  }

  // Evaluate answer with AI
  const evaluation = await evaluateAnswer(
    question.questionText,
    answerText,
    question.subject || "general",
    question.interview.jobDescription.experienceLevel
  );

  // Save answer
  const answer = await prisma.answer.create({
    data: {
      questionId: question.id,
      answerText,
      score: evaluation.score,
      feedback: evaluation.feedback,
    },
  });

  // Update interview status
  await prisma.interview.update({
    where: { id: interviewId },
    data: { status: "in_progress" },
  });

  return NextResponse.json({
    id: answer.id,
    score: evaluation.score,
    feedback: evaluation.feedback,
  });
}
