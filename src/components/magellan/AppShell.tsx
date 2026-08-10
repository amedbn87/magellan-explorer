import { Link, useRouterState } from "@tanstack/react-router";
import { Compass, Gauge, History, Info, Languages, MapPin, Moon, Navigation, QrCode, Radar, Radio, ScanLine, Settings, Shield, Signal, Sun, Satellite } from "lucide-react";
import type { ReactNode } from "react";
import { useMagellan } from "@/lib/magellan/store";
import type { TKey } from "@/lib/magellan/i18n";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { DemoBadge } from "./DemoBadge";

type Item = { to: string; key: TKey; icon: typeof Compass };

const GROUPS: { title: TKey; items: Item[] }[] = [
  { title: "section_position", items: [
    { to: "/", key: "nav_home", icon: Gauge },
    { to: "/navigate", key: "nav_navigate", icon: Navigation },
    { to: "/waypoints", key: "nav_waypoints", icon: MapPin },
  ]},
  { title: "section_signal", items: [
    { to: "/satellites", key: "nav_satellites", icon: Satellite },
    { to: "/sky", key: "nav_sky", icon: Radar },
    { to: "/signal", key: "nav_signal", icon: Signal },
  ]},
  { title: "section_sharing", items: [
    { to: "/share", key: "nav_share", icon: QrCode },
    { to: "/receive", key: "nav_receive", icon: ScanLine },
    { to: "/transports", key: "nav_transports", icon: Radio },
  ]},
  { title: "section_more", items: [
    { to: "/history", key: "nav_history", icon: History },
    { to: "/settings", key: "nav_settings", icon: Settings },
    { to: "/about", key: "nav_about", icon: Info },
    { to: "/privacy", key: "nav_privacy", icon: Shield },
  ]},
];

const TAB_BAR: Item[] = [
  { to: "/", key: "nav_home", icon: Gauge },
  { to: "/waypoints", key: "nav_waypoints", icon: MapPin },
  { to: "/satellites", key: "nav_satellites", icon: Satellite },
  { to: "/sky", key: "nav_sky", icon: Radar },
  { to: "/navigate", key: "nav_navigate", icon: Navigation },
];

export function AppShell({ children }: { children: ReactNode }) {
  const { t, theme, setTheme, lang, setLang } = useMagellan();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-30 border-b border-border bg-background/90 backdrop-blur">
        <div className="mx-auto grid max-w-6xl grid-cols-[minmax(0,1fr)_auto] items-center gap-3 px-4 py-3">
          <Link to="/" className="flex min-w-0 items-center gap-2"><span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-border bg-card"><Compass className="h-5 w-5 text-primary" aria-hidden /></span><span className="min-w-0"><span className="block truncate text-base font-semibold tracking-tight">{t("app")}</span><span className="block truncate text-[11px] text-muted-foreground">{t("tagline")}</span></span></Link>
          <div className="flex shrink-0 items-center gap-1"><DemoBadge label="WEB PROTOTYPE" className="hidden sm:inline-flex" /><Button variant="ghost" size="icon" aria-label={t("language")} onClick={() => setLang(lang === "en" ? "ar" : "en")}><Languages className="h-4 w-4" /></Button><Button variant="ghost" size="icon" aria-label={t("theme")} onClick={() => setTheme(theme === "dark" ? "light" : "dark")}>{theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}</Button></div>
        </div>
      </header>
      <div className="mx-auto flex max-w-6xl gap-6 px-4 py-5">
        <nav className="hidden w-56 shrink-0 lg:block" aria-label="Primary"><div className="sticky top-20 space-y-5">{GROUPS.map((g) => <div key={g.title} className="space-y-1"><div className="label-eyebrow px-2">{t(g.title)}</div>{g.items.map((item) => <Link key={item.to} to={item.to} className={cn("flex items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors hover:bg-secondary", pathname === item.to ? "bg-secondary font-medium text-foreground" : "text-muted-foreground")}><item.icon className="h-4 w-4 shrink-0" aria-hidden /><span className="truncate">{t(item.key)}</span></Link>)}</div>)}</div></nav>
        <main className="min-w-0 flex-1 pb-24 lg:pb-6">{children}</main>
      </div>
      <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-background/95 backdrop-blur lg:hidden" aria-label="Primary mobile"><ul className="mx-auto grid max-w-md grid-cols-5">{TAB_BAR.map((item) => <li key={item.to}><Link to={item.to} className={cn("flex flex-col items-center gap-1 px-1 py-2 text-[10px]", pathname === item.to ? "text-primary" : "text-muted-foreground")}><item.icon className="h-5 w-5" aria-hidden /><span className="w-full truncate text-center">{item.to === "/waypoints" ? "Locations" : t(item.key)}</span></Link></li>)}</ul></nav>
    </div>
  );
}