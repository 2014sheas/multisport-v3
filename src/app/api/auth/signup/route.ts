import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { sendVerificationEmail } from "../../../../lib/email-resend";
import { prisma } from "@/lib/prisma";

export async function POST(request: NextRequest) {
  try {
    const { name, email, password } = await request.json();

    if (!name || !email || !password) {
      return NextResponse.json(
        { error: "All fields are required" },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: "Password must be at least 6 characters" },
        { status: 400 }
      );
    }

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: "User with this email already exists" },
        { status: 400 }
      );
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12);

    // Create user
    const user = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        isAdmin: false, // Default to non-admin
        emailVerified: false, // Email needs to be verified
      },
      select: {
        id: true,
        name: true,
        email: true,
        isAdmin: true,
        emailVerified: true,
        createdAt: true,
      },
    });

    // Generate verification token
    const verificationToken = crypto.randomBytes(32).toString("hex");
    const expires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    // Save the verification token
    await prisma.emailVerificationToken.create({
      data: {
        token: verificationToken,
        userId: user.id,
        expires,
      },
    });

    // Send verification email
    const emailResult = await sendVerificationEmail(
      user.email,
      user.name,
      verificationToken
    );

    // Log verification details (helpful for development)
    console.log("📧 EMAIL VERIFICATION");
    console.log("User:", user.name, "(" + user.email + ")");
    console.log(
      "Verification URL:",
      `${
        process.env.NEXTAUTH_URL || "http://localhost:3000"
      }/api/auth/verify-email?token=${verificationToken}`
    );
    console.log("Token expires:", expires);
    console.log("Email sent successfully:", emailResult.success);

    if (!emailResult.success) {
      console.error("Failed to send verification email:", emailResult.error);
    }

    return NextResponse.json({
      message: emailResult.success
        ? "User created successfully. Please check your email to verify your account."
        : "User created successfully. Check the server console for verification link (email service not configured).",
      user,
      emailSent: emailResult.success,
      // Include URL in development for easy testing
      ...(process.env.NODE_ENV === "development" && {
        verificationUrl: `${
          process.env.NEXTAUTH_URL || "http://localhost:3000"
        }/api/auth/verify-email?token=${verificationToken}`,
      }),
    });
  } catch (error) {
    console.error("Error creating user:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
