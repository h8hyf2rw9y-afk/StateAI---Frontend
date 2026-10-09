import { PageHeader } from "@/components/shared/page-header";
import { TeamInvitations } from "@/features/admin/components/team-invitations";
import { TeamMembers } from "@/features/admin/components/team-members";
import { RetifyCommandCenter } from "@/features/admin/components/retify-command-center";
import { RoleAccessPreview } from "@/features/admin/components/role-access-preview";

/** Owner/admin only. The owner controls every role; a normal admin can manage Retify advisors only. */
export default function AdminPage() {
  return (
    <>
      <PageHeader title="Administración Retify" description="Resultados, permisos e invitaciones del equipo de adquisición." />
      <div className="flex flex-col gap-6">
        <RetifyCommandCenter />
        <TeamMembers />
        <RoleAccessPreview />
        <TeamInvitations />
      </div>
    </>
  );
}
