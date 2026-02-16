"use client";

import Link from "next/link";
import { Music, LogIn, LogOut, Settings } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useEffect, useState } from "react";
import type { Profile } from "@/lib/auth";

export function Header() {
  const [profile, setProfile] = useState<Profile | null>(null);

  useEffect(() => {
    const supabase = createClient();

    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        supabase
          .from("profiles")
          .select("*")
          .eq("id", user.id)
          .single()
          .then(({ data }) => setProfile(data as Profile | null));
      }
    });
  }, []);

  const handleSignOut = async () => {
    await fetch("/api/auth/signout", { method: "POST" });
    window.location.href = "/";
  };

  return (
    <header className="border-b border-gray-200 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <Link href="/" className="flex items-center gap-2">
            <Music className="h-6 w-6 text-indigo-600" />
            <span className="text-xl font-bold text-gray-900">ScoreSaver</span>
          </Link>

          <nav className="flex items-center gap-4">
            <Link
              href="/sheets"
              className="text-sm text-gray-600 hover:text-gray-900"
            >
              악보 목록
            </Link>

            {profile ? (
              <>
                {profile.is_admin && (
                  <Link
                    href="/admin/dashboard"
                    className="flex items-center gap-1 text-sm text-gray-600 hover:text-gray-900"
                  >
                    <Settings className="h-4 w-4" />
                    관리
                  </Link>
                )}
                <button
                  onClick={handleSignOut}
                  className="flex items-center gap-1 text-sm text-gray-600 hover:text-gray-900 cursor-pointer"
                >
                  <LogOut className="h-4 w-4" />
                  로그아웃
                </button>
              </>
            ) : (
              <Link
                href="/auth/login"
                className="flex items-center gap-1 text-sm text-indigo-600 hover:text-indigo-700"
              >
                <LogIn className="h-4 w-4" />
                로그인
              </Link>
            )}
          </nav>
        </div>
      </div>
    </header>
  );
}
