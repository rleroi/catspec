import type { SupabaseClient } from "@supabase/supabase-js";

export async function notifyUser(
  supabase: SupabaseClient,
  userId: string,
  message: string,
  taskId?: string,
) {
  await supabase.from("notifications").insert({
    user_id: userId,
    message,
    task_id: taskId,
  });
}

export async function getUnreadNotifications(supabase: SupabaseClient) {
  const { data } = await supabase
    .from("notifications")
    .select("*")
    .eq("read", false)
    .order("created_at", { ascending: false });

  return data ?? [];
}

export async function markAsRead(supabase: SupabaseClient, id: string) {
  await supabase.from("notifications").update({ read: true }).eq("id", id);
}
