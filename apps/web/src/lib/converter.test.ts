import { describe, expect, it } from "vitest";
import { convertProxies } from "./converter";

describe("convertProxies", () => {
  describe("JSON format", () => {
    it("converts basic proxy to json", () => {
      const input = "1.1.1.1:8080\n2.2.2.2:9090:user:pass";
      const output = convertProxies(input, "json");
      const parsed = JSON.parse(output);
      expect(parsed).toHaveLength(2);
      expect(parsed[1].user).toBe("user");
    });

    it("handles empty input", () => {
      const output = convertProxies("", "json");
      const parsed = JSON.parse(output);
      expect(parsed).toHaveLength(0);
    });

    it("handles whitespace-only input", () => {
      const output = convertProxies("   \n\n   ", "json");
      const parsed = JSON.parse(output);
      expect(parsed).toHaveLength(0);
    });

    it("ignores invalid lines", () => {
      const input = "1.1.1.1:8080\ninvalid-line\n2.2.2.2:9090";
      const output = convertProxies(input, "json");
      const parsed = JSON.parse(output);
      expect(parsed).toHaveLength(2);
    });

    it("handles hostname instead of IP", () => {
      const input = "proxy.example.com:8080";
      const output = convertProxies(input, "json");
      const parsed = JSON.parse(output);
      expect(parsed).toHaveLength(1);
      expect(parsed[0].ip).toBe("proxy.example.com");
    });

    it("handles Windows line endings", () => {
      const input = "1.1.1.1:8080\r\n2.2.2.2:9090";
      const output = convertProxies(input, "json");
      const parsed = JSON.parse(output);
      expect(parsed).toHaveLength(2);
    });
  });

  describe("Clash format", () => {
    it("converts to clash format", () => {
      const input = "1.1.1.1:8080";
      const output = convertProxies(input, "clash");
      expect(output).toContain("proxies:");
      expect(output).toContain("1.1.1.1");
      expect(output).toContain("type: socks5");
      expect(output).toContain("udp: true");
    });

    it("includes auth in clash format", () => {
      const input = "1.1.1.1:8080:user:pass";
      const output = convertProxies(input, "clash");
      expect(output).toContain('username: "user"');
      expect(output).toContain('password: "pass"');
    });

    it("handles empty input for clash", () => {
      const output = convertProxies("", "clash");
      expect(output).toBe("proxies:\n");
    });

    it("handles multiple proxies in clash format", () => {
      const input = "1.1.1.1:8080\n2.2.2.2:9090";
      const output = convertProxies(input, "clash");
      const lines = output.split("\n");
      expect(lines).toHaveLength(3); // header + 2 proxies
    });
  });

  describe("curl format", () => {
    it("converts to curl with auth", () => {
      const input = "1.1.1.1:8080:user:pass";
      const output = convertProxies(input, "curl");
      expect(output).toContain("socks5://user:pass@1.1.1.1:8080");
      expect(output).toContain("curl -x");
      expect(output).toContain("https://api.ipify.org");
    });

    it("converts to curl without auth", () => {
      const input = "1.1.1.1:8080";
      const output = convertProxies(input, "curl");
      expect(output).toBe(
        "curl -x socks5://1.1.1.1:8080 https://api.ipify.org",
      );
    });

    it("handles empty input for curl", () => {
      const output = convertProxies("", "curl");
      expect(output).toBe("");
    });

    it("handles multiple proxies in curl format", () => {
      const input = "1.1.1.1:8080\n2.2.2.2:9090";
      const output = convertProxies(input, "curl");
      const lines = output.split("\n");
      expect(lines).toHaveLength(2);
      expect(lines[0]).toContain("1.1.1.1:8080");
      expect(lines[1]).toContain("2.2.2.2:9090");
    });
  });

  describe("edge cases", () => {
    it("handles proxy with only partial auth (user only)", () => {
      // This should be treated as invalid since pattern requires user:pass pair
      const input = "1.1.1.1:8080:user";
      const output = convertProxies(input, "json");
      const parsed = JSON.parse(output);
      expect(parsed).toHaveLength(0);
    });

    it("handles special characters in password", () => {
      // Pattern allows any non-colon characters in user/pass
      const input = "1.1.1.1:8080:user:p@ss!word";
      const output = convertProxies(input, "json");
      const parsed = JSON.parse(output);
      expect(parsed).toHaveLength(1);
      expect(parsed[0].pass).toBe("p@ss!word");
    });

    it("handles leading/trailing whitespace on lines", () => {
      const input = "  1.1.1.1:8080  \n  2.2.2.2:9090  ";
      const output = convertProxies(input, "json");
      const parsed = JSON.parse(output);
      expect(parsed).toHaveLength(2);
    });

    it("handles high port numbers", () => {
      const input = "1.1.1.1:65535";
      const output = convertProxies(input, "json");
      const parsed = JSON.parse(output);
      expect(parsed).toHaveLength(1);
      expect(parsed[0].port).toBe("65535");
    });
  });
});
