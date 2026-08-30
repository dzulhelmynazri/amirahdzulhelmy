# Atlas — voice-over script v2

Matched to `amirahdzulhelmy-atlas.mp4` (3:23). One block per scene; timestamps are where each block starts in the footage. Generate one mp3 per block, drop it on the timeline at its timestamp, and trim the tail if a take runs long.

Total ≈ 470 words ≈ 3 minutes 10 at a natural pace.

---

## 1 — 0:00 · The ask (~12s)

> This is Atlas — an agentic travel companion built on the AtripTech Atlas flight API. One sentence: Kuala Lumpur to Tokyo, cheapest flight, for a saved traveller. That's the entire brief. A team of AI agents takes it from here.

## 2 — 0:12 · Thinking out loud (~14s)

> Flight Guardian is the conductor. It checks its long-term memory for the traveller, works out what was asked, and hands the job to a booking specialist — you can watch it reason in the panel while the rest of the app stays yours to use.

## 3 — 0:28 · Yesterday's work (~18s)

> While it searches live fares, here's what the same team did yesterday: a Seoul booking, created, confirmed, and ticketed — with the passenger, the segments, and the baggage the fare included. Every agent booking lands on the same pages a human would use.

## 4 — 1:00 · The gates (~20s)

> The first gates have appeared. Creating the order stopped and asked. Confirming it stops and asks again — approve once, always allow, or deny. The model cannot spend a dollar on its own. It can only ask, and wait for a tap.

## 5 — 1:10 · The sentinel (~20s)

> And look at the alerts feed — while the booking runs, Travel Sentinel just caught a magnitude five point eight earthquake alert for Tokyo. The exact city being booked. Booking and destination-watching are different agents, running at the same time, sharing the same screen.

## 6 — 1:45 · Payment (~16s)

> The order is created and confirmed — there it is, on the bookings page. Now the last and most serious gate: payment and ticketing. Same rule. A human taps, or nothing moves.

## 7 — 2:20 · The booking, in full (~16s)

> Approved. VietJet through Ho Chi Minh City, twenty-kilo checked bags included, the passenger read straight from her saved profile — and a real booking reference, because this runs against AtripTech's live sandbox, not a mock.

## 8 — 2:35 · The receipt (~22s)

> Then the follow-through. The itinerary wrote itself to the Trips page — day by day, layover and all. And the panel reports exactly what happened: booked, tickets issued, itinerary saved, confirmation email sent to the traveller's inbox. Each line is backed by a database record, not the model's word for it.

## 9 — 2:50 · Beyond the flight (~12s)

> Google Calendar, Maps, and Gmail are wired in for the journey concierge — because a flight is not a journey, and the trip doesn't end at the gate.

## 10 — 3:05 · Close (~14s)

> Tickets issued. An orchestrator that owns the conversation, specialists in their own contexts, and a human on every gate that spends money. Atlas — agentic, but never alone with your card.

---

## How to turn this into audio

**Fastest, no install — ElevenLabs.** Go to elevenlabs.io, sign in, paste a block, pick a voice, generate, download the mp3. Free tier covers this video several times over.

**Free and unlimited — Edge TTS.**

```sh
python3 -m pip install edge-tts     # or: brew install pipx && pipx install edge-tts
edge-tts --voice en-US-AriaNeural --file scene8.txt --write-media scene8.mp3
```

**Already on your Mac — `say`.** Download an enhanced voice in System Settings → Accessibility → Spoken Content → Manage Voices, then:

```sh
say -v Samantha -o scene8.aiff -f scene8.txt
```

Generate per scene, not one long file — a short take then means re-cutting one clip, not re-timing the whole video.
