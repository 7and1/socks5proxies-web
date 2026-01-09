export type ProxyFormat = "clash" | "json" | "curl";

interface ParsedProxy {
  ip: string;
  port: string;
  user?: string;
  pass?: string;
}

export function convertProxies(input: string, format: ProxyFormat): string {
  const lines = input
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  const proxies = lines.reduce<ParsedProxy[]>((acc, line) => {
    const match = line.match(/^([\w.-]+):(\d+)(?::([^:]+):([^:]+))?$/);
    if (!match) return acc;
    acc.push({ ip: match[1], port: match[2], user: match[3], pass: match[4] });
    return acc;
  }, []);

  if (format === "json") {
    return JSON.stringify(proxies, null, 2);
  }

  if (format === "clash") {
    return (
      "proxies:\n" +
      proxies
        .map((proxy) => {
          const auth =
            proxy.user && proxy.pass
              ? `username: \"${proxy.user}\", password: \"${proxy.pass}\", `
              : "";
          return `  - { name: \"${proxy.ip}\", type: socks5, server: ${proxy.ip}, port: ${proxy.port}, ${auth}udp: true }`;
        })
        .join("\n")
    );
  }

  return proxies
    .map((proxy) => {
      const auth =
        proxy.user && proxy.pass ? `${proxy.user}:${proxy.pass}@` : "";
      return `curl -x socks5://${auth}${proxy.ip}:${proxy.port} https://api.ipify.org`;
    })
    .join("\n");
}
