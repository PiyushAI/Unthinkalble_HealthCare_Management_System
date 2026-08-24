"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Card } from "@/components/ui/Card";
import { Activity, User, Lock, Mail, Phone, ArrowLeft, CheckCircle2 } from "lucide-react";

export default function RegisterPage() {
  const router = useRouter();
  const { signUpPatient, signOut } = useAuth();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [phone, setPhone] = useState("");
  const [dob, setDob] = useState("");
  const [gender, setGender] = useState("Female");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    if (!name.trim() || !email.trim() || !password) {
      setError("Please fill in all required fields (Name, Email, Password).");
      setLoading(false);
      return;
    }

    try {
      const result = await signUpPatient({
        email: email.trim(),
        password,
        name: name.trim(),
        phone: phone.trim() || undefined,
        dob: dob || undefined,
        gender: gender || undefined,
      });

      if (result.error) {
        setError(result.error);
        setLoading(false);
        return;
      }

      setSuccess(true);
      // Ensure clean state before redirecting to login
      await signOut().catch(() => {});
      
      setTimeout(() => {
        router.push(`/login?registered=success&email=${encodeURIComponent(email.trim())}`);
      }, 1200);
    } catch (err: any) {
      setError(err.message || "Registration failed. Please try again.");
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-background-subtle font-body-md text-on-surface antialiased flex flex-col items-center justify-center p-4 relative overflow-hidden py-12">
      <div 
        className="absolute inset-0 z-0 bg-gradient-to-br from-blue-50/50 via-indigo-50/30 to-slate-100/50 mix-blend-multiply pointer-events-none" 
      ></div>

      <div className="relative z-10 w-full max-w-lg">
        <div className="text-center mb-6">
          <Link href="/login" className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary hover:underline mb-3">
            <ArrowLeft className="w-3.5 h-3.5" /> Back to Sign In
          </Link>
          <h1 className="font-headline-lg text-headline-lg text-primary flex items-center justify-center gap-3">
            <Activity className="w-9 h-9 text-primary" />
            MedPrecision
          </h1>
          <p className="font-body-md text-body-md text-on-surface-variant mt-1">Patient Registration Portal</p>
        </div>

        <Card className="shadow-2xl">
          <div className="p-6 sm:p-8">
            <div className="mb-6 pb-4 border-b border-outline-variant">
              <h2 className="font-title-md text-title-md text-on-surface">Create New Patient Account</h2>
              <p className="font-caption-xs text-caption-xs text-on-surface-variant mt-1">
                Register to book doctor visits, consult specialists, and track prescriptions.
              </p>
            </div>

            {success ? (
              <div className="py-8 text-center space-y-3">
                <CheckCircle2 className="w-12 h-12 text-status-success mx-auto animate-bounce" />
                <h3 className="font-title-md text-title-md text-on-surface font-semibold">Account Created Successfully!</h3>
                <p className="font-body-md text-sm text-on-surface-variant">
                  Your profile has been saved to the database. Redirecting you to sign in...
                </p>
              </div>
            ) : (
              <form className="space-y-4" onSubmit={handleSubmit}>
                <Input
                  id="name"
                  name="name"
                  label="Full Name"
                  icon={<User className="w-5 h-5" />}
                  placeholder="e.g. Jane Doe"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />

                <Input
                  id="email"
                  name="email"
                  type="email"
                  label="Email Address"
                  icon={<Mail className="w-5 h-5" />}
                  placeholder="jane@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <Input
                    id="phone"
                    name="phone"
                    type="tel"
                    label="Phone Number"
                    icon={<Phone className="w-5 h-5" />}
                    placeholder="+1 555-0199"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                  />

                  <div>
                    <label className="block font-label-sm text-label-sm text-on-surface font-medium mb-1.5">
                      Gender
                    </label>
                    <select
                      value={gender}
                      onChange={(e) => setGender(e.target.value)}
                      className="w-full h-10 px-3 border border-outline-variant rounded-lg bg-surface-card text-on-surface font-body-md text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                    >
                      <option value="Female">Female</option>
                      <option value="Male">Male</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block font-label-sm text-label-sm text-on-surface font-medium mb-1.5">
                    Date of Birth
                  </label>
                  <input
                    type="date"
                    value={dob}
                    onChange={(e) => setDob(e.target.value)}
                    className="w-full h-10 px-3 border border-outline-variant rounded-lg bg-surface-card text-on-surface font-body-md text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                  />
                </div>

                <Input
                  id="password"
                  name="password"
                  type="password"
                  label="Create Password"
                  icon={<Lock className="w-5 h-5" />}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />

                {error && (
                  <p className="text-sm text-status-error font-medium">{error}</p>
                )}

                <div className="pt-2">
                  <Button type="submit" fullWidth disabled={loading}>
                    {loading ? "Creating Account..." : "Create Account & Proceed to Sign In"}
                  </Button>
                </div>
              </form>
            )}
          </div>

          {!success && (
            <div className="bg-surface-container-low px-6 py-4 border-t border-outline-variant text-center">
              <span className="font-label-sm text-label-sm text-on-surface-variant">
                Already have an account?
              </span>
              <Link
                href="/login"
                className="font-label-sm text-label-sm font-medium text-primary hover:text-primary-container ml-1 transition-colors underline"
              >
                Sign In
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
