# Task: give Travel Sentinel a real instrument

Implement exactly what is written here. Where this document names a file, a constant or a threshold, use that name and that value. Where it says something must never happen, that is a requirement and not a preference.

Do not ask questions. Every decision you would need to make has been made below. If something genuinely cannot be built as described, stop and say which line is impossible and why, rather than substituting your own design.

---

## The repository

A Bun + Turborepo monorepo. TypeScript throughout, strict.

```
agents/travel-sentinel/     the agent you are changing
apps/web/                   Next.js 16 app, reads the alerts
packages/db/                Drizzle ORM over Postgres (Neon)
```

Commands, run from the repo root:

```bash
bun install
bun run test                  # bun test via turbo
bunx ultracite fix <paths>    # formats and lints; must pass clean
```

Per-package typecheck:

```bash
cd agents/travel-sentinel && bunx tsc --noEmit
cd packages/db            && bunx tsc --noEmit
cd apps/web               && bunx tsc --noEmit
```

`bunx tsc --noEmit` must produce no output in every package you touch, and `bunx ultracite fix` must report no errors. Both are non-negotiable gates.

---

## Why this change exists

`travel-sentinel` posts destination alerts to the `/activity` dashboard. Today it produces them like this, from `agent/schedules/travel-monitor.ts`:

> run `firecrawl__firecrawl_search` with targeted queries for travel advisories, safety alerts, weather warnings, and transit disruptions. If you find genuinely new alerts, call `report-alert` once per alert

So a language model searches the web, decides what counts as an alert, writes the alert text, and supplies the latitude and longitude that place it on a globe. The model is the measuring instrument.

It has no instrument. It has fluency. Fluency about a typhoon reads exactly like knowledge of one, and a traveller who cancels a trip because of a hallucinated flood has been harmed by software that meant to help. This is not fixable with a confidence threshold, because the failure mode is not a low-confidence answer — it is a high-confidence answer with nothing behind it.

The first evidence already arrived. On its first real run the schedule posted the same Seoul heat warning twice from one Korea Herald URL, once as `medium` and once as `high`. Deduplication had been left to the model's judgement, and its judgement was wrong on the first attempt. That has since been fixed in code (`report-alert` refuses a source URL already on the board) — treat it as the pattern to follow, not as an isolated incident.

**Your job is to add one real instrument and make the agent honest about everything it cannot measure.**

---

## What you are building

### 1. `agent/lib/hazards.ts` — the instrument

Reads recorded earthquakes from the USGS FDSN event service. No key, no quota, no account.

```
https://earthquake.usgs.gov/fdsnws/event/1/query
  ?format=geojson
  &latitude=<lat>&longitude=<lon>
  &maxradiuskm=<radius>
  &minmagnitude=<magnitude>
  &starttime=<ISO date>
  &orderby=time
```

Filter by radius server-side so the response stays small and the distance you report is computed from coordinates USGS published, not from a guess about where a city is.

Export these constants with these exact values and a comment giving the reason:

| constant | value | reason |
| --- | --- | --- |
| `MIN_MAGNITUDE` | 4.5 | Below this it is not news even next door |
| `DEFAULT_RADIUS_KM` | 300 | Roughly where a quake is felt rather than merely recorded |
| `LOOKBACK_DAYS` | 14 | Instrumental sources are recent-only; older is history |
| `WORTH_REPORTING` | 5.0 | The bar for posting unprompted, higher than for answering |

Export:

- `checkHazards({ code, radiusKm?, minMagnitude? })` returning a discriminated result: either the events found, or an explicit "no instrument for this place" / "source unreachable" outcome. Never an empty array standing in for a failure.
- `greatCircleKm(a, b)` — haversine, used to report distance per event.
- `placeOf(code)` — see below.

**USGS being unreachable must be reported as unreachable.** Silence is indistinguishable from "nothing happened", which is the one wrong answer this tool must never give. Return a distinct outcome for a failed fetch and let the caller say so.

### 2. `agent/lib/gazetteer.ts` — coordinates from a table

```ts
/** Null when we do not know where the code is — never a guess. */
export const placeOf = (code: string) =>
  GAZETTEER[code.trim().toUpperCase()] ?? null;
```

A hand-written map of IATA city or airport codes to `{ name, countryCode, lat, lon }`. Populate it with the destinations this project actually serves — at minimum: KUL, SIN, BKK, PEN, HKT, DPS, CGK, MNL, HAN, SGN, ICN, NRT, HND, KIX, TPE, HKG, SYD, MEL, DXB, DOH, LHR, CDG.

A model will produce coordinates for any city on earth, confidently and sometimes wrongly, and a wrong latitude means an earthquake reported against the wrong trip. An unknown code returns null and the caller says it does not know that place. A gap is recoverable; a fabricated epicentre is not.

**No function in this codebase may accept coordinates that originated from the model.** That includes `report-alert` (see step 5).

### 3. `agent/tools/check-hazards.ts` — on demand

A read-only tool, no approval gate, for when a traveller asks. Input is a destination code and optionally a radius. Output carries, per event: magnitude, place description as USGS wrote it, event time, distance in km computed by `greatCircleKm`, and the USGS event page URL.

When `placeOf` returns null, return a result that says the code is unknown. Do not fall back to a search.

### 4. `agent/schedules/hazard-watch.ts` — unprompted

```ts
cron: "0 23 * * *"; // 07:00 Malaysia time, which is UTC+8
```

Read upcoming trips with `order-list`, resolve each destination through `placeOf`, and check each distinct place once. Post only events at or above `WORTH_REPORTING`, and only for trips within 45 days. If there is nothing, produce no output at all — an empty daily message trains people to ignore the channel.

> **Before you write the cron:** this repo deploys to Vercel, where Hobby accounts reject any expression that runs more than once per day and fail the build. Daily is deliberate and must stay daily.

### 5. `agent/tools/report-alert.ts` — close the coordinate hole

It currently accepts `latitude` and `longitude` as model input. Remove both from the input schema. Take a destination code instead, resolve it through `placeOf`, and refuse the call when the code is unknown rather than writing a row that would appear somewhere arbitrary on the globe.

Keep the existing duplicate-source refusal exactly as it is.

The database column stays as it is — `packages/db/src/schema/activity.ts` has `latitude` and `longitude` as `doublePrecision().notNull()`. You are changing where the values come from, not the table. **Do not write a migration.**

### 6. `agent/skills/destination-hazards.md` — the discipline

Three tiers, and this is the substance of the task, not decoration:

**Tier 1 — a measurement exists.** State it as a measurement with a link: "USGS recorded a magnitude 5.3 on 12 August, 84 km east of Tokyo." Offer to check whether flights are still operating, price a date change without booking it, or watch the route.

**Tier 2 — no instrument for this hazard.** Say so and offer what can be checked:

> "I can only check recorded earthquakes, and there is nothing near Bangkok. I have no source for the flooding you saw, so I would not want to guess. What I can tell you is that your flight on the 4th is still scheduled — shall I keep watching it?"

**Tier 3 — the instrument failed.** Say the source was unreachable. Never let that read as "nothing happened".

Never stated, in any turn:

- **Damage, casualties or closures.** USGS reports ground motion. It does not report what fell down.
- **Whether to travel.** Not "you should be fine", not "I would postpone".
- **An all-clear.** "Nothing was recorded" is true. "It is safe" is a different sentence and is not the agent's to say.

The traveller knows why they are going, who they are meeting, and what they can afford to lose. Supply the measurement; offer to act on whatever they decide.

### 7. `agent/instructions.md` — the short version

Add a section holding the rule that always needs to be in context: the agent reports measurements, never judgements; it refuses rather than guesses when it has no instrument; and web search is background reading, never the basis of a posted alert.

The existing Firecrawl capability stays for answering questions and reading context. It must no longer be the source of anything written to `activity_alert`.

### 8. `agent/lib/hazards.test.ts` — tests

`bun test`. Cover, with the network stubbed — never call USGS in a test:

- `greatCircleKm` against a known pair (KUL→SIN is roughly 297 km; allow ±5 km)
- `placeOf` returns null for an unknown code, and never throws
- A USGS response below `MIN_MAGNITUDE` yields no events
- A failed fetch returns the unreachable outcome, **not** an empty list
- An unknown code short-circuits before any fetch is attempted

Name each test after the failure it prevents, not the function it calls.

---

## Code conventions

Follow the surrounding files; they are consistent and you should match them.

- Arrow-function exports: `export const foo = () => {}`. Components and eve definitions follow the existing shape in their own directories.
- **Object keys and JSX props are sorted alphabetically.** The linter enforces this and will fail you.
- No `Array.prototype.reduce`, no nested ternaries, no `sort` (use `toSorted`).
- Regex literals need the `u` flag.
- Functions have a complexity ceiling of 20; split rather than nest.
- Database access inside agents uses dynamic import: `const { db } = await import("@atlas/db");`
- Comments explain **why**, never what. A comment restating the line above it is worse than no comment. Write them where a reader would otherwise ask "why is it like this" — a threshold, a refusal, a fallback that looks arbitrary.

---

## Definition of done

1. `bunx ultracite fix` clean across every path you touched
2. `bunx tsc --noEmit` silent in `agents/travel-sentinel`, `packages/db` and `apps/web`
3. `bun run test` green, including your new tests
4. No migration files created
5. `grep -rn "latitude" agents/travel-sentinel/agent/tools/report-alert.ts` returns nothing — the model can no longer supply coordinates
6. The schedule runs and posts nothing when there is nothing worth posting

Do not commit. Leave the working tree dirty for review.

---

## What is explicitly out of scope

Do not add weather, floods, storms, outbreaks or unrest. Each needs its own instrument, and until one is wired the honest answer is a refusal with an offer attached. The shape you are building makes adding a second source a `lib/` module and a tier row rather than a redesign — that is the point of it.

Do not touch `agents/booking-agent`, `agents/rebook-agent`, or `agents/flight-guardian`.

Do not change `disruption-monitor` or its cron.
