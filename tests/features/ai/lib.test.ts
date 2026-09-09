import { describe, expect, it } from "vitest";
import { getAiErrorMessage } from "@/features/ai/lib";

describe("getAiErrorMessage", () => {
  it("maps 503 (AI service not configured) to a message telling the user to check the local AI service", () => {
    expect(getAiErrorMessage({ message: "irrelevant", status: 503 })).toMatch(
      /AI is currently unavailable.*local AI service.*running/i
    );
  });

  it("maps 504 (timeout) to a friendly retry message", () => {
    expect(getAiErrorMessage({ message: "irrelevant", status: 504 })).toMatch(/took longer than expected/i);
  });

  it("maps 502 (provider/invalid-output error) to a friendly retry message", () => {
    expect(getAiErrorMessage({ message: "irrelevant", status: 502 })).toMatch(/unexpected response/i);
  });

  it("maps 401/403 to a session-expired message", () => {
    expect(getAiErrorMessage({ message: "irrelevant", status: 401 })).toMatch(/session has expired/i);
    expect(getAiErrorMessage({ message: "irrelevant", status: 403 })).toMatch(/session has expired/i);
  });

  it("maps 404 to a lead-not-found message", () => {
    expect(getAiErrorMessage({ message: "irrelevant", status: 404 })).toMatch(/couldn't be found/i);
  });

  it("maps a client-side timeout (no status, code: timeout) to a retry message", () => {
    expect(getAiErrorMessage({ message: "irrelevant", code: "timeout" })).toMatch(/took longer than expected/i);
  });

  it("maps a network failure (no status at all) to a connectivity message", () => {
    expect(getAiErrorMessage({ message: "Failed to fetch" })).toMatch(/couldn't reach the server/i);
  });

  it("never echoes the raw backend/provider message for an unmapped status", () => {
    const message = getAiErrorMessage({ message: "Traceback (most recent call last): ...", status: 500 });
    expect(message).not.toContain("Traceback");
  });
});
