import { supabase } from "./supabaseClient";

export const getCurrentUser = async () => {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return null;

  const user = session.user;

  // Check if profile exists, if not, create it
  let { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  if (!profile) {
    const { data: newProfile } = await supabase
      .from("profiles")
      .insert([{ id: user.id, name: user.email?.split('@')[0], role: 'user' }])
      .select()
      .single();
    profile = newProfile;
  }

  return { user, profile };
};