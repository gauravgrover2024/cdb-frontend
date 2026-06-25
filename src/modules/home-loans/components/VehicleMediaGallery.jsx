import React, { useEffect, useMemo, useState } from "react";
import { message } from "antd";
import { vehiclesApi } from "../../../api/vehicles";
import Icon from "../../../components/AppIcon";

const canonicalizeMake = (value) => {
  const normalized = String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[-_]+/g, " ")
    .replace(/\s+/g, " ");

  const aliases = {
    mercedes: "mercedes benz",
    "mercedes benz": "mercedes benz",
    benz: "mercedes benz",
    maruti: "maruti suzuki",
    "maruti suzuki": "maruti suzuki",
  };

  return aliases[normalized] || normalized;
};

const normalizeText = (value) =>
  String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[-_]+/g, " ")
    .replace(/\s+/g, " ");

const normalizeMakeKey = (value) => canonicalizeMake(value);
const normalizeModelKey = (value, make = "") => {
  const raw = normalizeText(value);
  const canonicalMake = normalizeMakeKey(make);
  return raw.startsWith(`${canonicalMake} `) ? raw.slice(canonicalMake.length + 1) : raw;
};

const getVehicleMake = (vehicle) => vehicle?.make || vehicle?.brand || "";
const getVehicleModel = (vehicle) => vehicle?.model || "";
const getVehicleVariant = (vehicle) => vehicle?.variant || "";
const getVehicleImage = (vehicle) => vehicle?.image_url || vehicle?.imageUrl || "";
const getVehicleColor = (vehicle) =>
  vehicle?.color_name || vehicle?.colorName || vehicle?.colour_name || vehicle?.colourName || "";
const getVehicleHex = (vehicle) => vehicle?.hex || vehicle?.color_hex || vehicle?.colour_hex || "";

const VehicleMediaGallery = ({ make, model, variant }) => {
  const [loading, setLoading] = useState(false);
  const [mediaRows, setMediaRows] = useState([]);
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    let cancelled = false;

    const loadMedia = async () => {
      if (!make || !model) {
        setMediaRows([]);
        setActiveIndex(0);
        return;
      }

      try {
        setLoading(true);
        const res = await vehiclesApi.getMedia(make, model);
        const rows = Array.isArray(res?.data) ? res.data : [];

        if (cancelled) return;
        setMediaRows(rows);
      } catch (error) {
        if (!cancelled) {
          console.error("Failed to load vehicle media:", error);
          message.error("Failed to load car photos");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    loadMedia();
    return () => {
      cancelled = true;
    };
  }, [make, model]);

  const galleryItems = useMemo(() => {
    const makeKey = normalizeMakeKey(make);
    const modelKey = normalizeModelKey(model, make);
    const variantKey = normalizeText(variant);

    const exactVariant = mediaRows.filter((row) => {
      const image = getVehicleImage(row);
      if (!image) return false;
      const rowVariant = normalizeText(getVehicleVariant(row));
      return (
        normalizeText(getVehicleMake(row)) === makeKey &&
        normalizeModelKey(getVehicleModel(row), getVehicleMake(row)) === modelKey &&
        (rowVariant === variantKey ||
          rowVariant.includes(variantKey) ||
          variantKey.includes(rowVariant))
      );
    });

    const sameModel = mediaRows.filter((row) => {
      const image = getVehicleImage(row);
      if (!image) return false;
      return (
        normalizeMakeKey(getVehicleMake(row)) === makeKey &&
        normalizeModelKey(getVehicleModel(row), getVehicleMake(row)) === modelKey
      );
    });

    const source = exactVariant.length ? exactVariant : sameModel;
    const seen = new Set();

    return source
      .map((row) => ({
        image: getVehicleImage(row),
        color: getVehicleColor(row) || "Default",
        hex: getVehicleHex(row) || "#d1d5db",
      }))
      .filter((item) => {
        const key = `${item.image}|${item.color}`;
        if (!item.image || seen.has(key)) return false;
        seen.add(key);
        return true;
      });
  }, [make, model, variant, mediaRows]);

  useEffect(() => {
    setActiveIndex(0);
  }, [make, model, variant]);

  useEffect(() => {
    if (!galleryItems.length) {
      setActiveIndex(0);
      return;
    }
    if (activeIndex > galleryItems.length - 1) {
      setActiveIndex(0);
    }
  }, [galleryItems, activeIndex]);

  if (!make || !model) return null;

  const activeItem = galleryItems[activeIndex] || null;

  const goPrev = () => {
    if (!galleryItems.length) return;
    setActiveIndex((current) =>
      current === 0 ? galleryItems.length - 1 : current - 1,
    );
  };

  const goNext = () => {
    if (!galleryItems.length) return;
    setActiveIndex((current) =>
      current === galleryItems.length - 1 ? 0 : current + 1,
    );
  };

  return (
    <div className="bg-white dark:bg-[#1f1f1f] rounded-3xl shadow-sm border border-slate-100 dark:border-[#262626] overflow-hidden">
      <div className="px-5 py-4 border-b border-slate-100 dark:border-[#262626]">
        <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
          Car Gallery
        </div>
        <h3 className="mt-1 text-sm font-semibold text-slate-900 dark:text-slate-100">
          {make} {model}
        </h3>
        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
          {variant}
        </p>
      </div>

      {loading ? (
        <div className="px-5 py-8 text-sm text-slate-500 dark:text-slate-400">
          Loading car photos...
        </div>
      ) : !galleryItems.length ? (
        <div className="px-5 py-8 text-sm text-slate-500 dark:text-slate-400">
          No photos available for this car in the database.
        </div>
      ) : (
        <div className="p-4 bg-slate-50 dark:bg-[#171717] space-y-4">
          <div className="relative overflow-hidden rounded-[24px] border border-slate-200 dark:border-[#2d2d2d] bg-white dark:bg-[#111]">
            <div className="absolute inset-x-0 top-0 z-10 flex items-center justify-between p-3">
              <button
                type="button"
                onClick={goPrev}
                className="flex h-10 w-10 items-center justify-center rounded-full border border-white/60 bg-white/80 text-slate-700 shadow-sm backdrop-blur hover:bg-white"
              >
                <Icon name="ChevronLeft" size={18} />
              </button>
              <button
                type="button"
                onClick={goNext}
                className="flex h-10 w-10 items-center justify-center rounded-full border border-white/60 bg-white/80 text-slate-700 shadow-sm backdrop-blur hover:bg-white"
              >
                <Icon name="ChevronRight" size={18} />
              </button>
            </div>

            <div className="aspect-[16/9] w-full overflow-hidden">
              <img
                src={activeItem.image}
                alt={`${make} ${model} ${variant} ${activeItem.color}`}
                className="h-full w-full object-cover"
              />
            </div>
          </div>

          <div className="flex items-center gap-2 overflow-x-auto pb-1">
            {galleryItems.map((item, index) => {
              const isActive = index === activeIndex;
              return (
                <button
                  key={`${item.image}-${item.color}-${index}`}
                  type="button"
                  onClick={() => setActiveIndex(index)}
                  className={`min-w-[112px] rounded-2xl border p-2 text-left transition ${
                    isActive
                      ? "border-emerald-500 bg-white shadow-sm dark:border-emerald-400 dark:bg-[#1f1f1f]"
                      : "border-slate-200 bg-white/70 hover:border-slate-300 dark:border-[#303030] dark:bg-[#1b1b1b]"
                  }`}
                >
                  <div className="mb-2 aspect-[4/3] overflow-hidden rounded-xl bg-slate-100 dark:bg-[#111]">
                    <img
                      src={item.image}
                      alt={item.color}
                      className="h-full w-full object-cover"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <span
                      className="h-3.5 w-3.5 rounded-full border border-black/10"
                      style={{ backgroundColor: item.hex }}
                    />
                    <span className="truncate text-xs font-medium text-slate-700 dark:text-slate-200">
                      {item.color}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default VehicleMediaGallery;
