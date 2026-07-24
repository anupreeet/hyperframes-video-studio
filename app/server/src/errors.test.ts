import assert from "node:assert/strict";
import test from "node:test";
import { capabilityUnavailable, prerequisite } from "./errors.js";

test("prerequisite errors carry a 409 status and upstream step", () => {
  const err = prerequisite("Run Transcribe first", "transcribe");
  assert.equal(err.status, 409);
  assert.equal(err.code, "PIPELINE_PREREQUISITE");
  assert.deepEqual(err.details, { prerequisite: "transcribe" });
});

test("capability errors carry a 503 status and remediation", () => {
  const err = capabilityUnavailable("Kokoro is unavailable", "Run setup");
  assert.equal(err.status, 503);
  assert.equal(err.code, "CAPABILITY_UNAVAILABLE");
  assert.deepEqual(err.details, { remediation: "Run setup" });
});
