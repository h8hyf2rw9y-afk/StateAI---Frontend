import "@testing-library/jest-dom/vitest";
import { afterEach } from "vitest";
import { cleanup } from "@testing-library/react";

// vitest.config.ts doesn't set `test.globals: true`, so @testing-library/react's
// own auto-cleanup (which only registers when it detects a global `afterEach`)
// never kicks in — without this, every render() in a test file accumulates in
// the same jsdom document, and any two tests that render the same button/text
// (e.g. two "Analyze lead" buttons across different `it` blocks) start
// colliding with "multiple elements found" errors that have nothing to do
// with the component under test.
afterEach(() => cleanup());
