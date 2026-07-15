"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { resetAppData } from "@/lib/storage";

const LINKS = [
  { href: "/dashboard", label: "대시보드" },
  { href: "/leads", label: "리드" },
  { href: "/channels", label: "채널" },
];

export function Nav() {
  const pathname = usePathname();

  const handleReset = () => {
    if (window.confirm("입력한 데이터를 모두 지우고 처음의 예시 데이터로 되돌릴까요?")) {
      resetAppData();
      window.location.reload();
    }
  };

  return (
    <header className="border-b border-zinc-200 bg-white">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-6 gap-y-2 px-4 py-3">
        <Link href="/dashboard" className="text-base font-bold tracking-tight">
          SalesOps Console
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
          <span className="cursor-default rounded-md px-3 py-1.5 text-zinc-300" title="2차 개발 예정">
            월간 보고
          </span>
          <span className="cursor-default rounded-md px-3 py-1.5 text-zinc-300" title="3차 개발 예정">
            스레드
          </span>
        </nav>
        <button
          onClick={handleReset}
          className="ml-auto rounded-md border border-zinc-300 px-3 py-1.5 text-xs text-zinc-600 hover:bg-zinc-100"
        >
          예시 데이터로 초기화
        </button>
      </div>
    </header>
  );
}
