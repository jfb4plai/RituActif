import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { buildAnthropicRequestBody, extractSimplifiedText } from "./logic.ts";

Deno.test("buildAnthropicRequestBody uses claude-sonnet-5 and includes the user text", () => {
  const body = buildAnthropicRequestBody("Va te laver les mains puis reviens t'asseoir.");
  assertEquals(body.model, "claude-sonnet-5");
  assertEquals(body.messages, [
    { role: "user", content: "Va te laver les mains puis reviens t'asseoir." },
  ]);
});

Deno.test("extractSimplifiedText reads the first content block", () => {
  const result = extractSimplifiedText({ content: [{ text: "se laver les mains\ns'asseoir" }] });
  assertEquals(result, "se laver les mains\ns'asseoir");
});

Deno.test("extractSimplifiedText returns empty string when content is missing", () => {
  assertEquals(extractSimplifiedText({}), "");
});
