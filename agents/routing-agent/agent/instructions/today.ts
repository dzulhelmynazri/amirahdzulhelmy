import { defineDynamic, defineInstructions } from "eve/instructions";

/**
 * Today's date, recomputed every turn.
 *
 * Without this the model has no clock and picks a year from whatever its
 * training left behind. Asked for flights "next Friday" it resolved the date
 * into 2025 and Atlas answered `status 102, "Can not search past flights"` —
 * a search that could never have succeeded, and a turn the traveller paid for
 * with nothing to show.
 *
 * Turn scope rather than session scope: sessions here live for seven days, so
 * a date fixed at `session.started` would be wrong by the end of one. The text
 * only changes once a day, so a prompt cache still holds within a day.
 */
const TIME_ZONE = "Asia/Kuala_Lumpur";

const dateLine = (): string => {
  const now = new Date();
  const date = new Intl.DateTimeFormat("en-CA", {
    day: "2-digit",
    month: "2-digit",
    timeZone: TIME_ZONE,
    year: "numeric",
  }).format(now);
  const weekday = new Intl.DateTimeFormat("en-US", {
    timeZone: TIME_ZONE,
    weekday: "long",
  }).format(now);

  return `${weekday}, ${date}`;
};

export default defineDynamic({
  events: {
    "turn.started": () =>
      defineInstructions({
        content: `# Today

Today is ${dateLine()} in ${TIME_ZONE}.

Every relative date resolves against this line and nothing else. "Next Wednesday", "this weekend", "early October" are yours to compute from it. Do not carry a year over from anywhere else, and never assume one.

Never search a date already past. Atlas refuses it outright — "Can not search past flights" — so the turn is spent and the traveller learns nothing.`,
      }),
  },
});
