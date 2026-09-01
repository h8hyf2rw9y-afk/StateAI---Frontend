import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { Users } from "lucide-react";
import { StatCard } from "@/components/shared/stat-card";

describe("StatCard", () => {
  it("renders the label and value", () => {
    render(<StatCard label="Active leads" value="24" icon={Users} />);

    expect(screen.getByText("Active leads")).toBeInTheDocument();
    expect(screen.getByText("24")).toBeInTheDocument();
  });

  it("renders an upward trend when provided", () => {
    render(
      <StatCard
        label="Hot leads"
        value="6"
        icon={Users}
        trend={{ value: "+2 this week", direction: "up" }}
      />
    );

    expect(screen.getByText("+2 this week")).toBeInTheDocument();
  });
});
