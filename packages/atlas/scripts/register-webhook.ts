/**
 * Tells Atlas where to push disruption and ticketing events.
 *
 * `/updateWebhookURL.do` was wrapped and exported for months without ever
 * being called, which is why the app could only poll. Run this once per
 * environment after deploying, and again whenever the public URL changes.
 *
 *   bun run webhook:register
 *
 * Credentials and the shared token come from the environment, never argv —
 * a secret on a command line ends up in shell history.
 */

const apiUrl = process.env.ATLAS_API_URL;
const clientId = process.env.ATLAS_CLIENT_ID;
const clientSecret = process.env.ATLAS_CLIENT_SECRET;
const appUrl = process.env.NEXT_PUBLIC_APP_URL;
const token = process.env.ATLAS_WEBHOOK_TOKEN;

const missing = [
  ["ATLAS_API_URL", apiUrl],
  ["ATLAS_CLIENT_ID", clientId],
  ["ATLAS_CLIENT_SECRET", clientSecret],
  ["NEXT_PUBLIC_APP_URL", appUrl],
  ["ATLAS_WEBHOOK_TOKEN", token],
]
  .filter(([, value]) => !value)
  .map(([name]) => name);

if (missing.length > 0) {
  process.stderr.write(`Missing environment: ${missing.join(", ")}\n`);
  process.exit(1);
}

const callback = `${appUrl}/api/webhooks/atlas?token=${token}`;

const response = await fetch(`${apiUrl}/updateWebhookURL.do`, {
  body: JSON.stringify({ url: callback }),
  headers: {
    Accept: "application/json",
    "Accept-Encoding": "gzip",
    "Content-Type": "application/json",
    "x-atlas-client-id": clientId as string,
    "x-atlas-client-secret": clientSecret as string,
  },
  method: "POST",
});

const body = (await response.json()) as {
  msg?: string | null;
  status?: number;
};

process.stdout.write(
  `${body.status === 0 ? "registered" : "failed"}: ${callback}\nstatus ${body.status} ${body.msg ?? ""}\n`
);

process.exit(body.status === 0 ? 0 : 1);
