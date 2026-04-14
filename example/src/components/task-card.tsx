"use client";

import { Draggable } from "@hello-pangea/dnd";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import Link from "next/link";

type Task = {
  id: string;
  title: string;
  description: string | null;
  priority: "low" | "medium" | "high" | "urgent";
  due_date: string | null;
  assignee_name: string;
};

const priorityColors = {
  low: "bg-slate-100 text-slate-700",
  medium: "bg-blue-100 text-blue-700",
  high: "bg-orange-100 text-orange-700",
  urgent: "bg-red-100 text-red-700",
};

export function TaskCard({
  task,
  index,
}: {
  task: Task;
  index: number;
}) {
  const isOverdue =
    task.due_date && new Date(task.due_date) < new Date();

  return (
    <Draggable draggableId={task.id} index={index}>
      {(provided) => (
        <Link href={`/tasks/${task.id}`}>
          <div
            ref={provided.innerRef}
            {...provided.draggableProps}
            {...provided.dragHandleProps}
            className={cn(
              "rounded-lg border bg-card p-3 shadow-sm space-y-2 cursor-pointer hover:shadow-md transition-shadow",
              isOverdue && "border-red-300 bg-red-50",
            )}
          >
            <p className="font-medium text-sm">{task.title}</p>

            <div className="flex items-center justify-between">
              <Badge className={priorityColors[task.priority]} variant="secondary">
                {task.priority}
              </Badge>
              <span className="text-xs text-muted-foreground">
                {task.assignee_name}
              </span>
            </div>

            {isOverdue && task.due_date && (
              <p className="text-xs text-red-600 font-medium">
                Overdue: {new Date(task.due_date).toLocaleDateString()}
              </p>
            )}
          </div>
        </Link>
      )}
    </Draggable>
  );
}
