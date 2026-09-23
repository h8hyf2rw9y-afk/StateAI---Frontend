"use client";

import { use } from "react";
import { RenovaCaseDetail } from "@/features/renova/components/renova-case-detail";

/** The Renova case detail page. `id` comes straight from the URL; the backend alone decides whether it is a real, authorized case. */
export default function RenovaCasePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return <RenovaCaseDetail key={id} caseId={id} />;
}
