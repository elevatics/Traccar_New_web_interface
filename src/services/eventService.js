import { traccarGetCollection } from "../api/traccarRequest";

const normalizeEvent = (event) => ({
  type: event?.type ?? "unknown",
  deviceId: event?.deviceId ?? null,
  eventTime: event?.eventTime ?? null,
});

const getDefaultTimeWindow = () => {
  const toDate = new Date();
  const fromDate = new Date(toDate.getTime() - 24 * 60 * 60 * 1000);

  return {
    from: fromDate.toISOString(),
    to: toDate.toISOString(),
  };
};

const fetchEventsFromEndpoint = ({ url, params }) =>
  traccarGetCollection({
    url,
    params,
    normalize: normalizeEvent,
    emptyMessage:
      "[Traccar Events] Empty response from event endpoint. This may depend on filters or device permissions.",
  });

export const getEvents = async () => {
  const timeWindow = getDefaultTimeWindow();

  try {
    return await fetchEventsFromEndpoint({
      url: "/events",
      params: timeWindow,
    });
  } catch (primaryError) {
    if (primaryError?.response?.status !== 404) {
      throw primaryError;
    }

    console.warn(
      "[Traccar Events] GET /events returned 404. Falling back to /reports/events."
    );

    return fetchEventsFromEndpoint({
      url: "/reports/events",
      params: timeWindow,
    });
  }
};

export default getEvents;
