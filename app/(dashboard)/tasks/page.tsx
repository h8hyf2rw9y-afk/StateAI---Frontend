"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { TaskList } from "@/features/tasks/components/task-list";
import { TaskForm } from "@/features/tasks/components/task-form";

/**
 * A Client Component page (unlike most other list pages in this app) so
 * the header's "New task" button can trigger a refresh of the list below
 * it once a task is actually created: Tasks has no per-entity detail page
 * to redirect to afterward (unlike Contact/Property/Opportunity), so the
 * natural place to land is back on this same list, showing the new task —
 * `refreshKey`, bumped on save and passed to `<TaskList key={refreshKey}>`,
 * forces a clean remount (and re-fetch) rather than threading a refetch
 * callback down through props.
 */
export default function TasksPage() {
  const [refreshKey, setRefreshKey] = useState(0);

  return (
    <>
      <PageHeader
        title="Tasks"
        description="Follow-ups, deadlines, and other work across your whole team."
        actions={
          <TaskForm
            onSaved={() => setRefreshKey((k) => k + 1)}
            trigger={
              <Button>
                <Plus />
                New task
              </Button>
            }
          />
        }
      />
      <TaskList key={refreshKey} />
    </>
  );
}
