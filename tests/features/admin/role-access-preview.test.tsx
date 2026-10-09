import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { RoleAccessPreview } from "@/features/admin/components/role-access-preview";
let role="owner";
vi.mock("@/features/auth/current-user-context",()=>({useCurrentUser:()=>({me:{id:"me",role},error:null,isLoading:false})}));
describe("RoleAccessPreview",()=>{
  it("lets owner preview advisor access without changing identity",()=>{role="owner";render(<RoleAccessPreview/>);expect(screen.getByText(/no cambia tu sesión/i)).toBeInTheDocument();fireEvent.click(screen.getByRole("button",{name:"Asesor Retify"}));expect(screen.getByText("Solo ve expedientes asignados")).toBeInTheDocument();expect(screen.getByText("Mis expedientes")).toBeInTheDocument();});
  it("is hidden from normal admins",()=>{role="admin";const{container}=render(<RoleAccessPreview/>);expect(container).toBeEmptyDOMElement();});
});
