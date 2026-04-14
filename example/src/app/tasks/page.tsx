import { TaskForm } from "@/components/task-form";

export default function NewTaskPage() {
  return (
    <div className="p-8 max-w-2xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold">New Task</h1>
      <TaskForm />
    </div>
  );
}
