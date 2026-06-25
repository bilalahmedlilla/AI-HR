"use client";

import { useEffect, useState, use, useCallback } from "react";
import { useVoiceInterview } from "@/lib/hooks/useVoiceInterview";

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
  const voice = useVoiceInterview();

  const [data, setData] = useState<InterviewData | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [started, setStarted] = useState(false);

  // Text input fallback
  const [textAnswer, setTextAnswer] = useState("");
  const [useTextMode, setUseTextMode] = useState(false);

  // Submission
  const [submitting, setSubmitting] = useState(false);
  const [showFeedback, setShowFeedback] = useState(false);
  const [latestFeedback, setLatestFeedback] = useState<{
    score: number;
    feedback: string;
    audioUrl?: string;
    voiceDuration?: number;
  } | null>(null);

  // Completion
  const [completed, setCompleted] = useState(false);
  const [overallScore, setOverallScore] = useState<number | null>(null);

  // Detect if voice is unavailable
  const voiceUnavailable =
    !voice.ttsSupported && !voice.recordingSupported;

  useEffect(() => {
    if (voiceUnavailable) setUseTextMode(true);
  }, [voiceUnavailable]);

  useEffect(() => {
    fetch(`/api/interview/${id}`)
      .then((r) => r.json())
      .then(setData)
      .finally(() => setLoading(false));
  }, [id]);

  const currentQuestion = data?.questions[currentIndex];
  const isAnswered = currentQuestion?.answer !== null;
  const allAnswered = data?.questions.every((q) => q.answer !== null);

  // Auto-speak question when it changes
  useEffect(() => {
    if (started && currentQuestion && !showFeedback && !isAnswered) {
      const timer = setTimeout(() => {
        voice.speak(currentQuestion.questionText);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [currentIndex, started, showFeedback, isAnswered]);

  const handleSpeakQuestion = useCallback(() => {
    if (currentQuestion) {
      voice.stopSpeaking();
      voice.speak(currentQuestion.questionText);
    }
  }, [currentQuestion, voice]);

  const handleMicToggle = async () => {
    if (voice.isRecording) {
      voice.stopRecording();
    } else {
      setTextAnswer("");
      await voice.startRecording();
    }
  };

  const handleSubmitAnswer = async () => {
    if (!data || submitting) return;
    setSubmitting(true);

    const answerText = useTextMode ? textAnswer : voice.transcript;
    if (!answerText.trim() && !voice.audioBlob) {
      setSubmitting(false);
      return;
    }

    try {
      let result: any;

      if (!useTextMode && voice.audioBlob) {
        // Voice submission with audio
        const formData = new FormData();
        formData.append("questionId", String(currentQuestion!.id));
        formData.append("answerText", answerText);
        formData.append("duration", String(voice.recordingDuration));
        formData.append("audioFile", voice.audioBlob, "answer.webm");

        const res = await fetch(`/api/interview/${id}/answer`, {
          method: "POST",
          body: formData,
        });
        result = await res.json();
      } else {
        // Text-only submission
        const res = await fetch(`/api/interview/${id}/answer`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            questionId: currentQuestion!.id,
            answerText,
          }),
        });
        result = await res.json();
      }

      setLatestFeedback(result);
      setShowFeedback(true);
      voice.releaseMic();
    } catch {
      alert("Failed to submit answer");
    }
    setSubmitting(false);
  };

  const nextQuestion = () => {
    setShowFeedback(false);
    setTextAnswer("");
    voice.cancelRecording();
    if (currentIndex < data!.questions.length - 1) {
      setCurrentIndex(currentIndex + 1);
    }
  };

  const completeInterview = async () => {
    const res = await fetch(`/api/interview/${id}/complete`, { method: "POST" });
    const result = await res.json();
    setOverallScore(result.overallScore);
    setCompleted(true);
  };

  // Loading state
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

  // Start screen
  if (!started) {
    return (
      <div className="mx-auto max-w-lg p-8 pt-20">
        <div className="rounded-2xl border bg-white p-8 text-center">
          <div className="text-5xl mb-4">🎙️</div>
          <h1 className="text-2xl font-bold mb-2">
            {data.jobDescription.title} Interview
          </h1>
          <p className="text-gray-500 mb-2">
            Welcome, {data.candidateName}!
          </p>
          <p className="text-sm text-gray-400 mb-6">
            Level: {data.jobDescription.experienceLevel} ·{" "}
            {data.questions.length} questions
          </p>

          {!voiceUnavailable && (
            <p className="text-sm text-gray-500 mb-6">
              You'll answer questions using your voice — just like a real interview.
              A quiet environment is recommended.
            </p>
          )}

          <button
            onClick={() => setStarted(true)}
            className="rounded-lg bg-blue-600 px-8 py-3 text-white font-semibold hover:bg-blue-700"
          >
            Start Interview
          </button>
        </div>
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

  // Get the final answer text for display
  const answerText = useTextMode ? textAnswer : voice.transcript;
  const canSubmit = useTextMode
    ? textAnswer.trim().length > 0
    : voice.audioBlob !== null || voice.transcript.trim().length > 0;

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
              width: `${(
                ((currentIndex + (showFeedback ? 1 : 0)) /
                  data.questions.length) *
                100
              ).toFixed(0)}%`,
            }}
          />
        </div>
      </div>

      {/* Main card */}
      <div className="rounded-2xl border bg-white p-8">
        {/* Question */}
        <div className="mb-6">
          {currentQuestion?.subject && (
            <span className="mb-3 inline-block rounded bg-blue-100 px-3 py-1 text-xs font-medium text-blue-700">
              {currentQuestion.subject}
            </span>
          )}
          <div className="flex items-start justify-between gap-4">
            <h2 className="text-xl font-semibold text-gray-900 leading-relaxed">
              {currentQuestion?.questionText}
            </h2>
            {voice.ttsSupported && (
              <button
                onClick={handleSpeakQuestion}
                disabled={voice.isSpeaking}
                className="shrink-0 rounded-lg border p-2 text-gray-500 hover:bg-gray-50 disabled:opacity-50"
                title="Listen to question"
              >
                {voice.isSpeaking ? "🔊" : "🔈"}
              </button>
            )}
          </div>
        </div>

        {/* Feedback view */}
        {showFeedback && latestFeedback ? (
          <div className="space-y-6">
            <div className="rounded-lg bg-gray-50 p-4">
              <p className="text-sm text-gray-500 mb-1">Your answer:</p>
              <p className="text-gray-800">
                {latestFeedback.audioUrl ? voice.transcript || textAnswer : textAnswer || voice.transcript}
              </p>
            </div>

            {latestFeedback.audioUrl && (
              <div className="rounded-lg bg-gray-50 p-4">
                <p className="text-sm text-gray-500 mb-2">Audio response:</p>
                <audio
                  controls
                  className="w-full max-w-md"
                  src={latestFeedback.audioUrl}
                >
                  Your browser does not support audio playback.
                </audio>
                {latestFeedback.voiceDuration && (
                  <p className="text-xs text-gray-400 mt-1">
                    Duration: {latestFeedback.voiceDuration}s
                  </p>
                )}
              </div>
            )}

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
          <>
            {/* Voice/Text input area */}
            {!useTextMode && voice.recordingSupported ? (
              <div className="space-y-4">
                {/* Voice recording UI */}
                <div className="rounded-lg border-2 border-dashed p-6 text-center">
                  {!voice.isRecording && !voice.audioBlob ? (
                    <div>
                      <button
                        onClick={handleMicToggle}
                        disabled={voice.micPermission === "denied"}
                        className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-blue-100 text-3xl hover:bg-blue-200 disabled:opacity-50 transition"
                        title="Click to start recording"
                      >
                        🎤
                      </button>
                      <p className="mt-3 text-sm text-gray-500">
                        Click the microphone and speak your answer
                      </p>
                      {voice.error && (
                        <p className="mt-2 text-sm text-red-600">
                          {voice.error}
                        </p>
                      )}
                    </div>
                  ) : voice.isRecording ? (
                    <div>
                      <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-red-100 text-3xl animate-pulse">
                        🔴
                      </div>
                      <p className="mt-3 text-sm font-medium text-red-600">
                        Recording... ({voice.recordingDuration}s)
                      </p>
                      <button
                        onClick={handleMicToggle}
                        className="mt-4 rounded-lg bg-red-600 px-6 py-2 text-white hover:bg-red-700"
                      >
                        Stop Recording
                      </button>
                    </div>
                  ) : voice.audioBlob ? (
                    <div className="space-y-3">
                      <div className="text-3xl">✅</div>
                      <p className="text-sm font-medium text-green-600">
                        Recorded ({voice.recordingDuration}s)
                      </p>

                      {voice.audioPreviewUrl && (
                        <div className="flex justify-center">
                          <audio
                            controls
                            className="w-full max-w-sm"
                            src={voice.audioPreviewUrl}
                          >
                            Your browser does not support audio playback.
                          </audio>
                        </div>
                      )}

                      {voice.transcript && (
                        <div className="rounded-lg bg-gray-50 p-3 text-left">
                          <p className="text-xs text-gray-400 mb-1">
                            Transcription:
                          </p>
                          <p className="text-sm text-gray-700">
                            {voice.transcript}
                          </p>
                        </div>
                      )}

                      <div className="flex items-center justify-center gap-3">
                        <button
                          onClick={voice.cancelRecording}
                          className="rounded-lg border px-4 py-2 text-sm text-gray-600 hover:bg-gray-50"
                        >
                          Re-record
                        </button>
                        <button
                          onClick={() => {
                            voice.cancelRecording();
                            setUseTextMode(true);
                          }}
                          className="rounded-lg border px-4 py-2 text-sm text-gray-600 hover:bg-gray-50"
                        >
                          Type instead
                        </button>
                      </div>
                    </div>
                  ) : null}
                </div>

                {/* Submit button */}
                {voice.audioBlob && (
                  <button
                    onClick={handleSubmitAnswer}
                    disabled={submitting}
                    className="w-full rounded-lg bg-blue-600 px-6 py-3 text-white font-medium hover:bg-blue-700 disabled:opacity-50"
                  >
                    {submitting ? "Evaluating..." : "Submit Answer"}
                  </button>
                )}

                {/* Voice toggle */}
                <div className="flex items-center justify-center gap-2 pt-2">
                  <span className="text-sm text-blue-600 font-medium">
                    🎙️ Voice
                  </span>
                  <button
                    onClick={() => {
                      voice.cancelRecording();
                      setUseTextMode(true);
                    }}
                    className="text-sm text-gray-400 hover:text-gray-600 underline"
                  >
                    Switch to text
                  </button>
                </div>
              </div>
            ) : (
              /* Text fallback */
              <div className="space-y-4">
                <textarea
                  placeholder="Type your answer here..."
                  className="w-full min-h-[180px] rounded-lg border px-4 py-3 text-gray-800"
                  value={textAnswer}
                  onChange={(e) => setTextAnswer(e.target.value)}
                  disabled={submitting}
                />
                <div className="flex items-center justify-between">
                  <p className="text-xs text-gray-400">
                    Be detailed and specific. Use real examples if applicable.
                  </p>
                  <button
                    onClick={handleSubmitAnswer}
                    disabled={submitting || !textAnswer.trim()}
                    className="rounded-lg bg-blue-600 px-6 py-2 text-white font-medium hover:bg-blue-700 disabled:opacity-50"
                  >
                    {submitting ? "Evaluating..." : "Submit Answer"}
                  </button>
                </div>

                {/* Voice toggle */}
                {voice.recordingSupported && (
                  <div className="flex items-center justify-center gap-2 pt-2">
                    <span className="text-sm text-gray-400">⌨️ Text</span>
                    <button
                      onClick={() => setUseTextMode(false)}
                      className="text-sm text-blue-600 hover:text-blue-800 underline"
                    >
                      Switch to voice
                    </button>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
