"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  FileMusic,
  Tags,
  Link2,
  Music,
} from "lucide-react";
import { cn } from "@/lib/utils/cn";

const navItems = [
  { href: "/admin/dashboard", label: "대시보드", icon: LayoutDashboard },
  { href: "/admin/sheets", label: "악보 관리", icon: FileMusic },
  { href: "/admin/tags", label: "태그 관리", icon: Tags },
  { href: "/admin/integrations", label: "연동 관리", icon: Link2 },
];

export function AdminSidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-64 bg-gray-900 text-white min-h-screen flex flex-col">
      <div className="p-4 border-b border-gray-700">
        <Link href="/admin/dashboard" className="flex items-center gap-2">
          <Music className="h-6 w-6 text-indigo-400" />
          <span className="text-lg font-bold">ScoreSaver</span>
        </Link>
        <p className="text-xs text-gray-400 mt-1">Admin Panel</p>
      </div>

      <nav className="flex-1 p-4 space-y-1">
        {navItems.map((item) => {
          const isActive = pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors",
                isActive
                  ? "bg-indigo-600 text-white"
                  : "text-gray-300 hover:bg-gray-800 hover:text-white"
              )}
            >
              <item.icon className="h-5 w-5" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t border-gray-700">
        <Link
          href="/"
          className="text-sm text-gray-400 hover:text-white transition-colors"
        >
          공개 사이트로 이동
        </Link>
      </div>
    </aside>
  );
}
