import NextAuth from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      name?: string | null;
      email?: string | null;
      image?: string | null;
      isAdmin: boolean;
      emailVerified: boolean;
    };
  }

  interface User {
    id: string;
    name: string;
    email: string;
    isAdmin: boolean;
    emailVerified: boolean;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    isAdmin: boolean;
    emailVerified: boolean;
  }
}
