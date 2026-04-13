import React from "react";
import { Button, Divider, Tabs, Typography } from "antd";
import {
  Car,
  CloudRain,
  FileText,
  Flame,
  Lock,
  Shield,
  Sparkles,
  Users,
} from "lucide-react";

const { Text } = Typography;

const DEFAULT_EXCLUDES = [
  "Consequential loss, wear and tear, and mechanical/electrical breakdown unless covered by add-ons.",
  "Driving under influence of alcohol/drugs, or without a valid licence.",
  "War, nuclear risks, and illegal use of the vehicle.",
  "Depreciation on parts unless zero-depreciation add-on is opted and applicable.",
];

const DEFAULT_CLAIM_STEPS = [
  "Intimate the insurer immediately after an incident (as per policy timeline).",
  "File an FIR where required (e.g. theft, third-party injury, major accidents).",
  "Get the vehicle surveyed; submit documents: RC, licence, policy copy, estimates.",
  "Track claim status with the insurer / surveyor until settlement.",
];

const getCoverageIncludes = (coverageType) => {
  const t = String(coverageType || "");
  if (t === "Third Party") {
    return [
      {
        title: "Third-party liability",
        description:
          "Covers injury/death of third parties and third-party property damage as per policy terms.",
        Icon: Users,
      },
      {
        title: "Personal accident (owner-driver)",
        description:
          "Mandatory cover for owner-driver as applicable under motor rules.",
        Icon: Shield,
      },
      {
        title: "Legal compliance",
        description:
          "Helps meet statutory motor insurance requirements for road use.",
        Icon: FileText,
      },
    ];
  }
  if (t === "Own Damage") {
    return [
      {
        title: "Road accidents",
        description:
          "Damages to your car caused in accidents, subject to policy terms and deductibles.",
        Icon: Car,
      },
      {
        title: "Natural calamities",
        description:
          "Loss or damage from events such as floods, storms, or earthquakes where covered.",
        Icon: CloudRain,
      },
      {
        title: "Fire & theft",
        description:
          "Coverage for fire damage and theft of the insured vehicle as per policy.",
        Icon: Flame,
      },
    ];
  }
  return [
    {
      title: "Road accidents",
      description:
        "Damages caused to your car in accidents including collisions, subject to terms.",
      Icon: Car,
    },
    {
      title: "Natural calamities",
      description:
        "Damage from natural events such as floods, cyclones, or earthquakes where included.",
      Icon: CloudRain,
    },
    {
      title: "Theft & total loss",
      description:
        "Theft of the vehicle and constructive total loss scenarios as per policy wording.",
      Icon: Lock,
    },
    {
      title: "Third-party liability",
      description:
        "Legal liability towards third parties for injury/death and property damage.",
      Icon: Shield,
    },
    {
      title: "Add-on covers",
      description:
        "Optional covers (e.g. zero depreciation, RSA) when selected and premium paid.",
      Icon: Sparkles,
    },
  ];
};

/**
 * @param {object} props
 * @param {Record<string, unknown>} props.row
 * @param {unknown} props.acceptedQuoteId
 * @param {(rid: string | number) => void} props.onAcceptAndClose
 * @param {(q: Record<string, unknown>, index?: number) => string | number} props.getQuoteRowId
 * @param {(q: Record<string, unknown>) => object} props.computeQuoteBreakupFromRow
 * @param {(n: unknown) => string} props.toINR
 */
const PlanFeaturesModalBody = ({
  row,
  acceptedQuoteId,
  onAcceptAndClose,
  getQuoteRowId,
  computeQuoteBreakupFromRow,
  toINR,
}) => {
  const rid = getQuoteRowId(row);
  const br = computeQuoteBreakupFromRow(row);
  const includes = getCoverageIncludes(row.coverageType);
  const isAccepted = String(acceptedQuoteId) === String(rid);

  return (
    <div className="flex flex-col gap-6 px-6 pb-6 pt-0 lg:flex-row lg:items-start lg:gap-8">
      <div className="min-w-0 flex-1 lg:max-w-[62%]">
        <div className="mb-4 flex flex-col justify-between gap-3 rounded-lg border border-slate-200 bg-slate-50/80 px-4 py-3 sm:flex-row sm:items-center dark:border-slate-600 dark:bg-slate-800/50">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md border border-slate-200 bg-white text-sm font-bold uppercase text-slate-700 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-200">
              {(row.insuranceCompany || "?").toString().slice(0, 1)}
            </div>
            <div>
              <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                {row.insuranceCompany || "—"}
              </div>
              <div className="text-xs text-slate-500 dark:text-slate-400">
                {row.coverageType || "—"}
              </div>
            </div>
          </div>
          <div className="text-left sm:text-right">
            <div className="text-xs text-slate-500 dark:text-slate-400">
              IDV — Cover value
            </div>
            <div className="text-xl font-bold tabular-nums text-slate-900 dark:text-slate-100">
              {toINR(br.totalIdv)}
            </div>
          </div>
        </div>

        <Tabs
          defaultActiveKey="includes"
          className="plan-features-tabs [&_.ant-tabs-nav]:mb-0 [&_.ant-tabs-nav::before]:border-slate-200 dark:[&_.ant-tabs-nav::before]:border-slate-600"
          items={[
            {
              key: "includes",
              label: <span className="text-sm font-medium">Includes</span>,
              children: (
                <div className="pt-4">
                  <div className="mb-3 text-sm font-semibold text-slate-900 dark:text-slate-100">
                    What&apos;s covered?
                  </div>
                  <ul className="flex flex-col gap-4">
                    {includes.map(({ title, description, Icon }) => (
                      <li key={title} className="flex gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-sky-100 text-sky-600 dark:bg-sky-950/80 dark:text-sky-400">
                          <Icon className="h-5 w-5" strokeWidth={2} />
                        </div>
                        <div>
                          <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                            {title}
                          </div>
                          <div className="text-sm leading-snug text-slate-500 dark:text-slate-400">
                            {description}
                          </div>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              ),
            },
            {
              key: "excludes",
              label: <span className="text-sm font-medium">Excludes</span>,
              children: (
                <div className="pt-4">
                  <div className="mb-3 text-sm font-semibold text-slate-900 dark:text-slate-100">
                    Common exclusions
                  </div>
                  <ul className="list-disc space-y-2 pl-5 text-sm text-slate-600 dark:text-slate-400">
                    {DEFAULT_EXCLUDES.map((line) => (
                      <li key={line}>{line}</li>
                    ))}
                  </ul>
                </div>
              ),
            },
            {
              key: "claimDetails",
              label: <span className="text-sm font-medium">Claim details</span>,
              children: (
                <div className="pt-4">
                  <div className="mb-3 text-sm font-semibold text-slate-900 dark:text-slate-100">
                    Typical claim steps
                  </div>
                  <ol className="list-decimal space-y-2 pl-5 text-sm text-slate-600 dark:text-slate-400">
                    {DEFAULT_CLAIM_STEPS.map((line) => (
                      <li key={line}>{line}</li>
                    ))}
                  </ol>
                </div>
              ),
            },
          ]}
        />
      </div>

      <div className="w-full shrink-0 lg:w-[min(100%,340px)]">
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-md dark:border-slate-600 dark:bg-slate-900/80">
          <div className="mb-4 text-lg font-bold text-slate-900 dark:text-slate-100">
            Premium breakup
          </div>

          <div className="space-y-3 text-sm">
            <div className="flex justify-between font-medium text-slate-900 dark:text-slate-100">
              <span>Own damage</span>
              <span className="tabular-nums font-semibold">{toINR(br.odAmt)}</span>
            </div>

            <div className="flex justify-between font-medium text-slate-900 dark:text-slate-100">
              <span>Third party</span>
              <span className="tabular-nums font-semibold">{toINR(br.tpAmt)}</span>
            </div>

            <div>
              <div className="flex justify-between font-medium text-slate-900 dark:text-slate-100">
                <span>Add-ons</span>
                <span className="tabular-nums font-semibold">
                  {toINR(br.addOnsTotal)}
                </span>
              </div>
              {br.addOnLines.length ? (
                <div className="mt-1 space-y-1 pl-2 text-xs text-slate-500 dark:text-slate-400">
                  {br.addOnLines.map(({ name, amount }) => (
                    <div key={name} className="flex justify-between gap-2">
                      <span className="min-w-0 truncate">{name}</span>
                      <span className="shrink-0 tabular-nums">
                        {amount > 0 ? toINR(amount) : "Included"}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="mt-1 pl-2 text-xs text-slate-500 dark:text-slate-400">
                  No add-ons selected
                </div>
              )}
            </div>

            <div className="flex justify-between text-emerald-700 dark:text-emerald-400">
              <span>NCB discount</span>
              <span className="tabular-nums font-medium">
                −{toINR(br.ncbAmount)}
              </span>
            </div>

            <Divider className="my-3 border-slate-200 dark:border-slate-600" />

            <div className="flex flex-col gap-1">
              <div className="flex items-baseline justify-between gap-2">
                <span className="text-base font-bold text-slate-900 dark:text-slate-100">
                  Total
                </span>
                <span className="text-2xl font-bold tabular-nums text-slate-900 dark:text-slate-100">
                  {toINR(br.totalPremium)}
                </span>
              </div>
              <Text className="text-xs text-slate-500 dark:text-slate-400">
                Prices are inclusive of GST
              </Text>
            </div>
          </div>

          <Button
            danger
            size="large"
            block
            className="mt-5 h-11 !bg-[#e54b4b] !font-semibold !text-white hover:!bg-[#d43f3f] dark:!border-red-700"
            disabled={isAccepted}
            onClick={() => onAcceptAndClose(rid)}
          >
            {isAccepted ? "Quote accepted" : "Proceed to buy"}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default PlanFeaturesModalBody;
