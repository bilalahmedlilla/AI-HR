"use client";

import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

interface Interview {
  id: number;
  candidateName: string;
  candidateEmail: string;
  status: string;
  overallScore: number | null;
  createdAt: string;
  totalQuestions: number;
}

interface JobDescriptionDetail {
  id: number;
  title: string;
  description: string;
  experienceLevel: string;
  skills: string[];
  interviews: Interview[];
  createdAt: string;
}

export default function JobDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const [data, setData] = useState<JobDescriptionDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [checkingAuth, setCheckingAuth] = useState(true);

  // Create interview state
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [candidateName, setCandidateName] = useState("");
  const [candidateEmail, setCandidateEmail] = useState("");
  const [creating, setCreating] = useState(false);
  const [createdLink, setCreatedLink] = useState<string | null>(null);
  const [createError, setCreateError] = useState("");

  useEffect(() => {
    fetch("/api/auth/me").then((r) => {
      if (!r.ok) router.push("/hr");
      setCheckingAuth(false);
    });
  }, [router]);

  useEffect(() => {
    if (checkingAuth) return;
    fetch(`/api/job-descriptions/${id}`)
      .then((r) => (r.ok ? r.json() : null))
      .then(setData)
      .finally(() => setLoading(false));
  }, [id, checkingAuth]);

  const handleCreateInterview = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    setCreateError("");
    setCreatedLink(null);

    try {
      const res = await fetch("/api/interview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jobDescriptionId: parseInt(id),
          candidateName,
          candidateEmail,
        }),
      });

      const result = await res.json();

      if (!res.ok) {
        setCreateError(result.error || "Failed to create interview");
        return;
      }

      setCreatedLink(
        typeof window !== "undefined"
          ? `${window.location.origin}${result.candidateLink}`
          : result.candidateLink
      );

      // Refresh interviews list
      const jdRes = await fetch(`/api/job-descriptions/${id}`);
      if (jdRes.ok) setData(await jdRes.json());
    } catch {
      setCreateError("Network error. Please try again.");
    }
    setCreating(false);
  };

  if (checkingAuth || loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-gray-500">Loading...</p>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <p className="text-gray-500 mb-4">Job description not found</p>
          <Link href="/hr" className="text-blue-600 hover:underline">
            ← Back to Dashboard
          </Link>
        </div>
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

      {/* Job Header */}
      <div className="mb-8 rounded-2xl border bg-white p-6">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold">{data.title}</h1>
            <div className="mt-2 flex items-center gap-2">
              <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700">
                {data.experienceLevel}
              </span>
            </div>
          </div>
          <button
            onClick={() => {
              setShowCreateForm(!showCreateForm);
              setCreatedLink(null);
              setCandidateName("");
              setCandidateEmail("");
            }}
            className="rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
          >
            + Create Interview
          </button>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          {data.skills.map((skill, i) => (
            <span
              key={i}
              className="rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-700"
            >
              {skill}
            </span>
          ))}
        </div>
      </div>

      {/* Create Interview Form */}
      {showCreateForm && (
        <div className="mb-8 rounded-2xl border bg-white p-6">
          <h2 className="text-lg font-semibold mb-4">New Interview</h2>

          {createdLink ? (
            <div className="text-center py-4">
              <div className="text-4xl mb-4">✅</div>
              <p className="font-medium mb-2">Interview Created!</p>
              <p className="text-sm text-gray-500 mb-3">
                Share this link with the candidate:
              </p>
              <div className="rounded-lg bg-gray-50 p-4 font-mono text-sm break-all">
                {createdLink}
              </div>
              <button
                onClick={() => {
                  setShowCreateForm(false);
                  setCreatedLink(null);
                }}
                className="mt-4 rounded-lg border px-4 py-2 text-sm text-gray-600 hover:bg-gray-50"
              >
                Close
              </button>
            </div>
          ) : (
            <form onSubmit={handleCreateInterview} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <input
                  type="text"
                  placeholder="Candidate Name"
                  className="rounded-lg border px-4 py-2 w-full"
                  value={candidateName}
                  onChange={(e) => setCandidateName(e.target.value)}
                  required
                />
                <input
                  type="email"
                  placeholder="Candidate Email"
                  className="rounded-lg border px-4 py-2 w-full"
                  value={candidateEmail}
                  onChange={(e) => setCandidateEmail(e.target.value)}
                  required
                />
              </div>

              {createError && (
                <p className="text-sm text-red-600">{createError}</p>
              )}

              <div className="flex items-center gap-3">
                <button
                  type="submit"
                  disabled={creating}
                  className="rounded-lg bg-blue-600 px-6 py-2 text-white font-medium hover:bg-blue-700 disabled:opacity-50"
                >
                  {creating ? "Creating..." : "Create Interview"}
                </button>
                <button
                  type="button"
                  onClick={() => setShowCreateForm(false)}
                  className="rounded-lg border px-4 py-2 text-gray-600 hover:bg-gray-50"
                >
                  Cancel
                </button>
              </div>
            </form>
          )}
        </div>
      )}

      {/* Interviews List */}
      <h2 className="text-xl font-semibold mb-4">
        Interviews ({data.interviews.length})
      </h2>

      {data.interviews.length === 0 ? (
        <div className="rounded-2xl border-2 border-dashed bg-white p-12 text-center">
          <p className="text-gray-500">No interviews yet for this role.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {data.interviews.map((iv) => (
            <Link
              key={iv.id}
              href={`/hr/interview/${iv.id}`}
              className="flex items-center justify-between rounded-xl border bg-white p-4 transition hover:shadow-md"
            >
              <div>
                <h3 className="font-semibold">{iv.candidateName}</h3>
                <p className="text-sm text-gray-500">{iv.candidateEmail}</p>
              </div>
              <div className="text-right">
                <span
                  className={`inline-block rounded-full px-3 py-1 text-xs font-medium ${
                    iv.status === "completed"
                      ? "bg-green-100 text-green-700"
                      : iv.status === "in_progress"
                      ? "bg-yellow-100 text-yellow-700"
                      : "bg-gray-100 text-gray-600"
                  }`}
                >
                  {iv.status}
                </span>
                {iv.overallScore !== null && (
                  <p className="mt-1 text-lg font-bold">{iv.overallScore}%</p>
                )}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
