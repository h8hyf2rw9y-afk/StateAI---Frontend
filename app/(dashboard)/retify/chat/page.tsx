import { PageHeader } from "@/components/shared/page-header";
import { RenovaChatWorkspace } from "@/features/ai/components/renova-chat-workspace";

export default function RetifyChatPage() {
  return (
    <>
      <PageHeader
        title="Chat Retify"
        description="Consulta tus expedientes, seguimientos, adeudos y etapas del pipeline."
      />
      <RenovaChatWorkspace />
    </>
  );
}
