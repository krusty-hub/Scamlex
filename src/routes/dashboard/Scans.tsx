import React, { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import {
    Search,
    Bell,
    ChevronDown,
    User,
    LogOut,
    ArrowRight,
    Menu,
    X,
    Activity,
    ShieldCheck,
    AlertTriangle,
    CheckCircle2,
    Clock,
    ArrowLeft
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { ScamlexBrand } from "@/components/scamlex-brand";
import { supabase, getUserScanHistory } from "../../lib/supabase";

export const Route = createFileRoute("/dashboard/Scans")({
    component: MyScansComponent,
});

export function MyScansComponent() {
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const [userDropdownOpen, setUserDropdownOpen] = useState(false);
    const [email, setEmail] = useState<string | null>(null);
    const [scans, setScans] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const loadScansData = async () => {
            setLoading(true);
            const { data: { user }, error: authError } = await supabase.auth.getUser();
            if (authError || !user) {
                setLoading(false);
                return;
            }

            setEmail(user.email ?? null);

            // Fetch full history (up to 100 recent scans)
            const { scans: history, error } = await getUserScanHistory(100);
            if (!error && history) {
                setScans(history);
            }
            setLoading(false);
        };

        loadScansData();
    }, []);

    const avatarLetter = email?.charAt(0).toUpperCase() || "U";

    return (
        <div className="min-h-screen bg-background text-foreground font-sans flex flex-col antialiased">

            {/* ── NAVIGATION ── */}
            <header className="sticky top-0 z-50 bg-background/90 backdrop-blur-xl border-b border-border">
                <div className="page-container max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex items-center justify-between h-18 gap-4">
                        <ScamlexBrand />

                        <div className="hidden md:flex items-center gap-4">
                            <nav className="flex items-center gap-6 text-sm font-medium text-foreground/70">
                                <a href="/dashboard/home" className="hover:text-primary transition-colors">
                                    Home
                                </a>
                                <a href="/dashboard/profile" className="hover:text-primary transition-colors">
                                    Settings
                                </a>
                            </nav>

                            <div className="h-4 w-px bg-border mx-2" />

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
                                        {email || "User"}
                                    </span>
                                    <ChevronDown className="size-4 text-foreground/50 ml-1" />
                                </Button>

                                {userDropdownOpen && (
                                    <div className="absolute right-0 top-full mt-2 w-64 bg-background border border-border rounded-md shadow-xl py-1 z-50">
                                        <div className="px-4 py-3 border-b border-border mb-1">
                                            <div className="text-sm font-bold font-display text-foreground truncate">{email}</div>
                                        </div>
                                        <a href="/dashboard/profile" className="flex items-center gap-2.5 px-4 py-2 text-sm text-foreground/70 hover:bg-border/50">
                                            <User className="size-4 text-primary" /> Profile Settings
                                        </a>
                                        <div className="h-px bg-border my-1" />
                                        <a href="/auth" className="flex items-center gap-2.5 px-4 py-2 text-sm text-foreground hover:bg-border/50 font-medium">
                                            <LogOut className="size-4 text-primary" /> Logout
                                        </a>
                                    </div>
                                )}
                            </div>
                        </div>

                        <Button
                            variant="ghost"
                            size="icon"
                            className="md:hidden text-foreground"
                            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                        >
                            {mobileMenuOpen ? <X className="size-5" /> : <Menu className="size-5" />}
                        </Button>
                    </div>
                </div>
            </header>

            {/* ── MAIN CONTENT ── */}
            <main className="flex-1">
                <section className="border-b border-primary bg-primary pt-10 pb-8">
                    <div className="page-container max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
                        <div className="flex items-center gap-4 mb-4">
                            <a href="/dashboard/home" className="inline-flex items-center gap-1.5 text-xs font-mono font-semibold text-primary-foreground/80 hover:text-primary-foreground bg-card/10 px-3 py-1.5 rounded transition-colors">
                                <ArrowLeft className="size-3.5" /> BACK_TO_DASHBOARD
                            </a>
                        </div>
                        <h1 className="text-3xl font-display font-bold text-background mb-1.5">
                            Scan History Archive
                        </h1>
                        <p className="text-sm text-primary-foreground/70 font-mono">
                            Complete logs of all inspected messages, URLs, and risk scores.
                        </p>
                    </div>
                </section>

                <div className="page-container max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
                    <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
                        <div className="px-6 py-4 border-b border-border flex items-center justify-between">
                            <span className="font-mono text-xs font-bold text-foreground flex items-center gap-2">
                                <Activity className="size-4 text-primary" />
                                TOTAL_LOGGED_SCANS ({scans.length})
                            </span>
                        </div>

                        {loading ? (
                            <div className="p-12 text-center text-sm text-foreground/50 font-mono">
                                Loading archive...
                            </div>
                        ) : scans.length === 0 ? (
                            <div className="p-16 text-center flex flex-col items-center justify-center">
                                <Activity className="size-10 text-foreground/20 mb-3" />
                                <h3 className="font-display text-base font-bold text-foreground mb-1">No scan records found</h3>
                                <p className="text-xs text-foreground/50 max-w-xs mb-6">
                                    Use the Threat Detection Console on your dashboard to inspect messages or links.
                                </p>
                                <a href="/dashboard/home">
                                    <Button className="h-9 px-4 text-xs font-semibold">
                                        Go to Console <ArrowRight className="ml-1.5 size-3.5" />
                                    </Button>
                                </a>
                            </div>
                        ) : (
                            <div className="divide-y divide-[border]">
                                {scans.map((scan) => {
                                    const riskScore = scan.risk_score ?? 0;
                                    const isHighRisk = riskScore > 70;
                                    const isMediumRisk = riskScore > 30 && riskScore <= 70;

                                    return (
                                        <div key={scan.id} className="p-5 sm:px-6 hover:bg-border/20 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                            <div className="space-y-1.5 max-w-2xl">
                                                <div className="flex items-center gap-2 font-mono text-xs text-foreground/60">
                                                    <span className="bg-border/60 px-2 py-0.5 rounded font-semibold text-foreground">
                                                        {scan.detection_type || "HEURISTIC v1.0"}
                                                    </span>
                                                    <span>•</span>
                                                    <span className="flex items-center gap-1">
                                                        <Clock className="size-3" />
                                                        {new Date(scan.created_at).toLocaleString()}
                                                    </span>
                                                </div>
                                                <p className="text-sm font-medium text-foreground break-words">
                                                    {scan.input_text}
                                                </p>
                                            </div>

                                            <div className="flex items-center gap-4 shrink-0 self-start sm:self-center">
                                                <div className={`px-3 py-1 rounded-full text-xs font-mono font-bold flex items-center gap-1.5 ${isHighRisk ? "bg-red-50 text-red-600 border border-red-200" :
                                                    isMediumRisk ? "bg-amber-50 text-amber-600 border border-amber-200" :
                                                        "bg-emerald-50 text-emerald-600 border border-emerald-200"
                                                    }`}>
                                                    {isHighRisk ? <AlertTriangle className="size-3.5" /> : <CheckCircle2 className="size-3.5" />}
                                                    Risk Score: {riskScore}/100
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </div>
            </main>

            {/* ── FOOTER ── */}
            <footer className="bg-foreground text-border mt-8 border-t border-foreground">
                <div className="h-1 bg-brand-lime" />
                <div className="page-container max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex flex-col sm:flex-row items-center justify-between text-xs text-border/50">
                    <span>© 2026 Scamlex. All rights reserved.</span>
                    <span>Built for safer digital decisions.</span>
                </div>
            </footer>
        </div>
    );
}
