"use client";

import { useState, useEffect, Suspense } from "react";
import { signIn, getSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { Eye, EyeOff, Mail, CheckCircle, AlertCircle } from "lucide-react";

function SignInContent() {
  const [isSignUp, setIsSignUp] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [resendingEmail, setResendingEmail] = useState(false);
  const [showResendEmail, setShowResendEmail] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    // Check for URL parameters
    const verified = searchParams.get("verified");
    const errorParam = searchParams.get("error");

    if (verified === "true") {
      setSuccess("Email verified successfully! You can now sign in.");
    } else if (errorParam) {
      switch (errorParam) {
        case "missing-token":
          setError("Verification link is missing or invalid.");
          break;
        case "invalid-token":
          setError("Invalid verification token. Please request a new one.");
          break;
        case "expired-token":
          setError("Verification link has expired. Please request a new one.");
          break;
        case "server-error":
          setError(
            "Server error occurred during verification. Please try again."
          );
          break;
        case "unauthorized":
          setError(
            "You need admin privileges to access that page. Please sign in with an admin account."
          );
          break;
        default:
          setError("An error occurred during verification.");
      }
    }
  }, [searchParams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccess("");
    setShowResendEmail(false);

    try {
      const result = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });

      if (result?.error) {
        if (result.error.includes("Email not verified")) {
          setError(
            "Email not verified. Please check your email and click the verification link."
          );
          setShowResendEmail(true);
        } else {
          setError("Invalid email or password");
        }
      } else {
        // Get the session to check if user is admin
        const session = await getSession();
        if (
          session?.user &&
          "isAdmin" in session.user &&
          session.user.isAdmin
        ) {
          router.push("/admin/users");
        } else {
          router.push("/");
        }
      }
    } catch (error) {
      setError("An error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleResendVerification = async () => {
    if (!email) {
      setError("Please enter your email address first.");
      return;
    }

    setResendingEmail(true);
    setError("");

    try {
      const response = await fetch("/api/auth/resend-verification", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (response.ok) {
        setSuccess("Verification email sent successfully!");
      } else {
        setError(data.error || "Failed to send verification email");
      }
    } catch (error) {
      setError("Failed to send verification email");
    } finally {
      setResendingEmail(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccess("");

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      setLoading(false);
      return;
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters long");
      setLoading(false);
      return;
    }

    try {
      const response = await fetch("/api/auth/signup", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name,
          email,
          password,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setSuccess(
          data.message ||
            "Account created successfully! Please check your email to verify your account."
        );
        // Clear form
        setName("");
        setEmail("");
        setPassword("");
        setConfirmPassword("");
        setIsSignUp(false);
      } else {
        setError(data.error || "Failed to create account");
      }
    } catch (error) {
      setError("An error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            {isSignUp ? "Create your account" : "Sign in to your account"}
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            {isSignUp ? (
              <>
                Or{" "}
                <button
                  type="button"
                  onClick={() => setIsSignUp(false)}
                  className="font-medium text-indigo-600 hover:text-indigo-500"
                >
                  sign in to your existing account
                </button>
              </>
            ) : (
              <>
                Or{" "}
                <button
                  type="button"
                  onClick={() => setIsSignUp(true)}
                  className="font-medium text-indigo-600 hover:text-indigo-500"
                >
                  create a new account
                </button>
              </>
            )}
          </p>
        </div>

        {/* Error and Success Messages */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-md p-4">
            <div className="flex">
              <AlertCircle className="h-5 w-5 text-red-400" />
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800">{error}</h3>
              </div>
            </div>
          </div>
        )}

        {success && (
          <div className="bg-green-50 border border-green-200 rounded-md p-4">
            <div className="flex">
              <CheckCircle className="h-5 w-5 text-green-400" />
              <div className="ml-3">
                <h3 className="text-sm font-medium text-green-800">
                  {success}
                </h3>
              </div>
            </div>
          </div>
        )}

        <form
          className="mt-8 space-y-6"
          onSubmit={isSignUp ? handleSignUp : handleSubmit}
        >
          <div className="rounded-md shadow-sm -space-y-px">
            {isSignUp && (
              <div>
                <label htmlFor="name" className="sr-only">
                  Name
                </label>
                <input
                  id="name"
                  name="name"
                  type="text"
                  required={isSignUp}
                  className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-t-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                  placeholder="Full name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>
            )}
            <div>
              <label htmlFor="email-address" className="sr-only">
                Email address
              </label>
              <input
                id="email-address"
                name="email"
                type="email"
                autoComplete="email"
                required
                className={`appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 ${
                  isSignUp ? "" : "rounded-t-md"
                } focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm`}
                placeholder="Email address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div className="relative">
              <label htmlFor="password" className="sr-only">
                Password
              </label>
              <input
                id="password"
                name="password"
                type={showPassword ? "text" : "password"}
                autoComplete={isSignUp ? "new-password" : "current-password"}
                required
                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <button
                type="button"
                className="absolute inset-y-0 right-0 pr-3 flex items-center"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? (
                  <EyeOff className="h-5 w-5 text-gray-400" />
                ) : (
                  <Eye className="h-5 w-5 text-gray-400" />
                )}
              </button>
            </div>
            {isSignUp && (
              <div className="relative">
                <label htmlFor="confirm-password" className="sr-only">
                  Confirm Password
                </label>
                <input
                  id="confirm-password"
                  name="confirm-password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="new-password"
                  required={isSignUp}
                  className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-b-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                  placeholder="Confirm password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                />
              </div>
            )}
          </div>

          {showResendEmail && (
            <div className="text-center">
              <button
                type="button"
                onClick={handleResendVerification}
                disabled={resendingEmail}
                className="text-sm text-indigo-600 hover:text-indigo-500 disabled:opacity-50"
              >
                {resendingEmail ? "Sending..." : "Resend verification email"}
              </button>
            </div>
          )}

          <div>
            <button
              type="submit"
              disabled={loading}
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
            >
              {loading ? (
                "Loading..."
              ) : (
                <>
                  <Mail className="h-5 w-5 text-indigo-500 group-hover:text-indigo-400" />
                  {isSignUp ? "Create account" : "Sign in"}
                </>
              )}
            </button>
          </div>

          <div className="flex items-center justify-center">
            <div className="text-sm">
              <button
                type="button"
                onClick={() => signIn("google")}
                className="font-medium text-indigo-600 hover:text-indigo-500"
              >
                Sign in with Google
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function SignInPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <SignInContent />
    </Suspense>
  );
}
