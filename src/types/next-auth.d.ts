import NextAuth from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      name?: string | null;
      email?: string | null;
      image?: string | null;
      isAdmin: boolean;
      emailVerified: boolean | null;
    };
  }

  interface User {
    id: string;
    name: string;
    email: string;
    isAdmin: boolean;
    emailVerified: boolean | null;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    isAdmin: boolean;
    emailVerified: boolean;
  }
}
