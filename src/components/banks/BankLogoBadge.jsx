import React, { useEffect, useMemo, useState } from "react";

const BANK_LOGO_DOMAIN_MAP = {
  hdfc: "hdfcbank.com",
  "hdfc bank": "hdfcbank.com",
  icici: "icicibank.com",
  "icici bank": "icicibank.com",
  sbi: "sbi.co.in",
  "state bank of india": "sbi.co.in",
  axis: "axisbank.com",
  "axis bank": "axisbank.com",
  kotak: "kotak.com",
  "kotak mahindra bank": "kotak.com",
  federal: "federalbank.co.in",
  "federal bank": "federalbank.co.in",
  pnb: "pnbindia.in",
  "punjab national bank": "pnbindia.in",
  bob: "bankofbaroda.in",
  "bank of baroda": "bankofbaroda.in",
  boi: "bankofindia.co.in",
  "bank of india": "bankofindia.co.in",
  canara: "canarabank.com",
  "canara bank": "canarabank.com",
  indusind: "indusind.com",
  "indusind bank": "indusind.com",
  "idfc first bank": "idfcfirstbank.com",
  "yes bank": "yesbank.in",
  "union bank of india": "unionbankofindia.co.in",
};

const normalizeBankNameKey = (name) =>
  String(name || "")
    .toLowerCase()
    .replace(/[.,&/()-]/g, " ")
    .replace(/\b(ltd|limited|banking|co|company)\b/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const bankLogoSources = (bankName) => {
  const rawKey = String(bankName || "").toLowerCase().trim();
  const normalized = normalizeBankNameKey(bankName);
  const byExact = BANK_LOGO_DOMAIN_MAP[rawKey] || BANK_LOGO_DOMAIN_MAP[normalized];
  const fallbackHit = Object.entries(BANK_LOGO_DOMAIN_MAP).find(([key]) =>
    normalized.includes(normalizeBankNameKey(key)),
  );
  const domain = byExact || fallbackHit?.[1] || "";
  if (!domain) return [];
  return [
    `https://logo.clearbit.com/${domain}?size=128`,
    `https://www.google.com/s2/favicons?sz=256&domain=${domain}`,
    `https://icons.duckduckgo.com/ip3/${domain}.ico`,
  ];
};

const initialsFromBankName = (bankName) => {
  const tokens = String(bankName || "")
    .split(/\s+/)
    .map((t) => t.trim())
    .filter(Boolean)
    .filter((t) => !["bank", "limited", "ltd", "finance", "financial", "services"].includes(t.toLowerCase()));
  if (!tokens.length) return "BK";
  if (tokens.length === 1) return tokens[0].slice(0, 2).toUpperCase();
  return `${tokens[0][0] || ""}${tokens[1][0] || ""}`.toUpperCase();
};

const BankLogoBadge = ({ bankName, size = 36 }) => {
  const [resolvedLogoUrl, setResolvedLogoUrl] = useState("");
  const logoUrls = useMemo(() => bankLogoSources(bankName), [bankName]);

  useEffect(() => {
    let isCancelled = false;

    const resolveLogo = async () => {
      setResolvedLogoUrl("");
      for (const url of logoUrls) {
        // Validate image load before rendering to avoid blank placeholders.
        const isValid = await new Promise((resolve) => {
          const img = new Image();
          img.onload = () => resolve(true);
          img.onerror = () => resolve(false);
          img.src = url;
        });
        if (isCancelled) return;
        if (isValid) {
          setResolvedLogoUrl(url);
          return;
        }
      }
    };

    resolveLogo();
    return () => {
      isCancelled = true;
    };
  }, [logoUrls]);

  return (
    <div
      className="relative flex items-center justify-center overflow-hidden rounded-lg border border-border bg-white shadow-sm"
      style={{ width: size, height: size }}
    >
      <span className="text-[10px] font-black tracking-wide text-slate-700">
        {initialsFromBankName(bankName)}
      </span>
      {resolvedLogoUrl ? (
        <img
          src={resolvedLogoUrl}
          alt={bankName || "Bank"}
          className="absolute inset-0 m-auto h-[75%] w-[75%] object-contain"
          loading="lazy"
        />
      ) : null}
    </div>
  );
};

export default BankLogoBadge;
