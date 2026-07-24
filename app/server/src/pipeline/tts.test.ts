import assert from "node:assert/strict";
import test from "node:test";
import { probeKokoroRuntime } from "../hyperframes-runtime.js";
import { parseHyperframesTtsError } from "./tts.js";

test("parseHyperframesTtsError reads the final JSON error from stdout", () => {
  const message = parseHyperframesTtsError({
    stdout: 'Preparing voice…\n{"ok":false,"error":"The kokoro-onnx package is not installed"}\n',
    stderr: "",
    message: "Command failed with a very long narration",
  });
  assert.equal(message, "The kokoro-onnx package is not installed");
});

test("parseHyperframesTtsError falls back to concise stderr", () => {
  const message = parseHyperframesTtsError({
    stdout: "",
    stderr: "first detail\nfinal detail",
    message: "Command failed with narration that should not be shown",
  });
  assert.equal(message, "first detail\nfinal detail");
  assert.doesNotMatch(message, /narration that should not be shown/);
});

test("app-local Kokoro runtime is ready", async () => {
  const runtime = await probeKokoroRuntime();
  assert.equal(runtime.ok, true, runtime.detail);
  assert.match(runtime.pythonPath ?? "", /app\/python\/\.venv\/bin\/python$/);
  assert.deepEqual(runtime.missingModules, []);
});
