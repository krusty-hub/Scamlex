import { useState, useEffect } from "react";
import {
  ArrowRight,
  Loader2,
  Lock,
  Mail,
  ShieldCheck,
  AlertCircle,
  User,
  Phone,
  AtSign,
  CheckCircle2,
  Eye,
  EyeOff,
} from "lucide-react";
// Adjust these imports based on your routing (e.g., Next.js uses next/navigation)
import { useNavigate } from '@tanstack/react-router';

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScamlexBrand } from "@/components/scamlex-brand";
import { supabase } from "@/lib/supabase"; // Your Supabase client instance

type AuthMode = 'signIn' | 'signUp' | 'forgotPassword' | 'updatePassword';

export function ScamlexAuth() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<AuthMode>('signIn');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Password Visibility Toggles
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Form States
  const [identifier, setIdentifier] = useState(""); // Used for Email OR Username on sign-in
  const [email, setEmail] = useState(""); // Used for Sign Up & Forgot Password
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [username, setUsername] = useState("");
  const [phone, setPhone] = useState("");

  // Listen for Supabase password recovery events
  useEffect(() => {
    const { data: authListener } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        setMode('updatePassword');
        setError(null);
        setSuccess(null);
      }
    });
    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  const resetMessages = () => {
    setError(null);
    setSuccess(null);
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    resetMessages();

    try {
      if (mode === 'signUp') {
        // Validation
        if (password !== confirmPassword) throw new Error("Passwords do not match.");
        if (username.includes('@')) throw new Error("Username cannot contain '@' symbol.");

        // Check if username is already taken using our RPC function
        const { data: existingEmail } = await supabase.rpc('get_email_by_username', { p_username: username });
        if (existingEmail) throw new Error("Username is already taken. Please choose another.");

        // Sign Up with Supabase Auth
        const { data: authData, error: authError } = await supabase.auth.signUp({
          email,
          password,
        });
        if (authError) throw authError;

        // Create the Profile entry
        if (authData.user) {
          const { error: profileError } = await supabase.from('profiles').upsert([
            {
              id: authData.user.id,
              username,
              full_name: fullName,
              email,
              phone: phone || null,
            }
          ]);
          if (profileError) throw profileError;
        }

        setSuccess("Account created successfully! Check your email for the confirmation link.");
        setMode('signIn');
      }

      else if (mode === 'signIn') {
        let loginEmail = identifier;

        // If the identifier doesn't have an '@', assume it's a username and resolve it to an email
        if (!identifier.includes('@')) {
          const { data: resolvedEmail, error: rpcError } = await supabase.rpc('get_email_by_username', { p_username: identifier });
          if (rpcError || !resolvedEmail) throw new Error("Invalid username or password.");
          loginEmail = resolvedEmail;
        }

        const { error: signInError } = await supabase.auth.signInWithPassword({
          email: loginEmail,
          password,
        });
        if (signInError) throw signInError;

        navigate({ to: "/dashboard/home" });
      }

      else if (mode === 'forgotPassword') {
        const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: window.location.origin + window.location.pathname, // Redirects back to this auth page
        });
        if (resetError) throw resetError;
        setSuccess("If that email is registered, password reset instructions have been sent.");
      }

      else if (mode === 'updatePassword') {
        if (password !== confirmPassword) throw new Error("Passwords do not match.");

        const { error: updateError } = await supabase.auth.updateUser({ password });
        if (updateError) throw updateError;

        setSuccess("Password updated successfully. You can now sign in.");
        setMode('signIn');
        setPassword("");
        setConfirmPassword("");
      }
    } catch (err: any) {
      setError(err.message || "An error occurred during authentication.");
    } finally {
      setLoading(false);
    }
  };

  const getFormTitle = () => {
    switch (mode) {
      case 'signUp': return "Create an account";
      case 'forgotPassword': return "Reset password";
      case 'updatePassword': return "Set new password";
      default: return "Welcome back";
    }
  };

  const getFormDescription = () => {
    switch (mode) {
      case 'signUp': return "Enter your details to start analyzing web threats.";
      case 'forgotPassword': return "Enter your email address to receive a reset link.";
      case 'updatePassword': return "Enter and confirm your new secure password.";
      default: return "Enter your credentials to access your dashboard.";
    }
  };

  const getSubmitLabel = () => {
    switch (mode) {
      case 'signUp': return "Create account";
      case 'forgotPassword': return "Send reset link";
      case 'updatePassword': return "Update password";
      default: return "Sign in";
    }
  };

  return (
    <div className="min-h-screen grid lg:grid-cols-2 bg-background text-foreground">
      {/* Left Panel - Branding & Info */}
      <div className="hidden lg:flex flex-col justify-between bg-secondary p-12 border-r border-border">
        <div>
          <ScamlexBrand />
          <h1 className="mt-12 font-display text-4xl font-bold leading-tight">
            Protect your digital perimeter.
          </h1>
          <p className="mt-4 text-lg text-muted-foreground max-w-md">
            Sign in to access your cached query history, API keys, and explainable risk scoring dashboard.
          </p>
        </div>

        <div className="space-y-6">
          <div className="flex items-center gap-3 text-sm font-medium">
            <ShieldCheck className="size-5 text-primary" />
            <span>End-to-end encrypted sessions</span>
          </div>
          <div className="rounded-md border border-border bg-background p-6">
            <blockquote className="space-y-4">
              <p className="text-sm leading-6 text-muted-foreground">
                "Scamlex turns vague warnings into deterministic, explainable verdicts. The dashboard is essential for my daily analysis."
              </p>
              <footer className="text-sm font-semibold">Security Analyst</footer>
            </blockquote>
          </div>
        </div>
      </div>

      {/* Right Panel - Auth Form */}
      <div className="flex items-center justify-center p-8 sm:p-12 overflow-y-auto">
        <div className="w-full max-w-md space-y-8">
          <div className="lg:hidden mb-10">
            <ScamlexBrand />
          </div>

          <div className="space-y-2">
            <h2 className="text-3xl font-display font-bold tracking-tight">
              {getFormTitle()}
            </h2>
            <p className="text-sm text-muted-foreground">
              {getFormDescription()}
            </p>
          </div>

          <form onSubmit={handleAuth} className="space-y-6">
            {error && (
              <div className="flex items-center gap-2 rounded-md bg-destructive/10 p-3 text-sm text-destructive border border-destructive/20">
                <AlertCircle className="size-4 shrink-0" />
                <p>{error}</p>
              </div>
            )}

            {success && (
              <div className="flex items-center gap-2 rounded-md bg-emerald-500/10 p-3 text-sm text-emerald-600 border border-emerald-500/20">
                <CheckCircle2 className="size-4 shrink-0" />
                <p>{success}</p>
              </div>
            )}

            <div className="space-y-4">

              {/* === SIGN IN === */}
              {mode === 'signIn' && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="identifier">Email or Username</Label>
                    <div className="relative">
                      <User className="absolute left-3 top-2.5 size-4 text-muted-foreground" />
                      <Input
                        id="identifier"
                        type="text"
                        placeholder="Email address or username"
                        className="pl-10"
                        value={identifier}
                        onChange={(e) => setIdentifier(e.target.value)}
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="password">Password</Label>
                      <button
                        type="button"
                        onClick={() => { setMode('forgotPassword'); resetMessages(); }}
                        className="text-xs font-medium text-primary hover:underline"
                      >
                        Forgot password?
                      </button>
                    </div>
                    <div className="relative">
                      <Lock className="absolute left-3 top-2.5 size-4 text-muted-foreground" />
                      <Input
                        id="password"
                        type={showPassword ? "text" : "password"}
                        placeholder="••••••••"
                        className="pl-10 pr-10"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-2.5 text-muted-foreground hover:text-foreground transition-colors focus:outline-none"
                        aria-label={showPassword ? "Hide password" : "Show password"}
                      >
                        {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                      </button>
                    </div>
                  </div>
                </>
              )}

              {/* === SIGN UP === */}
              {mode === 'signUp' && (
                <>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="fullName">Full Name</Label>
                      <div className="relative">
                        <User className="absolute left-3 top-2.5 size-4 text-muted-foreground" />
                        <Input
                          id="fullName"
                          type="text"
                          placeholder="John Doe"
                          className="pl-10"
                          value={fullName}
                          onChange={(e) => setFullName(e.target.value)}
                          required
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="username">Username</Label>
                      <div className="relative">
                        <AtSign className="absolute left-3 top-2.5 size-4 text-muted-foreground" />
                        <Input
                          id="username"
                          type="text"
                          placeholder="johndoe123"
                          className="pl-10"
                          value={username}
                          onChange={(e) => setUsername(e.target.value.toLowerCase())}
                          required
                        />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="email">Email address</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-2.5 size-4 text-muted-foreground" />
                      <Input
                        id="email"
                        type="email"
                        placeholder="name@example.com"
                        className="pl-10"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="phone">Phone Number (Optional)</Label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-2.5 size-4 text-muted-foreground" />
                      <Input
                        id="phone"
                        type="tel"
                        placeholder="+1 (555) 000-0000"
                        className="pl-10"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="password">Password</Label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-2.5 size-4 text-muted-foreground" />
                        <Input
                          id="password"
                          type={showPassword ? "text" : "password"}
                          placeholder="••••••••"
                          className="pl-10 pr-10"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          required
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3 top-2.5 text-muted-foreground hover:text-foreground transition-colors focus:outline-none"
                          aria-label={showPassword ? "Hide password" : "Show password"}
                        >
                          {showPassword ? (
                            <EyeOff className="size-4" />
                          ) : (
                            <Eye className="size-4" />
                          )}
                        </button>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="confirmPassword">Confirm Password</Label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-2.5 size-4 text-muted-foreground" />
                        <Input
                          id="confirmPassword"
                          type={showConfirmPassword ? "text" : "password"}
                          placeholder="••••••••"
                          className="pl-10 pr-10"
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          required
                        />
                        <button
                          type="button"
                          onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                          className="absolute right-3 top-2.5 text-muted-foreground hover:text-foreground transition-colors focus:outline-none"
                          aria-label={showConfirmPassword ? "Hide password" : "Show password"}
                        >
                          {showConfirmPassword ? (
                            <EyeOff className="size-4" />
                          ) : (
                            <Eye className="size-4" />
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                </>
              )}

              {/* === FORGOT PASSWORD === */}
              {mode === 'forgotPassword' && (
                <div className="space-y-2">
                  <Label htmlFor="reset-email">Email address</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-2.5 size-4 text-muted-foreground" />
                    <Input
                      id="reset-email"
                      type="email"
                      placeholder="name@example.com"
                      className="pl-10"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                    />
                  </div>
                </div>
              )}

              {/* === UPDATE PASSWORD (Recovery Flow) === */}
              {mode === 'updatePassword' && (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="new-password">New Password</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-2.5 size-4 text-muted-foreground" />
                      <Input
                        id="new-password"
                        type={showPassword ? "text" : "password"}
                        placeholder="••••••••"
                        className="pl-10 pr-10"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-2.5 text-muted-foreground hover:text-foreground transition-colors focus:outline-none"
                        aria-label={showPassword ? "Hide password" : "Show password"}
                      >
                        {showPassword ? (
                          <EyeOff className="size-4" />
                        ) : (
                          <Eye className="size-4" />
                        )}
                      </button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="confirm-new-password">Confirm New Password</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-2.5 size-4 text-muted-foreground" />
                      <Input
                        id="confirm-new-password"
                        type={showConfirmPassword ? "text" : "password"}
                        placeholder="••••••••"
                        className="pl-10 pr-10"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute right-3 top-2.5 text-muted-foreground hover:text-foreground transition-colors focus:outline-none"
                        aria-label={showConfirmPassword ? "Hide password" : "Show password"}
                      >
                        {showConfirmPassword ? (
                          <EyeOff className="size-4" />
                        ) : (
                          <Eye className="size-4" />
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              )}

            </div>

            <Button type="submit" className="w-full h-11" disabled={loading}>
              {loading ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <>
                  {getSubmitLabel()}
                  <ArrowRight className="ml-2 size-4" />
                </>
              )}
            </Button>
          </form>

          {/* Mode Toggles */}
          {mode !== 'updatePassword' && (
            <div className="text-center text-sm text-muted-foreground">
              {mode === 'signIn' && (
                <>
                  Don't have an account?{" "}
                  <button
                    type="button"
                    onClick={() => { setMode('signUp'); resetMessages(); }}
                    className="font-semibold text-foreground hover:text-primary hover:underline transition-colors"
                  >
                    Sign up
                  </button>
                </>
              )}
              {(mode === 'signUp' || mode === 'forgotPassword') && (
                <>
                  {mode === 'signUp' ? "Already have an account?" : "Remember your password?"}{" "}
                  <button
                    type="button"
                    onClick={() => { setMode('signIn'); resetMessages(); }}
                    className="font-semibold text-foreground hover:text-primary hover:underline transition-colors"
                  >
                    Sign in
                  </button>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
