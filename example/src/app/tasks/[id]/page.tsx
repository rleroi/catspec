import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import { Badge } from "@/components/ui/badge";

export default async function TaskDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: task } = await supabase
    .from("tasks")
    .select(
      "*, assignee:profiles!assignee(display_name), creator:profiles!created_by(display_name), project:projects(name)",
    )
    .eq("id", id)
    .single();

  if (!task) notFound();

  return (
    <div className="p-8 max-w-2xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold">{task.title}</h1>

      <div className="flex gap-2">
        <Badge variant="outline">{task.status}</Badge>
        <Badge variant="secondary">{task.priority}</Badge>
      </div>

      {task.description && (
        <p className="text-muted-foreground">{task.description}</p>
      )}

      <dl className="grid grid-cols-2 gap-4 text-sm">
        <div>
          <dt className="text-muted-foreground">Assignee</dt>
          <dd className="font-medium">{(task.assignee as any)?.display_name}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Created by</dt>
          <dd className="font-medium">{(task.creator as any)?.display_name}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Project</dt>
          <dd className="font-medium">{(task.project as any)?.name}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Due date</dt>
          <dd className="font-medium">
            {task.due_date
              ? new Date(task.due_date).toLocaleDateString()
              : "No due date"}
          </dd>
        </div>
      </dl>
    </div>
  );
}
