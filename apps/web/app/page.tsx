import { Bug, CirclePlay, Code2, Highlighter, MousePointerClick, ShieldCheck } from "lucide-react";
import Link from "next/link";

export default function MarketingHomePage() {
  return (
    <main className="min-h-screen bg-background text-on-surface">
      <MarketingNav />
      <HeroSection />
      <FeatureStrip />
      <MarketingFooter />
    </main>
  );
}

function MarketingNav() {
  return (
    <nav className="sticky top-0 z-50 w-full border-b-4 border-on-surface bg-background shadow-[8px_8px_0px_0px_rgba(18,28,43,1)]">
      <div className="mx-auto flex max-w-container-max items-center justify-between gap-4 px-margin-md py-4">
        <Link className="font-display-lg text-display-lg italic tracking-normal text-primary" href="/">
          Snapbug
        </Link>
        <div className="hidden items-center gap-gutter md:flex">
          <a className="wobbly-border-1 px-2 py-1 font-headline-md text-headline-md text-on-surface transition-transform duration-150 hover:rotate-2 hover:scale-105 hover:bg-secondary-container" href="#features">
            Features
          </a>
          <a className="wobbly-border-2 px-2 py-1 font-headline-md text-headline-md text-on-surface transition-transform duration-150 hover:-rotate-2 hover:scale-105 hover:bg-tertiary-container" href="#workflow">
            How it works
          </a>
          <a className="wobbly-border-1 px-2 py-1 font-headline-md text-headline-md text-on-surface transition-transform duration-150 hover:rotate-2 hover:scale-105 hover:bg-primary-container" href="#sdk">
            SDK
          </a>
        </div>
        <div className="hidden items-center gap-4 md:flex">
          <Link className="px-4 py-2 font-label-md text-label-md text-on-surface hover:underline hover:decoration-secondary hover:decoration-wavy" href="/login">
            Log in
          </Link>
          <Link className="wobbly-border-1 bg-primary-container px-6 py-3 font-label-md text-label-md font-bold uppercase text-on-primary-container neo-brutalism-border neo-brutalism-shadow neo-brutalism-button hover:rotate-2" href="/login">
            Get Started
          </Link>
        </div>
        <Link className="font-label-md text-label-md md:hidden" href="/login">
          Menu
        </Link>
      </div>
    </nav>
  );
}

function HeroSection() {
  return (
    <section className="relative mx-auto max-w-container-max overflow-hidden px-margin-md py-margin-lg">
      <div className="pointer-events-none absolute right-10 top-10 hidden -rotate-12 opacity-20 lg:block">
        <svg fill="none" height="200" viewBox="0 0 100 100" width="200" xmlns="http://www.w3.org/2000/svg">
          <path d="M10 50 Q 30 10, 50 50 T 90 50" fill="transparent" stroke="#a900a9" strokeWidth="4" />
        </svg>
      </div>
      <div className="pointer-events-none absolute bottom-10 left-10 hidden rotate-12 opacity-20 lg:block">
        <svg fill="none" height="150" viewBox="0 0 100 100" width="150" xmlns="http://www.w3.org/2000/svg">
          <circle cx="50" cy="50" fill="transparent" r="40" stroke="#006e15" strokeDasharray="10 5" strokeWidth="4" />
        </svg>
      </div>

      <div className="grid min-h-[calc(100vh-116px)] grid-cols-1 items-center gap-gutter lg:grid-cols-2">
        <div className="z-10 space-y-8">
          <div className="inline-flex rotate-[-1deg] items-center gap-2 bg-tertiary-container px-3 py-2 font-label-md text-label-md text-on-tertiary-container neo-brutalism-border-sm">
            <Highlighter size={18} />
            Screen annotation for real bugs
          </div>
          <h1 className="font-display-lg text-[48px] font-extrabold leading-[1.05] tracking-normal text-on-surface md:text-6xl lg:text-7xl">
            Fix Bugs Faster with a <span className="marker-bg-primary text-primary">Stroke</span> of Genius
          </h1>
          <p className="wobbly-border-2 max-w-xl -rotate-1 border-l-4 border-secondary bg-surface-container p-4 font-body-lg text-body-lg text-on-surface-variant neo-brutalism-border neo-brutalism-shadow-lg">
            Stop wrestling with confusing bug reports. Draw directly on the screen, collect screenshots, console logs, and environment-specific reports from one tiny SDK.
          </p>
          <div className="flex flex-col gap-4 pt-4 sm:flex-row">
            <Link className="wobbly-border-1 bg-primary-container px-8 py-4 text-center font-headline-md text-headline-md text-on-primary-container neo-brutalism-border neo-brutalism-shadow-lg neo-brutalism-button hover:rotate-2 hover:bg-primary hover:text-on-primary" href="/login">
              Get Started - It&apos;s Free
            </Link>
            <a className="wobbly-border-2 flex items-center justify-center gap-2 bg-surface px-8 py-4 font-label-md text-label-md text-on-surface neo-brutalism-border neo-brutalism-shadow-lg neo-brutalism-button hover:-rotate-2 hover:bg-secondary-container hover:text-on-secondary-container" href="#workflow">
              <CirclePlay size={22} />
              See How It Works
            </a>
          </div>
        </div>

        <div className="relative z-10 mt-8 lg:mt-0">
          <div className="wobbly-border-1 rotate-2 bg-surface-container-lowest p-4 neo-brutalism-border neo-brutalism-shadow-lg">
            <div className="relative h-80 overflow-hidden border-2 border-dashed border-outline-variant bg-surface-container-low p-4">
              <div className="mb-4 flex h-8 w-full items-center gap-2 bg-surface-container-highest px-2">
                <div className="h-3 w-3 rounded-full bg-error" />
                <div className="h-3 w-3 rounded-full bg-surface-tint" />
                <div className="h-3 w-3 rounded-full bg-primary" />
              </div>
              <div className="mb-4 h-12 w-3/4 bg-surface-container-highest" />
              <div className="flex h-32 w-full gap-4 bg-surface-container-highest p-2">
                <div className="h-full w-1/3 bg-surface-container" />
                <div className="h-full w-1/3 bg-surface-container" />
                <div className="relative h-full w-1/3 border-4 border-dashed border-error bg-surface-container">
                  <div className="absolute -right-6 -top-6 rotate-12 bg-error-container p-1 font-label-md text-label-md text-error neo-brutalism-border-sm">
                    Button broken!
                  </div>
                  <svg className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 overflow-visible" height="50" width="50">
                    <path d="M10,10 Q40,50 90,10" fill="none" stroke="#ba1a1a" strokeLinecap="round" strokeWidth="4" />
                    <polygon fill="#ba1a1a" points="85,5 95,15 90,10" />
                  </svg>
                </div>
              </div>
              <div className="absolute bottom-7 left-8 flex items-center gap-2 bg-secondary-fixed px-3 py-2 text-on-secondary-fixed neo-brutalism-border-sm">
                <MousePointerClick size={18} />
                click captures context
              </div>
              <svg className="pointer-events-none absolute inset-0 opacity-70" height="100%" width="100%">
                <path d="M 20 200 Q 150 150 250 250 T 400 200" fill="none" stroke="#a900a9" strokeDasharray="5 5" strokeWidth="3" />
              </svg>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function FeatureStrip() {
  const features = [
    {
      icon: Bug,
      title: "Dev and production lanes",
      body: "Keep TODOs and annotated dev bugs separate from production issue reports."
    },
    {
      icon: ShieldCheck,
      title: "Origin-locked keys",
      body: "Project keys and allowed origins stay isolated by environment."
    },
    {
      icon: Code2,
      title: "Tiny SDK surface",
      body: "Use a floating widget in dev or open Snapbug from your own button in production."
    }
  ];

  return (
    <section id="features" className="mx-auto -mt-2 max-w-container-max px-margin-md pb-margin-lg">
      <div className="grid grid-cols-1 gap-gutter md:grid-cols-3">
        {features.map((feature, index) => {
          const Icon = feature.icon;
          return (
            <article
              className={`bg-surface-container-lowest p-5 neo-brutalism-border neo-brutalism-shadow ${index === 1 ? "wobbly-border-2 md:translate-y-4" : "wobbly-border-1"}`}
              id={index === 1 ? "workflow" : index === 2 ? "sdk" : undefined}
              key={feature.title}
            >
              <Icon className="mb-4 text-secondary" size={32} />
              <h2 className="marker-bg-primary mb-3 inline-block font-headline-md text-headline-md">{feature.title}</h2>
              <p className="font-body-md text-body-md text-on-surface-variant">{feature.body}</p>
            </article>
          );
        })}
      </div>
    </section>
  );
}

function MarketingFooter() {
  return (
    <footer className="mt-margin-lg w-full border-t-4 border-dashed border-on-surface bg-surface-container-highest">
      <div className="mx-auto flex max-w-container-max flex-col items-center justify-between gap-8 px-margin-md py-margin-md md:flex-row">
        <div className="flex flex-col items-center md:items-start">
          <span className="marker-bg-primary mb-2 font-headline-md text-headline-md text-primary">Snapbug</span>
          <p className="font-label-md text-label-md text-on-surface">Dual-mode bug reports for teams that ship fast.</p>
        </div>
        <div className="flex flex-wrap justify-center gap-6">
          <a className="font-label-md text-label-md text-on-surface-variant transition-all hover:skew-x-2 hover:text-primary hover:underline hover:decoration-tertiary hover:decoration-wavy" href="#features">
            Features
          </a>
          <a className="font-label-md text-label-md text-on-surface-variant transition-all hover:skew-x-2 hover:text-primary hover:underline hover:decoration-tertiary hover:decoration-wavy" href="#workflow">
            Workflow
          </a>
          <Link className="font-label-md text-label-md text-on-surface-variant transition-all hover:skew-x-2 hover:text-primary hover:underline hover:decoration-tertiary hover:decoration-wavy" href="/login">
            Login
          </Link>
        </div>
      </div>
    </footer>
  );
}
