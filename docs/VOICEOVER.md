# Atlas — voice-over script

Matched to `amirahdzulhelmy-demo.mp4` (2:15). One block per scene; timestamps are where each block starts in the footage. Generate one mp3 per block, drop it on the timeline at its timestamp, and trim the tail if a take runs long.

Total ≈ 330 words ≈ 2 minutes 10 at a natural pace.

---

## 1 — 0:00 · The ask (~10s)

> This is Atlas. One sentence — Kuala Lumpur to Tokyo, cheapest flight, for a saved traveller — and a team of AI agents takes it from here.

## 2 — 0:08 · Saved travellers (~14s)

> While the agents work, look at where the passenger data lives. Nora's passport, date of birth, and phone sit in a proper profile — the booking agent reads them itself. Nobody is asked to retype a document number into a chat box.

## 3 — 0:26 · Working in the background (~14s)

> The conversation doesn't hold the app hostage. You can browse past bookings and trips while the specialists search live fares — and the first gate has already appeared: creating the order needed a human tap, and got one.

## 4 — 0:40 · Gates and guardians (~18s)

> Every step that commits money stops and asks — approve once, always allow, or deny. And this feed is Travel Sentinel: destination alerts and a real schedule change Atlas pushed for an earlier booking. Booking and watching happen at the same time, by different agents.

## 5 — 0:56 · Integrations (~8s)

> Google Calendar, Maps, and Gmail are connected — the concierge uses them once a trip exists.

## 6 — 1:04 · The booking lands (~16s)

> And there it is, on the same page you'd book from yourself. VietJet through Ho Chi Minh City, checked bags included in the fare, passenger read straight from the profile. Payment was the final gate — approved.

## 7 — 1:24 · The receipt (~20s)

> This is the part most chat demos skip: follow-through. The itinerary wrote itself to the Trips page — day by day, with the layover. And the panel states exactly what happened: booked, tickets issued, itinerary saved, confirmation email sent. Every line backed by a real record, not the model's word.

## 8 — 1:56 · The email (~12s)

> The confirmation is a real delivered email — reference, order number, and the full flight table with times. Sent automatically at payment, to the address on the booking.

## 9 — 2:08 · Close (~8s)

> Tickets issued, against AtripTech's live sandbox. Atlas — agentic, but never alone with your card.

---

## How to turn this into audio

**Fastest, no install — ElevenLabs.** Go to elevenlabs.io, sign in, paste a block, pick a voice, generate, download the mp3. Free tier is about ten minutes a month, which covers this whole video several times over.

**Free and unlimited — Edge TTS.** Microsoft's neural voices from the command line:

```sh
python3 -m pip install edge-tts     # or: brew install pipx && pipx install edge-tts
edge-tts --voice en-US-AriaNeural --file scene7.txt --write-media scene7.mp3
```

**Already on your Mac — `say`.** Download an enhanced voice first in System Settings → Accessibility → Spoken Content → System Voice → Manage Voices, then:

```sh
say -v Samantha -o scene7.aiff -f scene7.txt
```

Whichever you use: generate per scene, not one long file. When a take runs short you re-cut one clip instead of re-timing the whole video.
