/**
 * No Claim Bonus (NCB) calculation utilities.
 *
 * Standard IRDAI NCB slab, assuming continuous claim-free renewal:
 *   0 completed policy years (purchase year)  -> 0%
 *   1 completed claim-free year               -> 20%
 *   2 completed claim-free years               -> 25%
 *   3 completed claim-free years               -> 35%
 *   4 completed claim-free years               -> 45%
 *   5+ completed claim-free years               -> 50% (max)
 */
import dayjs from "dayjs";

/** Every value this module can ever suggest, in slab order. */
export const NCB_SLABS = [0, 20, 25, 35, 45, 50];

/**
 * Map completed claim-free policy years to the standard NCB slab.
 * @param {number} completedYears - Whole number of completed policy years since purchase.
 * @returns {number} One of NCB_SLABS.
 */
export const ncbSlabForCompletedYears = (completedYears) => {
  const years = Math.floor(Number(completedYears));
  if (!Number.isFinite(years) || years <= 0) return 0;
  if (years === 1) return 20;
  if (years === 2) return 25;
  if (years === 3) return 35;
  if (years === 4) return 45;
  return 50; // 5 or more
};

/**
 * Snap an arbitrary NCB value to the nearest standard slab at or below it.
 * Used as the "previous verified NCB" fallback when we must not
 * auto-increase (claim taken / policy not continuous).
 * @param {number|string} value
 * @returns {number} One of NCB_SLABS.
 */
export const normalizeNcbToSlab = (value) => {
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) return 0;
  if (n >= 50) return 50;
  if (n >= 45) return 45;
  if (n >= 35) return 35;
  if (n >= 25) return 25;
  if (n >= 20) return 20;
  return 0;
};

/**
 * Extract a calendar year from a bare year (number or "YYYY" string) or a
 * full date. Never falls back to "today" — an unparsable input is treated
 * as "unknown", not "now".
 * @param {number|string|null|undefined} input
 * @returns {number|null}
 */
const extractYear = (input) => {
  if (input === null || input === undefined || input === "") return null;

  if (typeof input === "number") {
    return Number.isFinite(input) && input > 1900 && input < 2100
      ? Math.trunc(input)
      : null;
  }

  const str = String(input).trim();
  if (!str) return null;

  if (/^\d{4}$/.test(str)) {
    const year = Number(str);
    return year > 1900 && year < 2100 ? year : null;
  }

  const parsed = dayjs(str);
  return parsed.isValid() ? parsed.year() : null;
};

const isTruthyClaim = (claimTakenLastYear) =>
  claimTakenLastYear === true ||
  String(claimTakenLastYear || "").trim().toLowerCase() === "yes";

/**
 * Suggested NCB based only on the vehicle purchase year and the policy
 * renewal year — assuming continuous, claim-free renewal. Deliberately does
 * NOT depend on the current calendar date/year.
 *
 * If the policy history isn't continuous (a claim was taken, or the policy
 * lapsed), the NCB is never auto-increased — the previously verified NCB is
 * returned instead (normalized to the nearest standard slab), or 0 if none
 * is available.
 *
 * @param {object} params
 * @param {number|string} params.purchaseDate - Vehicle purchase/registration date, or bare year.
 * @param {number|string} params.renewalDate - Policy renewal/start date, or bare year, being evaluated.
 * @param {boolean|string} [params.claimTakenLastYear=false] - Whether an OD claim was taken ("Yes"/true breaks continuity).
 * @param {boolean} [params.policyLapsed=false] - Whether the policy lapsed / renewal wasn't continuous.
 * @param {number|string} [params.previousNcbDiscount=0] - Last verified NCB, used as the fallback.
 * @returns {number} Always one of NCB_SLABS: 0, 20, 25, 35, 45, or 50.
 */
export const calculateSuggestedNcb = ({
  purchaseDate,
  renewalDate,
  claimTakenLastYear = false,
  policyLapsed = false,
  previousNcbDiscount = 0,
} = {}) => {
  const fallbackNcb = normalizeNcbToSlab(previousNcbDiscount);

  // Continuity broken: never auto-increase, fall back to the last
  // verified value (or 0 if there isn't one).
  if (isTruthyClaim(claimTakenLastYear) || policyLapsed) {
    return fallbackNcb;
  }

  const purchaseYear = extractYear(purchaseDate);
  const renewalYear = extractYear(renewalDate);

  // Missing/invalid inputs — nothing to compute from, and we must not
  // silently substitute today's date. Safe default.
  if (purchaseYear === null || renewalYear === null) return 0;

  const completedYears = renewalYear - purchaseYear;

  // Invalid or future purchase year relative to the renewal year.
  if (completedYears < 0) return 0;

  return ncbSlabForCompletedYears(completedYears);
};
