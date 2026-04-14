"use client";

import { createClient } from "@/lib/supabase/client";
import { useEffect, useState, useCallback } from "react";
import { KanbanBoard } from "@/components/kanban-board";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import Link from "next/link";

type Task = {
  id: string;
  title: string;
  description: string | null;
  status: "todo" | "in_progress" | "done";
  priority: "low" | "medium" | "high" | "urgent";
  due_date: string | null;
  assignee_name: string;
};

export default function DashboardPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [filterAssignee, setFilterAssignee] = useState("all");
  const [filterPriority, setFilterPriority] = useState("all");
  const [members, setMembers] = useState<{ id: string; display_name: string }[]>([]);
  const supabase = createClient();

  const loadTasks = useCallback(async () => {
    let query = supabase
      .from("tasks")
      .select("id, title, description, status, priority, due_date, assignee(display_name)")
      .order("created_at", { ascending: false });

    if (filterAssignee !== "all") {
      query = query.eq("assignee", filterAssignee);
    }
    if (filterPriority !== "all") {
      query = query.eq("priority", filterPriority);
    }

    const { data } = await query;

    const mapped = (data ?? []).map((t: any) => ({
      ...t,
      assignee_name: t.assignee?.display_name ?? "Unassigned",
    }));

    setTasks(mapped);
  }, [supabase, filterAssignee, filterPriority]);

  useEffect(() => {
    loadTasks();

    async function loadMembers() {
      const { data } = await supabase.from("profiles").select("id, display_name");
      setMembers(data ?? []);
    }
    loadMembers();
  }, [loadTasks, supabase]);

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <Link href="/tasks/new">
          <Button>New Task</Button>
        </Link>
      </div>

      <div className="flex gap-4">
        <Select value={filterAssignee} onValueChange={(v) => { setFilterAssignee(v); }}>
          <SelectTrigger className="w-48"><SelectValue placeholder="Filter by assignee" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All members</SelectItem>
            {members.map((m) => (
              <SelectItem key={m.id} value={m.id}>{m.display_name}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={filterPriority} onValueChange={(v) => { setFilterPriority(v); }}>
          <SelectTrigger className="w-48"><SelectValue placeholder="Filter by priority" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All priorities</SelectItem>
            <SelectItem value="low">Low</SelectItem>
            <SelectItem value="medium">Medium</SelectItem>
            <SelectItem value="high">High</SelectItem>
            <SelectItem value="urgent">Urgent</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <KanbanBoard tasks={tasks} onUpdate={loadTasks} />
    </div>
  );
}
