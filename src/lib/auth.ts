import { SupabaseClient } from "@supabase/supabase-js";

export class UnauthorizedError extends Error {
  constructor(message = "Not authenticated") {
    super(message);
    this.name = "UnauthorizedError";
  }
}

export class ForbiddenError extends Error {
  constructor(message = "Admin access required") {
    super(message);
    this.name = "ForbiddenError";
  }
}

export interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  is_admin: boolean;
  created_at: string;
  updated_at: string;
}

export async function getCurrentUser(supabase: SupabaseClient) {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  return profile as Profile | null;
}

export async function requireAdmin(supabase: SupabaseClient): Promise<Profile> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new UnauthorizedError();

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  if (!profile?.is_admin) throw new ForbiddenError();
  return profile as Profile;
}
