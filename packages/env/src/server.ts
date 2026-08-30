import "dotenv/config";
import { createEnv } from "@t3-oss/env-core";
import { z } from "zod";

/**
 * One or more origins, comma-separated. Lets a single value cover both the
 * local dev origin and the deployed one, so nothing has to be swapped by hand.
 */
const originList = z
  .string()
  .min(1)
  .transform((value) =>
    value
      .split(",")
      .map((origin) => origin.trim())
      .filter(Boolean)
  )
  .pipe(z.array(z.url()).min(1));

export const env = createEnv({
  emptyStringAsUndefined: true,
  runtimeEnv: process.env,
  server: {
    AI_GATEWAY_API_KEY: z.string().min(1),
    ATLAS_API_URL: z.string().url(),
    ATLAS_CLIENT_ID: z.string().min(1),
    ATLAS_CLIENT_SECRET: z.string().min(1),
    BETTER_AUTH_SECRET: z.string().min(32),
    BETTER_AUTH_URL: z.url(),
    COMPOSIO_API_KEY: z.string().min(1),
    CORS_ORIGIN: originList,
    DATABASE_URL: z.string().min(1),
    GOOGLE_CLIENT_ID: z.string().min(1),
    GOOGLE_CLIENT_SECRET: z.string().min(1),
    NODE_ENV: z
      .enum(["development", "production", "test"])
      .default("development"),
    S3_ACCESS_KEY_ID: z.string().min(1),
    S3_BUCKET: z.string().min(1),
    S3_ENCRYPTION_KEY: z.string().min(1),
    S3_ENDPOINT: z.url().optional(),
    S3_REGION: z.string().min(1),
    S3_SECRET_ACCESS_KEY: z.string().min(1),
  },
  skipValidation: !!process.env.SKIP_ENV_VALIDATION,
});
