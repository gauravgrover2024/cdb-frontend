/** Safe text for injecting into HTML body (e.g. inside pre). */
export const escapeHtmlText = (s) =>
  String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

/**
 * Calls window.print() after the window document is likely ready.
 * Avoids blank prints when print() runs before layout/paint (e.g. after document.write).
 */
export const scheduleWindowPrint = (win, options = {}) => {
  const { loadDelayMs = 350, fallbackMs = 1400 } = options;
  if (!win || typeof win.print !== "function") return;

  let fired = false;
  const run = () => {
    if (fired) return;
    fired = true;
    try {
      win.focus();
      win.print();
    } catch {
      /* ignore */
    }
  };

  win.addEventListener(
    "load",
    () => {
      setTimeout(run, loadDelayMs);
    },
    { once: true },
  );
  setTimeout(run, fallbackMs);
};
