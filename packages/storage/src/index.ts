import { env } from "@atlas/env/server";
import { createFiles } from "files-sdk";
import { cache } from "files-sdk/cache";
import { compression } from "files-sdk/compression";
import { contentType } from "files-sdk/content-type";
import { encryption } from "files-sdk/encryption";
import { s3 } from "files-sdk/s3";
import { signedUrlPolicy } from "files-sdk/signed-url-policy";
import { validation } from "files-sdk/validation";

export const createStorage = () =>
  createFiles({
    adapter: s3({
      bucket: env.S3_BUCKET,
      credentials: {
        accessKeyId: env.S3_ACCESS_KEY_ID,
        secretAccessKey: env.S3_SECRET_ACCESS_KEY,
      },
      endpoint: env.S3_ENDPOINT,
      region: env.S3_REGION,
    }),
    plugins: [
      signedUrlPolicy({
        maxExpiresIn: 15 * 60,
        maxUploadSize: 50 * 1024 * 1024,
      }),
      cache({
        maxBytes: 1024 * 1024,
        operations: ["head", "url", "download"],
        ttl: 60_000,
      }),
      validation({
        maxSize: 50 * 1024 * 1024,
        minSize: 1,
      }),
      contentType(),
      compression(),
      encryption(Buffer.from(env.S3_ENCRYPTION_KEY, "base64")),
    ],
  });

export const storage = createStorage();
