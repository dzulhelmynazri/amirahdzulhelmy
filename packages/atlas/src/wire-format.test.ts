import { describe, expect, test } from "bun:test";

import {
  assertOrderCreated,
  toAtlasContact,
  toAtlasDate,
  toAtlasPassengers,
  toAtlasPhone,
  toPassengerTypeCode,
} from "./wire-format";

/**
 * Every case here is a failure that reached a real booking attempt.
 *
 * They are grouped by the symptom Atlas produced rather than by function,
 * because the symptom is what someone debugging this will have in hand — and
 * in each case the symptom pointed somewhere other than the cause.
 */

describe("passenger type", () => {
  // Sending the word instead of the code returned `status 9999 "Internal
  // error"`, which reads like an Atlas outage. It is not one.
  test("maps words, IATA codes and numbers to 0/1/2", () => {
    expect(toPassengerTypeCode("adult")).toBe(0);
    expect(toPassengerTypeCode("child")).toBe(1);
    expect(toPassengerTypeCode("infant")).toBe(2);
    expect(toPassengerTypeCode("ADT")).toBe(0);
    expect(toPassengerTypeCode("CHD")).toBe(1);
    expect(toPassengerTypeCode("INF")).toBe(2);
    expect(toPassengerTypeCode(0)).toBe(0);
    expect(toPassengerTypeCode(2)).toBe(2);
  });

  test("is case and whitespace insensitive", () => {
    expect(toPassengerTypeCode("  Adult ")).toBe(0);
  });

  test("refuses a type it does not know rather than guessing adult", () => {
    expect(() => toPassengerTypeCode("senior")).toThrow(/senior/u);
  });
});

describe("dates", () => {
  // A dashed date is not rejected by Atlas. It answers HTTP 200 with every
  // order field null, so the booking silently does not exist.
  test("compacts an ISO date", () => {
    expect(toAtlasDate("1995-06-15", "Date of birth")).toBe("19950615");
  });

  test("leaves an already-compact date alone", () => {
    expect(toAtlasDate("19950615", "Date of birth")).toBe("19950615");
  });

  test("names the field when the value is not a date", () => {
    expect(() => toAtlasDate("sometime in 1995", "Date of birth")).toThrow(
      /Date of birth/u
    );
  });

  test("rejects a partial date rather than padding it", () => {
    expect(() => toAtlasDate("1995-06", "Date of birth")).toThrow();
  });
});

describe("phone numbers", () => {
  // Stored without the 00 prefix, the number is one neither Atlas nor the
  // profile form can read, so the field looks empty on the next visit.
  test("adds the international prefix", () => {
    expect(toAtlasPhone("60-123456789")).toBe("0060-123456789");
  });

  test("accepts a number that already has it", () => {
    expect(toAtlasPhone("0060-123456789")).toBe("0060-123456789");
  });

  test("strips the plus and punctuation around a clean split", () => {
    expect(toAtlasPhone("+60-12 345 6789")).toBe("0060-123456789");
  });

  test("gives up when there is no separator at all", () => {
    expect(toAtlasPhone("0123456789")).toBeUndefined();
  });

  test("gives up rather than split on a dash inside the local number", () => {
    // Splitting on the first dash here yields a calling code of 6012, which
    // is not a country. The number would be wrong and look entirely plausible.
    expect(toAtlasPhone("+60 12-345 6789")).toBeUndefined();
  });
});

describe("passengers", () => {
  test("converts every field the API is strict about", () => {
    const converted = toAtlasPassengers([
      {
        birthday: "1999-05-11",
        cardExpired: "2031-06-30",
        gender: "F",
        name: "TAN/MEI LING",
        passengerType: "adult",
      },
    ]);

    expect(converted).toHaveLength(1);
    expect(converted[0]).toMatchObject({
      birthday: "19990511",
      cardExpired: "20310630",
      passengerType: 0,
    });
  });

  test("leaves an absent document expiry absent", () => {
    const converted = toAtlasPassengers([
      { birthday: "19990511", passengerType: 0 },
    ]);

    expect(Object.hasOwn(converted[0] ?? {}, "cardExpired")).toBe(false);
  });

  test("keeps fields it does not own", () => {
    const converted = toAtlasPassengers([
      { birthday: "19990511", name: "TAN/MEI LING", passengerType: 0 },
    ]);

    expect(converted[0]).toMatchObject({ name: "TAN/MEI LING" });
  });
});

describe("contact", () => {
  test("normalises the mobile", () => {
    expect(toAtlasContact({ mobile: "60-123456789" }).mobile).toBe(
      "0060-123456789"
    );
  });

  test("refuses a mobile it cannot split instead of sending a guess", () => {
    expect(() => toAtlasContact({ mobile: "+60 12-345 6789" })).toThrow(
      /country code/u
    );
  });

  test("passes a contact with no mobile straight through", () => {
    const contact = {
      email: "a@example.com",
      mobile: undefined,
      name: "TAN/MEI LING",
    };
    expect(toAtlasContact(contact)).toEqual(contact);
  });
});

describe("order result", () => {
  test("accepts an order that was created", () => {
    expect(() =>
      assertOrderCreated({ orderNo: "TESTA20260823162840167" })
    ).not.toThrow();
  });

  // The two failures below both reached a traveller as an invented cause.
  test("carries Atlas's own reason when it rejects the order", () => {
    expect(() =>
      assertOrderCreated({
        msg: "illegal booking request param: contact",
        orderNo: null,
        status: 307,
      })
    ).toThrow(/307.*illegal booking request param: contact/u);
  });

  test("says so plainly when Atlas gives no reason at all", () => {
    expect(() => assertOrderCreated({ orderNo: null })).toThrow(
      /gave no reason/u
    );
  });

  test("tells the caller not to retry or guess", () => {
    expect(() => assertOrderCreated({})).toThrow(/Do not retry/u);
  });
});
