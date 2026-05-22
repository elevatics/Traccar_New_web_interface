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

const EVENTS_404_KEY = "traccar_events_endpoint_404";

// Persisted across hot-reloads within the same browser session
let eventsEndpointUnavailable =
  window.sessionStorage.getItem(EVENTS_404_KEY) === "1";

export const getEvents = async () => {
  const timeWindow = getDefaultTimeWindow();

  if (!eventsEndpointUnavailable) {
    try {
      return await fetchEventsFromEndpoint({
        url: "/events",
        params: timeWindow,
      });
    } catch (primaryError) {
      if (primaryError?.response?.status !== 404) {
        throw primaryError;
      }
      eventsEndpointUnavailable = true;
      window.sessionStorage.setItem(EVENTS_404_KEY, "1");
    }
  }

  return fetchEventsFromEndpoint({
    url: "/reports/events",
    params: timeWindow,
  });
};

export default getEvents;
