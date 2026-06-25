"use client";

import { useEffect, useState, use } from "react";

interface Question {
  id: number;
  subject: string | null;
  questionText: string;
  orderIndex: number;
  answer: {
    answerText: string;
    score: number | null;
    feedback: string | null;
  } | null;
}

interface InterviewData {
  id: number;
  candidateName: string;
  status: string;
  jobDescription: { title: string; experienceLevel: string };
  questions: Question[];
}

export default function CandidateInterviewPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const [data, setData] = useState<InterviewData | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answer, setAnswer] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [showFeedback, setShowFeedback] = useState(false);
  const [latestFeedback, setLatestFeedback] = useState<{
    score: number;
    feedback: string;
  } | null>(null);
  const [completed, setCompleted] = useState(false);
  const [overallScore, setOverallScore] = useState<number | null>(null);

  useEffect(() => {
    fetch(`/api/interview/${id}`)
      .then((r) => r.json())
      .then(setData)
      .finally(() => setLoading(false));
  }, [id]);

  // Find the first unanswered question
  const currentQuestion = data?.questions[currentIndex];
  const isAnswered = currentQuestion?.answer !== null;
  const allAnswered = data?.questions.every((q) => q.answer !== null);

  const submitAnswer = async () => {
    if (!data || !answer.trim()) return;
    setSubmitting(true);

    const res = await fetch(`/api/interview/${id}/answer`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        questionId: currentQuestion!.id,
        answerText: answer,
      }),
    });

    const result = await res.json();
    setLatestFeedback(result);
    setShowFeedback(true);
    setSubmitting(false);
  };

  const nextQuestion = () => {
    setShowFeedback(false);
    setAnswer("");
    if (currentIndex < data!.questions.length - 1) {
      setCurrentIndex(currentIndex + 1);
    }
  };

  const completeInterview = async () => {
    const res = await fetch(`/api/interview/${id}/complete`, {
      method: "POST",
    });
    const result = await res.json();
    setOverallScore(result.overallScore);
    setCompleted(true);
  };

  // Auto-detect if current question is answered (data refreshes)
  useEffect(() => {
    if (isAnswered && !showFeedback) {
      const ans = currentQuestion?.answer;
      if (ans && ans.score !== null) {
        setLatestFeedback({
          score: ans.score,
          feedback: ans.feedback || "",
        });
        setShowFeedback(true);
      }
    }
  }, [currentIndex, data, isAnswered, showFeedback, currentQuestion]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-gray-500">Loading interview...</p>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-gray-500">Interview not found</p>
      </div>
    );
  }

  // Completed screen
  if (completed) {
    return (
      <div className="mx-auto max-w-lg p-8 pt-20">
        <div className="rounded-2xl border bg-white p-8 text-center">
          <div className="text-5xl mb-4">🎉</div>
          <h1 className="text-2xl font-bold mb-2">Interview Complete!</h1>
          <p className="text-gray-500 mb-6">
            Thank you, {data.candidateName}. Your responses have been recorded.
          </p>
          {overallScore !== null && (
            <div className="mb-6">
              <div
                className={`text-5xl font-bold mb-2 ${
                  overallScore >= 80
                    ? "text-green-600"
                    : overallScore >= 60
                    ? "text-yellow-600"
                    : "text-red-600"
                }`}
              >
                {overallScore}%
              </div>
              <p className="text-gray-400">Overall Score</p>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl p-8 pt-12">
      {/* Progress bar */}
      <div className="mb-8">
        <div className="flex items-center justify-between text-sm text-gray-500 mb-2">
          <span>
            Question {currentIndex + 1} of {data.questions.length}
          </span>
          <span>{data.jobDescription.title}</span>
        </div>
        <div className="h-2 rounded-full bg-gray-200">
          <div
            className="h-2 rounded-full bg-blue-600 transition-all"
            style={{
              width: `${
                ((currentIndex + (showFeedback ? 1 : 0)) / data.questions.length) *
                100
              }%`,
            }}
          />
        </div>
      </div>

      <div className="rounded-2xl border bg-white p-8">
        {/* Question card */}
        <div className="mb-6">
          {currentQuestion?.subject && (
            <span className="mb-3 inline-block rounded bg-blue-100 px-3 py-1 text-xs font-medium text-blue-700">
              {currentQuestion.subject}
            </span>
          )}
          <h2 className="text-xl font-semibold text-gray-900 leading-relaxed">
            {currentQuestion?.questionText}
          </h2>
        </div>

        {/* Answer input or feedback */}
        {showFeedback ? (
          <div className="space-y-6">
            <div className="rounded-lg bg-gray-50 p-4">
              <p className="text-sm text-gray-500 mb-1">Your answer:</p>
              <p className="text-gray-800">{answer}</p>
            </div>

            {latestFeedback && (
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <span
                    className={`text-3xl font-bold ${
                      latestFeedback.score >= 80
                        ? "text-green-600"
                        : latestFeedback.score >= 60
                        ? "text-yellow-600"
                        : "text-red-600"
                    }`}
                  >
                    {latestFeedback.score}
                  </span>
                  <span className="text-gray-400">/ 100</span>
                </div>

                <div className="rounded-lg border-l-4 border-blue-400 bg-blue-50 p-4">
                  <p className="font-medium text-sm text-blue-800 mb-1">
                    Feedback
                  </p>
                  <p className="text-sm text-gray-700">
                    {latestFeedback.feedback}
                  </p>
                </div>
              </div>
            )}

            {currentIndex < data.questions.length - 1 ? (
              <button
                onClick={nextQuestion}
                className="rounded-lg bg-blue-600 px-6 py-3 text-white font-medium hover:bg-blue-700"
              >
                Next Question →
              </button>
            ) : (
              <button
                onClick={completeInterview}
                className="rounded-lg bg-green-600 px-6 py-3 text-white font-medium hover:bg-green-700"
              >
                Complete Interview
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            <textarea
              placeholder="Type your answer here..."
              className="w-full min-h-[180px] rounded-lg border px-4 py-3 text-gray-800"
              value={answer}
              onChange={(e) => setAnswer(e.target.value)}
              disabled={submitting}
            />
            <div className="flex items-center justify-between">
              <p className="text-xs text-gray-400">
                Be detailed and specific. Use real examples if applicable.
              </p>
              <button
                onClick={submitAnswer}
                disabled={submitting || !answer.trim()}
                className="rounded-lg bg-blue-600 px-6 py-2 text-white font-medium hover:bg-blue-700 disabled:opacity-50"
              >
                {submitting ? "Evaluating..." : "Submit Answer"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
