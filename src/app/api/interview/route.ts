import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { parseJobDescription, generateQuestions } from "@/lib/ai";
import { getCurrentCompany } from "@/lib/auth";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // New flow: authenticated company creates interview for an existing JD
    if (body.jobDescriptionId) {
      const company = await getCurrentCompany();
      if (!company) {
        return NextResponse.json(
          { error: "Authentication required" },
          { status: 401 }
        );
      }

      const { jobDescriptionId, candidateName, candidateEmail } = body;

      // Verify JD belongs to this company
      const jobDescription = await prisma.jobDescription.findFirst({
        where: { id: jobDescriptionId, companyId: company.id },
      });

      if (!jobDescription) {
        return NextResponse.json(
          { error: "Job description not found" },
          { status: 404 }
        );
      }

      // Parse skills for question generation
      const parsedJD = {
        title: jobDescription.title,
        skills: JSON.parse(jobDescription.requiredSkills),
        experienceLevel: jobDescription.experienceLevel,
        subjects: [] as string[],
      };

      // Generate interview questions
      const generated = await generateQuestions(parsedJD);

      // Create interview
      const interview = await prisma.interview.create({
        data: {
          jobDescriptionId: jobDescription.id,
          candidateName,
          candidateEmail,
          status: "pending",
          questions: {
            create: generated.map((q, i) => ({
              subject: q.subject,
              questionText: q.questionText,
              orderIndex: i + 1,
            })),
          },
        },
        include: { questions: true },
      });

      return NextResponse.json({
        id: interview.id,
        candidateLink: `/interview/${interview.id}`,
      });
    }

    // Legacy flow: full form (company + JD + candidate all at once)
    const { companyName, companyEmail, jobTitle, jobDescription, candidateName, candidateEmail } = body;

    // Find or create company
    let company = await prisma.company.findUnique({
      where: { email: companyEmail },
    });

    if (!company) {
      company = await prisma.company.create({
        data: { name: companyName, email: companyEmail, passwordHash: "" },
      });
    }

    // Parse JD with AI
    const parsedJD = await parseJobDescription(jobDescription);

    // Create job description
    const newJD = await prisma.jobDescription.create({
      data: {
        companyId: company.id,
        title: jobTitle,
        description: jobDescription,
        requiredSkills: JSON.stringify(parsedJD.skills),
        experienceLevel: parsedJD.experienceLevel,
      },
    });

    // Generate interview questions
    const generated = await generateQuestions(parsedJD);

    // Create interview
    const interview = await prisma.interview.create({
      data: {
        jobDescriptionId: newJD.id,
        candidateName,
        candidateEmail,
        status: "pending",
        questions: {
          create: generated.map((q, i) => ({
            subject: q.subject,
            questionText: q.questionText,
            orderIndex: i + 1,
          })),
        },
      },
      include: { questions: true },
    });

    return NextResponse.json({
      id: interview.id,
      candidateLink: `/interview/${interview.id}`,
    });
  } catch (error) {
    console.error("Error creating interview:", error);
    return NextResponse.json(
      { error: "Failed to create interview" },
      { status: 500 }
    );
  }
}
