import { z } from "zod";

export const ProxyProtocolSchema = z.enum([
  "socks5",
  "socks4",
  "socks",
  "http",
  "https",
]);

export const ProxyResultSchema = z.object({
  ip: z.string(),
  port: z.union([z.string(), z.number().int().positive()]),
  protocol: z.string(),
  status: z.boolean(),
  latency: z.number().int().nonnegative(),
  country: z.string().optional(),
  anonymity: z.string().optional(),
  error: z.string().optional(),
  checkedAt: z.string().optional(),
});

export const CheckRequestSchema = z.object({
  proxies: z.array(z.string()).min(1).max(500),
});

export const CheckResponseSchema = z.object({
  results: z.array(ProxyResultSchema),
  total: z.number().int().nonnegative(),
  working: z.number().int().nonnegative(),
  failed: z.number().int().nonnegative(),
});

export const HealthResponseSchema = z.object({
  status: z.literal("ok"),
  service: z.string(),
  timestamp: z.string().datetime(),
  version: z.string().optional(),
});

export const ApiErrorSchema = z.object({
  error: z.string(),
  message: z.string().optional(),
  code: z.string().optional(),
});

export type ProxyProtocol = z.infer<typeof ProxyProtocolSchema>;
export type ProxyResult = z.infer<typeof ProxyResultSchema>;
export type CheckRequest = z.infer<typeof CheckRequestSchema>;
export type CheckResponse = z.infer<typeof CheckResponseSchema>;
export type HealthResponse = z.infer<typeof HealthResponseSchema>;
export type ApiError = z.infer<typeof ApiErrorSchema>;
