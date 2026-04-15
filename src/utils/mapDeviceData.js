export const mapDeviceData = (devices = [], positions = []) => {
  const positionByDeviceId = new Map(
    positions.map((position) => [position.deviceId, position])
  );

  const asNumber = (value, fallback = 0) => {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
  };

  const asBoolean = (value, fallback = false) => {
    if (value === true || value === false) {
      return value;
    }
    return fallback;
  };

  const deriveStatus = (deviceStatus, speed, motion) => {
    if (deviceStatus === "offline") {
      return "offline";
    }
    if (speed > 0 || motion) {
      return "online";
    }
    return "idle";
  };

  return devices
    .map((device) => {
      const position = positionByDeviceId.get(device.id);
      const deviceAttributes = device.attributes || {};
      const positionAttributes = position?.attributes || {};
      const lat = Number(position?.latitude);
      const lng = Number(position?.longitude);
      const hasValidCoordinates = Number.isFinite(lat) && Number.isFinite(lng);
      const speed = asNumber(position?.speed);

      const motion = asBoolean(
        positionAttributes.motion ?? deviceAttributes.motion,
        speed > 0
      );

      const geofenceIds = positionAttributes.geofenceIds ?? deviceAttributes.geofenceIds;
      const geofenceValue = Array.isArray(geofenceIds)
        ? geofenceIds.join(", ")
        : geofenceIds;

      return {
        id: String(device.id),
        deviceId: asNumber(device.id),
        protocol: deviceAttributes.protocol || device.protocol || "traccar",
        name: device.name,
        plateNumber:
          deviceAttributes.plateNumber ||
          deviceAttributes.plate ||
          deviceAttributes.licensePlate ||
          "-",
        driver: deviceAttributes.driver || "-",
        status: deriveStatus(device.status, speed, motion),
        lat: hasValidCoordinates ? lat : 0,
        lng: hasValidCoordinates ? lng : 0,
        address:
          position?.address ||
          positionAttributes.address ||
          "No GPS position yet",
        speed,
        serverTime: position?.serverTime || null,
        deviceTime: position?.deviceTime || null,
        fixTime: position?.fixTime || null,
        lastUpdate: device.lastUpdate || position?.fixTime || null,
        fuelLevel: asNumber(
          positionAttributes.fuelLevel ?? deviceAttributes.fuelLevel
        ),
        odometer: asNumber(
          positionAttributes.odometer ?? deviceAttributes.odometer
        ),
        outdated: asBoolean(position?.outdated, false),
        valid: asBoolean(position?.valid, true),
        altitude: asNumber(position?.altitude),
        course: asNumber(position?.course),
        accuracy: asNumber(position?.accuracy),
        network:
          positionAttributes.network ??
          deviceAttributes.network ??
          undefined,
        geofenceIds:
          geofenceValue !== undefined && geofenceValue !== null
            ? String(geofenceValue)
            : undefined,
        tripOdometer: asNumber(
          positionAttributes.tripOdometer ?? deviceAttributes.tripOdometer
        ),
        fuelConsumption: asNumber(
          positionAttributes.fuelConsumption ?? deviceAttributes.fuelConsumption
        ),
        ignition: asBoolean(
          positionAttributes.ignition ?? deviceAttributes.ignition,
          false
        ),
        statusCode: asNumber(
          positionAttributes.statusCode ?? deviceAttributes.statusCode
        ),
        coolantTemp:
          positionAttributes.coolantTemp ?? deviceAttributes.coolantTemp,
        mapIntake:
          positionAttributes.mapIntake ?? deviceAttributes.mapIntake,
        rpm: positionAttributes.rpm ?? deviceAttributes.rpm,
        obdSpeed: positionAttributes.obdSpeed ?? deviceAttributes.obdSpeed,
        intakeTemp:
          positionAttributes.intakeTemp ?? deviceAttributes.intakeTemp,
        fuel: asNumber(positionAttributes.fuel ?? deviceAttributes.fuel),
        distance: asNumber(
          positionAttributes.distance ?? deviceAttributes.distance
        ),
        totalDistance: asNumber(
          positionAttributes.totalDistance ?? deviceAttributes.totalDistance
        ),
        motion,
      };
    });
};

export default mapDeviceData;
