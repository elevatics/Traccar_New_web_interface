import { traccarGet, traccarGetCollection, traccarPost, traccarPut } from "../api/traccarRequest";

const normalizeDevice = (device) => ({
  id: device?.id ?? null,
  name: device?.name ?? "",
  status: device?.status ?? "unknown",
  attributes: device?.attributes ?? {},
  category: device?.category ?? "",
  contact: device?.contact ?? "",
  phone: device?.phone ?? "",
  model: device?.model ?? "",
  uniqueId: device?.uniqueId ?? "",
  lastUpdate: device?.lastUpdate ?? null,
});

export const getDevices = async () => {
  return traccarGetCollection({
    url: "/devices",
    normalize: normalizeDevice,
  });
};

/** Full device JSON as returned by Traccar (needed for PUT /devices/{id}). */
export const getDeviceById = async (deviceId) => traccarGet(`/devices/${deviceId}`);

export const updateDevice = async (device) => {
  const payload = {
    ...device,
    attributes: device.attributes && typeof device.attributes === "object" ? device.attributes : {},
  };
  return traccarPut(`/devices/${device.id}`, payload);
};

export const createDevice = async (device) => {
  const payload = {
    name: device?.name?.trim(),
    uniqueId: device?.uniqueId?.trim(),
    category: device?.category || "car",
    model: device?.model?.trim() || "",
    attributes: device?.attributes && typeof device.attributes === "object" ? device.attributes : {},
  };

  if (!payload.name || !payload.uniqueId) {
    throw new Error("Name and unique ID are required");
  }

  return traccarPost("/devices", payload);
};
