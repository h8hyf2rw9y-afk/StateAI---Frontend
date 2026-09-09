"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Search, Users } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { EmptyState } from "@/components/shared/empty-state";
import { StageBadge } from "@/features/pipeline/components/stage-badge";
import { LeadScoreBadge } from "@/features/leads/components/lead-score-badge";
import type { Lead } from "@/features/leads/types";
import { LEAD_SOURCE_LABELS } from "@/features/leads/types";
import { PIPELINE_STAGES, PIPELINE_STAGE_LABELS } from "@/features/pipeline/types";
import { mockProperties } from "@/features/properties/mock-data";
import { formatCurrency, formatRelativeToToday, getInitials } from "@/lib/format";

const propertyNameById = new Map(mockProperties.map((p) => [p.id, p.name]));

export function LeadsTable({ leads }: { leads: Lead[] }) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const filteredLeads = useMemo(() => {
    return leads.filter((lead) => {
      const matchesStatus = statusFilter === "all" || lead.status === statusFilter;
      const matchesQuery =
        query.trim().length === 0 ||
        lead.name.toLowerCase().includes(query.toLowerCase()) ||
        lead.email.toLowerCase().includes(query.toLowerCase());
      return matchesStatus && matchesQuery;
    });
  }, [leads, query, statusFilter]);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1 sm:max-w-xs">
          <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search leads by name or email…"
            className="pl-8"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value ?? "all")}>
          <SelectTrigger className="sm:w-52">
            <SelectValue placeholder="All statuses">
              {(value: string | null) =>
                !value || value === "all" ? "All statuses" : PIPELINE_STAGE_LABELS[value as keyof typeof PIPELINE_STAGE_LABELS]
              }
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            {PIPELINE_STAGES.map((stage) => (
              <SelectItem key={stage} value={stage}>
                {PIPELINE_STAGE_LABELS[stage]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="overflow-hidden rounded-xl border">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/40">
              <TableHead>Lead</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Score</TableHead>
              <TableHead>Source</TableHead>
              <TableHead>Budget</TableHead>
              <TableHead>Interested in</TableHead>
              <TableHead>Last interaction</TableHead>
              <TableHead>Next action</TableHead>
              <TableHead>Follow-up</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredLeads.map((lead) => (
              <TableRow
                key={lead.id}
                className="cursor-pointer hover:bg-muted/40"
                onClick={() => router.push(`/leads/${lead.id}`)}
              >
                <TableCell>
                  <div className="flex items-center gap-2.5">
                    <Avatar className="size-8">
                      <AvatarFallback className="text-xs">
                        {getInitials(lead.name)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex flex-col">
                      <span className="font-medium">{lead.name}</span>
                      <span className="text-xs text-muted-foreground">{lead.email}</span>
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <StageBadge stage={lead.status} />
                </TableCell>
                <TableCell>
                  <LeadScoreBadge score={lead.score} />
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {LEAD_SOURCE_LABELS[lead.source]}
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {formatCurrency(lead.budgetMin, lead.currency)} – {formatCurrency(lead.budgetMax, lead.currency)}
                </TableCell>
                <TableCell className="max-w-[180px] truncate text-muted-foreground">
                  {lead.interestedPropertyIds.map((id) => propertyNameById.get(id)).filter(Boolean).join(", ") || "—"}
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {formatRelativeToToday(lead.lastInteractionAt)}
                </TableCell>
                <TableCell className="max-w-[220px] truncate">{lead.nextAction}</TableCell>
                <TableCell className="text-muted-foreground">
                  {lead.followUpDate ? formatRelativeToToday(lead.followUpDate) : "—"}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        {filteredLeads.length === 0 && (
          <EmptyState
            icon={Users}
            title="No leads match your filters"
            description="Try a different search term or clear the status filter."
          />
        )}
      </div>
    </div>
  );
}
