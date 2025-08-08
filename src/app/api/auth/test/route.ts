import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    message: "NextAuth test endpoint",
    env: {
      hasNextAuthSecret: !!process.env.NEXTAUTH_SECRET,
      hasNextAuthUrl: !!process.env.NEXTAUTH_URL,
      hasGoogleClientId: !!process.env.GOOGLE_CLIENT_ID,
      hasGoogleClientSecret: !!process.env.GOOGLE_CLIENT_SECRET,
      nodeEnv: process.env.NODE_ENV,
      url: process.env.NEXTAUTH_URL,
    },
  });
}

export async function POST() {
  return NextResponse.json({
    message: "NextAuth test POST endpoint",
    method: "POST",
  });
} 