import React, { useEffect, useState, useCallback, useRef } from "react";
import { createFileRoute } from "@tanstack/react-router";
import {
  Search,
  Bell,
  ChevronDown,
  User,
  Star,
  Bookmark,
  Building2,
  LogOut,
  ShieldAlert,
  ArrowRight,
  Menu,
  X,
  Activity,
  ShieldCheck,
  Chrome,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { ScamlexBrand } from "@/components/scamlex-brand";
import { supabase, getUserScanHistory } from "../../lib/supabase";
import { ScannerDemo } from '@/components/scanner'
import ExtensionConnectCard from '@/components/ExtensionConnectCard'

export const Route = createFileRoute("/dashboard/home")({
  component: DashboardComponent,
});

export function DashboardComponent() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const [email, setEmail] = useState<string | null>(null);
  const [username, setUsername] = useState<string | null>(null);
  const [scanCount, setScanCount] = useState<number>(0);
  const [recentScans, setRecentScans] = useState<any[]>([]);

  // Search Bar State
  const [searchInput, setSearchInput] = useState("");
  const [globalSearchQuery, setGlobalSearchQuery] = useState("");
  const consoleRef = useRef<HTMLElement>(null);

  // 1. ADD THIS: A simple trigger to safely force a re-render
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // 2. ONE CLEAN USE-EFFECT: Completely removes the broken useCallback logic
  useEffect(() => {
    const loadUserData = async () => {
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) {
        console.error("No authenticated user:", authError);
        return;
      }

      // Keep the user's profile information
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("username, email")
        .eq("id", user.id)
        .single();

      if (profileError) {
        console.error("Error getting profile:", profileError);
        // Fall back to the authenticated user's email
        setEmail(user.email ?? null);
      } else {
        setUsername(profile.username);
        setEmail(profile.email ?? user.email ?? null);
      }

      const { scans, error: scansError } = await getUserScanHistory(50);

      if (scansError) {
        console.error("Error getting scan history:", scansError);
        return;
      }

      if (scans) {
        setScanCount(scans.length);
        setRecentScans(scans);
      }
    };

    loadUserData();
  }, [refreshTrigger]); // <-- Listens for the trigger to change

  // Get the first letter of the username for the avatar
  const avatarLetter = username?.charAt(0).toUpperCase() || email?.charAt(0).toUpperCase() || "U";

  return (
    <div className="min-h-screen bg-background text-foreground font-sans flex flex-col antialiased">

      {/* ── NAVIGATION ── */}
      <header className="sticky top-0 z-50 bg-background/90 backdrop-blur-xl border-b border-border">
        <div className="page-container max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-18 gap-4">

            {/* Logo */}
            <ScamlexBrand />

            {/* Desktop Search */}
            <div className="hidden md:block flex-1 max-w-md relative ml-8">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-foreground/50" />

                <input
                  type="text"
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && searchInput.trim()) {
                      setGlobalSearchQuery(searchInput);
                      consoleRef.current?.scrollIntoView({ behavior: 'smooth' });
                    }
                  }}
                  placeholder="Check website, email, phone, wallet..."
                  className="w-full bg-border/40 border border-border rounded-md py-2 pl-9 pr-4 text-sm text-foreground outline-none focus:border-primary focus:ring-1 focus:ring-[primary] transition-all"
                />
              </div>
            </div>

            {/* Desktop Nav Links & User Controls */}
            <div className="hidden md:flex items-center gap-4">

              <nav className="flex items-center gap-6 text-sm font-medium text-foreground/70">
                <a
                  href="/dashboard/dashboard"
                  className="text-primary font-bold"
                >
                  Home
                </a>

                <a
                  href="/dashboard/profile"
                  className="hover:text-primary transition-colors"
                >
                  Settings
                </a>
              </nav>

              <div className="h-4 w-px bg-border mx-2" />

              {/* Notifications */}
              <Button
                variant="ghost"
                size="icon"
                className="text-foreground/70 hover:text-primary hover:bg-border/50"
              >
                <Bell className="size-4" />
              </Button>

              {/* User Avatar Dropdown */}
              <div className="relative">
                <Button
                  variant="ghost"
                  onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                  className="flex items-center gap-2 px-2 hover:bg-border/50"
                >
                  <div className="size-6 bg-primary text-background rounded flex items-center justify-center text-xs font-bold font-mono">
                    {avatarLetter}
                  </div>

                  <span className="text-sm font-medium text-foreground max-w-[150px] truncate">
                    {username || "User"}
                  </span>

                  <ChevronDown className="size-4 text-foreground/50 ml-1" />
                </Button>

                {userDropdownOpen && (
                  <div className="absolute right-0 top-full mt-2 w-64 bg-background border border-border rounded-md shadow-xl py-1 z-50">

                    <div className="px-4 py-3 border-b border-border mb-1">
                      <div className="text-sm font-bold font-display text-foreground truncate">
                        {username || "User"}
                      </div>

                      <div className="text-xs font-mono text-foreground/50 truncate">
                        {email || "Not signed in"}
                      </div>
                    </div>

                    <a
                      href="/dashboard/profile"
                      className="flex items-center gap-2.5 px-4 py-2 text-sm text-foreground/70 hover:text-foreground hover:bg-border/50 transition-colors"
                    >
                      <User className="size-4 text-primary" />
                      Profile Settings
                    </a>

                    <div className="h-px bg-border my-1" />

                    <a
                      href="/auth"
                      className="flex items-center gap-2.5 px-4 py-2 text-sm text-foreground hover:bg-border/50 transition-colors font-medium"
                    >
                      <LogOut className="size-4 text-primary" />
                      Logout
                    </a>
                  </div>
                )}
              </div>
            </div>

            {/* Mobile menu button */}
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden text-foreground"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? (
                <X className="size-5" />
              ) : (
                <Menu className="size-5" />
              )}
            </Button>

          </div>
        </div>

        {/* Mobile menu dropdown */}
        {mobileMenuOpen && (
          <nav className="border-t border-border bg-background px-5 py-4 md:hidden">

            <div className="mb-4 flex items-center gap-3 p-3 bg-border/30 rounded-md border border-border">
              <div className="size-9 bg-primary text-background rounded flex items-center justify-center font-bold font-mono">
                {avatarLetter}
              </div>

              <div>
                <div className="text-sm font-bold font-display text-foreground">
                  {username || "User"}
                </div>

                <div className="text-xs font-mono text-foreground/50 truncate max-w-[220px]">
                  {email || "Not signed in"}
                </div>
              </div>
            </div>

            <a
              href="/dashboard/dashboard"
              className="block border-b border-border py-3 text-sm font-bold text-primary"
            >
              Dashboard
            </a>

            <a
              href="/dashboard/profile"
              className="block border-b border-border py-3 text-sm font-medium text-foreground/70"
            >
              Profile Settings
            </a>

            <a
              href="/dashboard/reviews"
              className="block border-b border-border py-3 text-sm font-medium text-foreground/70"
            >
              My Reviews
            </a>

            <a
              href="/auth"
              className="block py-3 text-sm font-medium text-foreground mt-2"
            >
              Logout
            </a>
          </nav>
        )}
      </header>

      {/* ── MAIN CONTENT ── */}
      <main className="flex-1">

        {/* Header/Hero Section */}
        <section className="relative bg-primary pt-16 pb-14 overflow-hidden border-b border-primary">
          {/* Decorative Background Elements */}
          <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-gradient-to-br from-[brand-lime]/20 to-transparent rounded-full blur-3xl -translate-y-1/2 translate-x-1/3 pointer-events-none"></div>
          <div className="absolute bottom-0 left-0 w-80 h-80 bg-gradient-to-tr from-[foreground]/20 to-transparent rounded-full blur-3xl translate-y-1/3 -translate-x-1/4 pointer-events-none"></div>

          <div className="page-container max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">

            <div className="flex items-center gap-6">

              <div className="relative">
                <div className="absolute -inset-1.5 bg-gradient-to-br from-[brand-lime] to-transparent rounded-full blur-md opacity-70"></div>
                <div className="size-20 rounded-full bg-foreground flex items-center justify-center font-display text-3xl font-bold text-background shadow-lg border-2 border-white/20 relative z-10">
                  {avatarLetter}
                </div>
              </div>

              <div className="flex-1 py-1">

                <h1 className="text-3xl sm:text-4xl font-display font-extrabold text-background mb-3 tracking-tight">
                  Hi {username || "User"}, welcome back!
                </h1>

                <div className="flex items-center flex-wrap gap-3 text-sm text-background/80 font-mono">

                  <span className="truncate max-w-[300px] font-medium bg-foreground/20 px-3 py-1 rounded-full border border-white/10 backdrop-blur-sm">
                    {email || "User"}
                  </span>

                  <span className="flex items-center gap-1.5 text-foreground bg-brand-lime font-bold px-3 py-1 rounded-full text-xs shadow-sm">
                    <ShieldCheck className="size-3.5 text-primary" />
                    Verified Analyst
                  </span>

                </div>
              </div>
            </div>
          </div>
        </section>

        <div className="page-container max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-12">

          {/* Stats Grid */}
          <section>

            <div className="mb-6 flex items-center justify-between">
              <h2 className="font-display text-xl font-bold text-foreground tracking-tight">
                Activity Metrics
              </h2>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 sm:gap-6">

              {[
                { label: "Total Scans", value: scanCount.toString(), icon: Activity, color: "text-primary", bg: "bg-primary/10" },
                { label: "Following", value: "0", icon: Bell, color: "text-primary", bg: "bg-primary/10" },
                { label: "Helpful", value: "0", icon: Bookmark, color: "text-primary", bg: "bg-primary/10" },
                { label: "Scam Reports", value: "0", icon: ShieldAlert, color: "text-foreground", bg: "bg-foreground/10" },
              ].map((stat, idx) => (
                <div
                  key={idx}
                  className="bg-background p-5 sm:p-6 rounded-2xl shadow-[0_2px_10px_rgba(17,19,28,0.04)] border border-border/50 hover:shadow-[0_8px_24px_rgba(17,19,28,0.08)] hover:-translate-y-1 transition-all duration-300"
                >
                  <div className="flex items-center justify-between mb-5">

                    <span className="font-mono text-[11px] uppercase tracking-wider text-foreground/60 font-semibold">
                      {stat.label}
                    </span>

                    <div className={`p-2 rounded-xl ${stat.bg}`}>
                      <stat.icon className={`size-4 ${stat.color}`} />
                    </div>
                  </div>

                  <div className="font-display text-3xl font-extrabold text-foreground">
                    {stat.value}
                  </div>
                </div>
              ))}

            </div>
          </section>

          {/* Quick Nav & Overview */}
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_2fr] gap-8">

            {/* Actions */}
            <section>

              <h2 className="font-display text-lg font-bold text-foreground mb-5 tracking-tight">
                Quick Actions
              </h2>

              <div className="grid grid-cols-2 gap-4">

                {[
                  {
                    label: "Write Review",
                    icon: Star,
                    href: "/dashboard/reviews",
                    color: "text-foreground",
                    bg: "bg-brand-lime",
                  },
                  {
                    label: "Following",
                    icon: Bell,
                    href: "/dashboard/following",
                    color: "text-primary",
                    bg: "bg-primary/10",
                  },
                  {
                    label: "Settings",
                    icon: User,
                    href: "/dashboard/profile",
                    color: "text-foreground",
                    bg: "bg-border",
                  },
                  {
                    label: "Manage List",
                    icon: Building2,
                    href: "/dashboard/manage-listing",
                    color: "text-primary",
                    bg: "bg-primary/10",
                  },
                ].map((nav, idx) => (
                  <a
                    key={idx}
                    href={nav.href}
                    className="bg-background p-5 flex flex-col items-center justify-center text-center gap-3 rounded-xl border border-border/50 shadow-[0_2px_10px_rgba(17,19,28,0.03)] hover:shadow-[0_8px_20px_rgba(17,19,28,0.06)] hover:-translate-y-1 transition-all duration-300 group"
                  >
                    <div className={`p-3 rounded-full transition-transform duration-300 group-hover:scale-110 ${nav.bg}`}>
                      <nav.icon className={`size-5 ${nav.color}`} />
                    </div>

                    <span className="text-xs font-bold text-foreground">
                      {nav.label}
                    </span>
                  </a>
                ))}

              </div>
            </section>

            {/* Recent Signals */}
            <section>

              <h2 className="font-display text-lg font-bold text-foreground mb-5 tracking-tight">
                Recent Signals
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 lg:gap-6">

                {/* MY SCAN */}
                <div className="bg-background flex flex-col rounded-2xl border border-border/50 shadow-[0_2px_10px_rgba(17,19,28,0.03)] overflow-hidden">
                  <div className="flex items-center justify-between px-5 py-4 border-b border-border/50 bg-border/10">

                    <span className="font-mono text-xs font-bold text-foreground flex items-center gap-2">
                      <div className="bg-primary/10 p-1.5 rounded-md">
                        <Activity className="size-3.5 text-primary" />
                      </div>
                      MY_SCANS
                    </span>

                    <a
                      href="/dashboard/scans"
                      className="text-xs font-mono text-primary font-bold flex items-center gap-1 hover:bg-primary/5 px-2 py-1 rounded-md transition-colors"
                    >
                      VIEW_ALL
                      <ArrowRight className="size-3" />
                    </a>

                  </div>

                  <div className="flex-1 p-5 flex flex-col justify-start">
                    {recentScans.length === 0 ? (
                      <div className="py-10 flex flex-col items-center justify-center text-center">
                        <div className="relative mb-4">
                          <div className="absolute inset-0 bg-primary/20 blur-xl rounded-full"></div>
                          <Activity className="size-10 text-primary relative z-10" />
                        </div>
                        <h3 className="font-display text-sm font-bold text-foreground mb-1">No analysis recorded</h3>
                        <p className="text-xs text-foreground/50 max-w-[220px]">Inspect messages or URLs using the console below to build history.</p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {recentScans.slice(0, 3).map((scan) => (
                          <div key={scan.id} className="p-4 border border-border/60 rounded-xl text-xs space-y-2 hover:border-primary/30 hover:shadow-sm transition-all duration-300 relative overflow-hidden group bg-card">
                            <div className="absolute left-0 top-0 bottom-0 w-1 bg-primary/50 group-hover:bg-primary transition-colors"></div>
                            
                            <div className="flex justify-between font-mono text-foreground/60 pl-2">
                              <span className="font-semibold text-foreground">Risk: <span className={scan.risk_score === "RED" ? "text-red-500" : scan.risk_score === "YELLOW" ? "text-yellow-600" : "text-primary"}>{scan.risk_score ?? "N/A"}</span></span>
                              <span>{new Date(scan.created_at).toLocaleDateString()}</span>
                            </div>
                            <p className="font-medium text-foreground truncate pl-2">{scan.input_text}</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Browser Extension Card */}
                <div className="bg-background flex flex-col rounded-2xl border border-border/50 shadow-[0_2px_10px_rgba(17,19,28,0.03)] overflow-hidden">

                  <div className="flex items-center justify-between px-5 py-4 border-b border-border/50 bg-border/10">

                    <span className="font-mono text-xs font-bold text-foreground flex items-center gap-2">
                      <div className="bg-brand-lime p-1.5 rounded-md">
                        <Chrome className="size-3.5 text-foreground" />
                      </div>
                      BROWSER EXTENSION
                    </span>

                    <span className="text-[10px] font-mono text-primary font-bold px-2 py-0.5 bg-primary/10 rounded-sm">
                      RECOMMENDED
                    </span>

                  </div>

                  <div className="flex-1 p-0 flex flex-col">
                    <ExtensionConnectCard />
                  </div>

                </div>

              </div>
            </section>
          </div>

          {/* CTA Banner */}
          {/* Live Scanner Console Widget */}
          <section ref={consoleRef} className="bg-background rounded-2xl shadow-[0_4px_20px_rgba(17,19,28,0.05)] border border-border/50 overflow-hidden relative">
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[primary] via-[brand-lime] to-[primary]"></div>
            <div className="bg-gradient-to-r from-[primary]/5 to-transparent px-6 py-5 border-b border-border/50">
              <div className="flex items-center gap-3">
                <div className="bg-primary p-2 rounded-lg shadow-sm">
                  <ShieldCheck className="size-5 text-primary-foreground" />
                </div>
                <div>
                  <h2 className="font-display text-xl font-extrabold text-foreground tracking-tight">Threat Detection Console</h2>
                  <p className="text-xs text-foreground/60 mt-0.5">Inspect messages or URLs against heuristic rules in real-time.</p>
                </div>
              </div>
            </div>
            <div className="p-6 sm:p-8">
              {/* 3. ADD THE PROP: This fires when a scan succeeds */}
              <ScannerDemo onScanComplete={() => setRefreshTrigger(prev => prev + 1)} externalQuery={globalSearchQuery} />
            </div>
          </section>

        </div>
      </main>

      {/* ── FOOTER ── */}
      <footer className="bg-foreground text-border mt-8 border-t border-foreground">

        <div className="h-1 bg-brand-lime" />

        <div className="page-container max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid gap-12 py-14 md:grid-cols-[1.4fr_1fr_1fr]">

          <div>
            <ScamlexBrand inverted />

            <p className="mt-5 max-w-sm text-sm leading-6 text-border/70">
              Explainable scam detection for suspicious messages, links, and
              web content.
            </p>
          </div>

          <div>

            <p className="font-display text-sm font-bold text-background mb-4">
              Check Reviews
            </p>

            <div className="flex flex-col gap-3 text-sm text-border/70">

              <a
                href="#"
                className="hover:text-brand-lime transition-colors"
              >
                Website Reviews
              </a>

              <a
                href="#"
                className="hover:text-brand-lime transition-colors"
              >
                Email Reviews
              </a>

              <a
                href="#"
                className="hover:text-brand-lime transition-colors"
              >
                Phone Reviews
              </a>

            </div>
          </div>

          <div>

            <p className="font-display text-sm font-bold text-background mb-4">
              Technology
            </p>

            <div className="flex flex-col gap-3 text-sm text-border/70">

              <a
                href="#"
                className="hover:text-brand-lime transition-colors"
              >
                Architecture
              </a>

              <a
                href="#"
                className="hover:text-brand-lime transition-colors"
              >
                Chromium extension
              </a>

              <a
                href="#"
                className="hover:text-brand-lime transition-colors"
              >
                REST API
              </a>

            </div>
          </div>

        </div>

        <div className="page-container max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col gap-3 border-t border-border/10 py-6 text-xs text-border/50 sm:flex-row sm:items-center sm:justify-between">

          <span>
            © 2026 Scamlex. All rights reserved.
          </span>

          <span>
            Built for safer digital decisions.
          </span>

        </div>
      </footer>

    </div>
  );
}
