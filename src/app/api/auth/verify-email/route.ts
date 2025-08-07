import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const token = searchParams.get('token');

  if (!token) {
    return NextResponse.redirect(new URL('/auth/signin?error=missing-token', request.url));
  }

  try {
    // Find the verification token
    const verificationToken = await prisma.emailVerificationToken.findUnique({
      where: { token },
      include: { user: true }
    });

    if (!verificationToken) {
      return NextResponse.redirect(new URL('/auth/signin?error=invalid-token', request.url));
    }

    // Check if token has expired
    if (verificationToken.expires < new Date()) {
      // Clean up expired token
      await prisma.emailVerificationToken.delete({
        where: { id: verificationToken.id }
      });
      return NextResponse.redirect(new URL('/auth/signin?error=expired-token', request.url));
    }

    // Update user as verified
    await prisma.user.update({
      where: { id: verificationToken.userId },
      data: { emailVerified: true }
    });

    // Clean up the verification token
    await prisma.emailVerificationToken.delete({
      where: { id: verificationToken.id }
    });

    // Redirect to success page
    return NextResponse.redirect(new URL('/auth/signin?verified=true', request.url));

  } catch (error) {
    console.error('Error verifying email:', error);
    return NextResponse.redirect(new URL('/auth/signin?error=server-error', request.url));
  }
}