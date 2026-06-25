import OpenAI from "openai";

function getAI() {
  const apiKey = process.env.AI_API_KEY || process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error(
      "AI_API_KEY environment variable is required. " +
      "Set it in .env.local"
    );
  }
  const baseURL = process.env.AI_BASE_URL || "https://api.openai.com/v1";
  return new OpenAI({ apiKey, baseURL });
}

function getModel() {
  return process.env.AI_MODEL || "gpt-4o";
}

export interface ParsedJD {
  title: string;
  skills: string[];
  experienceLevel: string;
  subjects: string[];
}

export interface GeneratedQuestion {
  subject: string;
  questionText: string;
}

export interface AnswerEvaluation {
  score: number;
  feedback: string;
}

const SYSTEM_PROMPT = "You are a helpful AI that returns valid JSON only. No markdown, no explanation, just the JSON object.";

/**
 * Parse a job description to extract key information
 */
export async function parseJobDescription(jdText: string): Promise<ParsedJD> {
  const ai = getAI();
  const prompt = `Analyze this job description and extract:
1. Job title
2. Required skills (as a comma-separated list)
3. Experience level (junior / mid / senior / lead)
4. Relevant technical subjects from this list that match the skills:
   csharp-dotnet-core, aspnet-mvc-webapi, entity-framework-orm, javascript-typescript,
   react-frontend, angularjs, sql-server, ravendb-nosql, system-design,
   design-patterns-architecture, data-engineering-etl, salesforce-integration,
   cicd-devops, testing-quality, web-security, performance-optimization,
   behavioral-leadership, dsa, claude-ai-prompting

Return JSON with fields: title, skills (array), experienceLevel, subjects (array of matching subjects)

Job Description:
${jdText}`;

  const response = await ai.chat.completions.create({
    model: getModel(),
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: prompt },
    ],
    temperature: 0.3,
  });

  return JSON.parse(response.choices[0].message.content || "{}");
}

/**
 * Generate interview questions based on skills and subjects
 */
export async function generateQuestions(
  parsedJD: ParsedJD,
  questionCount: number = 6
): Promise<GeneratedQuestion[]> {
  const ai = getAI();
  const skillsList = parsedJD.skills.join(", ");
  const subjectsList = parsedJD.subjects.join(", ");

  const prompt = `You are a senior technical interviewer conducting a live interview. Generate ${questionCount} interview questions for a ${parsedJD.experienceLevel}-level position requiring these skills: ${skillsList}.

Relevant subjects: ${subjectsList}

Style rules:
- Questions must be SHORT and CONVERSATIONAL — like a human interviewer asking them verbally
- Each question should be answerable in 2-4 sentences, not pages of code
- Ask about concepts, trade-offs, experience, and reasoning — not "write code for X"
- Match the seniority level (${parsedJD.experienceLevel})

Examples of good questions:
- "How do you decide between using Task.Run vs async/await?"
- "What's the difference between IEnumerable and IQueryable?"
- "How would you troubleshoot a slow SQL query?"
- "Tell me about a time you handled a production incident."

Return JSON: { "questions": [{ "subject": "subject-name", "questionText": "full question text" }, ...] }`;

  const response = await ai.chat.completions.create({
    model: getModel(),
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: prompt },
    ],
    temperature: 0.7,
  });

  const content = response.choices[0].message.content || "{}";
  const parsed = JSON.parse(content);
  return parsed.questions || [];
}

/**
 * Evaluate a candidate's answer to a question, scored relative to the expected experience level.
 *
 * The same answer gets a different score depending on the role:
 * - junior (0-2 yrs): basic concept clarity is a high score
 * - mid (3-5 yrs): expects independent work, some depth, practical know-how
 * - senior (6-9 yrs): deep understanding, architecture decisions, production scars
 * - lead (10+ yrs): strategic thinking, mentoring, system-level ownership
 */
export async function evaluateAnswer(
  question: string,
  answer: string,
  subject: string,
  experienceLevel: string
): Promise<AnswerEvaluation> {
  const ai = getAI();

  const levelExpectations: Record<string, string> = {
    junior:
      "Basic understanding of concepts. Can complete well-defined tasks with guidance. Knows fundamentals and common patterns. Surface-level knowledge is acceptable as long as it's correct.",
    mid:
      "Works independently. Understands trade-offs and can make solid decisions. Has practical experience solving real problems. Shows depth beyond just definitions.",
    senior:
      "Deep architectural understanding. Has production experience and knows what breaks. Can design systems, not just use tools. Mentors others. Questions assumptions.",
    lead:
      "Strategic technical vision. Owns outcomes across teams. Deep system design and cross-functional impact. Sets standards, grows people, drives architectural decisions.",
  };

  const expectation =
    levelExpectations[experienceLevel] ||
    `Expected level: ${experienceLevel}. Evaluate proportionally.`;

  const prompt = `You are an expert technical interviewer evaluating a candidate relative to the EXPECTED experience level.

Question: ${question}
Subject: ${subject}
Expected Level: ${experienceLevel}

What the company expects at this level:
${expectation}

Candidate's Answer: ${answer}

CRITICAL: Score the answer relative to the expected level above. The same answer should score HIGH for a junior (they met expectations) but LOW for a senior (they fell short).

Evaluate against these criteria, weighted by level:
1. Technical accuracy — is it correct?
2. Depth & clarity — does it match what's expected at this level?
3. Practical experience — is there real-world context appropriate for this level?
4. Communication — is it clear and structured?

Score guide:
- 90-100: Exceeds expectations for this level
- 75-89: Meets expectations for this level
- 50-74: Below expectations — gaps for this level
- 0-49: Well below — would not pass for this level

Return JSON: { "score": number (0-100), "feedback": "feedback specific to this level — why this score is appropriate for a ${experienceLevel}-level candidate" }`;

  const response = await ai.chat.completions.create({
    model: getModel(),
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: prompt },
    ],
    temperature: 0.3,
  });

  return JSON.parse(response.choices[0].message.content || "{}");
}
