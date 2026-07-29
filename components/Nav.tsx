"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { supabase } from "@/lib/supabase";

const LINKS = [
  { href: "/dashboard", label: "대시보드" },
  { href: "/leads", label: "리드" },
  { href: "/channels", label: "채널" },
  { href: "/weekly", label: "주간 현황" },
  { href: "/report", label: "월간 보고" },
  { href: "/threads", label: "무료 채널 게시" },
  { href: "/insights", label: "영업 기회" },
];

export function Nav() {
  const pathname = usePathname();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.reload();
  };

  return (
    <header className="border-b border-zinc-200 bg-white">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-6 gap-y-2 px-4 py-3">
        <Link href="/dashboard" className="text-base font-bold tracking-tight">
          Lingo · Neuro SalesOps
        </Link>
        <nav className="flex items-center gap-1 text-sm">
          {LINKS.map((link) => {
            const active = pathname.startsWith(link.href);
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`rounded-md px-3 py-1.5 font-medium transition-colors ${
                  active ? "bg-zinc-900 text-white" : "text-zinc-600 hover:bg-zinc-100"
                }`}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>
        <button
          onClick={handleLogout}
          className="ml-auto rounded-md border border-zinc-300 px-3 py-1.5 text-xs text-zinc-600 hover:bg-zinc-100"
        >
          로그아웃
        </button>
      </div>
    </header>
  );
}
