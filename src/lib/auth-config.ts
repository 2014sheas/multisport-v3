import NextAuth from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import { PrismaAdapter } from "@next-auth/prisma-adapter";
import bcrypt from "bcryptjs";
import { prisma } from "./prisma";

export const authOptions = {
  adapter: PrismaAdapter(prisma),
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        console.error("🔐 Auth: authorize called");
        console.error("  Credentials:", credentials ? "provided" : "missing");

        if (!credentials?.email || !credentials?.password) {
          console.error("❌ Auth: Missing credentials");
          return null;
        }

        try {
          console.error("🔍 Auth: Looking up user:", credentials.email);
          const user = await prisma.user.findUnique({
            where: {
              email: credentials.email,
            },
          });

          if (!user || !user.password) {
            console.error("❌ Auth: User not found or no password");
            return null;
          }

          console.error("🔐 Auth: Checking password");
          const isPasswordValid = await bcrypt.compare(
            credentials.password,
            user.password
          );

          if (!isPasswordValid) {
            console.error("❌ Auth: Invalid password");
            return null;
          }

          // Check if email is verified
          if (!user.emailVerified) {
            console.error("❌ Auth: Email not verified");
            throw new Error(
              "Email not verified. Please check your email and click the verification link."
            );
          }

          console.error("✅ Auth: User authenticated successfully");
          return {
            id: user.id,
            email: user.email,
            name: user.name,
            isAdmin: user.isAdmin,
            emailVerified: user.emailVerified,
          };
        } catch (error) {
          console.error("❌ Auth error:", error);
          return null;
        }
      },
    }),
  ],
  session: {
    strategy: "jwt" as const,
  },
  pages: {
    signIn: "/auth/signin",
    signUp: "/auth/signup",
    error: "/auth/signin",
  },
  callbacks: {
    async jwt({
      token,
      user,
      account,
    }: {
      token: any;
      user: any;
      account: any;
    }) {
      console.error("🔄 JWT Callback:", {
        hasUser: !!user,
        hasAccount: !!account,
        provider: account?.provider,
      });

      if (user) {
        token.isAdmin = user.isAdmin;
        token.emailVerified = user.emailVerified;

        // If this is a Google OAuth sign-in, ensure email is verified
        if (account?.provider === "google") {
          try {
            // Use upsert to create or update the user
            const updatedUser = await prisma.user.upsert({
              where: { email: user.email },
              update: { 
                emailVerified: true,
                name: user.name || user.email,
              },
              create: {
                email: user.email,
                name: user.name || user.email,
                emailVerified: true,
                isAdmin: false, // Default to non-admin
              },
            });
            
            console.error("✅ Google OAuth user updated/created:", updatedUser.email);
            token.emailVerified = true;
            token.isAdmin = updatedUser.isAdmin;
          } catch (error) {
            console.error("❌ Error handling Google OAuth user:", error);
            // Don't fail the auth, just log the error
          }
        }
      }
      return token;
    },
    async session({ session, token }: { session: any; token: any }) {
      console.error("🔄 Session Callback:", {
        hasSession: !!session,
        hasToken: !!token,
      });

      if (session.user) {
        session.user.id = token.sub;
        session.user.isAdmin = token.isAdmin;
        session.user.emailVerified = token.emailVerified || false;
      }
      return session;
    },
    async signIn({ user, account }: { user: any; account: any }) {
      console.error("🔄 SignIn Callback:", {
        hasUser: !!user,
        hasAccount: !!account,
        provider: account?.provider,
        userEmail: user?.email,
      });

      // For Google OAuth, always allow sign-in
      if (account?.provider === "google") {
        console.error("✅ Google OAuth sign-in allowed");
        return true;
      }

      // For credentials, check if email is verified
      if (account?.provider === "credentials") {
        const dbUser = await prisma.user.findUnique({
          where: { email: user.email },
        });
        
        if (dbUser && !dbUser.emailVerified) {
          console.error("❌ Credentials sign-in blocked: email not verified");
          return false;
        }
      }

      return true;
    },
  },
  // Disable debug mode to prevent _log requests
  debug: false,
  // Add these for better Vercel compatibility
  useSecureCookies: process.env.NODE_ENV === "production",
  cookies: {
    sessionToken: {
      name: `next-auth.session-token`,
      options: {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        secure: process.env.NODE_ENV === "production",
      },
    },
  },
  // Add logging for all events
  events: {
    async signIn(message: any) {
      console.error("📝 Auth Event: signIn", message);
    },
    async signOut(message: any) {
      console.error("📝 Auth Event: signOut", message);
    },
    async session(message: any) {
      console.error("📝 Auth Event: session", message);
    },
  },
};
