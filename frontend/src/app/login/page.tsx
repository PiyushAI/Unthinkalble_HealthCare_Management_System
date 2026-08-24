"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Card } from "@/components/ui/Card";
import { Activity, User, Lock, CheckCircle2 } from "lucide-react";

const ROLE_REDIRECT: Record<string, string> = {
  PATIENT: "/patient",
  DOCTOR: "/doctor",
  ADMIN: "/admin",
};

type Role = "patient" | "doctor" | "admin";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { signInWithPassword } = useAuth();
  
  const [role, setRole] = useState<Role>("patient");
  const [identifier, setIdentifier] = useState("patient@example.com");
  const [password, setPassword] = useState("Password123!");
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const isRegistered = searchParams.get("registered");
    const regEmail = searchParams.get("email");
    if (isRegistered === "success" && regEmail) {
      setRole("patient");
      setIdentifier(decodeURIComponent(regEmail));
      setPassword("");
      setSuccessMsg("Account created and saved to database! Please enter your password to sign in.");
    }
  }, [searchParams]);

  const roleConfig = {
    patient: {
      label: "Email Address",
      placeholder: "patient@example.com",
      showCreateAccount: true,
    },
    doctor: {
      label: "Doctor Email / Provider ID",
      placeholder: "dr.jenkins@hospital.com",
      showCreateAccount: false,
    },
    admin: {
      label: "Admin Email",
      placeholder: "admin@hospital.com",
      showCreateAccount: false,
    },
  };

  function handleRoleChange(r: Role) {
    setRole(r);
    setError(null);
    setSuccessMsg(null);
    setIdentifier(roleConfig[r].placeholder);
    setPassword("Password123!");
  }

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccessMsg(null);

    const email = identifier.trim();
    if (!email || !password) {
      setError("Please enter both email and password.");
      setLoading(false);
      return;
    }

    try {
      const result = await signInWithPassword(email, password);
      if (result.error) {
        setError(result.error);
        setLoading(false);
        return;
      }

      // Validated role returned from database/profile
      const userRole = (result.role || role).toUpperCase();
      const redirectUrl = ROLE_REDIRECT[userRole] ?? `/${role}`;
      router.push(redirectUrl);
    } catch (err: any) {
      setError(err.message || "Failed to sign in");
      setLoading(false);
    }
  }

  return (
    <main className="h-full bg-background-subtle font-body-md text-on-surface antialiased flex flex-col items-center justify-center min-h-screen relative overflow-hidden py-12">
      <div 
        className="absolute inset-0 z-0 bg-gradient-to-br from-blue-50/50 via-indigo-50/30 to-slate-100/50 mix-blend-multiply pointer-events-none" 
      ></div>
      
      <div className="relative z-10 w-full max-w-md px-margin-mobile md:px-0">
        <div className="text-center mb-8">
          <h1 className="font-headline-lg text-headline-lg text-primary flex items-center justify-center gap-3">
            <Activity className="w-10 h-10 text-primary" />
            MedPrecision
          </h1>
          <p className="font-body-md text-body-md text-on-surface-variant mt-2">Secure Access Portal</p>
        </div>

        <Card>
          <div className="p-6">
            <div className="flex bg-surface-container-low rounded-lg p-1 mb-6 border border-outline-variant">
              {(["patient", "doctor", "admin"] as Role[]).map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => handleRoleChange(r)}
                  className={`flex-1 font-label-sm text-label-sm py-2 px-4 rounded-md transition-all font-medium text-center capitalize ${
                    role === r
                      ? "bg-surface-card text-primary shadow-sm border border-outline-variant"
                      : "text-on-surface-variant hover:text-on-surface border border-transparent"
                  }`}
                >
                  {r}
                </button>
              ))}
            </div>

            {successMsg && (
              <div className="mb-5 p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <span>{successMsg}</span>
              </div>
            )}

            <form className="space-y-5" onSubmit={handleLogin}>
              <Input
                id="identifier"
                name="identifier"
                label={roleConfig[role].label}
                icon={<User className="w-5 h-5" />}
                placeholder={roleConfig[role].placeholder}
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                required
              />

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label htmlFor="password" className="block font-label-sm text-label-sm text-on-surface font-medium">Password</label>
                  <a href="#" className="font-label-sm text-label-sm text-primary hover:text-primary-container transition-colors">Forgot Password?</a>
                </div>
                <Input
                  id="password"
                  name="password"
                  type="password"
                  icon={<Lock className="w-5 h-5" />}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>

              <div className="flex items-center">
                <input
                  id="remember-me"
                  name="remember-me"
                  type="checkbox"
                  className="h-4 w-4 text-primary focus:ring-primary border-outline rounded text-primary-container"
                />
                <label htmlFor="remember-me" className="ml-2 block font-label-sm text-label-sm text-on-surface-variant">
                  Remember my device
                </label>
              </div>

              {error && <p className="text-sm text-status-error font-medium">{error}</p>}

              <Button type="submit" fullWidth disabled={loading}>
                {loading ? "Signing in..." : "Sign In Securely"}
              </Button>
            </form>
          </div>

          {roleConfig[role].showCreateAccount && (
            <div className="bg-surface-container-low px-6 py-4 border-t border-outline-variant text-center">
              <span className="font-label-sm text-label-sm text-on-surface-variant">New to MedPrecision?</span>
              <Link
                href="/register"
                className="font-label-sm text-label-sm font-medium text-primary hover:text-primary-container ml-1 transition-colors underline"
              >
                Create an Account
              </Link>
            </div>
          )}
        </Card>

        <div className="mt-6 text-center flex items-center justify-center gap-2 text-on-surface-variant font-caption-xs text-caption-xs">
          <Lock className="w-4 h-4" />
          End-to-end encrypted. HIPAA compliant.
        </div>
      </div>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-background-subtle" />}>
      <LoginForm />
    </Suspense>
  );
}
