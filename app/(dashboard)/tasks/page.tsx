import { Plus } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { TaskList } from "@/features/tasks/components/task-list";

export default function TasksPage() {
  return (
    <>
      <PageHeader
        title="Tasks"
        description="Follow-ups, deadlines, and other work across your whole team."
        actions={
          <Button disabled>
            <Plus />
            New task
          </Button>
        }
      />
      <TaskList />
    </>
  );
}
