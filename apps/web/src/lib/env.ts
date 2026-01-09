import { z } from "zod";

const envSchema = z.object({
  NEXT_PUBLIC_API_URL: z
    .string()
    .url()
    .default("https://api.socks5proxies.com"),
  NEXT_PUBLIC_WS_URL: z
    .string()
    .url()
    .default("wss://api.socks5proxies.com/ws"),
  NEXT_PUBLIC_SITE_URL: z.string().url().default("https://socks5proxies.com"),
  NODE_ENV: z.enum(["development", "production", "test"]).default("production"),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  const errors = parsed.error.errors
    .map((e) => `${e.path.join(".")}: ${e.message}`)
    .join("\n");
  throw new Error("Environment validation failed:\n" + errors);
}

export const env = parsed.data;

export const isDevelopment = env.NODE_ENV === "development";
export const isProduction = env.NODE_ENV === "production";
export const isTest = env.NODE_ENV === "test";
