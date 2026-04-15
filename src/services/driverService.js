import {
  traccarDelete,
  traccarGet,
  traccarGetCollection,
  traccarPost,
  traccarPut,
} from "../api/traccarRequest";

export const normalizeDriver = (driver) => ({
  id: driver?.id ?? null,
  name: driver?.name ?? "",
  uniqueId: driver?.uniqueId ?? "",
  attributes: driver?.attributes ?? {},
});

export const getDrivers = async () =>
  traccarGetCollection({
    url: "/drivers",
    normalize: normalizeDriver,
  });

export const createDriver = async ({ name, uniqueId, attributes = {} }) => {
  const payload = {
    name: String(name).trim(),
    uniqueId: String(uniqueId).trim(),
    attributes,
  };
  const created = await traccarPost("/drivers", payload);
  if (created && created.id != null) {
    return normalizeDriver(created);
  }
  const list = await getDrivers();
  const match = list.find((d) => d.uniqueId === payload.uniqueId);
  return match || normalizeDriver(created);
};

export const updateDriver = async (driver) => {
  const payload = {
    ...driver,
    id: driver.id,
    name: String(driver.name ?? "").trim(),
    uniqueId: String(driver.uniqueId ?? "").trim(),
    attributes: driver.attributes && typeof driver.attributes === "object" ? driver.attributes : {},
  };
  const updated = await traccarPut(`/drivers/${driver.id}`, payload);
  return normalizeDriver(updated);
};

export const deleteDriver = async (driverId) => {
  await traccarDelete(`/drivers/${driverId}`);
};

export const getDriverById = async (driverId) => {
  const driver = await traccarGet(`/drivers/${driverId}`);
  return normalizeDriver(driver);
};

/** Merge phone/email into driver.attributes (PUT full driver from server). */
export const patchDriverContact = async (driverId, { phone, email }) => {
  const current = await traccarGet(`/drivers/${driverId}`);
  const prev =
    current.attributes && typeof current.attributes === "object" ? { ...current.attributes } : {};
  const next = { ...prev };
  const p = phone != null ? String(phone).trim() : "";
  const em = email != null ? String(email).trim() : "";
  if (p) next.phone = p;
  else delete next.phone;
  if (em) next.email = em;
  else delete next.email;
  const payload = { ...current, attributes: next };
  const updated = await traccarPut(`/drivers/${driverId}`, payload);
  return normalizeDriver(updated);
};
