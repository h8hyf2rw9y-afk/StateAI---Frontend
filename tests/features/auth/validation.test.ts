import { describe, expect, it } from "vitest";
import {
  getPasswordRequirementError,
  isValidEmail,
  validateLoginForm,
  validateRegisterForm,
} from "@/features/auth/validation";

describe("isValidEmail", () => {
  it("accepts a well-formed email", () => {
    expect(isValidEmail("jane@example.com")).toBe(true);
  });

  it("rejects a string with no @", () => {
    expect(isValidEmail("not-an-email")).toBe(false);
  });

  it("rejects a string with no domain", () => {
    expect(isValidEmail("jane@")).toBe(false);
  });
});

describe("getPasswordRequirementError", () => {
  it("rejects a password shorter than 8 characters", () => {
    expect(getPasswordRequirementError("ab1")).toMatch(/at least 8/i);
  });

  it("rejects a password with no letter", () => {
    expect(getPasswordRequirementError("12345678")).toMatch(/letter/i);
  });

  it("rejects a password with no number", () => {
    expect(getPasswordRequirementError("abcdefgh")).toMatch(/number/i);
  });

  it("accepts a password with 8+ chars, a letter, and a number", () => {
    expect(getPasswordRequirementError("password123")).toBeNull();
  });
});

describe("validateLoginForm", () => {
  it("flags empty fields", () => {
    const errors = validateLoginForm({ email: "", password: "" });
    expect(errors.email).toBeTruthy();
    expect(errors.password).toBeTruthy();
  });

  it("flags a malformed email but leaves a present password alone", () => {
    const errors = validateLoginForm({ email: "nope", password: "x" });
    expect(errors.email).toBeTruthy();
    expect(errors.password).toBeUndefined();
  });

  it("passes for valid input", () => {
    const errors = validateLoginForm({ email: "jane@example.com", password: "x" });
    expect(errors).toEqual({});
  });
});

describe("validateRegisterForm", () => {
  const validBase = {
    firstName: "Jane",
    lastName: "Doe",
    email: "jane@example.com",
    password: "password123",
    confirmPassword: "password123",
  };

  it("passes for fully valid input", () => {
    expect(validateRegisterForm(validBase)).toEqual({});
  });

  it("flags mismatched passwords", () => {
    const errors = validateRegisterForm({ ...validBase, confirmPassword: "different123" });
    expect(errors.confirmPassword).toMatch(/match/i);
  });

  it("flags missing first and last name", () => {
    const errors = validateRegisterForm({ ...validBase, firstName: "", lastName: "  " });
    expect(errors.firstName).toBeTruthy();
    expect(errors.lastName).toBeTruthy();
  });

  it("flags a weak password", () => {
    const errors = validateRegisterForm({ ...validBase, password: "short", confirmPassword: "short" });
    expect(errors.password).toBeTruthy();
  });
});
