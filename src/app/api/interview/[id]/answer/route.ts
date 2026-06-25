import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { evaluateAnswer } from "@/lib/ai";
import { saveAudioFile } from "@/lib/storage";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const interviewId = parseInt(id);

  const contentType = request.headers.get("content-type") || "";

  let questionId: number;
  let answerText: string;
  let audioUrl: string | undefined;
  let voiceDuration: number | undefined;

  if (contentType.includes("multipart/form-data")) {
    const formData = await request.formData();
    questionId = parseInt(formData.get("questionId") as string);
    answerText = (formData.get("answerText") as string) || "";
    voiceDuration = parseInt(formData.get("duration") as string) || undefined;

    const audioFile = formData.get("audioFile") as File | null;
    if (audioFile && audioFile.size > 0) {
      const saved = await saveAudioFile(audioFile, interviewId, questionId);
      audioUrl = saved.url;
    }
  } else {
    const body = await request.json();
    questionId = body.questionId;
    answerText = body.answerText;
  }

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
      audioUrl,
      voiceDuration,
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
    audioUrl,
    voiceDuration,
  });
}
