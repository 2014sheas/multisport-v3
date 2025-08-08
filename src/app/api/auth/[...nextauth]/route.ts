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
    // Call the handler directly without wrapping
    const result = await handler(req);
    console.error("✅ NextAuth Response:", result.status);
    return result;
  } catch (error) {
    console.error("❌ NextAuth Error:", error);
    // Return a proper error response instead of throwing
    return new Response(JSON.stringify({ error: "Authentication failed" }), {
      status: 500,
      headers: {
        "Content-Type": "application/json",
      },
    });
  }
}

// Export all HTTP methods that NextAuth might use
export { loggedHandler as GET, loggedHandler as POST, loggedHandler as PUT, loggedHandler as DELETE };
