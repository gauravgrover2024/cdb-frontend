/**
 * Client-side mirror of cdb-api's src/services/payoutEngine.js.
 *
 * Splits the total payout percentage evenly across the OD tenure years for
 * "yearly" mode (auto-calculated from however many years the policy runs —
 * a 3-year policy pays 1/3 of the total % each year), or pays it in full at
 * issuance for "lumpsum" mode. Kept in sync by hand since the two apps don't
 * share a package; the shapes must match InsuranceCase's payoutSchedule.
 */

export const PAYOUT_MODES = { YEARLY: "yearly", LUMPSUM: "lumpsum" };

const round2 = (n) => Math.round((Number(n) || 0) * 100) / 100;

const toPositiveYears = (value) => {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? Math.round(n) : 1;
};

export const generatePayoutSchedule = ({
  mode = PAYOUT_MODES.LUMPSUM,
  tenureYears = 1,
  totalPayoutPercentage = 0,
  baseAmount = 0,
  policyStartDate = null,
} = {}) => {
  const years = toPositiveYears(tenureYears);
  const totalPct = Number(totalPayoutPercentage) || 0;
  const base = Number(baseAmount) || 0;
  const start = policyStartDate ? new Date(policyStartDate) : new Date();
  const normalizedMode =
    mode === PAYOUT_MODES.YEARLY ? PAYOUT_MODES.YEARLY : PAYOUT_MODES.LUMPSUM;

  if (normalizedMode === PAYOUT_MODES.YEARLY) {
    const perYearPct = round2(totalPct / years);
    const entries = Array.from({ length: years }, (_, idx) => {
      const dueDate = new Date(start);
      dueDate.setFullYear(dueDate.getFullYear() + idx);
      return {
        policyYear: idx + 1,
        percentage: perYearPct,
        baseAmount: base,
        amount: round2((base * perYearPct) / 100),
        status: "Pending",
        dueDate: dueDate.toISOString(),
        paidDate: null,
      };
    });
    return {
      mode: PAYOUT_MODES.YEARLY,
      tenureYears: years,
      totalPayoutPercentage: totalPct,
      baseAmount: base,
      entries,
    };
  }

  return {
    mode: PAYOUT_MODES.LUMPSUM,
    tenureYears: years,
    totalPayoutPercentage: totalPct,
    baseAmount: base,
    entries: [
      {
        policyYear: 0,
        percentage: totalPct,
        baseAmount: base,
        amount: round2((base * totalPct) / 100),
        status: "Pending",
        dueDate: start.toISOString(),
        paidDate: null,
      },
    ],
  };
};
