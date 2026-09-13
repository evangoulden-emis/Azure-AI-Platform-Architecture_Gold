import { type ReactNode, useState } from 'react';
import { QueryClient, QueryClientProvider, useQueryClient } from '@tanstack/react-query';
import {
  Activity,
  ArrowRight,
  BookOpen,
  Check,
  CheckCircle2,
  ChevronDown,
  CircleAlert,
  ClipboardCheck,
  Clock3,
  Compass,
  ExternalLink,
  Eye,
  FileCheck2,
  GitBranch,
  Layers3,
  LockKeyhole,
  Menu,
  Network,
  RefreshCw,
  ShieldCheck,
  Target,
  X,
  XCircle,
  Zap,
} from 'lucide-react';
import {
  ArchitectureDecisionUpdateStatus,
  getGetPlatformOverviewQueryKey,
  getListArchitectureDecisionsQueryKey,
  getListPlatformCapabilitiesQueryKey,
  getListPlatformControlsQueryKey,
  getListPlatformRoadmapQueryKey,
  useGetPlatformOverview,
  useListArchitectureDecisions,
  useListPlatformCapabilities,
  useListPlatformControls,
  useListPlatformRoadmap,
  useUpdateArchitectureDecision,
} from '@workspace/api-client-react';
import type {
  ArchitectureDecision,
  PlatformCapability,
  PlatformControl,
  RoadmapItem,
} from '@workspace/api-client-react';
import { ErrorBoundary } from '@/components/error-boundary';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import NotFound from '@/pages/not-found';
import { Link, useLocation, Router as WouterRouter } from 'wouter';

const queryClient = new QueryClient();

type IconType = typeof Activity;

const navigation = [
  { href: '/', label: 'Overview', icon: Compass },
  { href: '/architecture', label: 'Architecture', icon: Layers3 },
  { href: '/controls', label: 'Controls', icon: ShieldCheck },
  { href: '/roadmap', label: 'Roadmap', icon: GitBranch },
  { href: '/decisions', label: 'Decisions', icon: BookOpen },
];

const statusTone: Record<string, { label: string; className: string; icon: IconType }> = {
  Ready: { label: 'Ready', className: 'bg-[#e0f3ee] text-[#176557]', icon: CheckCircle2 },
  'In progress': { label: 'In progress', className: 'bg-[#fff1d7] text-[#8b5d10]', icon: Activity },
  Planned: { label: 'Planned', className: 'bg-[#e8eef7] text-[#49627e]', icon: Clock3 },
  Blocked: { label: 'Blocked', className: 'bg-[#fbe6e3] text-[#a43c32]', icon: XCircle },
  Accepted: { label: 'Accepted', className: 'bg-[#e0f3ee] text-[#176557]', icon: CheckCircle2 },
  Proposed: { label: 'Proposed', className: 'bg-[#e8eef7] text-[#49627e]', icon: Target },
  'Needs review': { label: 'Needs review', className: 'bg-[#fff1d7] text-[#8b5d10]', icon: CircleAlert },
  Compliant: { label: 'Compliant', className: 'bg-[#e0f3ee] text-[#176557]', icon: CheckCircle2 },
  'Needs evidence': { label: 'Needs evidence', className: 'bg-[#fff1d7] text-[#8b5d10]', icon: FileCheck2 },
};

const fallbackTone = { label: 'Tracked', className: 'bg-[#e8eef7] text-[#49627e]', icon: Activity };

function toneFor(status: string) {
  return statusTone[status] ?? { ...fallbackTone, label: status || fallbackTone.label };
}

function StatusPill({ status, className = '' }: { status: string; className?: string }) {
  const tone = toneFor(status);
  const Icon = tone.icon;
  return (
    <span data-testid={`status-${status.toLowerCase().replace(/\s+/g, '-')}`} className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-semibold tracking-wide ${tone.className} ${className}`}>
      <Icon size={12} strokeWidth={2.3} />
      {tone.label}
    </span>
  );
}

function LogoMark() {
  return (
    <div className="relative grid h-9 w-9 place-items-center rounded-xl bg-[#78d2bf] text-[#113d3c] shadow-[0_6px_16px_rgba(120,210,191,.2)]">
      <div className="absolute h-4 w-4 rotate-45 border-2 border-[#113d3c]" />
      <div className="absolute h-1.5 w-1.5 rounded-full bg-[#113d3c]" />
    </div>
  );
}

function Sidebar({ onNavigate }: { onNavigate?: () => void }) {
  const [location] = useLocation();
  return (
    <aside className="fixed inset-y-0 left-0 z-40 hidden min-h-[100dvh] w-[252px] shrink-0 flex-col bg-sidebar text-sidebar-foreground md:flex">
      <div className="flex h-[76px] items-center gap-3 border-b border-sidebar-border px-6">
        <LogoMark />
        <div>
          <div className="text-[14px] font-extrabold tracking-[-.02em] text-white">AI Platform</div>
          <div className="bp-kicker mt-1 text-sidebar-foreground/55">Blueprint cockpit</div>
        </div>
      </div>
      <div className="px-4 pt-7">
        <div className="bp-kicker px-3 text-sidebar-foreground/40">Workspace</div>
        <nav className="mt-3 space-y-1" aria-label="Primary navigation">
          {navigation.map(({ href, label, icon: Icon }) => {
            const active = location === href;
            return (
              <Link key={href} href={href} onClick={onNavigate} data-testid={`link-${label.toLowerCase()}`} className={`group flex items-center gap-3 rounded-lg px-3 py-2.5 text-[13px] font-semibold transition-colors ${active ? 'bg-sidebar-accent text-white' : 'text-sidebar-foreground/65 hover:bg-sidebar-accent/70 hover:text-sidebar-foreground'}`}>
                <Icon size={17} strokeWidth={active ? 2.3 : 1.8} className={active ? 'text-sidebar-primary' : 'text-sidebar-foreground/50 group-hover:text-sidebar-primary'} />
                {label}
                {label === 'Controls' && <span className="ml-auto rounded bg-[#bb9670]/20 px-1.5 py-0.5 font-mono text-[9px] text-[#e8be8c]">4</span>}
              </Link>
            );
          })}
        </nav>
      </div>
      <div className="mt-auto px-4 pb-5">
        <div className="rounded-xl border border-sidebar-border bg-sidebar-accent/55 p-4">
          <div className="flex items-center gap-2 text-[11px] font-semibold text-sidebar-foreground/70"><span className="h-1.5 w-1.5 animate-[blueprint-pulse_2.5s_ease-in-out_infinite] rounded-full bg-sidebar-primary" />Live environment</div>
          <div className="mt-3 flex items-end justify-between">
            <div><div className="bp-mono text-[18px] text-white">westeurope</div><div className="mt-1 text-[10px] text-sidebar-foreground/45">Azure tenant / production</div></div>
            <span className="bp-mono text-[10px] text-sidebar-primary">CONNECTED</span>
          </div>
        </div>
        <div className="mt-5 flex items-center gap-3 border-t border-sidebar-border pt-4">
          <div className="grid h-8 w-8 place-items-center rounded-full bg-[#d9ba93] text-[11px] font-bold text-[#463522]">AL</div>
          <div className="min-w-0"><div className="truncate text-[11px] font-semibold text-white">Avery Lin</div><div className="truncate text-[10px] text-sidebar-foreground/45">Platform engineering</div></div>
          <button type="button" data-testid="button-profile-menu" className="ml-auto text-sidebar-foreground/45 hover:text-white" aria-label="Open profile menu"><ChevronDown size={15} /></button>
        </div>
      </div>
    </aside>
  );
}

function MobileHeader({ onMenu }: { onMenu: () => void }) {
  return (
    <div className="flex h-16 items-center justify-between border-b border-border bg-card px-4 md:hidden">
      <div className="flex items-center gap-2.5"><LogoMark /><span className="text-sm font-extrabold">AI Platform</span></div>
      <button type="button" onClick={onMenu} data-testid="button-open-navigation" className="rounded-lg p-2 text-muted-foreground hover:bg-muted" aria-label="Open navigation"><Menu size={20} /></button>
    </div>
  );
}

function MobileNav({ onClose }: { onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 bg-[#152b35]/50 backdrop-blur-sm md:hidden">
      <div className="h-full w-[286px] bg-sidebar shadow-2xl">
        <div className="flex items-center justify-between border-b border-sidebar-border px-5 py-4"><div className="flex items-center gap-3"><LogoMark /><span className="font-bold text-white">AI Platform</span></div><button onClick={onClose} type="button" data-testid="button-close-navigation" className="text-sidebar-foreground/70" aria-label="Close navigation"><X size={19} /></button></div>
        <div className="p-4"><div className="bp-kicker px-3 text-sidebar-foreground/40">Workspace</div><nav className="mt-3 space-y-1"><Sidebar onNavigate={onClose} /></nav></div>
      </div>
    </div>
  );
}

function AppShell({ children }: { children: ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  return (
    <div className="min-h-[100dvh] bg-background">
      <Sidebar />
      <div className="min-h-[100dvh] md:ml-[252px]">
        <MobileHeader onMenu={() => setMobileOpen(true)} />
        {mobileOpen && <MobileNav onClose={() => setMobileOpen(false)} />}
        <main className="mx-auto max-w-[1480px] px-4 py-5 sm:px-6 md:px-8 md:py-8">{children}</main>
      </div>
    </div>
  );
}

function PageHeader({ eyebrow, title, description, action }: { eyebrow: string; title: string; description: string; action?: React.ReactNode }) {
  return (
    <header className="mb-8 flex flex-col justify-between gap-5 lg:flex-row lg:items-end">
      <div><div className="bp-kicker mb-3 flex items-center gap-2 text-primary"><span className="h-1.5 w-1.5 rounded-full bg-primary" />{eyebrow}</div><h1 className="text-[28px] font-extrabold tracking-[-.045em] text-foreground sm:text-[34px]">{title}</h1><p className="mt-2 max-w-2xl text-[13px] leading-6 text-muted-foreground">{description}</p></div>
      {action}
    </header>
  );
}

function LoadingState({ label = 'Synchronizing platform state' }: { label?: string }) {
  return <div className="space-y-4" data-testid="status-loading"><div className="h-28 animate-pulse rounded-xl bg-muted" /><div className="grid gap-4 md:grid-cols-3"><div className="h-48 animate-pulse rounded-xl bg-muted" /><div className="h-48 animate-pulse rounded-xl bg-muted" /><div className="h-48 animate-pulse rounded-xl bg-muted" /></div><p className="bp-kicker text-center">{label}</p></div>;
}

function ErrorState({ onRetry }: { onRetry: () => void }) {
  return <div className="bp-card flex flex-col items-center justify-center rounded-xl px-6 py-16 text-center" data-testid="status-error"><div className="mb-4 grid h-11 w-11 place-items-center rounded-full bg-[#fbe6e3] text-[#a43c32]"><CircleAlert size={21} /></div><h2 className="text-base font-bold">Platform data is unavailable</h2><p className="mt-2 max-w-sm text-sm leading-6 text-muted-foreground">The blueprint could not reach its source of truth. Try again before making a platform decision.</p><button onClick={onRetry} type="button" data-testid="button-retry" className="mt-5 inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-xs font-bold text-primary-foreground transition hover:brightness-105"><RefreshCw size={14} /> Retry connection</button></div>;
}

function MetricTile({ label, value, detail, icon: Icon, tone = 'teal' }: { label: string; value: string | number; detail: string; icon: IconType; tone?: 'teal' | 'amber' | 'blue' | 'rose' }) {
  const tones = { teal: 'bg-[#e0f3ee] text-[#176557]', amber: 'bg-[#fff1d7] text-[#8b5d10]', blue: 'bg-[#e8eef7] text-[#49627e]', rose: 'bg-[#fbe6e3] text-[#a43c32]' };
  return <div className="bp-card bp-card-hover rounded-xl p-4 sm:p-5" data-testid={`metric-${label.toLowerCase().replace(/\s+/g, '-')}`}><div className="flex items-start justify-between"><div className={`grid h-8 w-8 place-items-center rounded-lg ${tones[tone]}`}><Icon size={16} /></div><span className="bp-mono text-[10px] text-muted-foreground">LIVE</span></div><div className="mt-5 text-[27px] font-extrabold tracking-[-.05em]">{value}</div><div className="mt-1 text-[11px] font-semibold text-foreground/75">{label}</div><div className="mt-2 text-[10px] text-muted-foreground">{detail}</div></div>;
}

function ReadinessRing({ score }: { score: number }) {
  const safeScore = Math.max(0, Math.min(100, score));
  const radius = 42;
  const circumference = 2 * Math.PI * radius;
  return <div className="relative h-32 w-32 shrink-0"><svg className="-rotate-90" viewBox="0 0 100 100"><circle cx="50" cy="50" r={radius} fill="none" stroke="hsl(210 22% 86%)" strokeWidth="7" /><circle cx="50" cy="50" r={radius} fill="none" stroke="hsl(174 45% 40%)" strokeWidth="7" strokeLinecap="round" strokeDasharray={circumference} strokeDashoffset={circumference * (1 - safeScore / 100)} /></svg><div className="absolute inset-0 grid place-items-center text-center"><div><div className="bp-mono text-[24px] font-medium">{safeScore}%</div><div className="text-[9px] uppercase tracking-[.12em] text-muted-foreground">ready</div></div></div></div>;
}

function Overview() {
  const overview = useGetPlatformOverview({ query: { queryKey: getGetPlatformOverviewQueryKey() } });
  const capabilities = useListPlatformCapabilities({ query: { queryKey: getListPlatformCapabilitiesQueryKey() } });
  const controls = useListPlatformControls({ query: { queryKey: getListPlatformControlsQueryKey() } });
  const roadmap = useListPlatformRoadmap({ query: { queryKey: getListPlatformRoadmapQueryKey() } });
  const decisions = useListArchitectureDecisions({ query: { queryKey: getListArchitectureDecisionsQueryKey() } });
  const [location, setLocation] = useLocation();
  if (overview.isLoading || capabilities.isLoading || controls.isLoading || roadmap.isLoading || decisions.isLoading) return <LoadingState />;
  if (overview.isError || capabilities.isError || controls.isError || roadmap.isError || decisions.isError) return <ErrorState onRetry={() => { overview.refetch(); capabilities.refetch(); controls.refetch(); roadmap.refetch(); decisions.refetch(); }} />;
  const data = overview.data;
  const caps = capabilities.data ?? [];
  const controlRows = controls.data ?? [];
  const roadmapRows = roadmap.data ?? [];
  const decisionRows = decisions.data ?? [];
  const activeWork = roadmapRows.filter((item) => item.status === 'In progress' || item.status === 'Blocked').slice(0, 3);
  const readyCaps = caps.filter((item) => item.status === 'Ready').length;
  return (
    <div className="bp-page-in">
      <PageHeader eyebrow="Platform overview" title={data?.platformName ?? 'AI Platform Foundation'} description="One operational view of the foundation: readiness, guardrails, and the work that moves the platform forward." action={<button type="button" onClick={() => setLocation('/architecture')} data-testid="button-explore-architecture" className="inline-flex items-center justify-center gap-2 rounded-lg border border-border bg-card px-4 py-2.5 text-xs font-bold text-foreground transition hover:border-primary hover:text-primary"><Eye size={15} /> Explore architecture <ArrowRight size={14} /></button>} />
      <section className="bp-card relative overflow-hidden rounded-2xl p-5 sm:p-7" data-testid="card-platform-readiness">
        <div className="absolute right-0 top-0 h-full w-1/2 bg-gradient-to-bl from-[#e0f3ee]/70 to-transparent" />
        <div className="relative flex flex-col justify-between gap-7 lg:flex-row lg:items-center">
          <div><div className="bp-kicker">Current milestone</div><div className="mt-3 flex items-center gap-2.5"><span className="grid h-7 w-7 place-items-center rounded-full bg-[#e0f3ee] text-primary"><Check size={15} strokeWidth={3} /></span><h2 className="text-xl font-extrabold tracking-[-.04em]">{data?.nextMilestone ?? 'Foundation baseline'}</h2></div><p className="mt-3 max-w-xl text-[12px] leading-6 text-muted-foreground">The core landing zone is in place. The next proof point is to close the remaining governance evidence and move the shared AI gateway into managed operation.</p><div className="mt-5 flex flex-wrap gap-2"><span className="bp-mono rounded-md bg-muted px-2.5 py-1.5 text-[10px] text-muted-foreground">{data?.environment ?? 'Production'} environment</span><span className="bp-mono rounded-md bg-muted px-2.5 py-1.5 text-[10px] text-muted-foreground">{data?.regionPolicy ?? 'EU-only'} region policy</span><span className="bp-mono rounded-md bg-muted px-2.5 py-1.5 text-[10px] text-muted-foreground">Reviewed {data?.lastReviewed ? new Date(data.lastReviewed).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : 'recently'}</span></div></div>
          <div className="flex items-center gap-6 lg:pr-5"><ReadinessRing score={data?.readinessScore ?? 0} /><div className="min-w-[130px]"><div className="bp-kicker">Foundation health</div><div className="mt-2 text-sm font-bold text-primary">On track</div><div className="mt-2 text-[11px] leading-5 text-muted-foreground">{readyCaps} of {caps.length} capability layers ready</div></div></div>
        </div>
      </section>
      <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricTile label="Active users" value={data?.activeUsers ?? 0} detail="Across governed workloads" icon={Activity} tone="teal" />
        <MetricTile label="Capability layers" value={data?.capabilityCount ?? caps.length} detail={`${readyCaps} ready for adoption`} icon={Layers3} tone="blue" />
        <MetricTile label="Governance controls" value={data?.controlCount ?? controlRows.length} detail={`${controlRows.filter((item) => item.status === 'Compliant').length} currently compliant`} icon={ShieldCheck} tone="amber" />
        <MetricTile label="Roadmap items" value={data?.roadmapCount ?? roadmapRows.length} detail={`${activeWork.length} need attention now`} icon={GitBranch} tone="rose" />
      </div>
      <div className="mt-5 grid gap-5 xl:grid-cols-[1.35fr_.65fr]">
        <section className="bp-card rounded-xl p-5 sm:p-6" data-testid="card-immediate-next-steps"><div className="flex items-start justify-between"><div><div className="bp-kicker">Execution queue</div><h2 className="mt-2 text-lg font-extrabold tracking-[-.035em]">Immediate next steps</h2></div><Link href="/roadmap" data-testid="link-view-roadmap" className="text-[11px] font-bold text-primary hover:underline">View roadmap <ArrowRight className="ml-1 inline" size={13} /></Link></div><div className="mt-5 divide-y divide-border">{activeWork.length === 0 ? <EmptyState title="No active work" body="The current roadmap has no items requiring attention." /> : activeWork.map((item, index) => <div key={item.id} className="flex gap-3 py-4 first:pt-0 last:pb-0" data-testid={`row-next-step-${item.id}`}><div className="bp-mono pt-0.5 text-[10px] text-muted-foreground">0{index + 1}</div><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><h3 className="text-[13px] font-bold">{item.title}</h3><StatusPill status={item.status} /></div><p className="mt-1.5 text-[11px] leading-5 text-muted-foreground">{item.description}</p><div className="mt-2 flex flex-wrap gap-3 text-[10px] text-muted-foreground"><span className="inline-flex items-center gap-1"><Zap size={11} className="text-primary" />{item.owner}</span><span className="inline-flex items-center gap-1"><Clock3 size={11} />{item.horizon}</span></div></div></div>)}</div></section>
        <section className="bp-card bp-grid rounded-xl p-5 sm:p-6" data-testid="card-decision-signal"><div className="bp-kicker">Architecture signal</div><h2 className="mt-2 text-lg font-extrabold tracking-[-.035em]">Decisions are moving</h2><p className="mt-2 text-[11px] leading-5 text-muted-foreground">The blueprint is an agreement surface. Keep recommendations explicit so delivery teams can move without re-opening settled questions.</p><div className="mt-6 space-y-3">{decisionRows.slice(0, 3).map((decision) => <div key={decision.id} className="rounded-lg border border-border/80 bg-card/85 p-3" data-testid={`summary-decision-${decision.id}`}><div className="flex items-center justify-between gap-3"><span className="truncate text-[11px] font-bold">{decision.title}</span><StatusPill status={decision.status} /></div><div className="mt-2 bp-mono text-[9px] uppercase tracking-[.12em] text-muted-foreground">{decision.area}</div></div>)}</div><Link href="/decisions" data-testid="link-review-decisions" className="mt-5 inline-flex items-center gap-1.5 text-[11px] font-bold text-primary hover:underline">Review decision log <ArrowRight size={13} /></Link></section>
      </div>
    </div>
  );
}

function EmptyState({ title, body }: { title: string; body: string }) {
  return <div className="rounded-lg border border-dashed border-border bg-muted/40 px-5 py-8 text-center"><div className="mx-auto grid h-8 w-8 place-items-center rounded-full bg-card text-muted-foreground"><Network size={15} /></div><div className="mt-3 text-xs font-bold">{title}</div><p className="mt-1 text-[11px] text-muted-foreground">{body}</p></div>;
}

function Architecture() {
  const query = useListPlatformCapabilities({ query: { queryKey: getListPlatformCapabilitiesQueryKey() } });
  if (query.isLoading) return <LoadingState label="Mapping capability layers" />;
  if (query.isError) return <ErrorState onRetry={() => query.refetch()} />;
  const rows = query.data ?? [];
  return <div className="bp-page-in"><PageHeader eyebrow="Target-state architecture" title="How the platform fits together" description="A private, serverless-first Azure foundation that takes an Entra-authenticated request through policy, retrieval, model access, and evidence." action={<div className="bp-mono rounded-lg border border-border bg-card px-3 py-2 text-[10px] text-muted-foreground"><span className="mr-2 text-primary">●</span>Reference design · approval required</div>} /><ArchitectureFlow /><div className="mb-6 grid gap-4 md:grid-cols-3"><ArchitectureFact icon={CloudIcon} label="Cloud substrate" value="Azure landing zone" /><ArchitectureFact icon={LockKeyhole} label="Identity plane" value="Entra governed" /><ArchitectureFact icon={Activity} label="Operating model" value="Policy-as-code ready" /></div><div className="mb-4 flex items-end justify-between gap-4"><div><div className="bp-kicker">Implementation map</div><h2 className="mt-2 text-lg font-extrabold tracking-[-.035em]">Capability layers</h2></div><span className="bp-mono text-[10px] text-muted-foreground">Owner · boundary · readiness</span></div>{rows.length === 0 ? <EmptyState title="No capability layers defined" body="Capability data will appear when the platform baseline is connected." /> : <div className="space-y-3">{rows.map((capability, index) => <CapabilityRow key={capability.id} capability={capability} index={index} />)}</div>}<div className="mt-7 rounded-xl border border-[#bddfd8] bg-[#e8f5f1] p-5 sm:p-6"><div className="flex gap-3"><div className="mt-0.5 text-primary"><Network size={18} /></div><div><div className="bp-kicker text-primary">Design basis</div><p className="mt-2 max-w-3xl text-[12px] leading-6 text-[#2b5e59]">This view is backed by the architecture pack in <span className="bp-mono text-[11px]">docs/architecture/</span>: target state, logical architecture, deployment topology, control matrix, and the model gateway contract. Capabilities are broader than products; each one is a platform boundary with an accountable owner.</p></div></div></div></div>;
}

function CloudIcon({ size = 16 }: { size?: number }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M17.5 19H9a7 7 0 1 1 6.7-9.03A5 5 0 1 1 17.5 19Z" /></svg>;
}

function ArchitectureFact({ icon: Icon, label, value }: { icon: IconType | typeof CloudIcon; label: string; value: string }) {
  return <div className="bp-card flex items-center gap-3 rounded-xl p-4"><div className="grid h-9 w-9 place-items-center rounded-lg bg-[#e8eef7] text-[#49627e]"><Icon size={17} /></div><div><div className="bp-kicker">{label}</div><div className="mt-1 text-[12px] font-bold">{value}</div></div></div>;
}

function ArchitectureFlow() {
  const stages = [
    { label: 'Access & trust', icon: LockKeyhole, items: ['Entra ID', 'APIM ingress'], tone: 'bg-[#e8eef7] text-[#49627e]' },
    { label: 'Orchestration', icon: Network, items: ['Functions', 'Policy engine'], tone: 'bg-[#e0f3ee] text-[#176557]' },
    { label: 'AI services', icon: Target, items: ['Model gateway', 'Retrieval · tools'], tone: 'bg-[#fff1d7] text-[#8b5d10]' },
    { label: 'Evidence & ops', icon: Activity, items: ['ADLS · AI Search', 'OpenTelemetry · Dynatrace'], tone: 'bg-[#fbe6e3] text-[#a43c32]' },
  ];
  return <section className="bp-card overflow-hidden rounded-2xl" data-testid="card-target-architecture"><div className="border-b border-border bg-card/80 px-5 py-4 sm:px-6"><div className="flex flex-wrap items-center justify-between gap-3"><div><div className="bp-kicker">Logical request path</div><h2 className="mt-2 text-[15px] font-extrabold tracking-[-.02em]">From authenticated request to operable response</h2></div><span className="bp-mono rounded-md bg-muted px-2.5 py-1.5 text-[10px] text-muted-foreground">PRIVATE BY DEFAULT</span></div></div><div className="grid gap-2 p-4 sm:p-6 md:grid-cols-[repeat(4,minmax(0,1fr))]">{stages.map(({ label, icon: Icon, items, tone }, index) => <div key={label} className="flex items-stretch gap-2 md:items-center"><div className="flex min-w-0 flex-1 items-center gap-3 rounded-xl border border-border bg-muted/35 p-3"><div className={`grid h-8 w-8 shrink-0 place-items-center rounded-lg ${tone}`}><Icon size={15} /></div><div className="min-w-0"><div className="bp-kicker">{label}</div><div className="mt-1 space-y-0.5 text-[11px] font-semibold">{items.map((item) => <div key={item} className="truncate">{item}</div>)}</div></div></div>{index < stages.length - 1 && <div className="hidden place-items-center text-muted-foreground md:grid"><ArrowRight size={15} /></div>}{index < stages.length - 1 && <div className="grid place-items-center text-muted-foreground md:hidden"><ArrowRight size={15} className="rotate-90" /></div>}</div>)}</div><div className="grid gap-2 border-t border-border bg-muted/25 px-5 py-4 text-[10px] text-muted-foreground sm:grid-cols-3 sm:px-6"><span><strong className="text-foreground">Control:</strong> identity · classification · safety</span><span><strong className="text-foreground">Data:</strong> source IDs · citations · deletion path</span><span><strong className="text-foreground">Evidence:</strong> correlation ID · traces · audit</span></div></section>;
}

function CapabilityRow({ capability, index }: { capability: PlatformCapability; index: number }) {
  const [open, setOpen] = useState(index === 0);
  const accent = capability.accent || '#4aa998';
  return <article className="bp-card bp-card-hover overflow-hidden rounded-xl" data-testid={`card-capability-${capability.id}`}><button type="button" onClick={() => setOpen(!open)} data-testid={`button-toggle-capability-${capability.id}`} className="flex w-full items-center gap-4 p-4 text-left sm:p-5"><div className="h-10 w-1 shrink-0 rounded-full" style={{ backgroundColor: accent }} /><div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-muted text-muted-foreground"><span className="bp-mono text-[11px]">0{index + 1}</span></div><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><h2 className="text-sm font-extrabold">{capability.name}</h2><StatusPill status={capability.status} /></div><p className="mt-1 truncate text-[11px] text-muted-foreground">{capability.description}</p></div><div className="hidden w-32 sm:block"><div className="mb-1.5 flex justify-between text-[10px]"><span className="bp-kicker">Readiness</span><span className="bp-mono">{capability.readiness}%</span></div><div className="bp-progress h-1.5 rounded-full"><span style={{ width: `${capability.readiness}%`, backgroundColor: accent }} /></div></div><ChevronDown size={16} className={`shrink-0 text-muted-foreground transition-transform ${open ? 'rotate-180' : ''}`} /></button>{open && <div className="border-t border-border bg-muted/35 px-5 pb-5 pt-4 sm:pl-[76px]"><div className="grid gap-5 md:grid-cols-[1fr_1.2fr]"><div><div className="bp-kicker">Layer intent</div><p className="mt-2 text-[11px] leading-5 text-muted-foreground">{capability.description}</p><div className="mt-4 flex items-center gap-2 text-[10px] text-muted-foreground"><span className="grid h-6 w-6 place-items-center rounded-full bg-[#d9ba93] text-[9px] font-bold text-[#463522]">{capability.owner?.split(' ').map((part) => part[0]).join('').slice(0, 2)}</span><span>Owned by <strong className="text-foreground">{capability.owner}</strong></span></div></div><div><div className="bp-kicker">Services & platforms</div><div className="mt-3 flex flex-wrap gap-2">{(capability.services ?? []).map((service) => <span key={service} className="rounded-md border border-border bg-card px-2.5 py-1.5 text-[10px] font-semibold text-foreground/75">{service}</span>)}</div><div className="mt-4 flex items-center gap-2 sm:hidden"><div className="bp-progress h-1.5 flex-1 rounded-full"><span style={{ width: `${capability.readiness}%`, backgroundColor: accent }} /></div><span className="bp-mono text-[10px]">{capability.readiness}% ready</span></div></div></div></div>}</article>;
}

function Controls() {
  const query = useListPlatformControls({ query: { queryKey: getListPlatformControlsQueryKey() } });
  const [filter, setFilter] = useState('All');
  if (query.isLoading) return <LoadingState label="Loading governance register" />;
  if (query.isError) return <ErrorState onRetry={() => query.refetch()} />;
  const rows = query.data ?? [];
  const categories = ['All', ...Array.from(new Set(rows.map((item) => item.category)))];
  const filtered = filter === 'All' ? rows : rows.filter((item) => item.category === filter);
  return <div className="bp-page-in"><PageHeader eyebrow="Governance register" title="Controls & evidence" description="A working register of the controls that make the AI foundation safe to reuse. Evidence is linked to an accountable owner, not left as a policy footnote." action={<div className="inline-flex items-center gap-2 rounded-lg bg-[#e0f3ee] px-3 py-2 text-[10px] font-bold text-[#176557]"><ShieldCheck size={14} /> Control plane active</div>} /><div className="mb-5 flex flex-wrap items-center gap-2">{categories.map((category) => <button type="button" key={category} onClick={() => setFilter(category)} data-testid={`button-filter-${category.toLowerCase().replace(/\s+/g, '-')}`} className={`rounded-lg border px-3 py-2 text-[11px] font-bold transition ${filter === category ? 'border-primary bg-primary text-primary-foreground' : 'border-border bg-card text-muted-foreground hover:border-primary hover:text-primary'}`}>{category}</button>)}</div><div className="bp-card overflow-hidden rounded-xl" data-testid="table-controls"><div className="hidden grid-cols-[1.5fr_.8fr_1fr_1.3fr_auto] gap-4 border-b border-border bg-muted/45 px-5 py-3 md:grid"><div className="bp-kicker">Control</div><div className="bp-kicker">Category</div><div className="bp-kicker">Owner</div><div className="bp-kicker">Evidence</div><div className="bp-kicker">Status</div></div>{filtered.length === 0 ? <div className="p-5"><EmptyState title="No controls in this view" body="Try another category or connect more controls to the register." /></div> : filtered.map((control) => <ControlRow key={control.id} control={control} />)}</div><div className="mt-4 flex items-center gap-2 text-[10px] text-muted-foreground"><FileCheck2 size={13} className="text-primary" /> Evidence links are reviewed alongside control status. {filtered.length} controls shown.</div></div>;
}

function ControlRow({ control }: { control: PlatformControl }) {
  const [open, setOpen] = useState(false);
  return <div className="border-b border-border last:border-0" data-testid={`row-control-${control.id}`}><button type="button" onClick={() => setOpen(!open)} data-testid={`button-expand-control-${control.id}`} className="grid w-full gap-3 px-5 py-4 text-left transition hover:bg-muted/35 md:grid-cols-[1.5fr_.8fr_1fr_1.3fr_auto] md:items-center md:gap-4"><div className="min-w-0"><div className="flex items-center gap-2"><span className={`h-1.5 w-1.5 shrink-0 rounded-full ${control.status === 'Compliant' ? 'bg-primary' : 'bg-[#d59b42]'}`} /><span className="truncate text-[12px] font-bold">{control.name}</span></div><div className="mt-1 pl-3.5 text-[10px] text-muted-foreground md:hidden">{control.category} · {control.owner}</div></div><div className="hidden text-[11px] text-muted-foreground md:block">{control.category}</div><div className="hidden text-[11px] text-foreground/75 md:block">{control.owner}</div><div className="hidden truncate text-[11px] text-muted-foreground md:block">{control.evidence || 'Evidence pending'}</div><StatusPill status={control.status} className="w-fit md:justify-self-end" /></button>{open && <div className="mx-5 mb-4 rounded-lg border border-border bg-muted/40 p-4"><div className="bp-kicker">Control description</div><p className="mt-2 text-[11px] leading-5 text-muted-foreground">{control.description}</p><div className="mt-4 grid gap-3 text-[11px] sm:grid-cols-2"><div><div className="bp-kicker">Accountable owner</div><div className="mt-1 font-semibold">{control.owner}</div></div><div><div className="bp-kicker">Evidence reference</div><div className="mt-1 flex items-center gap-1 font-semibold text-primary">{control.evidence || 'No evidence linked'} {control.evidence && <ExternalLink size={11} />}</div></div></div></div>}</div>;
}

function Roadmap() {
  const query = useListPlatformRoadmap({ query: { queryKey: getListPlatformRoadmapQueryKey() } });
  const [horizon, setHorizon] = useState('All horizons');
  if (query.isLoading) return <LoadingState label="Sequencing delivery plan" />;
  if (query.isError) return <ErrorState onRetry={() => query.refetch()} />;
  const rows = query.data ?? [];
  const horizons = ['All horizons', ...Array.from(new Set(rows.map((item) => item.horizon)))];
  const filtered = horizon === 'All horizons' ? rows : rows.filter((item) => item.horizon === horizon);
  const phases = Array.from(new Set(filtered.map((item) => item.phase)));
  return <div className="bp-page-in"><PageHeader eyebrow="Delivery sequence" title="Roadmap" description="A phased plan for moving from baseline to repeatable service. Horizons show when work matters; dependencies show what must be true first." action={<div className="flex rounded-lg border border-border bg-card p-1">{horizons.map((item) => <button type="button" key={item} onClick={() => setHorizon(item)} data-testid={`button-horizon-${item.toLowerCase().replace(/\s+/g, '-')}`} className={`rounded-md px-2.5 py-1.5 text-[10px] font-bold transition ${horizon === item ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'}`}>{item.replace(' horizons', '')}</button>)}</div>} /><div className="relative ml-2 border-l border-border pl-6 sm:ml-4 sm:pl-9">{phases.length === 0 ? <EmptyState title="No roadmap items defined" body="Delivery sequencing will appear when the roadmap source is connected." /> : phases.map((phase, phaseIndex) => <section key={phase} className="relative mb-9 last:mb-0" data-testid={`section-phase-${phase}`}><span className="absolute -left-[35px] top-0 grid h-7 w-7 place-items-center rounded-full border-4 border-background bg-primary text-[10px] font-bold text-primary-foreground sm:-left-[49px]">{phaseIndex + 1}</span><div className="mb-4 flex flex-wrap items-center gap-3"><div className="bp-kicker text-primary">{phase}</div><span className="h-px w-10 bg-border" /><span className="text-[10px] text-muted-foreground">{filtered.filter((item) => item.phase === phase).length} work items</span></div><div className="space-y-3">{filtered.filter((item) => item.phase === phase).map((item) => <RoadmapCard key={item.id} item={item} />)}</div></section>)}</div></div>;
}

function RoadmapCard({ item }: { item: RoadmapItem }) {
  return <article className="bp-card bp-card-hover rounded-xl p-4 sm:p-5" data-testid={`card-roadmap-${item.id}`}><div className="flex flex-col gap-4 sm:flex-row sm:items-start"><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><h2 className="text-[13px] font-extrabold">{item.title}</h2><StatusPill status={item.status} /></div><p className="mt-2 max-w-3xl text-[11px] leading-5 text-muted-foreground">{item.description}</p><div className="mt-4 flex flex-wrap gap-4 text-[10px] text-muted-foreground"><span className="inline-flex items-center gap-1.5"><span className="grid h-5 w-5 place-items-center rounded-full bg-[#d9ba93] text-[8px] font-bold text-[#463522]">{item.owner?.split(' ').map((part) => part[0]).join('').slice(0, 2)}</span>{item.owner}</span><span className="inline-flex items-center gap-1.5"><Clock3 size={12} />{item.horizon}</span></div></div><div className="w-full border-t border-border pt-3 sm:w-44 sm:border-l sm:border-t-0 sm:pl-4 sm:pt-0"><div className="bp-kicker">Dependencies</div>{item.dependencies?.length ? <div className="mt-2 space-y-1.5">{item.dependencies.map((dependency) => <div key={dependency} className="flex items-start gap-1.5 text-[10px] leading-4 text-muted-foreground"><span className="mt-1 h-1 w-1 shrink-0 rounded-full bg-[#b58a55]" />{dependency}</div>)}</div> : <div className="mt-2 text-[10px] text-muted-foreground">No dependencies</div>}</div></div></article>;
}

function Decisions() {
  const query = useListArchitectureDecisions({ query: { queryKey: getListArchitectureDecisionsQueryKey() } });
  const mutation = useUpdateArchitectureDecision();
  const client = useQueryClient();
  const [area, setArea] = useState('All areas');
  const [pendingId, setPendingId] = useState<string | null>(null);
  if (query.isLoading) return <LoadingState label="Loading architecture decision log" />;
  if (query.isError) return <ErrorState onRetry={() => query.refetch()} />;
  const rows = query.data ?? [];
  const areas = ['All areas', ...Array.from(new Set(rows.map((item) => item.area)))];
  const filtered = area === 'All areas' ? rows : rows.filter((item) => item.area === area);
  const updateStatus = (decision: ArchitectureDecision, status: ArchitectureDecisionUpdateStatus) => {
    setPendingId(decision.id);
    mutation.mutate({ decisionId: decision.id, data: { status } }, { onSuccess: (updated) => { client.setQueryData(getListArchitectureDecisionsQueryKey(), (old: ArchitectureDecision[] | undefined) => (old ?? []).map((item) => item.id === updated.id ? updated : item)); setPendingId(null); }, onError: () => setPendingId(null) });
  };
  return <div className="bp-page-in"><PageHeader eyebrow="Architecture governance" title="Decision log" description="The short list of choices that shape the foundation. Recommendations stay visible, rationale stays attached, and status is owned by the team that will operate the result." action={<div className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-[10px] text-muted-foreground"><BookOpen size={14} className="text-primary" /> {rows.length} decisions tracked</div>} /><div className="mb-5 flex flex-wrap gap-2">{areas.map((item) => <button type="button" key={item} onClick={() => setArea(item)} data-testid={`button-area-${item.toLowerCase().replace(/\s+/g, '-')}`} className={`rounded-lg border px-3 py-2 text-[11px] font-bold transition ${area === item ? 'border-primary bg-primary text-primary-foreground' : 'border-border bg-card text-muted-foreground hover:border-primary hover:text-primary'}`}>{item}</button>)}</div>{filtered.length === 0 ? <EmptyState title="No decisions in this view" body="Try a different area to see the architecture record." /> : <div className="grid gap-4">{filtered.map((decision) => <DecisionCard key={decision.id} decision={decision} pending={pendingId === decision.id} onStatusChange={updateStatus} />)}</div>}</div>;
}

function DecisionCard({ decision, pending, onStatusChange }: { decision: ArchitectureDecision; pending: boolean; onStatusChange: (decision: ArchitectureDecision, status: ArchitectureDecisionUpdateStatus) => void }) {
  const [open, setOpen] = useState(true);
  const options = [ArchitectureDecisionUpdateStatus.Proposed, ArchitectureDecisionUpdateStatus.Accepted, ArchitectureDecisionUpdateStatus.Needs_review];
  return <article className="bp-card overflow-hidden rounded-xl" data-testid={`card-decision-${decision.id}`}><div className="flex items-start gap-3 p-5 sm:p-6"><div className="mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-[#e8eef7] text-[#49627e]"><span className="bp-mono text-[11px]">{decision.area?.slice(0, 2).toUpperCase()}</span></div><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><span className="bp-kicker text-primary">{decision.area}</span><StatusPill status={decision.status} /></div><h2 className="mt-2 text-[15px] font-extrabold tracking-[-.02em]">{decision.title}</h2><div className="mt-3 rounded-lg border-l-2 border-primary bg-[#e8f5f1] px-3.5 py-3"><div className="bp-kicker text-primary">Recommendation</div><p className="mt-1.5 text-[12px] font-semibold leading-5 text-[#285c56]">{decision.recommendation}</p></div>{open && <div className="mt-4"><div className="bp-kicker">Rationale</div><p className="mt-1.5 max-w-3xl text-[11px] leading-5 text-muted-foreground">{decision.rationale}</p></div>}<div className="mt-5 flex flex-col gap-4 border-t border-border pt-4 sm:flex-row sm:items-center"><div className="flex items-center gap-2 text-[10px] text-muted-foreground"><span className="grid h-6 w-6 place-items-center rounded-full bg-[#d9ba93] text-[9px] font-bold text-[#463522]">{decision.owner?.split(' ').map((part) => part[0]).join('').slice(0, 2)}</span><span>Owner <strong className="text-foreground">{decision.owner}</strong></span></div><div className="flex flex-wrap items-center gap-2 sm:ml-auto"><span className="bp-kicker mr-1">Set status</span>{options.map((status) => <button type="button" disabled={pending} key={status} onClick={() => onStatusChange(decision, status)} data-testid={`button-decision-${status.toLowerCase().replace(/\s+/g, '-')}-${decision.id}`} className={`rounded-md border px-2.5 py-1.5 text-[10px] font-bold transition disabled:cursor-wait disabled:opacity-50 ${decision.status === status ? 'border-primary bg-primary text-primary-foreground' : 'border-border bg-card text-muted-foreground hover:border-primary hover:text-primary'}`}>{pending && decision.status !== status ? <RefreshCw size={11} className="animate-spin" /> : status}</button>)}</div></div></div><button type="button" onClick={() => setOpen(!open)} data-testid={`button-toggle-decision-${decision.id}`} aria-label={open ? 'Collapse rationale' : 'Expand rationale'} className="text-muted-foreground hover:text-foreground">{open ? <ChevronDown size={17} className="rotate-180" /> : <ChevronDown size={17} />}</button></div></article>;
}

function Router() {
  const [location] = useLocation();
  const page =
    location === '/' ? <Overview /> :
    location === '/architecture' ? <Architecture /> :
    location === '/controls' ? <Controls /> :
    location === '/roadmap' ? <Roadmap /> :
    location === '/decisions' ? <Decisions /> :
    <NotFound />;
  return <ErrorBoundary resetKey={location}><AppShell>{page}</AppShell></ErrorBoundary>;
}

function App() {
  return <QueryClientProvider client={queryClient}><TooltipProvider><WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}><Router /></WouterRouter><Toaster /></TooltipProvider></QueryClientProvider>;
}

export default App;