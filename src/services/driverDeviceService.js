import { traccarDelete, traccarPost } from "../api/traccarRequest";
import { getDeviceById, getDevices, updateDevice } from "./deviceService";

const FLEET_DRIVER_ID_KEY = "fleetDriverId";

/**
 * Traccar links a driver to a device with POST /permissions { deviceId, driverId }.
 * See https://www.traccar.org/traccar-api/
 *
 * We also mirror the chosen driver onto device.attributes so the fleet UI
 * (mapDeviceData) can show a name without the tracker sending driverUniqueId.
 */
export async function assignDriverToDevice(driver, deviceId) {
  const dId = Number(deviceId);
  const drId = Number(driver.id);
  if (!Number.isFinite(dId) || !Number.isFinite(drId)) {
    throw new Error("Invalid device or driver id");
  }

  const devices = await getDevices();
  for (const d of devices) {
    if (Number(d.attributes?.[FLEET_DRIVER_ID_KEY]) === drId && Number(d.id) !== dId) {
      const raw = await getDeviceById(d.id);
      const attrs = { ...(raw.attributes || {}) };
      if (Number(attrs[FLEET_DRIVER_ID_KEY]) === drId) {
        delete attrs[FLEET_DRIVER_ID_KEY];
        delete attrs.driver;
      }
      await updateDevice({ ...raw, attributes: attrs });
    }
  }

  await traccarPost("/permissions", { deviceId: dId, driverId: drId });

  const device = await getDeviceById(dId);
  const nextAttrs = { ...(device.attributes || {}) };
  nextAttrs.driver = driver.name;
  nextAttrs[FLEET_DRIVER_ID_KEY] = drId;
  await updateDevice({ ...device, attributes: nextAttrs });
}

export async function unassignDriverFromDevice(driver, deviceId) {
  const dId = Number(deviceId);
  const drId = Number(driver.id);
  if (!Number.isFinite(dId) || !Number.isFinite(drId)) {
    throw new Error("Invalid device or driver id");
  }

  await traccarDelete("/permissions", { data: { deviceId: dId, driverId: drId } });

  const device = await getDeviceById(dId);
  const attrs = { ...(device.attributes || {}) };
  if (Number(attrs[FLEET_DRIVER_ID_KEY]) === drId) {
    delete attrs[FLEET_DRIVER_ID_KEY];
    delete attrs.driver;
  }
  await updateDevice({ ...device, attributes: attrs });
}

export function findPrimaryDeviceForDriver(devices, driverId) {
  const drId = Number(driverId);
  return (
    devices.find((d) => Number(d.attributes?.[FLEET_DRIVER_ID_KEY]) === drId) ||
    null
  );
}
