import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    message: "Auth test endpoint",
    env: {
      hasGoogleClientId: !!process.env.GOOGLE_CLIENT_ID,
      hasGoogleClientSecret: !!process.env.GOOGLE_CLIENT_SECRET,
      hasNextAuthSecret: !!process.env.NEXTAUTH_SECRET,
      hasNextAuthUrl: !!process.env.NEXTAUTH_URL,
      nodeEnv: process.env.NODE_ENV,
    },
  });
}

export async function POST() {
  return NextResponse.json({
    message: "Auth test POST endpoint",
    method: "POST",
  });
} 