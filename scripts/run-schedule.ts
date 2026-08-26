/**
 * Fires an agent schedule once, locally.
 *
 * `eve dev` never runs schedules on their cron cadence — only a deployed build
 * does. That is why the Activity dashboard sat empty for weeks while
 * travel-monitor looked broken: it had simply never been asked to run. eve
 * mounts a dev-only dispatch route for exactly this, but the URL is buried
 * under the per-agent mount prefix, so nobody found it.
 *
 *   bun run schedule travel-sentinel travel-monitor
 *   bun run schedule travel-sentinel            # lists what that agent has
 *
 * The run is real: it calls live APIs and writes to the database, the same as
 * a production tick would.
 */

const BASE = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3001";

const [agent, schedule] = process.argv.slice(2);

if (!agent) {
  process.stderr.write(
    "usage: bun run schedule <agent> [schedule]\n" +
      "example: bun run schedule travel-sentinel travel-monitor\n"
  );
  process.exit(1);
}

const dispatch = (id: string) =>
  fetch(`${BASE}/eve/agents/${agent}/eve/v1/dev/schedules/${id}`, {
    method: "POST",
  });

// Asking for a schedule that cannot exist is how the route reports its list.
const probe = await dispatch(schedule ?? "__list__");
const body = (await probe.json()) as {
  availableScheduleIds?: string[];
  error?: string;
  scheduleId?: string;
  sessionIds?: string[];
};

if (!schedule) {
  const ids = body.availableScheduleIds ?? [];
  process.stdout.write(
    ids.length
      ? `${agent} schedules:\n${ids.map((id) => `  ${id}`).join("\n")}\n`
      : `${agent} defines no schedules.\n`
  );
  process.exit(0);
}

if (!probe.ok) {
  process.stderr.write(`${body.error ?? `HTTP ${probe.status}`}\n`);
  process.exit(1);
}

const [sessionId] = body.sessionIds ?? [];
process.stdout.write(`started ${body.scheduleId} · session ${sessionId}\n`);

if (!sessionId) {
  process.exit(0);
}

// Follow the run so the terminal shows what it did rather than just that it
// began. A schedule that fails silently is indistinguishable from one that
// found nothing, which is the failure mode this script exists to end.
const stream = await fetch(
  `${BASE}/eve/agents/${agent}/eve/v1/session/${sessionId}/stream`
);

if (!stream.body) {
  process.exit(0);
}

const decoder = new TextDecoder();

for await (const chunk of stream.body as unknown as AsyncIterable<Uint8Array>) {
  for (const line of decoder.decode(chunk).split("\n")) {
    if (!line.trim()) {
      continue;
    }
    try {
      const event = JSON.parse(line) as {
        data?: Record<string, unknown>;
        type?: string;
      };
      if (event.type === "action.called") {
        process.stdout.write(`  → ${String(event.data?.toolName ?? "")}\n`);
      }
      if (event.type === "run.completed" || event.type === "run.failed") {
        process.stdout.write(`${event.type}\n`);
      }
    } catch {
      // Partial frame at a chunk boundary; the next chunk completes it.
    }
  }
}
