import { traccarGetCollection } from "../api/traccarRequest";

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
