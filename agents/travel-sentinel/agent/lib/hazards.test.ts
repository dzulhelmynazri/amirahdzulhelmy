import { afterEach, describe, expect, test } from "bun:test";

import { placeOf } from "./gazetteer";
import { checkHazards, greatCircleKm, MIN_MAGNITUDE } from "./hazards";

const realFetch = globalThis.fetch;

afterEach(() => {
  globalThis.fetch = realFetch;
});

/**
 * Replaces fetch with a stub that still satisfies its type.
 *
 * `fetch` carries a `preconnect` property, so a bare function will not stand
 * in for it under strict types.
 */
const stubFetch = (respond: () => Promise<Response>) => {
  const stub = respond as unknown as typeof fetch;
  stub.preconnect = () => {
    // Nothing to warm up: no request leaves this test.
  };
  globalThis.fetch = stub;
};

/** Answers as USGS would, without going near the network. */
const stubUsgs = (features: unknown[]) => {
  stubFetch(() => Promise.resolve(Response.json({ features })));
};

const quake = (magnitude: number) => ({
  geometry: { coordinates: [103.99, 1.36, 10] },
  id: "test1",
  properties: {
    mag: magnitude,
    place: "10 km SW of Somewhere",
    time: Date.now(),
    url: "https://earthquake.usgs.gov/earthquakes/eventpage/test1",
  },
});

describe("distance", () => {
  test("matches the real distance between two known airports", () => {
    const kul = placeOf("KUL");
    const sin = placeOf("SIN");

    expect(kul).not.toBeNull();
    expect(sin).not.toBeNull();
    // KUL to SIN is about 297 km.
    expect(greatCircleKm(kul as never, sin as never)).toBeCloseTo(297, -1);
  });
});

describe("the gazetteer", () => {
  test("returns null for a code it does not hold, rather than throwing", () => {
    expect(placeOf("ZZZ")).toBeNull();
    expect(placeOf("")).toBeNull();
  });

  test("ignores case and stray whitespace", () => {
    expect(placeOf(" kul ")?.name).toBe("Kuala Lumpur");
  });
});

describe("checking a destination", () => {
  test("reports an unknown place without asking USGS about it", async () => {
    let called = false;
    stubFetch(() => {
      called = true;
      return Promise.resolve(Response.json({}));
    });

    const result = await checkHazards({ code: "ZZZ" });

    expect(result.kind).toBe("unknown-place");
    // Querying would mean inventing the coordinates first.
    expect(called).toBe(false);
  });

  test("says the source was unreachable rather than reporting nothing", async () => {
    stubFetch(() => Promise.reject(new Error("network down")));

    const result = await checkHazards({ code: "KUL" });

    // "Nothing happened" is the one wrong answer here.
    expect(result.kind).toBe("unreachable");
  });

  test("treats a non-200 from USGS as unreachable too", async () => {
    stubFetch(() => Promise.resolve(new Response("", { status: 503 })));

    const result = await checkHazards({ code: "KUL" });

    expect(result.kind).toBe("unreachable");
  });

  test("returns no events when the instrument looked and found nothing", async () => {
    stubUsgs([]);

    const result = await checkHazards({ code: "KUL" });

    expect(result.kind).toBe("measured");
    expect(result.kind === "measured" && result.events).toHaveLength(0);
  });

  test("carries magnitude, distance and the source link", async () => {
    stubUsgs([quake(MIN_MAGNITUDE + 1)]);

    const result = await checkHazards({ code: "KUL" });

    expect(result.kind).toBe("measured");

    if (result.kind !== "measured") {
      return;
    }

    expect(result.events[0]?.magnitude).toBe(MIN_MAGNITUDE + 1);
    expect(result.events[0]?.distanceKm).toBeGreaterThan(0);
    expect(result.events[0]?.url).toContain("earthquake.usgs.gov");
  });

  test("drops a feature with no magnitude instead of defaulting it", async () => {
    stubUsgs([
      { ...quake(5), properties: { ...quake(5).properties, mag: null } },
    ]);

    const result = await checkHazards({ code: "KUL" });

    expect(result.kind === "measured" && result.events).toHaveLength(0);
  });
});
