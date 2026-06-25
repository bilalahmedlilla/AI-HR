"use client";

import { useState, useRef, useCallback, useEffect } from "react";

interface VoiceState {
  /** Browser supports SpeechSynthesis (TTS) */
  ttsSupported: boolean;
  /** Browser supports SpeechRecognition (STT) */
  sttSupported: boolean;
  /** Browser supports MediaRecorder + getUserMedia */
  recordingSupported: boolean;
  /** TTS is currently speaking */
  isSpeaking: boolean;
  /** Microphone is actively listening/recording */
  isRecording: boolean;
  /** Live transcription text from STT */
  transcript: string;
  /** Finalized audio blob from MediaRecorder */
  audioBlob: Blob | null;
  /** Duration of recording in seconds */
  recordingDuration: number;
  /** Local object URL for previewing recording */
  audioPreviewUrl: string | null;
  /** Permission state */
  micPermission: "unknown" | "granted" | "denied" | "prompt";
  /** Error message */
  error: string | null;
}

const INITIAL: VoiceState = {
  ttsSupported: false,
  sttSupported: false,
  recordingSupported: false,
  isSpeaking: false,
  isRecording: false,
  transcript: "",
  audioBlob: null,
  recordingDuration: 0,
  audioPreviewUrl: null,
  micPermission: "unknown",
  error: null,
};

export function useVoiceInterview() {
  const [state, setState] = useState<VoiceState>(INITIAL);

  const recognitionRef = useRef<any>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const startTimeRef = useRef<number>(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Detect browser support on mount
  useEffect(() => {
    const hasTTS = "speechSynthesis" in window;
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    const hasSTT = !!SpeechRecognition;
    const hasRecording =
      "MediaRecorder" in window &&
      !!navigator.mediaDevices?.getUserMedia;

    setState((s) => ({
      ...s,
      ttsSupported: hasTTS,
      sttSupported: hasSTT,
      recordingSupported: hasRecording,
    }));
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopAllTracks();
      if (timerRef.current) clearInterval(timerRef.current);
      if (recognitionRef.current) {
        try { recognitionRef.current.abort(); } catch {}
      }
    };
  }, []);

  const stopAllTracks = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
  }, []);

  const requestMicPermission = useCallback(async (): Promise<boolean> => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      setState((s) => ({ ...s, micPermission: "granted", error: null }));
      return true;
    } catch (err: any) {
      const permission =
        err.name === "NotAllowedError" ? "denied" : "prompt";
      setState((s) => ({
        ...s,
        micPermission: permission,
        error:
          permission === "denied"
            ? "Microphone access denied. Please allow microphone access and try again."
            : "Microphone not available.",
      }));
      return false;
    }
  }, []);

  /** Speak text using browser TTS */
  const speak = useCallback(
    (text: string): Promise<void> => {
      return new Promise((resolve) => {
        if (!("speechSynthesis" in window)) {
          resolve();
          return;
        }

        // Cancel any ongoing speech
        window.speechSynthesis.cancel();

        const utterance = new SpeechSynthesisUtterance(text);
        utterance.rate = 1;
        utterance.pitch = 1;
        utterance.volume = 1;

        // Try to find a good English voice
        const voices = window.speechSynthesis.getVoices();
        const preferred = voices.find(
          (v) => v.lang.startsWith("en") && v.name.includes("Google")
        ) || voices.find((v) => v.lang.startsWith("en"));

        if (preferred) utterance.voice = preferred;

        setState((s) => ({ ...s, isSpeaking: true }));

        utterance.onend = () => {
          setState((s) => ({ ...s, isSpeaking: false }));
          resolve();
        };
        utterance.onerror = () => {
          setState((s) => ({ ...s, isSpeaking: false }));
          resolve();
        };

        window.speechSynthesis.speak(utterance);
      });
    },
    []
  );

  /** Stop TTS */
  const stopSpeaking = useCallback(() => {
    if ("speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
    setState((s) => ({ ...s, isSpeaking: false }));
  }, []);

  /** Start recording (STT + MediaRecorder simultaneously) */
  const startRecording = useCallback(async (): Promise<boolean> => {
    // Request mic if not already granted
    if (!streamRef.current) {
      const ok = await requestMicPermission();
      if (!ok) return false;
    }

    const stream = streamRef.current!;
    chunksRef.current = [];
    startTimeRef.current = Date.now();

    // Reset state
    setState((s) => ({
      ...s,
      isRecording: true,
      transcript: "",
      audioBlob: null,
      audioPreviewUrl: null,
      recordingDuration: 0,
      error: null,
    }));

    // Start MediaRecorder for audio capture
    const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
      ? "audio/webm;codecs=opus"
      : "audio/webm";

    const recorder = new MediaRecorder(stream, { mimeType });
    recorderRef.current = recorder;

    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunksRef.current.push(e.data);
    };

    recorder.onstop = () => {
      const blob = new Blob(chunksRef.current, { type: mimeType });
      const url = URL.createObjectURL(blob);
      const duration = Math.round((Date.now() - startTimeRef.current) / 1000);

      setState((s) => ({
        ...s,
        isRecording: false,
        audioBlob: blob,
        audioPreviewUrl: url,
        recordingDuration: duration,
      }));

      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };

    recorder.start(100); // collect data every 100ms

    // Start timer for duration display
    timerRef.current = setInterval(() => {
      setState((s) => ({
        ...s,
        recordingDuration: Math.round((Date.now() - startTimeRef.current) / 1000),
      }));
    }, 1000);

    // Start SpeechRecognition for live transcription
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = "en-US";

      recognition.onresult = (event: any) => {
        // Build full transcript from ALL results (not just new ones)
        // This prevents previous text from being lost on each event
        let full = "";
        for (let i = 0; i < event.results.length; i++) {
          full += event.results[i][0].transcript;
        }

        setState((s) => ({
          ...s,
          transcript: full,
        }));
      };

      recognition.onerror = () => {
        // STT error is non-fatal — recording continues
      };

      recognitionRef.current = recognition;
      recognition.start();
    }

    return true;
  }, [requestMicPermission]);

  /** Stop recording */
  const stopRecording = useCallback(() => {
    // Stop STT
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {}
      recognitionRef.current = null;
    }

    // Stop recorder
    if (recorderRef.current && recorderRef.current.state !== "inactive") {
      recorderRef.current.stop();
    }

    // Stop mic tracks but keep stream reference
    // Don't call stopAllTracks here — we might need the stream again

    setState((s) => ({ ...s, isRecording: false }));
  }, []);

  /** Cancel recording without saving */
  const cancelRecording = useCallback(() => {
    stopRecording();
    stopAllTracks();

    // Revoke preview URL if exists
    setState((s) => {
      if (s.audioPreviewUrl) URL.revokeObjectURL(s.audioPreviewUrl);
      return {
        ...s,
        isRecording: false,
        transcript: "",
        audioBlob: null,
        audioPreviewUrl: null,
        recordingDuration: 0,
      };
    });
  }, [stopRecording, stopAllTracks]);

  /** Clean up and release mic */
  const releaseMic = useCallback(() => {
    stopRecording();
    stopAllTracks();
    setState((s) => ({
      ...s,
      isRecording: false,
      audioBlob: null,
      audioPreviewUrl: null,
      recordingDuration: 0,
    }));
  }, [stopRecording, stopAllTracks]);

  return {
    ...state,
    speak,
    stopSpeaking,
    startRecording,
    stopRecording,
    cancelRecording,
    releaseMic,
    requestMicPermission,
  };
}
