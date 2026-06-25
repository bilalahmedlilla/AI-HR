import Link from "next/link";

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-8">
      <div className="max-w-2xl text-center">
        <h1 className="text-5xl font-bold tracking-tight text-gray-900 mb-4">
          AI-HR
        </h1>
        <p className="text-xl text-gray-600 mb-12">
          AI-powered interview platform. Create interviews, evaluate answers, and
          find the right talent — faster.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <Link
            href="/hr"
            className="group rounded-2xl border border-gray-200 bg-white p-8 transition hover:border-blue-400 hover:shadow-lg"
          >
            <div className="text-3xl mb-3">🏢</div>
            <h2 className="text-lg font-semibold text-gray-900 mb-2">
              HR Portal
            </h2>
            <p className="text-sm text-gray-500">
              Create interviews, review candidates, and manage your hiring pipeline.
            </p>
          </Link>

          <div className="group rounded-2xl border border-gray-200 bg-white p-8 transition hover:border-green-400 hover:shadow-lg">
            <div className="text-3xl mb-3">🎤</div>
            <h2 className="text-lg font-semibold text-gray-900 mb-2">
              Candidate Interview
            </h2>
            <p className="text-sm text-gray-500">
              Have an interview link? Open it to start your AI-powered interview session.
            </p>
          </div>
        </div>

        <div className="mt-12 text-sm text-gray-400">
          Phase 1 — Text-to-Text Interview
        </div>
      </div>
    </div>
  );
}
