import { NextRequest, NextResponse } from "next/server";
import { sendVerificationEmail } from "../../../lib/email-resend";

export async function POST(request: NextRequest) {
  try {
    const { email, name } = await request.json();

    if (!email || !name) {
      return NextResponse.json(
        { error: "Email and name are required" },
        { status: 400 }
      );
    }

    console.log("🧪 Testing email service configuration...");
    console.log("Resend API Key configured:", !!process.env.RESEND_API_KEY);
    console.log(
      "Gmail SMTP configured:",
      !!(
        process.env.SMTP_HOST &&
        process.env.SMTP_USER &&
        process.env.SMTP_PASS
      )
    );

    // Test email sending
    const result = await sendVerificationEmail(email, name, "test-token-123");

    return NextResponse.json({
      success: result.success,
      provider: result.provider || "unknown",
      message: result.success
        ? `Email sent successfully via ${result.provider || "unknown"}`
        : "Email sending failed",
      error: result.error,
      resendConfigured: !!process.env.RESEND_API_KEY,
      gmailConfigured: !!(
        process.env.SMTP_HOST &&
        process.env.SMTP_USER &&
        process.env.SMTP_PASS
      ),
    });
  } catch (error) {
    console.error("❌ Email service test failed:", error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
}
