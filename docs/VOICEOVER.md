# Atlas — voice-over script

Paste each block into a text-to-speech tool, download the mp3, drop it on the Recordly timeline under the matching footage. One file per scene is easier to re-cut than one long track.

Total ≈ 480 words ≈ 3 minutes at a natural pace. Read order matches `docs/DEMO.md`.

---

## 1 — Opening (~20s)

> Atlas is an agentic travel companion built on the AtripTech Atlas flight API. You don't fill forms and compare tabs. You tell a team of AI agents what you need, and they search, compare, warn you about trouble at your destination, book, pay, and put the trip on your calendar. Every dollar that moves still passes through a human tap.

## 2 — Profile (~15s)

> Passport details live in a proper form, not in a chat box. The agents read them when booking, so nobody is ever asked twice for a document number they already gave.

## 3 — The booking (~55s) ⭐ core scene

> One sentence in. The conductor works out what was asked, then hands off to a booking specialist and a safety specialist at the same time. Fares are still loading while destination alerts arrive.
>
> This is the part worth watching. Creating the order stops. Paying stops. The model cannot spend money on its own — it can only ask, and wait for a tap.
>
> Approved. The order is created, the ticket is issued, and the booking reference is real: this ran against AtripTech's sandbox, not a mock.

## 4 — Bookings (~15s)

> The agent's booking is your booking. It lands on the same page you would have used yourself, with the ticket status, the passengers, and the baggage the fare included.

## 5 — Fares (~15s)

> Search yourself with the form, or write one sentence and let a small model fill it in. Either way the search lands in the same history — the ones the agent ran are marked, and any of them replays with a tap.

## 6 — Disruption (~30s)

> Now the part that matters when a trip goes wrong. Atlas pushes schedule changes and cancellations straight to us. The event is recorded before any model runs, so what the airline said survives even if the agent fails.
>
> Then Disruption Guard wakes up, works out what actually changed, and writes it in plain language on the traveller's own board — next to the flights they already paid for.

## 7 — Concierge (~15s)

> A flight is not a journey. The concierge reads the confirmation emails, measures the ground legs on Maps, and writes the whole thing to the calendar.

## 8 — Proof (~25s)

> Two claims, both checkable. The integration passed AtripTech's official user acceptance testing: search, order, payment, ticket issuance, all through the live sandbox.
>
> And the safety rules are tests, not slides. One of them proves the agent parks instead of paying. Another feeds it a poisoned email telling it to book and approve on its own, and proves it refuses.

## 9 — Close (~15s)

> An orchestrator that owns the conversation, specialists that run in their own context, and a human on every gate that spends money. Atlas — agentic, but never on its own with your card.

---

## How to turn this into audio

**Fastest, no install — ElevenLabs.** Go to elevenlabs.io, sign in, paste a block, pick a voice, generate, download the mp3. Free tier is about ten minutes a month, which covers this whole video several times over. Best quality of the options here, and nothing to install the night before a deadline.

**Free and unlimited — Edge TTS.** Microsoft's neural voices from the command line:

```sh
python3 -m pip install edge-tts     # or: brew install pipx && pipx install edge-tts
edge-tts --voice en-US-AriaNeural --file scene3.txt --write-media scene3.mp3
edge-tts --list-voices | grep ms-MY  # Malay voices, if you narrate in Malay
```

**Already on your Mac — `say`.** Zero install, but the built-in voices sound dated. Download an enhanced voice first in System Settings → Accessibility → Spoken Content → System Voice → Manage Voices, then:

```sh
say -v Samantha -o scene3.aiff -f scene3.txt
```

Whichever you use: generate per scene, not one long file. When a take runs short you re-cut one clip instead of re-timing the whole video.
