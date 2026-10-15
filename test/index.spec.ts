import {
  env,
  createExecutionContext,
  waitOnExecutionContext,
  SELF,
} from "cloudflare:test";
import { describe, it, expect } from "vitest";
import worker from "../src/index";

const IncomingRequest = Request<unknown, IncomingRequestCfProperties>;

describe("finsystem worker", () => {
  it("responds to /api/health (unit style)", async () => {
    const request = new IncomingRequest("http://example.com/api/health");
    const ctx = createExecutionContext();
    const response = await worker.fetch(request, env, ctx);
    await waitOnExecutionContext(ctx);
    expect(await response.json()).toEqual({ ok: true });
  });

  it("responds to /api/health (integration style)", async () => {
    const response = await SELF.fetch("https://example.com/api/health");
    expect(await response.json()).toEqual({ ok: true });
  });
});
