import { writeFile, mkdir } from "fs/promises";
import path from "path";

export async function saveAudioFile(
  file: File,
  interviewId: number,
  questionId: number
): Promise<{ url: string; duration: number }> {
  const dir = path.join(
    process.cwd(),
    "public",
    "uploads",
    "audio",
    `interview-${interviewId}`
  );
  await mkdir(dir, { recursive: true });

  const timestamp = Date.now();
  const filename = `q-${questionId}-${timestamp}.webm`;
  const filepath = path.join(dir, filename);

  const buffer = Buffer.from(await file.arrayBuffer());
  await writeFile(filepath, buffer);

  return {
    url: `/uploads/audio/interview-${interviewId}/${filename}`,
    duration: 0, // will be overridden by the form data duration field
  };
}
