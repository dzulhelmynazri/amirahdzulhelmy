# Atlas — Hackathon Demo Flow

Full user flow + behind-the-scenes agent flow, scene by scene, written to be recorded with Recordly and voiced over. Target length: **2:30–3:00**.

> Before recording: restart the dev server (`bun run dev:web`) so the latest agent changes are live, sign in as ONE account and stay on it — bookings are scoped per user.

---

## The pitch (opening voice-over, ~20s)

> "Atlas is an agentic travel companion built on the AtripTech Atlas flight API. You don't fill forms and compare tabs — you tell a team of AI agents what you need. They search, compare, warn you about hazards at your destination, book, pay, and put the trip on your calendar — while every dollar spent still passes through a human approval gate."

---

## Scene-by-scene

### Scene 1 — Sign in & the product frame (~15s)

- Open the app, sign in with Google, land on **/trips**.
- VO: "Sign in, and Atlas knows you. Every booking, fare and alert is scoped to your account."

### Scene 2 — Profile: travellers done right (~15s)

- Open **/profile**, show the saved traveller form (name as on passport, DOB, document number, email, phone).
- VO: "Passport details live in a proper form — not in a chat box. Agents read them when booking, so you're never asked twice."

### Scene 3 — The agent books a flight, end to end (~60s) ⭐ core scene

- Press **⌘I** to open the agent panel. Type: **"Book me the cheapest flight from KUL to Singapore on <a date ~2 weeks out> for 1 adult."**
- Point out as they stream in:
  1. Status line — "Asking **booking-agent**…" (the conductor delegates).
  2. **Travel-sentinel fires in parallel** — destination hazards arrive while fares are still loading. That's the agentic part: two agents at once.
  3. Fare list — five options, one per line, cheapest first.
  4. Tap a pill to pick a flight (suggestions render as one-tap pills).
  5. **The approval card** — "Create this order?" Money never moves without a human tap. Approve it.
  6. Pay approval → ticket issued, PNR on screen.
- VO: "One sentence in. The conductor classifies intent, fans out to a booking specialist and a safety specialist in parallel, and every side-effect — creating the order, paying — stops at an approval gate. Agentic, but never autonomous with your money."

### Scene 4 — /bookings updates itself (~15s)

- Switch to **/bookings** — the new order appears (page refetches every 15s), open the details sheet: PNR, order progress (Created → Confirmed → Issued), passengers, baggage allowance, total.
- VO: "The AI's booking is your booking — it lands in the same place, with Pay & issue available right from the sheet."

### Scene 5 — /fares: manual and AI share one history (~15s)

- Open **/fares** — show "Pick up where you left off": the search the agent just ran is there with an **✨ AI badge**. Click it → results replay on the page.
- VO: "Anything the agents search shows up beside your own searches, and replays as a full fare table."

### Scene 6 — Travel Sentinel: alerts tied to YOUR trips (~15s)

- Open **/activity** — the alert board watches the destinations you actually have bookings and trips for (180-day horizon), not the whole world.
- VO: "Travel Sentinel doesn't spam world news. It watches where _you_ are going."

### Scene 7 — Concierge + Google Calendar (~15s)

- In the panel: **"Add my Singapore flight to my calendar."**
- journey-concierge uses the connected Google Calendar (Composio) to write it.
- VO: "The concierge handles everything around the flight — calendar, ground transport, itineraries on the Trips page."

### Scene 8 — Proof it's real (~10s)

- Show the ATRIP portal **UAT Testing: Passed** screen — Flight Booking 2/2 cases, orders ticketed through the real sandbox API.
- VO: "This isn't a mock. The integration passed AtripTech's official UAT — search, verify, order, payment, ticket issuance, all through the live sandbox."

---

## Behind the scenes (for the technical section of the VO)

**Architecture**

- Next.js 16 web app + **eve** agent mesh, one Vercel deployment.
- **flight-guardian** is the front-door conductor. It owns no travel tools — it classifies intent and delegates to six specialists:
  - **booking-agent** — search → verify → seats/bags → order → pay → track
  - **routing-agent** — read-only route/date comparison (can never spend)
  - **rebook-agent** — disruption recovery, void, refund, stop-ticket
  - **journey-concierge** — Calendar/Maps/Gmail, itineraries on /trips
  - **disruption-guard** — incident lookup on existing orders
  - **travel-sentinel** — destination intelligence, fired _in parallel_ with any booking or search that names a destination
- Specialists run as **local subagents**, so human-in-the-loop approval gates bubble up into the panel as approval cards.

**The hard-won details**

- **Approval gates**: `create-order` and `payment-and-ticketing` are eve-gated — the model literally cannot spend without a human tap.
- **One-search-per-turn guard**: an atomic Redis claim (Upstash, Singapore) stops an agent from burning the fare API with repeat searches; it releases only when a search comes back empty.
- **Token discipline**: raw Atlas search payloads were ~548K tokens for five flights. Every search tool returns a condensed top-20, cheapest-first view — orders of magnitude smaller, and the whole booking runs on a cheap model (qwen3.7-flash).
- **Shared state**: agent searches mirror into Postgres (Neon, Singapore) so the /fares page and the panel see one history; bookings persist with strict per-user attribution; agent memory is keyed per account.
- **Signed-in context injection**: agents are told who is talking at session start — no "please enter your booking email" to a logged-in user.

---

## Voice-over tools

| Tool | Cost | Notes |
| --- | --- | --- |
| **ElevenLabs** | Free ~10 min/mo | Best quality, natural English; fastest path for a 3-min video |
| **Edge-TTS** (open source CLI) | Free, unlimited | Microsoft neural voices incl. **Malay: ms-MY Yasmin/Osman**; `pip install edge-tts` |
| **Kokoro-82M** (open source) | Free, runs locally | Very natural English, small model, CPU-friendly |
| **Piper** (open source) | Free, local | Fast, lighter quality; good fallback |
| OpenAI TTS API | ~$0.015/1k chars | Solid quality if you already have an API key |

Quick Edge-TTS example:

```bash
pip install edge-tts
edge-tts --voice en-US-AriaNeural --text "Atlas is an agentic travel companion..." --write-media vo-scene1.mp3
edge-tts --list-voices | grep ms-MY   # Malay voices
```

Recommended: write the script per scene (the VO lines above), generate one mp3 per scene, and drop them onto the Recordly timeline. Keep the demo footage at 1080p and let scene 3 breathe — it is the whole product.
