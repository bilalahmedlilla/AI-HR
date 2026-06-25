"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

interface Company {
  id: number;
  name: string;
  email: string;
}

interface JobDescription {
  id: number;
  title: string;
  experienceLevel: string;
  skills: string[];
  interviewCount: number;
  createdAt: string;
}

export default function HRPage() {
  const router = useRouter();
  const [company, setCompany] = useState<Company | null>(null);
  const [loading, setLoading] = useState(true);

  // Auth state
  const [authMode, setAuthMode] = useState<"login" | "register">("login");
  const [authName, setAuthName] = useState("");
  const [authEmail, setAuthEmail] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [authError, setAuthError] = useState("");
  const [authSubmitting, setAuthSubmitting] = useState(false);

  // Dashboard state
  const [jobDescriptions, setJobDescriptions] = useState<JobDescription[]>([]);
  const [dashboardLoading, setDashboardLoading] = useState(false);

  // Check session on mount
  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data?.id) {
          setCompany(data);
          loadJobDescriptions();
        }
      })
      .finally(() => setLoading(false));
  }, []);

  const loadJobDescriptions = async () => {
    setDashboardLoading(true);
    try {
      const res = await fetch("/api/job-descriptions");
      if (res.ok) {
        const data = await res.json();
        setJobDescriptions(data);
      }
    } catch {
      // ignore
    }
    setDashboardLoading(false);
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError("");
    setAuthSubmitting(true);

    const endpoint = authMode === "login" ? "/api/auth/login" : "/api/auth/register";
    const body =
      authMode === "login"
        ? { email: authEmail, password: authPassword }
        : { name: authName, email: authEmail, password: authPassword };

    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = await res.json();

      if (!res.ok) {
        setAuthError(data.error || "Something went wrong");
        return;
      }

      setCompany({ id: data.id, name: data.name, email: data.email });
      loadJobDescriptions();
    } catch {
      setAuthError("Network error. Please try again.");
    }
    setAuthSubmitting(false);
  };

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    setCompany(null);
    setJobDescriptions([]);
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-gray-500">Loading...</p>
      </div>
    );
  }

  // Auth screen
  if (!company) {
    return (
      <div className="mx-auto max-w-md p-8 pt-20">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold">AI-HR</h1>
          <p className="text-gray-500 mt-2">HR Portal</p>
        </div>

        <div className="rounded-2xl border bg-white p-8">
          <div className="flex mb-6 rounded-lg bg-gray-100 p-1">
            <button
              onClick={() => { setAuthMode("login"); setAuthError(""); }}
              className={`flex-1 rounded-md py-2 text-sm font-medium transition ${
                authMode === "login" ? "bg-white shadow-sm" : "text-gray-500"
              }`}
            >
              Sign In
            </button>
            <button
              onClick={() => { setAuthMode("register"); setAuthError(""); }}
              className={`flex-1 rounded-md py-2 text-sm font-medium transition ${
                authMode === "register" ? "bg-white shadow-sm" : "text-gray-500"
              }`}
            >
              Register
            </button>
          </div>

          <form onSubmit={handleAuth} className="space-y-4">
            {authMode === "register" && (
              <input
                type="text"
                placeholder="Company Name"
                className="w-full rounded-lg border px-4 py-2"
                value={authName}
                onChange={(e) => setAuthName(e.target.value)}
                required
              />
            )}
            <input
              type="email"
              placeholder="Email"
              className="w-full rounded-lg border px-4 py-2"
              value={authEmail}
              onChange={(e) => setAuthEmail(e.target.value)}
              required
            />
            <input
              type="password"
              placeholder="Password"
              className="w-full rounded-lg border px-4 py-2"
              value={authPassword}
              onChange={(e) => setAuthPassword(e.target.value)}
              required
              minLength={6}
            />

            {authError && (
              <p className="text-sm text-red-600">{authError}</p>
            )}

            <button
              type="submit"
              disabled={authSubmitting}
              className="w-full rounded-lg bg-blue-600 px-4 py-2 text-white font-medium hover:bg-blue-700 disabled:opacity-50"
            >
              {authSubmitting
                ? "Please wait..."
                : authMode === "login"
                ? "Sign In"
                : "Create Account"}
            </button>
          </form>
        </div>
      </div>
    );
  }

  // Dashboard
  return (
    <div className="mx-auto max-w-4xl p-8">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{company.name}</h1>
          <p className="text-sm text-gray-500">{company.email}</p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/hr/create"
            className="rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
          >
            + New Job Description
          </Link>
          <button
            onClick={handleLogout}
            className="rounded-lg border px-4 py-2 text-gray-600 hover:bg-gray-50"
          >
            Logout
          </button>
        </div>
      </div>

      {dashboardLoading ? (
        <p className="text-gray-500 text-center py-12">Loading...</p>
      ) : jobDescriptions.length === 0 ? (
        <div className="rounded-2xl border-2 border-dashed bg-white p-12 text-center">
          <div className="text-4xl mb-4">📋</div>
          <h2 className="text-lg font-semibold mb-2">No job descriptions yet</h2>
          <p className="text-gray-500 mb-6">
            Create your first job description to start interviewing candidates.
          </p>
          <Link
            href="/hr/create"
            className="inline-block rounded-lg bg-blue-600 px-6 py-2 text-white hover:bg-blue-700"
          >
            Create Job Description
          </Link>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {jobDescriptions.map((jd) => (
            <Link
              key={jd.id}
              href={`/hr/job/${jd.id}`}
              className="rounded-xl border bg-white p-6 transition hover:shadow-md"
            >
              <h3 className="font-semibold text-lg mb-2">{jd.title}</h3>
              <div className="flex items-center gap-2 mb-3">
                <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700">
                  {jd.experienceLevel}
                </span>
                <span className="text-xs text-gray-400">
                  {jd.interviewCount} interview{jd.interviewCount !== 1 ? "s" : ""}
                </span>
              </div>
              <div className="flex flex-wrap gap-1">
                {jd.skills.slice(0, 4).map((skill, i) => (
                  <span
                    key={i}
                    className="rounded bg-gray-100 px-2 py-0.5 text-xs text-gray-600"
                  >
                    {skill}
                  </span>
                ))}
                {jd.skills.length > 4 && (
                  <span className="text-xs text-gray-400">
                    +{jd.skills.length - 4} more
                  </span>
                )}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
