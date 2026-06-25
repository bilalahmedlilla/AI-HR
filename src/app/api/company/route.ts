import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(request: NextRequest) {
  try {
    const { name, email } = await request.json();

    const existing = await prisma.company.findUnique({ where: { email } });
    if (existing) {
      return NextResponse.json({
        id: existing.id,
        name: existing.name,
        message: "Company already registered",
      });
    }

    const company = await prisma.company.create({ data: { name, email } });
    return NextResponse.json({ id: company.id, name: company.name });
  } catch (error) {
    console.error("Error creating company:", error);
    return NextResponse.json(
      { error: "Failed to create company" },
      { status: 500 }
    );
  }
}
