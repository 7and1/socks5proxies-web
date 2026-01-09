export interface ParsedProxyInput {
  valid: string[];
  invalid: string[];
  ignored: string[];
}

const urlPattern = /^(socks5|socks4|socks|http|https):\/\/[^\s]+$/i;
const basicPattern = /^([\w.-]+):(\d+)(?::([^:]+):([^:]+))?$/;

// SECURITY: Patterns to detect potential injection attempts
const sqlInjectionPattern =
  /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|UNION)\b|--|;)/i;
const xssPattern = /<script[^>]*>|javascript:|on\w+\s*=/i;

export function isValidProxyLine(line: string): boolean {
  // SECURITY: Reject lines with potential injection patterns
  if (sqlInjectionPattern.test(line) || xssPattern.test(line)) {
    return false;
  }
  return urlPattern.test(line) || basicPattern.test(line);
}

export function sanitizeProxyLine(line: string): string {
  // SECURITY: Remove null bytes and control characters
  return line
    .replace(/\x00/g, "")
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "")
    .trim();
}

export function parseProxyLines(input: string, limit = 500): ParsedProxyInput {
  const lines = input
    .split(/\r?\n/)
    .map((line) => sanitizeProxyLine(line))
    .filter(Boolean);

  const valid: string[] = [];
  const invalid: string[] = [];
  const ignored: string[] = [];

  for (const line of lines) {
    if (!isValidProxyLine(line)) {
      invalid.push(line);
      continue;
    }

    if (valid.length < limit) {
      valid.push(line);
    } else {
      ignored.push(line);
    }
  }

  return { valid, invalid, ignored };
}
