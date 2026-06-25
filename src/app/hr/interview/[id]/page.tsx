"use client";

import { useEffect, useState } from "react";
import { use } from "react";
import Link from "next/link";
import { InterviewWithDetails } from "@/lib/types";

export default function InterviewReviewPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const [data, setData] = useState<InterviewWithDetails | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/interview/${id}`)
      .then((r) => r.json())
      .then(setData)
      .finally(() => setLoading(false));
  }, [id]);

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

  return (
    <div className="mx-auto max-w-4xl p-8">
      <div className="mb-6">
        <Link href="/hr" className="text-sm text-blue-600 hover:underline">
          ← Back to Dashboard
        </Link>
      </div>

      <div className="mb-8 rounded-2xl border bg-white p-6">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold">{data.jobDescription.title}</h1>
            <p className="text-gray-500 mt-1">
              {data.candidateName} · {data.candidateEmail}
            </p>
            <p className="text-sm text-gray-400 mt-1">
              Experience Level: {data.jobDescription.experienceLevel} · Status:{" "}
              <span
                className={`font-medium ${
                  data.status === "completed"
                    ? "text-green-600"
                    : data.status === "in_progress"
                    ? "text-yellow-600"
                    : "text-gray-600"
                }`}
              >
                {data.status}
              </span>
            </p>
          </div>
          {data.overallScore !== null && (
            <div className="text-center">
              <div
                className={`text-4xl font-bold ${
                  data.overallScore >= 80
                    ? "text-green-600"
                    : data.overallScore >= 60
                    ? "text-yellow-600"
                    : "text-red-600"
                }`}
              >
                {data.overallScore}%
              </div>
              <div className="text-sm text-gray-400">Overall Score</div>
            </div>
          )}
        </div>

        {data.jobDescription.requiredSkills && (
          <div className="mt-4 flex flex-wrap gap-2">
            {JSON.parse(data.jobDescription.requiredSkills).map(
              (skill: string, i: number) => (
                <span
                  key={i}
                  className="rounded-full bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700"
                >
                  {skill}
                </span>
              )
            )}
          </div>
        )}
      </div>

      <h2 className="text-xl font-semibold mb-4">Questions & Answers</h2>

      <div className="space-y-6">
        {data.questions.map((q, idx) => (
          <div key={q.id} className="rounded-xl border bg-white p-6">
            <div className="mb-2 flex items-center gap-2">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-100 text-xs font-bold text-blue-700">
                {idx + 1}
              </span>
              {q.subject && (
                <span className="rounded bg-gray-100 px-2 py-0.5 text-xs text-gray-600">
                  {q.subject}
                </span>
              )}
            </div>
            <p className="font-medium text-gray-900 mb-4">{q.questionText}</p>

            {q.answer ? (
              <div className="space-y-3">
                <div className="rounded-lg bg-gray-50 p-4">
                  <p className="text-sm text-gray-500 mb-1">Answer:</p>
                  <p className="text-gray-800">{q.answer.answerText}</p>
                </div>
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-1">
                    <span
                      className={`text-lg font-bold ${
                        (q.answer.score ?? 0) >= 80
                          ? "text-green-600"
                          : (q.answer.score ?? 0) >= 60
                          ? "text-yellow-600"
                          : "text-red-600"
                      }`}
                    >
                      {q.answer.score}
                    </span>
                    <span className="text-sm text-gray-400">/ 100</span>
                  </div>
                </div>
                {q.answer.feedback && (
                  <div className="rounded-lg border-l-4 border-blue-400 bg-blue-50 p-4">
                    <p className="text-sm text-gray-500 mb-1">Feedback:</p>
                    <p className="text-sm text-gray-700">{q.answer.feedback}</p>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-sm text-gray-400 italic">Not answered yet</p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
