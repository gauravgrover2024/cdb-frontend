const normalizeRegNo = (value) =>
  String(value || "")
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "");

const firstValue = (...values) =>
  values.find((value) => value !== undefined && value !== null && String(value).trim() !== "");

const toIsoDate = (value) => {
  if (!value) return "";
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toISOString().slice(0, 10);
};

export const normalizeVehicleRegistrationQuery = (value) => normalizeRegNo(value);

export const buildVehicleRecordAutofillPatch = (record = {}, registrationField) => {
  const patch = {};
  const regNo = firstValue(
    record?.registrationNumber,
    record?.registrationNumberNormalized,
  );
  const make = firstValue(record?.make);
  const model = firstValue(record?.model);
  const variant = firstValue(record?.variant);
  const year = firstValue(record?.yearOfManufacture, record?.manufacturingYear);
  const chassis = firstValue(record?.chassisNumber, record?.rc_chassis_no);
  const engine = firstValue(record?.engineNumber, record?.rc_engine_no);
  const regCity = firstValue(record?.registrationCity, record?.postfile_regd_city);
  const regDate = toIsoDate(
    firstValue(record?.registrationDate, record?.rc_redg_date, record?.regdDate),
  );
  const hypothecation = firstValue(record?.hypothecation);

  if (regNo) {
    patch.vehicleRegNo = regNo;
    patch.rc_redg_no = regNo;
    patch.registrationNumber = regNo;
    if (registrationField) patch[registrationField] = regNo;
  }
  if (make) patch.vehicleMake = make;
  if (model) patch.vehicleModel = model;
  if (variant) patch.vehicleVariant = variant;
  if (year) {
    patch.yearOfManufacture = String(year);
    patch.manufacturingYear = String(year);
    patch.boughtInYear = String(year);
  }
  if (chassis) {
    patch.rc_chassis_no = chassis;
    patch.chassisNumber = chassis;
  }
  if (engine) {
    patch.rc_engine_no = engine;
    patch.engineNumber = engine;
  }
  if (regDate) {
    patch.rc_redg_date = regDate;
    patch.registrationDate = regDate;
  }
  if (regCity) {
    patch.registrationCity = regCity;
    patch.postfile_regd_city = regCity;
  }
  if (hypothecation) {
    patch.hypothecation = "Yes";
    patch.hypothecationBank = hypothecation;
  }

  return patch;
};

