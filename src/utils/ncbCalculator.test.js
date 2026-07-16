import {
  NCB_SLABS,
  calculateSuggestedNcb,
  ncbSlabForCompletedYears,
  normalizeNcbToSlab,
} from "./ncbCalculator";

describe("ncbSlabForCompletedYears", () => {
  test.each([
    [0, 0],
    [1, 20],
    [2, 25],
    [3, 35],
    [4, 45],
    [5, 50],
    [6, 50],
    [50, 50],
  ])("%i completed years -> %i%%", (years, expected) => {
    expect(ncbSlabForCompletedYears(years)).toBe(expected);
  });

  test("negative years is treated as 0", () => {
    expect(ncbSlabForCompletedYears(-1)).toBe(0);
  });
});

describe("normalizeNcbToSlab", () => {
  test.each([
    [0, 0],
    [20, 20],
    [25, 25],
    [35, 35],
    [45, 45],
    [50, 50],
    [50, 50], // >50 clamps to max slab too (see next case)
  ])("%i -> %i", (input, expected) => {
    expect(normalizeNcbToSlab(input)).toBe(expected);
  });

  test("clamps values above 50 to 50", () => {
    expect(normalizeNcbToSlab(75)).toBe(50);
  });

  test("snaps in-between values down to the nearest slab", () => {
    expect(normalizeNcbToSlab(30)).toBe(25);
    expect(normalizeNcbToSlab(49)).toBe(45);
  });

  test.each([undefined, null, "", "not-a-number", -5])(
    "invalid input %p -> 0",
    (input) => {
      expect(normalizeNcbToSlab(input)).toBe(0);
    },
  );
});

describe("calculateSuggestedNcb — standard slabs from the example table", () => {
  // Vehicle Purchase Year: 2023
  test.each([
    ["2023-24", 2023, 0],
    ["2024-25", 2024, 20],
    ["2025-26", 2025, 25],
    ["2026-27", 2026, 35],
    ["2027-28", 2027, 45],
    ["2028-29", 2028, 50],
  ])("policy year %s -> %i%%", (_label, renewalYear, expected) => {
    expect(
      calculateSuggestedNcb({
        purchaseDate: 2023,
        renewalDate: renewalYear,
      }),
    ).toBe(expected);
  });

  test("more than 5 claim-free years still caps at 50%", () => {
    expect(
      calculateSuggestedNcb({ purchaseDate: 2010, renewalDate: 2030 }),
    ).toBe(50);
  });

  test("works with full ISO dates, not just bare years", () => {
    expect(
      calculateSuggestedNcb({
        purchaseDate: "2023-04-12",
        renewalDate: "2025-04-12",
      }),
    ).toBe(25);
  });

  test("only whole calendar-year gaps matter, not day-level precision", () => {
    // Purchased late in 2023, renewed early in 2025 — still a 2-year gap
    // by calendar year, regardless of exact day count.
    expect(
      calculateSuggestedNcb({
        purchaseDate: "2023-12-30",
        renewalDate: "2025-01-02",
      }),
    ).toBe(25);
  });
});

describe("calculateSuggestedNcb — return value never escapes the slab set", () => {
  test.each([
    { purchaseDate: 2023, renewalDate: 2023 },
    { purchaseDate: 2023, renewalDate: 2024 },
    { purchaseDate: 2023, renewalDate: 2099 },
    { purchaseDate: null, renewalDate: null },
    { purchaseDate: 2050, renewalDate: 2023 },
  ])("result is always in NCB_SLABS", (params) => {
    expect(NCB_SLABS).toContain(calculateSuggestedNcb(params));
  });
});

describe("calculateSuggestedNcb — edge cases", () => {
  test("purchase year equals renewal year -> 0%", () => {
    expect(
      calculateSuggestedNcb({ purchaseDate: 2023, renewalDate: 2023 }),
    ).toBe(0);
  });

  test("vehicle more than 5 years old -> capped at 50%", () => {
    expect(
      calculateSuggestedNcb({ purchaseDate: 2015, renewalDate: 2024 }),
    ).toBe(50);
  });

  test("future purchase year relative to renewal year -> safe 0%, not negative/NaN", () => {
    expect(
      calculateSuggestedNcb({ purchaseDate: 2026, renewalDate: 2024 }),
    ).toBe(0);
  });

  test("invalid purchase year string -> safe 0%", () => {
    expect(
      calculateSuggestedNcb({
        purchaseDate: "not-a-date",
        renewalDate: 2025,
      }),
    ).toBe(0);
  });

  test("missing purchase year -> 0%, does not throw", () => {
    expect(() =>
      calculateSuggestedNcb({ purchaseDate: undefined, renewalDate: 2025 }),
    ).not.toThrow();
    expect(
      calculateSuggestedNcb({ purchaseDate: undefined, renewalDate: 2025 }),
    ).toBe(0);
  });

  test("missing renewal date -> 0%, never falls back to today's date", () => {
    expect(
      calculateSuggestedNcb({ purchaseDate: 2020, renewalDate: undefined }),
    ).toBe(0);
  });

  test("no params at all -> 0%, does not throw", () => {
    expect(() => calculateSuggestedNcb()).not.toThrow();
    expect(calculateSuggestedNcb()).toBe(0);
  });

  test("lapsed policy does not auto-increase NCB, falls back to previous verified value", () => {
    expect(
      calculateSuggestedNcb({
        purchaseDate: 2018,
        renewalDate: 2024, // would otherwise compute to 50%
        policyLapsed: true,
        previousNcbDiscount: 20,
      }),
    ).toBe(20);
  });

  test("lapsed policy with no previous verified NCB resets to 0%", () => {
    expect(
      calculateSuggestedNcb({
        purchaseDate: 2018,
        renewalDate: 2024,
        policyLapsed: true,
      }),
    ).toBe(0);
  });

  test("previous OD claim does not auto-increase NCB, falls back to previous verified value", () => {
    expect(
      calculateSuggestedNcb({
        purchaseDate: 2020,
        renewalDate: 2024, // would otherwise compute to 45%
        claimTakenLastYear: "Yes",
        previousNcbDiscount: 25,
      }),
    ).toBe(25);
  });

  test('claimTakenLastYear is case-insensitive ("yes" as well as "Yes")', () => {
    expect(
      calculateSuggestedNcb({
        purchaseDate: 2020,
        renewalDate: 2024,
        claimTakenLastYear: "yes",
        previousNcbDiscount: 25,
      }),
    ).toBe(25);
  });

  test('claimTakenLastYear "No" does not suppress the normal calculation', () => {
    expect(
      calculateSuggestedNcb({
        purchaseDate: 2023,
        renewalDate: 2025,
        claimTakenLastYear: "No",
      }),
    ).toBe(25);
  });

  test("an odd/non-slab previous NCB is normalized down on fallback", () => {
    expect(
      calculateSuggestedNcb({
        purchaseDate: 2018,
        renewalDate: 2024,
        policyLapsed: true,
        previousNcbDiscount: 30,
      }),
    ).toBe(25);
  });
});
