import { NextResponse } from "next/server";
import { getCurrentCompany, clearSessionCookie } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST() {
  try {
    const company = await getCurrentCompany();
    if (company) {
      await prisma.company.update({
        where: { id: company.id },
        data: { sessionToken: null },
      });
    }

    const response = NextResponse.json({ ok: true });
    response.cookies.set(clearSessionCookie());

    return response;
  } catch (error) {
    console.error("Logout error:", error);
    return NextResponse.json(
      { error: "Failed to logout" },
      { status: 500 }
    );
  }
}
