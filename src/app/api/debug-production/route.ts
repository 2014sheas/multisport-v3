import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  // Force this to show up in Vercel logs
  console.error("🚨 PRODUCTION DEBUG - GET REQUEST");
  console.error("  URL:", request.url);
  console.error("  Method:", request.method);
  console.error("  Headers:", JSON.stringify(Object.fromEntries(request.headers.entries()), null, 2));
  
  return NextResponse.json({
    message: "Production debug endpoint",
    timestamp: new Date().toISOString(),
    url: request.url,
    method: request.method,
    headers: Object.fromEntries(request.headers.entries()),
    env: {
      nodeEnv: process.env.NODE_ENV,
      hasNextAuthSecret: !!process.env.NEXTAUTH_SECRET,
      hasNextAuthUrl: !!process.env.NEXTAUTH_URL,
      hasGoogleClientId: !!process.env.GOOGLE_CLIENT_ID,
      hasGoogleClientSecret: !!process.env.GOOGLE_CLIENT_SECRET,
      hasPostgresPrismaUrl: !!process.env.POSTGRES_PRISMA_URL,
    }
  });
}

export async function POST(request: NextRequest) {
  console.error("🚨 PRODUCTION DEBUG - POST REQUEST");
  console.error("  URL:", request.url);
  console.error("  Method:", request.method);
  
  const body = await request.text();
  console.error("  Body:", body);
  
  return NextResponse.json({
    message: "Production debug POST endpoint",
    timestamp: new Date().toISOString(),
    receivedBody: body,
  });
} 