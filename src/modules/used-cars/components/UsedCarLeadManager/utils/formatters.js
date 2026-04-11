import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";

dayjs.extend(relativeTime);

export { dayjs };

export const fmt = (v) => {
  if (!v) return "—";
  const d = dayjs(v);
  return d.isValid() ? d.format("DD MMM YYYY, hh:mm A") : String(v);
};

export const fmtDate = (v) => {
  if (!v) return "—";
  const d = dayjs(v);
  return d.isValid() ? d.format("DD MMM YYYY") : String(v);
};

export const fmtInr = (v) => `₹${Number(v || 0).toLocaleString("en-IN")}`;
export const fmtInrOrPending = (v) =>
  Number(v || 0) > 0 ? fmtInr(v) : "Price pending";
