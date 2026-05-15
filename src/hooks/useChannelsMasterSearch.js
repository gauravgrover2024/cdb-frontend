import { useCallback, useMemo, useRef, useState } from "react";
import { channelsApi } from "../api/channels";

const MIN_SEARCH_CHARS = 3;

const normalize = (value) => String(value || "").trim().toLowerCase();

export default function useChannelsMasterSearch({
  minChars = MIN_SEARCH_CHARS,
  limit = 25,
} = {}) {
  const [channels, setChannels] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const timerRef = useRef(null);

  const search = useCallback(
    (term) => {
      const q = String(term || "").trim();
      setSearchTerm(q);
      if (timerRef.current) clearTimeout(timerRef.current);

      if (!q || q.length < minChars) {
        setChannels([]);
        setLoading(false);
        return;
      }

      timerRef.current = setTimeout(async () => {
        setLoading(true);
        try {
          const response = await channelsApi.search(q, null);
          const rows = Array.isArray(response?.data) ? response.data : [];
          setChannels(rows.slice(0, limit));
        } catch {
          setChannels([]);
        } finally {
          setLoading(false);
        }
      }, 280);
    },
    [limit, minChars],
  );

  const options = useMemo(
    () =>
      (channels || []).map((ch) => {
        const id = String(ch?.channelId || "").trim();
        const name = String(ch?.name || "").trim();
        const type = String(ch?.type || "").trim();
        const mobile = String(ch?.mobile || "").trim();
        const labelParts = [id, name, type, mobile].filter(Boolean);
        return {
          value: id || name,
          label: labelParts.join(" · "),
          channel: ch,
        };
      }),
    [channels],
  );

  const getByChannelId = useCallback(
    (channelId) => {
      const key = normalize(channelId);
      return (
        (channels || []).find((ch) => normalize(ch?.channelId) === key) || null
      );
    },
    [channels],
  );

  const notFoundContent = useMemo(() => {
    const q = String(searchTerm || "").trim();
    if (q.length > 0 && q.length < minChars) {
      return `Type at least ${minChars} characters`;
    }
    if (loading) return "Searching channels…";
    if (q.length >= minChars && !channels.length) return "No channel found";
    return null;
  }, [channels.length, loading, minChars, searchTerm]);

  return {
    loading,
    channels,
    options,
    search,
    getByChannelId,
    notFoundContent,
    minChars,
  };
}
