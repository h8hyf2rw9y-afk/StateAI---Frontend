"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Search, Users } from "lucide-react";
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
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/shared/empty-state";
import { FormError } from "@/features/auth/components/form-error";
import { getApiErrorMessage } from "@/lib/api/errors";
import { getContacts } from "@/lib/api/contacts";
import { formatContactRole, formatContactSource, type Contact } from "@/features/leads/types";
import { formatTimestamp, getInitials } from "@/lib/format";

type Status = "loading" | "success" | "error";

/**
 * Real backend contacts, fetched on mount — the actual CRM source of truth
 * (app/api/routes/contacts.py), not features/leads/mock-data.ts. No
 * score/status/budget columns: Contact has none of those fields, and
 * fabricating them would violate the "don't invent backend data" rule this
 * task is built around — see features/leads/types.ts's Contact/Lead
 * comment for why a fresh type was introduced instead of stretching Lead
 * to fit.
 */
export function LeadsTable() {
  const router = useRouter();
  const [status, setStatus] = useState<Status>("loading");
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("all");

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const response = await getContacts();
      if (cancelled) return;

      if (!response.ok) {
        setErrorMessage(getApiErrorMessage(response.error));
        setStatus("error");
        return;
      }

      setContacts(response.data);
      setStatus("success");
    }

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const availableRoles = useMemo(() => {
    const roles = new Set<string>();
    for (const contact of contacts) {
      for (const role of contact.roles) roles.add(role.role_key);
    }
    return Array.from(roles).sort();
  }, [contacts]);

  const filteredContacts = useMemo(() => {
    return contacts.filter((contact) => {
      const matchesRole = roleFilter === "all" || contact.roles.some((r) => r.role_key === roleFilter);
      const name = `${contact.first_name} ${contact.last_name}`.toLowerCase();
      const matchesQuery =
        query.trim().length === 0 ||
        name.includes(query.toLowerCase()) ||
        (contact.email?.toLowerCase().includes(query.toLowerCase()) ?? false);
      return matchesRole && matchesQuery;
    });
  }, [contacts, query, roleFilter]);

  if (status === "loading") {
    return (
      <div className="flex flex-col items-center gap-2 rounded-xl border py-16 text-center">
        <Loader2 className="size-5 animate-spin text-muted-foreground" aria-hidden="true" />
        <p className="text-sm text-muted-foreground">Loading leads…</p>
      </div>
    );
  }

  if (status === "error") {
    return (
      <div className="rounded-xl border p-6">
        <FormError message={errorMessage} />
      </div>
    );
  }

  if (contacts.length === 0) {
    return (
      <div className="rounded-xl border">
        <EmptyState
          icon={Users}
          title="No leads yet"
          description="Contacts your organization adds will show up here."
        />
      </div>
    );
  }

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
        {availableRoles.length > 0 && (
          <Select value={roleFilter} onValueChange={(value) => setRoleFilter(value ?? "all")}>
            <SelectTrigger className="sm:w-52">
              <SelectValue placeholder="All roles">
                {(value: string | null) => (!value || value === "all" ? "All roles" : formatContactRole(value))}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All roles</SelectItem>
              {availableRoles.map((role) => (
                <SelectItem key={role} value={role}>
                  {formatContactRole(role)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      <div className="overflow-hidden rounded-xl border">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/40">
              <TableHead>Lead</TableHead>
              <TableHead>Phone</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Source</TableHead>
              <TableHead>Created</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredContacts.map((contact) => {
              const name = `${contact.first_name} ${contact.last_name}`;
              return (
                <TableRow
                  key={contact.id}
                  className="cursor-pointer hover:bg-muted/40"
                  onClick={() => router.push(`/leads/${contact.id}`)}
                >
                  <TableCell>
                    <div className="flex items-center gap-2.5">
                      <Avatar className="size-8">
                        <AvatarFallback className="text-xs">{getInitials(name)}</AvatarFallback>
                      </Avatar>
                      <div className="flex flex-col">
                        <span className="font-medium">{name}</span>
                        <span className="text-xs text-muted-foreground">{contact.email ?? "—"}</span>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{contact.phone ?? "—"}</TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {contact.roles.length > 0 ? (
                        contact.roles.map((role) => (
                          <Badge key={role.role_key} variant="outline">
                            {formatContactRole(role.role_key)}
                          </Badge>
                        ))
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{formatContactSource(contact.source)}</TableCell>
                  <TableCell className="text-muted-foreground">{formatTimestamp(contact.created_at)}</TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
        {filteredContacts.length === 0 && (
          <EmptyState
            icon={Users}
            title="No leads match your filters"
            description="Try a different search term or clear the role filter."
          />
        )}
      </div>
    </div>
  );
}
