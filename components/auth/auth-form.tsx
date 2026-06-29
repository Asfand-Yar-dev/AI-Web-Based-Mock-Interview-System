"use client";

import type React from "react";
import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { GoogleSignInButton } from "@/components/auth/google-signin-button";
import { Sparkles, Loader2, Eye, EyeOff, Mail, Lock, User } from "lucide-react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { isValidEmail, isAllowedEmailDomain, ALLOWED_EMAIL_DOMAINS, cn } from "@/lib/utils";
import { useAuth } from "@/contexts/auth-context";

interface AuthFormProps {
  mode: "login" | "signup";
}

export function AuthForm({ mode }: AuthFormProps) {
  const { login, signup, googleSignIn, isLoading: authLoading, error: authError, clearError } = useAuth();
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [role, setRole] = useState<"user" | "interviewer">("user");

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    clearError();

    // Validate email format
    if (!isValidEmail(formData.email)) {
      setError("Please enter a valid email address");
      return;
    }

    // On sign-up, only allow the whitelisted email domains. Everything else is
    // rejected here and again by the backend.
    if (mode === "signup" && !isAllowedEmailDomain(formData.email)) {
      setError(`Email must be from an allowed domain: ${ALLOWED_EMAIL_DOMAINS.join(", ")}`);
      return;
    }

    // Validate password complexity for signup
    if (mode === "signup") {
      const passwordError = validatePassword(formData.password);
      if (passwordError) {
        setError(passwordError);
        return;
      }
      
      // Validate name for signup
      if (!formData.name.trim() || formData.name.trim().length < 2) {
        setError("Please enter your full name (at least 2 characters)");
        return;
      }
    }

    setIsSubmitting(true);

    try {
      if (mode === "login") {
        await login(formData.email, formData.password);
        toast.success("Welcome back!", {
          description: "You have been logged in successfully.",
        });
      } else {
        await signup(formData.name.trim(), formData.email, formData.password, role);
        toast.success("Account created!", {
          description: "Please sign in to continue.",
        });
      }
      // Redirect is handled by auth context
    } catch (err) {
      const message = err instanceof Error ? err.message : "An error occurred";
      setError(message);
      toast.error(mode === "login" ? "Login failed" : "Registration failed", {
        description: message,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Check if Google OAuth is configured
  const isGoogleConfigured = !!process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;

  // Handle Google login success - called from GoogleSignInButton
  // Receives authorization code from auth-code flow
  const handleGoogleSuccess = async (authCode: string) => {
    try {
      // In signup mode we forward the chosen role so the backend can enforce
      // the one-email-one-role rule. In login mode we omit it.
      await googleSignIn(authCode, 'authCode', mode === 'signup' ? role : undefined);
      toast.success("Welcome!", {
        description: "You have been signed in with Google.",
      });
    } catch (err) {
      // Fully handle here — surface as form error + toast. Don't re-throw:
      // the button's loading state resets in its own finally{} regardless,
      // and re-throwing only causes Next.js dev overlay to flag the
      // expected role-conflict / duplicate-account message as a Console Error.
      const message = err instanceof Error ? err.message : "Google sign-in failed";
      setError(message);
      toast.error("Google Sign-In Failed", {
        description: message,
      });
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
    // Clear error when user starts typing
    if (error) setError("");
    if (authError) clearError();
  };

  const validatePassword = (password: string): string | null => {
    if (password.length < 6) {
      return "Password must be at least 6 characters long";
    }
    return null;
  };

  const isLoading = isSubmitting || authLoading;
  const displayError = error || authError;

  return (
    <div className="min-h-screen flex">
      {/* Left Panel - Form */}
      <div className="flex-1 flex items-center justify-center p-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="w-full max-w-md space-y-8"
        >
          {/* Logo */}
          <Link href="/" className="flex items-center gap-1.5">
            <Image
              src="/Logo_with_no_background.png"
              alt="Intervexa"
              width={80}
              height={80}
              className="object-contain"
            />
            <span className="font-display text-[28px] font-bold leading-none text-foreground">
              Intervexa
            </span>
          </Link>

          {/* Header */}
          <div className="space-y-2">
            <h1 className="text-3xl font-bold text-foreground">
              {mode === "login" ? "Welcome back" : "Create your account"}
            </h1>
            <p className="text-muted-foreground">
              {mode === "login"
                ? "Enter your credentials to access your account"
                : "Start your journey to interview success"}
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            {mode === "signup" && (
              <div className="space-y-3">
                <Label className="text-sm font-medium text-foreground">
                  I want to join as:
                </Label>
                <div className="grid grid-cols-2 gap-3">
                  <div
                    onClick={() => setRole("user")}
                    className={cn(
                      "flex flex-col items-center justify-center p-4 rounded-xl border-2 cursor-pointer text-center transition-all duration-200",
                      role === "user"
                        ? "border-accent bg-accent/5"
                        : "border-border/50 bg-secondary/20 hover:border-border"
                    )}
                  >
                    <div className="h-8 w-8 rounded-lg bg-accent/10 flex items-center justify-center mb-2">
                      <Sparkles className="h-4 w-4 text-accent" />
                    </div>
                    <span className="text-xs font-semibold text-foreground">Applicant / User</span>
                    <span className="text-[10px] text-muted-foreground mt-1 leading-tight">Practice & prepare for interviews</span>
                  </div>

                  <div
                    onClick={() => setRole("interviewer")}
                    className={cn(
                      "flex flex-col items-center justify-center p-4 rounded-xl border-2 cursor-pointer text-center transition-all duration-200",
                      role === "interviewer"
                        ? "border-accent bg-accent/5"
                        : "border-border/50 bg-secondary/20 hover:border-border"
                    )}
                  >
                    <div className="h-8 w-8 rounded-lg bg-accent/10 flex items-center justify-center mb-2">
                      <User className="h-4 w-4 text-accent" />
                    </div>
                    <span className="text-xs font-semibold text-foreground">Interviewer</span>
                    <span className="text-[10px] text-muted-foreground mt-1 leading-tight">Conduct mock interviews & earn</span>
                  </div>
                </div>
              </div>
            )}

            {mode === "signup" && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                className="space-y-2"
              >
                <Label
                  htmlFor="name"
                  className="text-sm font-medium text-foreground"
                >
                  Full Name
                </Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="name"
                    name="name"
                    type="text"
                    placeholder="John Doe"
                    value={formData.name}
                    onChange={handleChange}
                    required
                    disabled={isLoading}
                    className="pl-10 h-12 bg-secondary/50 border-border/50 focus:border-accent focus:ring-accent"
                  />
                </div>
              </motion.div>
            )}

            <div className="space-y-2">
              <Label
                htmlFor="email"
                className="text-sm font-medium text-foreground"
              >
                Email Address
              </Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="email"
                  name="email"
                  type="email"
                  placeholder="you@example.com"
                  value={formData.email}
                  onChange={handleChange}
                  required
                  disabled={isLoading}
                  className="pl-10 h-12 bg-secondary/50 border-border/50 focus:border-accent focus:ring-accent"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label
                htmlFor="password"
                className="text-sm font-medium text-foreground"
              >
                Password
              </Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={formData.password}
                  onChange={handleChange}
                  required
                  minLength={6}
                  disabled={isLoading}
                  className="pl-10 pr-10 h-12 bg-secondary/50 border-border/50 focus:border-accent focus:ring-accent"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  disabled={isLoading}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
              {mode === "signup" && (
                <p className="text-xs text-muted-foreground">
                  Password must be at least 6 characters
                </p>
              )}
            </div>

            {mode === "login" && (
              <div className="flex items-center justify-end">
                <Link href="/forgot-password" className="text-sm text-accent hover:underline">
                  Forgot password?
                </Link>
              </div>
            )}

            {displayError && (
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-sm text-destructive bg-destructive/10 p-3 rounded-lg"
              >
                {displayError}
              </motion.p>
            )}

            <Button
              type="submit"
              disabled={isLoading}
              className="w-full h-12 bg-primary text-primary-foreground hover:bg-primary/90 font-medium"
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {mode === "login" ? "Signing in..." : "Creating account..."}
                </>
              ) : mode === "login" ? (
                "Sign In"
              ) : (
                "Create Account"
              )}
            </Button>
          </form>

          {/* Divider */}
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-border/50" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">
                Or continue with
              </span>
            </div>
          </div>

          {/* Social Login */}
          <div className="space-y-3">
            {isGoogleConfigured ? (
              <GoogleSignInButton
                mode={mode}
                onSuccess={handleGoogleSuccess}
                disabled={isLoading}
              />
            ) : (
              <Button
                variant="outline"
                type="button"
                disabled
                className="w-full h-12 bg-transparent border-border/50 opacity-60"
              >
                <svg className="mr-2 h-5 w-5" viewBox="0 0 24 24">
                  <path
                    fill="currentColor"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="currentColor"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="currentColor"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  />
                  <path
                    fill="currentColor"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  />
                </svg>
                Google (Not Configured)
              </Button>
            )}
          </div>

          {/* Switch Mode */}
          <p className="text-center text-sm text-muted-foreground">
            {mode === "login"
              ? "Don't have an account? "
              : "Already have an account? "}
            <Link
              href={mode === "login" ? "/signup" : "/login"}
              className="font-medium text-accent hover:underline transition-colors"
            >
              {mode === "login" ? "Sign up" : "Sign in"}
            </Link>
          </p>
        </motion.div>
      </div>

      {/* Right Panel - Decorative */}
      <div className="hidden lg:flex lg:flex-1 relative bg-secondary/30 items-center justify-center p-12">
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute right-0 top-1/4 h-96 w-96 rounded-full bg-accent/10 blur-3xl animate-pulse-glow" />
          <div className="absolute left-1/4 bottom-1/4 h-64 w-64 rounded-full bg-accent/5 blur-2xl" />
        </div>

        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="relative max-w-md space-y-8 text-center"
        >
          <div className="mx-auto flex items-center justify-center">
            <Image
              src="/Logo_with_no_background.png"
              alt="Intervexa"
              width={96}
              height={96}
              className="object-contain"
            />
          </div>

          <div className="space-y-4">
            <h2 className="text-2xl font-bold text-foreground">
              {mode === "login"
                ? "Continue your journey"
                : "Start your interview journey"}
            </h2>
            <p className="text-muted-foreground leading-relaxed">
              {mode === "login"
                ? "Pick up where you left off and keep improving your interview skills with AI-powered practice sessions."
                : "Join thousands of professionals who have mastered their interviews and landed their dream jobs."}
            </p>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-6 pt-8">
            <div className="space-y-1">
              <p className="text-2xl font-bold text-foreground">10k+</p>
              <p className="text-xs text-muted-foreground">Active Users</p>
            </div>
            <div className="space-y-1">
              <p className="text-2xl font-bold text-foreground">50k+</p>
              <p className="text-xs text-muted-foreground">Interviews</p>
            </div>
            <div className="space-y-1">
              <p className="text-2xl font-bold text-foreground">92%</p>
              <p className="text-xs text-muted-foreground">Success Rate</p>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
