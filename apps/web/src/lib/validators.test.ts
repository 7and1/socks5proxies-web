import { describe, expect, it } from "vitest";
import { isValidProxyLine, parseProxyLines } from "./validators";

describe("validators", () => {
  it("validates proxy lines", () => {
    expect(isValidProxyLine("1.1.1.1:8080")).toBe(true);
    expect(isValidProxyLine("socks5://user:pass@1.1.1.1:1080")).toBe(true);
    expect(isValidProxyLine("not-a-proxy")).toBe(false);
  });

  it("parses and limits proxies", () => {
    const input = "1.1.1.1:8080\ninvalid\n2.2.2.2:9090";
    const result = parseProxyLines(input, 1);
    expect(result.valid).toHaveLength(1);
    expect(result.invalid).toHaveLength(1);
    expect(result.ignored).toHaveLength(1);
  });
});
