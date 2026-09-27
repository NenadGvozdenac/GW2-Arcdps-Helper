import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { Link } from "react-router-dom";
import {
  ArrowRightIcon,
  BellIcon,
  ChevronDownIcon,
  CircleDotIcon,
  ClipboardPasteIcon,
  CloudUploadIcon,
  DownloadIcon,
  FileChartColumnIcon,
  FolderOpenIcon,
  Gamepad2Icon,
  HistoryIcon,
  KeyRoundIcon,
  LayersIcon,
  LayoutDashboardIcon,
  MousePointerClickIcon,
  RadioIcon,
  RefreshCwIcon,
  SparklesIcon,
  SwordsIcon,
  TimerIcon,
  TrophyIcon,
  UsersIcon,
  type LucideIcon,
} from "lucide-react";
import { ADDON_DOWNLOAD_URL, SOURCE_URL, UPLOADER_DOWNLOAD_URL } from "../../config/constants";
import { useI18n } from "../../controllers/I18nController";
import { ENCOUNTERS } from "../../domain/data/encounters";
import { downloadService } from "../../services/downloadService";
import { encounterService } from "../../services/encounterService";
import type { Downloads } from "../../domain/types/release.types";
import type { TranslationKey } from "../../i18n/i18n.types";
import { Button } from "@/presentation/components/ui/button";
import { cn } from "@/presentation/lib/utils";
import Brand from "../components/Brand";
import LanguageSwitcher from "../components/LanguageSwitcher";
import AddonPreview from "../components/landing/AddonPreview";
import DashboardPreview from "../components/landing/DashboardPreview";
import UploaderPreview from "../components/landing/UploaderPreview";

const STEPS: { icon: LucideIcon; title: TranslationKey; body: TranslationKey }[] = [
  { icon: SwordsIcon, title: "landing.how.step1Title", body: "landing.how.step1Body" },
  { icon: CloudUploadIcon, title: "landing.how.step2Title", body: "landing.how.step2Body" },
  { icon: FileChartColumnIcon, title: "landing.how.step3Title", body: "landing.how.step3Body" },
  { icon: LayoutDashboardIcon, title: "landing.how.step4Title", body: "landing.how.step4Body" },
];

const FEATURES: { icon: LucideIcon; title: TranslationKey; body: TranslationKey; wide?: boolean }[] = [
  { icon: TrophyIcon, title: "landing.features.clearsTitle", body: "landing.features.clearsBody", wide: true },
  { icon: LayersIcon, title: "landing.features.catalogueTitle", body: "landing.features.catalogueBody" },
  { icon: SparklesIcon, title: "landing.features.cmTitle", body: "landing.features.cmBody" },
  { icon: TimerIcon, title: "landing.features.recordsTitle", body: "landing.features.recordsBody" },
  { icon: UsersIcon, title: "landing.features.squadTitle", body: "landing.features.squadBody", wide: true },
  { icon: HistoryIcon, title: "landing.features.historyTitle", body: "landing.features.historyBody" },
  { icon: RadioIcon, title: "landing.features.liveTitle", body: "landing.features.liveBody", wide: true },
  { icon: ClipboardPasteIcon, title: "landing.features.pasteTitle", body: "landing.features.pasteBody", wide: true },
];

const UPLOADER_POINTS: { icon: LucideIcon; text: TranslationKey }[] = [
  { icon: FolderOpenIcon, text: "landing.uploader.point1" },
  { icon: KeyRoundIcon, text: "landing.uploader.point2" },
  { icon: BellIcon, text: "landing.uploader.point3" },
  { icon: RadioIcon, text: "landing.uploader.point4" },
];

const ADDON_POINTS: { icon: LucideIcon; text: TranslationKey }[] = [
  { icon: CircleDotIcon, text: "landing.addon.point1" },
  { icon: CloudUploadIcon, text: "landing.addon.point2" },
  { icon: MousePointerClickIcon, text: "landing.addon.point3" },
  { icon: RefreshCwIcon, text: "landing.addon.point4" },
];

const FAQ: { q: TranslationKey; a: TranslationKey }[] = [
  { q: "landing.faq.q1", a: "landing.faq.a1" },
  { q: "landing.faq.q2", a: "landing.faq.a2" },
  { q: "landing.faq.q3", a: "landing.faq.a3" },
  { q: "landing.faq.q4", a: "landing.faq.a4" },
];

function useLandingController() {
  // The links are fixed (always the newest file). GitHub's API only adds the version number next to them, when it
  // answers (it is rate-limited per visitor).
  const [downloads, setDownloads] = useState<Downloads>({ uploader: null, addon: null });
  useEffect(() => {
    let cancelled = false;
    downloadService.latest().then((d) => !cancelled && setDownloads(d));
    return () => {
      cancelled = true;
    };
  }, []);

  return {
    uploaderUrl: UPLOADER_DOWNLOAD_URL,
    uploaderVersion: downloads.uploader?.version ?? null,
    addonUrl: ADDON_DOWNLOAD_URL,
    addonVersion: downloads.addon?.version ?? null,
    stats: [
      { value: encounterService.groupsFor("raid").length, label: "landing.hero.stat1" as TranslationKey },
      { value: encounterService.groupsFor("fractal").length, label: "landing.hero.stat2" as TranslationKey },
      { value: encounterService.groupsFor("strike").length, label: "landing.hero.stat3" as TranslationKey },
      { value: ENCOUNTERS.length, label: "landing.hero.stat4" as TranslationKey },
    ],
  };
}

/** Fades its children in the first time they scroll into view. */
function Reveal({ children, delay = 0, className }: { children: ReactNode; delay?: number; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        el.classList.add("is-visible");
        observer.disconnect();
      },
      { threshold: 0.15 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);
  return (
    <div ref={ref} className={cn("reveal", className)} style={{ "--reveal-delay": `${delay}ms` } as CSSProperties}>
      {children}
    </div>
  );
}

function SectionHeading({ eyebrow, title, subtitle }: { eyebrow: string; title: string; subtitle?: string }) {
  return (
    <Reveal className="mx-auto mb-12 max-w-2xl text-center">
      <p className="mb-3 text-xs font-semibold tracking-[0.2em] text-[var(--brand)] uppercase">{eyebrow}</p>
      <h2 className="text-3xl font-semibold tracking-tight text-balance sm:text-4xl">{title}</h2>
      {subtitle && <p className="mt-4 text-muted-foreground text-pretty">{subtitle}</p>}
    </Reveal>
  );
}

function GithubMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path d="M12 .5a11.5 11.5 0 0 0-3.64 22.41c.58.1.79-.25.79-.56v-2c-3.2.7-3.88-1.37-3.88-1.37-.52-1.33-1.28-1.69-1.28-1.69-1.05-.72.08-.7.08-.7 1.16.08 1.77 1.19 1.77 1.19 1.03 1.77 2.7 1.26 3.36.96.1-.75.4-1.26.73-1.55-2.55-.29-5.24-1.28-5.24-5.69 0-1.26.45-2.28 1.19-3.09-.12-.29-.52-1.46.11-3.05 0 0 .97-.31 3.17 1.18a11 11 0 0 1 5.77 0c2.2-1.49 3.17-1.18 3.17-1.18.63 1.59.23 2.76.11 3.05.74.81 1.19 1.83 1.19 3.09 0 4.42-2.7 5.39-5.26 5.68.41.36.78 1.06.78 2.14v3.17c0 .31.21.67.8.56A11.5 11.5 0 0 0 12 .5Z" />
    </svg>
  );
}

export default function LandingPage() {
  const { stats, uploaderUrl, uploaderVersion, addonUrl, addonVersion } = useLandingController();
  const { t } = useI18n();

  return (
    <div className="landing relative min-h-svh overflow-x-clip">
      {/* ---------- Nav ---------- */}
      <header className="sticky top-0 z-30 border-b border-transparent bg-background/80 backdrop-blur-lg">
        <div className="mx-auto flex max-w-6xl items-center gap-6 px-4 py-3">
          <Link to="/">
            <Brand />
          </Link>
          <nav className="hidden flex-1 justify-center gap-1 md:flex">
            {(
              [
                ["#how", "landing.nav.howItWorks"],
                ["#features", "landing.nav.features"],
                ["#uploader", "landing.nav.uploader"],
                ["#addon", "landing.nav.addon"],
              ] as const
            ).map(([href, label]) => (
              <a
                key={href}
                href={href}
                className="rounded-md px-3 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
              >
                {t(label)}
              </a>
            ))}
          </nav>
          <div className="ml-auto flex items-center gap-2">
            <LanguageSwitcher />
            <Button asChild variant="ghost" size="sm" className="hidden sm:inline-flex">
              <Link to="/login">{t("landing.nav.signIn")}</Link>
            </Button>
            <Button asChild size="sm">
              <Link to="/register">{t("landing.nav.getStarted")}</Link>
            </Button>
          </div>
        </div>
      </header>

      {/* ---------- Hero ---------- */}
      <section className="relative">
        {/* No glow here: under the translucent sticky header it showed up as a flickering purple band. */}
        <div className="landing-grid pointer-events-none absolute inset-0" />
        <div className="relative mx-auto grid max-w-6xl grid-cols-1 items-center gap-16 px-4 pt-16 pb-24 lg:grid-cols-[1.05fr_1fr] lg:pt-24 lg:pb-32">
          <div>
            <Reveal>
              <p className="mb-6 inline-flex items-center gap-2 rounded-full border bg-card/60 px-3 py-1 text-xs font-medium text-muted-foreground backdrop-blur">
                <span className="size-1.5 rounded-full bg-[var(--brand)]" />
                {t("landing.hero.eyebrow")}
              </p>
            </Reveal>
            <Reveal delay={80}>
              <h1 className="text-4xl leading-[1.05] font-semibold tracking-tight text-balance sm:text-5xl lg:text-6xl">
                {t("landing.hero.titleBefore")}{" "}
                <span className="landing-gradient-text">{t("landing.hero.titleHighlight")}</span>
              </h1>
            </Reveal>
            <Reveal delay={160}>
              <p className="mt-6 max-w-xl text-lg text-muted-foreground text-pretty">{t("landing.hero.subtitle")}</p>
            </Reveal>
            <Reveal delay={240} className="mt-8 flex flex-wrap gap-3">
              <Button asChild size="lg" className="shadow-lg shadow-[var(--brand)]/20">
                <Link to="/register">
                  {t("landing.hero.primary")} <ArrowRightIcon />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <a href="#how">{t("landing.hero.secondary")}</a>
              </Button>
            </Reveal>
            <Reveal delay={280} className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-muted-foreground">
              <span>{t("landing.hero.download")}</span>
              <a href={uploaderUrl} className="inline-flex items-center gap-1.5 font-medium text-foreground hover:text-[var(--brand)]">
                <DownloadIcon className="size-4" /> {t("landing.hero.downloadUploader")}
              </a>
              <a href={addonUrl} className="inline-flex items-center gap-1.5 font-medium text-foreground hover:text-[var(--brand)]">
                <Gamepad2Icon className="size-4" /> {t("landing.hero.downloadAddon")}
              </a>
            </Reveal>
            <Reveal delay={320}>
              <dl className="mt-12 grid max-w-lg grid-cols-4 gap-4 border-t pt-6">
                {stats.map((s) => (
                  <div key={s.label}>
                    <dt className="sr-only">{t(s.label)}</dt>
                    <dd className="text-2xl font-semibold tabular-nums">{s.value}</dd>
                    <dd className="text-xs text-muted-foreground">{t(s.label)}</dd>
                  </div>
                ))}
              </dl>
            </Reveal>
          </div>
          <Reveal delay={200}>
            <DashboardPreview />
          </Reveal>
        </div>
      </section>

      {/* ---------- How it works ---------- */}
      <section id="how" className="relative scroll-mt-20 border-t bg-card/20 py-24">
        <div className="mx-auto max-w-6xl px-4">
          <SectionHeading
            eyebrow={t("landing.how.eyebrow")}
            title={t("landing.how.title")}
            subtitle={t("landing.how.subtitle")}
          />
          <ol className="relative grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            {/* Animated connector behind the step icons (desktop). */}
            <div className="landing-flow pointer-events-none absolute top-7 right-[12.5%] left-[12.5%] hidden h-0.5 opacity-60 lg:block" />
            {STEPS.map((s, i) => (
              <li key={s.title}>
                <Reveal delay={i * 120} className="relative flex h-full flex-col items-center text-center">
                  <span className="landing-border relative z-10 mb-5 grid size-14 place-items-center rounded-2xl bg-card shadow-lg shadow-black/30">
                    <s.icon className="size-6 text-[var(--brand)]" />
                    <span className="absolute -top-2 -right-2 grid size-6 place-items-center rounded-full bg-foreground text-[11px] font-bold text-background">
                      {i + 1}
                    </span>
                  </span>
                  <h3 className="mb-2 font-semibold">{t(s.title)}</h3>
                  <p className="text-sm text-muted-foreground text-pretty">{t(s.body)}</p>
                </Reveal>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* ---------- Features ---------- */}
      <section id="features" className="scroll-mt-20 py-24">
        <div className="mx-auto max-w-6xl px-4">
          <SectionHeading eyebrow={t("landing.features.eyebrow")} title={t("landing.features.title")} />
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {FEATURES.map((f, i) => (
              <Reveal key={f.title} delay={(i % 4) * 90} className={cn(f.wide && "lg:col-span-2")}>
                <div className="group relative h-full overflow-hidden rounded-2xl border bg-card/60 p-6 transition-colors hover:border-[var(--brand)]/40">
                  <div className="pointer-events-none absolute -top-20 -right-20 size-40 rounded-full bg-[var(--brand)]/0 blur-3xl transition-colors duration-500 group-hover:bg-[var(--brand)]/20" />
                  <span className="mb-4 grid size-10 place-items-center rounded-xl bg-[var(--brand)]/10 text-[var(--brand)]">
                    <f.icon className="size-5" />
                  </span>
                  <h3 className="mb-2 font-semibold">{t(f.title)}</h3>
                  <p className="text-sm text-muted-foreground text-pretty">{t(f.body)}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ---------- Uploader ---------- */}
      <section id="uploader" className="relative scroll-mt-20 overflow-hidden border-y bg-card/20 py-24">
        <div className="landing-glow pointer-events-none absolute -right-40 top-10 h-96 w-[40rem] opacity-60" />
        <div className="relative mx-auto grid max-w-6xl grid-cols-1 items-center gap-14 px-4 lg:grid-cols-2">
          <Reveal>
            <p className="mb-3 text-xs font-semibold tracking-[0.2em] text-[var(--brand)] uppercase">
              {t("landing.uploader.eyebrow")}
            </p>
            <h2 className="text-3xl font-semibold tracking-tight text-balance sm:text-4xl">
              {t("landing.uploader.title")}
            </h2>
            <p className="mt-4 text-muted-foreground text-pretty">{t("landing.uploader.body")}</p>
            <ul className="mt-8 space-y-3">
              {UPLOADER_POINTS.map((p) => (
                <li key={p.text} className="flex items-start gap-3 text-sm">
                  <span className="mt-0.5 grid size-6 shrink-0 place-items-center rounded-md bg-[var(--brand)]/10 text-[var(--brand)]">
                    <p.icon className="size-3.5" />
                  </span>
                  {t(p.text)}
                </li>
              ))}
            </ul>
            <div className="mt-8 flex flex-wrap items-center gap-4">
              <Button asChild size="lg">
                <a href={uploaderUrl}>
                  <DownloadIcon /> {t("landing.uploader.download")}
                </a>
              </Button>
              <span className="text-xs text-muted-foreground">
                {uploaderVersion && `v${uploaderVersion} · `}
                {t("landing.uploader.downloadHint")}
              </span>
            </div>
            <p className="mt-6 text-sm text-muted-foreground">
              {t("landing.uploader.addonTeaser")}{" "}
              <a href="#addon" className="inline-flex items-center gap-1 font-medium text-foreground hover:text-[var(--brand)]">
                <Gamepad2Icon className="size-4" /> {t("landing.uploader.addonLink")}
              </a>
            </p>
          </Reveal>
          <Reveal delay={150}>
            <UploaderPreview />
          </Reveal>
        </div>
      </section>

      {/* ---------- Nexus addon ---------- */}
      <section id="addon" className="relative scroll-mt-20 overflow-hidden border-b py-24">
        <div className="relative mx-auto grid max-w-6xl grid-cols-1 items-center gap-14 px-4 lg:grid-cols-2">
          <Reveal delay={150} className="order-last lg:order-first">
            <AddonPreview />
          </Reveal>
          <Reveal>
            <p className="mb-3 text-xs font-semibold tracking-[0.2em] text-[var(--brand)] uppercase">
              {t("landing.addon.eyebrow")}
            </p>
            <h2 className="text-3xl font-semibold tracking-tight text-balance sm:text-4xl">{t("landing.addon.title")}</h2>
            <p className="mt-4 text-muted-foreground text-pretty">{t("landing.addon.body")}</p>
            <ul className="mt-8 space-y-3">
              {ADDON_POINTS.map((p) => (
                <li key={p.text} className="flex items-start gap-3 text-sm">
                  <span className="mt-0.5 grid size-6 shrink-0 place-items-center rounded-md bg-[var(--brand)]/10 text-[var(--brand)]">
                    <p.icon className="size-3.5" />
                  </span>
                  {t(p.text)}
                </li>
              ))}
            </ul>
            <div className="mt-8 flex flex-wrap items-center gap-4">
              <Button asChild size="lg">
                <a href={addonUrl}>
                  <DownloadIcon /> {t("landing.addon.download")}
                </a>
              </Button>
              <span className="text-xs text-muted-foreground">
                {addonVersion && `v${addonVersion} · `}
                {t("landing.addon.downloadHint")}
              </span>
            </div>
            <p className="mt-6 text-sm text-muted-foreground text-pretty">{t("landing.addon.installHint")}</p>
          </Reveal>
        </div>
      </section>

      {/* ---------- FAQ ---------- */}
      <section className="py-24">
        <div className="mx-auto max-w-3xl px-4">
          <Reveal>
            <h2 className="mb-8 text-center text-3xl font-semibold tracking-tight">{t("landing.faq.title")}</h2>
          </Reveal>
          <div className="space-y-3">
            {FAQ.map((f, i) => (
              <Reveal key={f.q} delay={i * 70}>
                <details className="group rounded-xl border bg-card/60 px-5 py-4 open:border-[var(--brand)]/40">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-medium [&::-webkit-details-marker]:hidden">
                    {t(f.q)}
                    <ChevronDownIcon className="size-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-180" />
                  </summary>
                  <p className="mt-3 text-sm text-muted-foreground text-pretty">{t(f.a)}</p>
                </details>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ---------- Final CTA ---------- */}
      <section className="px-4 pb-24">
        <Reveal className="mx-auto max-w-5xl">
          <div className="landing-border relative overflow-hidden rounded-3xl bg-card px-6 py-16 text-center sm:px-12">
            <div className="landing-glow pointer-events-none absolute inset-0 opacity-70" />
            <div className="relative">
              <h2 className="text-3xl font-semibold tracking-tight text-balance sm:text-4xl">
                {t("landing.cta.title")}
              </h2>
              <p className="mx-auto mt-4 max-w-xl text-muted-foreground text-pretty">{t("landing.cta.body")}</p>
              <div className="mt-8 flex flex-wrap justify-center gap-3">
                <Button asChild size="lg">
                  <Link to="/register">
                    {t("landing.cta.primary")} <ArrowRightIcon />
                  </Link>
                </Button>
                <Button asChild size="lg" variant="outline">
                  <Link to="/login">{t("landing.cta.secondary")}</Link>
                </Button>
              </div>
            </div>
          </div>
        </Reveal>
      </section>

      {/* ---------- Footer ---------- */}
      <footer className="border-t">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-8 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
          <p className="max-w-2xl">{t("landing.footer.disclaimer")}</p>
          <a
            href={SOURCE_URL}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 hover:text-foreground"
          >
            <GithubMark className="size-4" /> {t("landing.footer.source")}
          </a>
        </div>
      </footer>
    </div>
  );
}
