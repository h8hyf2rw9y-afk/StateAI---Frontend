import { PageHeader } from "@/components/shared/page-header";
import { SectionCard } from "@/components/shared/section-card";
import { AgentCard } from "@/features/ai/components/agent-card";
import { AiChatPlaceholder } from "@/features/ai/components/ai-chat-placeholder";
import { RecommendationList } from "@/features/ai/components/recommendation-list";
import { mockAgents, mockRecommendations } from "@/features/ai/mock-data";

export default function AiAssistantPage() {
  return (
    <>
      <PageHeader
        title="AI Assistant"
        description="The agents that will actively work your pipeline alongside you."
      />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {mockAgents.map((agent) => (
          <AgentCard key={agent.id} agent={agent} />
        ))}
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-3">
        <div className="xl:col-span-2">
          <AiChatPlaceholder />
        </div>
        <SectionCard title="Recent recommendations">
          <RecommendationList recommendations={mockRecommendations} />
        </SectionCard>
      </div>
    </>
  );
}
