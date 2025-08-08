import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  console.error("🚨 Testing auth response");

  try {
    // Test the auth endpoint directly
    const authUrl = new URL("/api/auth/session", request.url);
    console.error("  Testing URL:", authUrl.toString());

    const response = await fetch(authUrl.toString(), {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });

    const contentType = response.headers.get("content-type");
    const responseText = await response.text();

    console.error("  Response Status:", response.status);
    console.error("  Content-Type:", contentType);
    console.error(
      "  Response Text (first 200 chars):",
      responseText.substring(0, 200)
    );

    return NextResponse.json({
      message: "Auth response test",
      status: response.status,
      contentType,
      responseText: responseText.substring(0, 500),
      isJson: contentType?.includes("application/json"),
    });
  } catch (error) {
    console.error("❌ Error testing auth response:", error);
    return NextResponse.json(
      {
        error: "Failed to test auth response",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
