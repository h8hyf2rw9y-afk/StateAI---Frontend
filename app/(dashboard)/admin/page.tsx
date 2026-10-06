import { PageHeader } from "@/components/shared/page-header";
import { TeamInvitations } from "@/features/admin/components/team-invitations";
import { TeamMembers } from "@/features/admin/components/team-members";

/** Owner/admin only — AccessGate sends everyone else away, and every request here is require_role-gated in the backend too. */
export default function AdminPage() {
  return (
    <>
      <PageHeader title="Administración" description="Usuarios de tu organización, sus accesos e invitaciones." />
      <div className="flex flex-col gap-6">
        <TeamMembers />
        <TeamInvitations />
      </div>
    </>
  );
}
