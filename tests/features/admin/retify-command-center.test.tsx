import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { RetifyCommandCenter } from "@/features/admin/components/retify-command-center";

const getRetifyDashboardMock=vi.fn();
vi.mock("@/lib/api/organization",async importOriginal=>{const original=await importOriginal<typeof import("@/lib/api/organization")>();return{...original,getRetifyDashboard:(...args:unknown[])=>getRetifyDashboardMock(...args)};});
const metrics={received:12,active:8,closed:2,archived:2,contacted:9,no_answer:3,follow_ups_overdue:2,proposals_sent:5,negotiating:2,accepted:3,operations_open:2,operations_closed:1,conversion_rate:25};
const dashboard={period:"30d",assigned_user_id:null,summary:metrics,advisors:[{user_id:"owner",email:"owner@example.com",role:"owner",is_active:true,metrics},{user_id:"ana",email:"ana@example.com",role:"renova_agent",is_active:true,metrics}],attention:[{case_id:"case-1",owner_name:"Cliente urgente",assigned_user_id:"ana",advisor_email:"ana@example.com",status:"negotiating",priority:"urgent",reason:"Seguimiento vencido",next_follow_up_at:"2026-10-08T10:00:00Z"}]};
beforeEach(()=>{vi.clearAllMocks();getRetifyDashboardMock.mockResolvedValue({ok:true,data:dashboard});});
describe("RetifyCommandCenter",()=>{
  it("shows team results and attention items",async()=>{render(<RetifyCommandCenter/>);expect(await screen.findByText("Cliente urgente")).toBeInTheDocument();expect(screen.getAllByText("owner@example.com").length).toBeGreaterThan(0);expect(screen.getByText("25% de conversión")).toBeInTheDocument();expect(screen.getByText("Seguimiento vencido")).toBeInTheDocument();});
  it("reloads when period or advisor changes",async()=>{render(<RetifyCommandCenter/>);await screen.findByText("Cliente urgente");fireEvent.change(screen.getByRole("combobox",{name:/periodo/i}),{target:{value:"7d"}});await waitFor(()=>expect(getRetifyDashboardMock).toHaveBeenCalledWith("7d",undefined));fireEvent.change(screen.getByRole("combobox",{name:/asesor/i}),{target:{value:"ana"}});await waitFor(()=>expect(getRetifyDashboardMock).toHaveBeenCalledWith("7d","ana"));});
});
