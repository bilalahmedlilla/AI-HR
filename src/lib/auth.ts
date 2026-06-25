import { cookies } from "next/headers";
import { prisma } from "./prisma";
import bcrypt from "bcryptjs";
import crypto from "crypto";

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

export async function verifyPassword(
  password: string,
  hash: string
): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export function generateSessionToken(): string {
  return crypto.randomUUID();
}

export function getSessionCookieName(): string {
  return "hr-session";
}

export function createSessionCookie(token: string): {
  name: string;
  value: string;
  httpOnly: boolean;
  sameSite: "lax";
  path: string;
  maxAge: number;
} {
  return {
    name: getSessionCookieName(),
    value: token,
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30, // 30 days
  };
}

export function clearSessionCookie(): {
  name: string;
  value: string;
  path: string;
  maxAge: number;
} {
  return {
    name: getSessionCookieName(),
    value: "",
    path: "/",
    maxAge: 0,
  };
}

export async function getCurrentCompany() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(getSessionCookieName())?.value;
    if (!token) return null;

    const company = await prisma.company.findUnique({
      where: { sessionToken: token },
    });

    return company;
  } catch {
    return null;
  }
}

export async function requireCompany() {
  const company = await getCurrentCompany();
  if (!company) {
    throw new Error("Unauthorized");
  }
  return company;
}
