import NextAuth from "next-auth";
import { authOptions } from "@/lib/auth-config";
import { NextRequest } from "next/server";

const handler = NextAuth(authOptions);

// Add logging wrapper
async function loggedHandler(req: NextRequest) {
  console.error("🚨 NextAuth Request Debug:");
  console.error("  Method:", req.method);
  console.error("  URL:", req.url);
  console.error("  User Agent:", req.headers.get("user-agent"));
  console.error("  Referer:", req.headers.get("referer"));
  
  try {
    const result = await handler(req);
    console.error("✅ NextAuth Response:", result.status);
    return result;
  } catch (error) {
    console.error("❌ NextAuth Error:", error);
    throw error;
  }
}

export { loggedHandler as GET, loggedHandler as POST };
