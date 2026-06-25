import { NextResponse } from "next/server";
import { getCurrentCompany } from "@/lib/auth";

export async function GET() {
  try {
    const company = await getCurrentCompany();
    if (!company) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    return NextResponse.json({
      id: company.id,
      name: company.name,
      email: company.email,
    });
  } catch (error) {
    console.error("Session check error:", error);
    return NextResponse.json(
      { error: "Failed to check session" },
      { status: 500 }
    );
  }
}
