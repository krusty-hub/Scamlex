import { useState } from "react";

import {
  Activity, ArrowRight, Braces, ChevronRight, Database, Fingerprint, Gauge, Globe2,
  Menu, MessageSquareText, ScanSearch, ServerCog, ShieldAlert, ShieldCheck, X,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { ScannerDemo } from "@/components/scanner";
import { ScamlexBrand } from "@/components/scamlex-brand";
import { Link } from '@tanstack/react-router';

const nav = [
  ["How it works", "#how-it-works"], ["Features", "#features"], ["Security", "#security"], ["Scanner", "#scanner"],
];

const features = [
  { icon: Globe2, title: "URL structure analysis", copy: "Inspects domain length, character substitutions, excessive hyphens, risky TLDs, and subdomain abuse." },
  { icon: MessageSquareText, title: "Linguistic threat detection", copy: "Finds urgency triggers, financial bait, grammar anomalies, and aggressive formatting in messages." },
  { icon: Gauge, title: "Explainable risk scoring", copy: "Aggregates matched indicators into a clear 0–100 score, verdict, and reason list." },
  { icon: ShieldAlert, title: "Browser-side warnings", copy: "A Manifest V3 extension checks active pages and flags suspicious URL patterns as you browse." },
  { icon: Database, title: "Cached query history", copy: "Content hashes and prior verdicts are stored locally to accelerate duplicate requests." },
  { icon: ServerCog, title: "Asynchronous REST API", copy: "FastAPI endpoints validate requests and handle concurrent text and URL analysis." },
];

export function ScamlexLanding() {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div id="top" className="min-h-screen overflow-hidden bg-background text-foreground">
      <header className="fixed inset-x-0 top-0 z-50 border-b border-border/80 bg-background/90 backdrop-blur-xl">
        <div className="page-container flex h-18 items-center justify-between">
          <ScamlexBrand />
          <nav className="hidden items-center gap-7 md:flex" aria-label="Primary navigation">
            {nav.map(([label, href]) => <a key={href} href={href} className="nav-link">{label}</a>)}
          </nav>
          <div className="hidden md:flex items-center gap-2">
            <Button variant="ghost" asChild className="h-10 px-5">
              <Link to="/auth">Sign in</Link>
            </Button>
            <Button asChild className="h-10 px-5">
              <a href="#scanner">Scan now <ArrowRight /></a>
            </Button>
          </div>
          <Button variant="ghost" size="icon" className="md:hidden" onClick={() => setMenuOpen((open) => !open)} aria-label="Toggle navigation" aria-expanded={menuOpen}>
            {menuOpen ? <X /> : <Menu />}
          </Button>
        </div>
        {menuOpen && (
          <nav className="border-t border-border bg-background px-5 py-4 md:hidden">
            {nav.map(([label, href]) => (
              <a key={href} href={href} onClick={() => setMenuOpen(false)} className="block border-b border-border py-3 text-sm font-medium">
                {label}
              </a>
            ))}
            <Link to="/auth" onClick={() => setMenuOpen(false)} className="block border-b border-border py-3 text-sm font-medium">
              Sign in
            </Link>
            <Button asChild className="mt-4 w-full">
              <a href="#scanner" onClick={() => setMenuOpen(false)}>Scan now</a>
            </Button>
          </nav>
        )}
      </header>

      <main>
        <section className="hero-section pt-18">
          <div className="hero-grid page-container">
            <div className="relative z-10 py-16 lg:py-24">
              <div className="eyebrow"><span className="status-dot" /> Web security, made legible</div>
              <h1 className="mt-7 max-w-3xl font-display text-5xl font-bold leading-[1.02] sm:text-6xl lg:text-7xl">
                Catch the signals<br />before the <span className="text-primary">scam.</span>
              </h1>
              <p className="mt-6 max-w-xl text-base leading-7 text-muted-foreground sm:text-lg">
                Scamlex analyzes suspicious messages and links for deceptive language, risky URL patterns, and social engineering signals—then explains what it found.
              </p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Button asChild size="lg" className="h-12 px-6"><a href="#scanner">Scan suspicious content <ArrowRight /></a></Button>
                <Button asChild size="lg" variant="outline" className="h-12 px-6"><a href="#how-it-works">See how it works</a></Button>
              </div>
              <div className="mt-9 flex flex-wrap gap-x-6 gap-y-3 text-xs font-medium text-muted-foreground">
                <span className="flex items-center gap-2"><ShieldCheck className="size-4 text-primary" /> Explainable verdicts</span>
                <span className="flex items-center gap-2"><Activity className="size-4 text-primary" /> Fast heuristic analysis</span>
                <span className="flex items-center gap-2"><Fingerprint className="size-4 text-primary" /> Local query caching</span>
              </div>
            </div>
            <div className="hero-console relative py-10 lg:py-20">
              <div className="signal-label signal-one">URL_STRUCTURE <span>04</span></div>
              <div className="signal-label signal-two">URGENCY_TRIGGER <span>+18</span></div>
              <ScannerDemo compact />
            </div>
          </div>
        </section>

        <section className="border-y border-border bg-secondary" aria-label="Core capabilities">
          <div className="page-container grid divide-y divide-border sm:grid-cols-2 sm:divide-x sm:divide-y-0 lg:grid-cols-4">
            {[['01','Text analysis'],['02','URL inspection'],['03','0–100 risk scoring'],['04','Chromium protection']].map(([n,label]) => (
              <div key={n} className="flex items-center gap-4 px-2 py-6 sm:px-6"><span className="font-mono text-xs text-primary">{n}</span><span className="text-sm font-semibold">{label}</span></div>
            ))}
          </div>
        </section>

        <section className="section-space page-container">
          <div className="grid gap-12 lg:grid-cols-[0.8fr_1.2fr] lg:gap-20">
            <div><div className="section-kicker">The problem</div><h2 className="section-title">Deception is designed to feel ordinary.</h2></div>
            <div className="grid gap-px overflow-hidden rounded-md border border-border bg-border sm:grid-cols-2">
              {[['01','Manufactured urgency','“Act now” language pressures people to react before they verify.'],['02','Trusted impersonation','Messages mimic familiar brands, teams, and account alerts.'],['03','Disguised destinations','Lookalike domains use subtle character swaps and misleading subdomains.'],['04','Financial bait','Rewards, refunds, and payment threats exploit emotion and attention.']].map(([n,t,c]) => (
                <article key={n} className="bg-background p-6 sm:p-8"><span className="font-mono text-xs text-primary">{n}</span><h3 className="mt-8 font-display text-lg font-bold">{t}</h3><p className="mt-2 text-sm leading-6 text-muted-foreground">{c}</p></article>
              ))}
            </div>
          </div>
        </section>

        <section id="how-it-works" className="section-space bg-foreground text-background scroll-mt-18">
          <div className="page-container">
            <div className="max-w-2xl"><div className="section-kicker section-kicker-dark">How it works</div><h2 className="section-title text-background">A clear verdict from a deterministic pipeline.</h2><p className="mt-5 leading-7 text-dark-muted">Every result follows a sequential process designed to stay fast and explainable.</p></div>
            <div className="mt-14 grid gap-px bg-dark-border md:grid-cols-4">
              {[['01','Submit','Paste a message or URL into the dashboard or send it through the API.'],['02','Normalize','Scamlex cleans the input, normalizes case, and extracts embedded links.'],['03','Analyze','Heuristic rules examine URL structure, urgency, language, and formatting.'],['04','Understand','Receive a 0–100 score, risk verdict, and the indicators that triggered it.']].map(([n,t,c],i) => (
                <article key={n} className="relative bg-foreground p-6 sm:p-8"><div className="flex items-center justify-between"><span className="font-mono text-sm text-brand-lime">{n}</span>{i<3&&<ChevronRight className="hidden size-4 text-dark-muted md:block" />}</div><h3 className="mt-12 font-display text-xl font-bold text-background">{t}</h3><p className="mt-3 text-sm leading-6 text-dark-muted">{c}</p></article>
              ))}
            </div>
          </div>
        </section>

        <section id="features" className="section-space page-container scroll-mt-18">
          <div className="mb-12 flex flex-col justify-between gap-6 lg:flex-row lg:items-end"><div className="max-w-2xl"><div className="section-kicker">Core capabilities</div><h2 className="section-title">Every signal has a reason.</h2></div><p className="max-w-md text-sm leading-6 text-muted-foreground">Scamlex does not hide behind a vague safety label. It returns the patterns that informed each verdict.</p></div>
          <div className="grid gap-px overflow-hidden rounded-md border border-border bg-border md:grid-cols-2 lg:grid-cols-3">
            {features.map(({icon:Icon,title,copy}, i)=><article key={title} className="feature-card bg-background p-6 sm:p-8"><div className="flex items-start justify-between"><span className="icon-box"><Icon /></span><span className="font-mono text-[11px] text-muted-foreground">0{i+1}</span></div><h3 className="mt-10 font-display text-lg font-bold">{title}</h3><p className="mt-2 text-sm leading-6 text-muted-foreground">{copy}</p></article>)}
          </div>
        </section>

        <section id="scanner" className="section-space bg-secondary scroll-mt-18">
          <div className="page-container grid items-center gap-12 lg:grid-cols-[0.75fr_1.25fr] lg:gap-20">
            <div><div className="section-kicker">Product demonstration</div><h2 className="section-title">Check before you click.</h2><p className="mt-5 max-w-md leading-7 text-muted-foreground">Try the interface with a suspicious message or URL. This frontend demo illustrates the documented output and is ready to connect to Scamlex’s <span className="font-mono text-xs text-foreground">POST /scan</span> API.</p><div className="mt-7 rounded-md border border-border bg-background p-4 text-xs leading-5 text-muted-foreground"><strong className="text-foreground">Risk bands:</strong> 0–20 low · 21–69 medium · 70–100 high</div></div>
            <ScannerDemo />
          </div>
        </section>

        <section id="security" className="section-space page-container scroll-mt-18">
          <div className="grid items-center gap-14 lg:grid-cols-2 lg:gap-24">
            <div className="tech-panel">
              <div className="flex items-center justify-between border-b border-dark-border px-5 py-4"><span className="font-mono text-xs text-brand-lime">SYSTEM / ARCHITECTURE</span><Braces className="size-4 text-dark-muted" /></div>
              <div className="space-y-3 p-5 sm:p-7">
                {[['CLIENT','Streamlit dashboard + Chrome extension'],['API','FastAPI · Pydantic · async handlers'],['ENGINE','URL + linguistic heuristic rules'],['STORE','SQLite · SQLAlchemy · content hash cache']].map(([k,v])=><div key={k} className="grid gap-1 border-b border-dark-border py-4 last:border-0 sm:grid-cols-[100px_1fr]"><span className="font-mono text-xs text-brand-lime">{k}</span><span className="text-sm text-background">{v}</span></div>)}
              </div>
            </div>
            <div><div className="section-kicker">Security & technology</div><h2 className="section-title">Transparent by design. Honest by default.</h2><p className="mt-5 leading-7 text-muted-foreground">Scamlex uses predefined heuristic rules rather than opaque promises. The backend centralizes analysis while lightweight clients deliver results to the dashboard and Chromium extension.</p><div className="mt-8 space-y-5">{['Validated request schemas through Pydantic','Specific triggered indicators returned with every verdict','Content-hash caching reduces duplicate analysis','Known limitation: novel attacks may evade predefined rules'].map((x)=><div key={x} className="flex gap-3 text-sm"><ShieldCheck className="mt-0.5 size-4 shrink-0 text-primary"/><span>{x}</span></div>)}</div></div>
          </div>
        </section>

        <section className="cta-section">
          <div className="page-container py-16 sm:py-20"><p className="font-mono text-xs font-bold uppercase text-primary-foreground/70">One pause can prevent one costly mistake.</p><h2 className="mt-5 max-w-3xl font-display text-4xl font-bold leading-tight text-primary-foreground sm:text-5xl">Don’t let a suspicious link make the decision for you.</h2><div className="mt-8"><Button asChild size="lg" variant="secondary" className="h-12 px-6"><a href="#scanner">Analyze with Scamlex <ArrowRight /></a></Button></div></div>
        </section>
      </main>

      <footer className="bg-foreground text-background">
        <div className="page-container grid gap-12 py-14 md:grid-cols-[1.4fr_1fr_1fr]">
          <div><ScamlexBrand inverted /><p className="mt-5 max-w-sm text-sm leading-6 text-dark-muted">Explainable scam detection for suspicious messages, links, and web content.</p></div>
          <div><p className="footer-heading">Product</p><div className="footer-links"><a href="#features">Features</a><a href="#how-it-works">How it works</a><a href="#scanner">Scanner</a></div></div>
          <div><p className="footer-heading">Technology</p><div className="footer-links"><a href="#security">Architecture</a><span>Chromium extension</span><span>REST API</span></div></div>
        </div>
        <div className="page-container flex flex-col gap-3 border-t border-dark-border py-6 text-xs text-dark-muted sm:flex-row sm:items-center sm:justify-between"><span>© 2026 Scamlex. All rights reserved.</span><span>Built for safer digital decisions.</span></div>
      </footer>
    </div>
  );
}
