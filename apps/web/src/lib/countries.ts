/**
 * Countries, for phone codes and travel-document fields.
 *
 * Only the dialling codes are stored. Names come from `Intl.DisplayNames`, so
 * they arrive already translated into the reader's locale and never drift out
 * of date; flags are derived from the ISO-3166 letters, since regional
 * indicator symbols sit at a fixed offset from ASCII. Shipping a name column
 * would mean maintaining 250 English strings that the platform already knows.
 *
 * A network lookup was considered and rejected: this list changes about once a
 * decade, and fetching it would put a failure point in front of a form field.
 */

/** Distance from ASCII `A` to 🇦 , the first regional indicator symbol. */
const REGIONAL_INDICATOR_OFFSET = 0x1_f1_a5;

/** ISO-3166 alpha-2 to E.164 country calling code, without the plus. */
const CALLING_CODES: Record<string, string> = {
  AD: "376",
  AE: "971",
  AF: "93",
  AG: "1",
  AI: "1",
  AL: "355",
  AM: "374",
  AO: "244",
  AR: "54",
  AS: "1",
  AT: "43",
  AU: "61",
  AW: "297",
  AX: "358",
  AZ: "994",
  BA: "387",
  BB: "1",
  BD: "880",
  BE: "32",
  BF: "226",
  BG: "359",
  BH: "973",
  BI: "257",
  BJ: "229",
  BL: "590",
  BM: "1",
  BN: "673",
  BO: "591",
  BQ: "599",
  BR: "55",
  BS: "1",
  BT: "975",
  BW: "267",
  BY: "375",
  BZ: "501",
  CA: "1",
  CD: "243",
  CF: "236",
  CG: "242",
  CH: "41",
  CI: "225",
  CK: "682",
  CL: "56",
  CM: "237",
  CN: "86",
  CO: "57",
  CR: "506",
  CU: "53",
  CV: "238",
  CW: "599",
  CY: "357",
  CZ: "420",
  DE: "49",
  DJ: "253",
  DK: "45",
  DM: "1",
  DO: "1",
  DZ: "213",
  EC: "593",
  EE: "372",
  EG: "20",
  ER: "291",
  ES: "34",
  ET: "251",
  FI: "358",
  FJ: "679",
  FK: "500",
  FM: "691",
  FO: "298",
  FR: "33",
  GA: "241",
  GB: "44",
  GD: "1",
  GE: "995",
  GF: "594",
  GG: "44",
  GH: "233",
  GI: "350",
  GL: "299",
  GM: "220",
  GN: "224",
  GP: "590",
  GQ: "240",
  GR: "30",
  GT: "502",
  GU: "1",
  GW: "245",
  GY: "592",
  HK: "852",
  HN: "504",
  HR: "385",
  HT: "509",
  HU: "36",
  ID: "62",
  IE: "353",
  IL: "972",
  IM: "44",
  IN: "91",
  IQ: "964",
  IR: "98",
  IS: "354",
  IT: "39",
  JE: "44",
  JM: "1",
  JO: "962",
  JP: "81",
  KE: "254",
  KG: "996",
  KH: "855",
  KI: "686",
  KM: "269",
  KN: "1",
  KP: "850",
  KR: "82",
  KW: "965",
  KY: "1",
  KZ: "7",
  LA: "856",
  LB: "961",
  LC: "1",
  LI: "423",
  LK: "94",
  LR: "231",
  LS: "266",
  LT: "370",
  LU: "352",
  LV: "371",
  LY: "218",
  MA: "212",
  MC: "377",
  MD: "373",
  ME: "382",
  MF: "590",
  MG: "261",
  MH: "692",
  MK: "389",
  ML: "223",
  MM: "95",
  MN: "976",
  MO: "853",
  MP: "1",
  MQ: "596",
  MR: "222",
  MS: "1",
  MT: "356",
  MU: "230",
  MV: "960",
  MW: "265",
  MX: "52",
  MY: "60",
  MZ: "258",
  NA: "264",
  NC: "687",
  NE: "227",
  NF: "672",
  NG: "234",
  NI: "505",
  NL: "31",
  NO: "47",
  NP: "977",
  NR: "674",
  NU: "683",
  NZ: "64",
  OM: "968",
  PA: "507",
  PE: "51",
  PF: "689",
  PG: "675",
  PH: "63",
  PK: "92",
  PL: "48",
  PM: "508",
  PR: "1",
  PS: "970",
  PT: "351",
  PW: "680",
  PY: "595",
  QA: "974",
  RE: "262",
  RO: "40",
  RS: "381",
  RU: "7",
  RW: "250",
  SA: "966",
  SB: "677",
  SC: "248",
  SD: "249",
  SE: "46",
  SG: "65",
  SH: "290",
  SI: "386",
  SJ: "47",
  SK: "421",
  SL: "232",
  SM: "378",
  SN: "221",
  SO: "252",
  SR: "597",
  SS: "211",
  ST: "239",
  SV: "503",
  SX: "1",
  SY: "963",
  SZ: "268",
  TC: "1",
  TD: "235",
  TG: "228",
  TH: "66",
  TJ: "992",
  TK: "690",
  TL: "670",
  TM: "993",
  TN: "216",
  TO: "676",
  TR: "90",
  TT: "1",
  TV: "688",
  TW: "886",
  TZ: "255",
  UA: "380",
  UG: "256",
  US: "1",
  UY: "598",
  UZ: "998",
  VA: "39",
  VC: "1",
  VE: "58",
  VG: "1",
  VI: "1",
  VN: "84",
  VU: "678",
  WF: "681",
  WS: "685",
  YE: "967",
  YT: "262",
  ZA: "27",
  ZM: "260",
  ZW: "263",
};

/** `MY` becomes 🇲🇾 — two regional indicator symbols, no image assets. */
export const flagEmoji = (iso2: string): string =>
  String.fromCodePoint(
    ...[...iso2.toUpperCase()].map(
      (letter) => (letter.codePointAt(0) ?? 0) + REGIONAL_INDICATOR_OFFSET
    )
  );

const displayNames = new Intl.DisplayNames(undefined, { type: "region" });

const nameOf = (iso2: string): string => {
  try {
    return displayNames.of(iso2) ?? iso2;
  } catch {
    return iso2;
  }
};

export interface Country {
  /** Calling code without the plus, e.g. `60`. */
  callingCode: string;
  flag: string;
  iso2: string;
  name: string;
}

/** Every country, sorted by localised name so search order matches the label. */
export const COUNTRIES: Country[] = Object.entries(CALLING_CODES)
  .map(([iso2, callingCode]) => ({
    callingCode,
    flag: flagEmoji(iso2),
    iso2,
    name: nameOf(iso2),
  }))
  .toSorted((a, b) => a.name.localeCompare(b.name));

const byIso2 = new Map(COUNTRIES.map((country) => [country.iso2, country]));

export const findCountry = (iso2: string): Country | undefined =>
  byIso2.get(iso2.toUpperCase());

/**
 * Atlas wants `00{callingCode}-{localNumber}`, e.g. `0060-123456789`.
 *
 * Several countries share a calling code (`1` covers the US, Canada and much
 * of the Caribbean), so a stored number cannot always be traced back to one
 * country. The chosen ISO code is kept alongside rather than re-derived.
 */
export const formatAtlasPhone = (
  callingCode: string,
  local: string
): string => {
  const digits = local.replaceAll(/\D/gu, "");
  return digits ? `00${callingCode}-${digits}` : "";
};

const digitsOnly = (value: string) => value.replaceAll(/\D/gu, "");

/**
 * Splits a phone number into calling code and local part.
 *
 * Deliberately forgiving about the prefix. `+60-12345`, `0060-12345` and
 * `60-12345` all mean the same thing, and an agent handed "60-123456789" by a
 * traveller will store exactly that. Rejecting those would leave a number in
 * the database that the form cannot display, which is how a phone field ends
 * up looking empty when it is not.
 *
 * The separator is required: without it there is no way to tell where a
 * country code ends, and guessing would corrupt the number.
 *
 * Written without a regular expression on purpose — the readable form needs
 * named capture groups, which this app's compile target does not allow.
 */
export const parseAtlasPhone = (
  value: string
): { callingCode: string; local: string } | undefined => {
  const trimmed = value.trim();
  const separator = trimmed.indexOf("-");

  if (separator === -1) {
    return;
  }

  // Leading zeros are the international prefix, never part of a calling code.
  const callingCode = digitsOnly(trimmed.slice(0, separator)).replace(
    /^0+/u,
    ""
  );
  const local = digitsOnly(trimmed.slice(separator + 1));

  return callingCode && local ? { callingCode, local } : undefined;
};

/**
 * Rewrites any accepted spelling into the one Atlas takes, `0060-123456789`.
 * Returns undefined when the number cannot be split, so callers can ask rather
 * than store something an airline will reject.
 */
export const normaliseAtlasPhone = (value: string): string | undefined => {
  const parts = parseAtlasPhone(value);

  return parts ? formatAtlasPhone(parts.callingCode, parts.local) : undefined;
};
