export interface CreateInterviewRequest {
  companyName: string;
  companyEmail: string;
  jobTitle: string;
  jobDescription: string;
  candidateName: string;
  candidateEmail: string;
}

export interface CreateInterviewResponse {
  id: number;
  candidateLink: string;
}

export interface QuestionWithAnswer {
  id: number;
  subject: string | null;
  questionText: string;
  orderIndex: number;
  answer: { answerText: string; score: number | null; feedback: string | null } | null;
}

export interface InterviewWithDetails {
  id: number;
  candidateName: string;
  candidateEmail: string;
  status: string;
  overallScore: number | null;
  createdAt: string;
  jobDescription: {
    title: string;
    requiredSkills: string;
    experienceLevel: string;
  };
  questions: QuestionWithAnswer[];
}
