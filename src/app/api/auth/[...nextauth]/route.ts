import NextAuth from "next-auth";
import { authOptions } from "@/lib/auth-config";
import { NextRequest } from "next/server";

const handler = NextAuth(authOptions);

// Add logging wrapper
async function loggedHandler(req: NextRequest) {
  console.log("🔍 NextAuth Request Debug:");
  console.log("  Method:", req.method);
  console.log("  URL:", req.url);
  console.log("  Headers:", Object.fromEntries(req.headers.entries()));
  console.log("  User Agent:", req.headers.get("user-agent"));
  console.log("  Referer:", req.headers.get("referer"));
  
  try {
    const result = await handler(req);
    console.log("✅ NextAuth Response:", result.status);
    return result;
  } catch (error) {
    console.error("❌ NextAuth Error:", error);
    throw error;
  }
}

export { loggedHandler as GET, loggedHandler as POST };
