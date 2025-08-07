"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export function withAdminProtection<P extends object>(
  Component: React.ComponentType<P>
) {
  return function AdminProtectedComponent(props: P) {
    const { data: session, status } = useSession();
    const router = useRouter();

    useEffect(() => {
      if (status === "loading") return;

      if (!session) {
        router.push("/auth/signin");
        return;
      }

      if (!session.user?.isAdmin) {
        router.push("/unauthorized");
        return;
      }
    }, [session, status, router]);

    if (status === "loading") {
      return (
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
        </div>
      );
    }

    if (!session || !session.user?.isAdmin) {
      return null; // Will redirect via useEffect
    }

    return <Component {...props} />;
  };
}
