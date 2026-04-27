export type RuleMetric = 'speed' | 'device_offline' | 'device_online';

export interface NotificationRule {
  id: string;
  deviceId: number;
  vehicleName: string;
  metric: RuleMetric;
  limit: number | null;
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
}

export type ParsedPromptRuleCommand =
  | { kind: 'speed'; limit: number | null }
  | { kind: 'device_offline'; enabled: boolean }
  | { kind: 'device_online'; enabled: boolean };

const STORAGE_KEY = 'custom_notification_rules_v1';
const MIN_SPEED_LIMIT_KMH = 1;
const MAX_SPEED_LIMIT_KMH = 300;
const MPH_TO_KMH = 1.60934;

const parseStoredRules = (value: string | null): NotificationRule[] => {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

export const getNotificationRules = (): NotificationRule[] => {
  if (typeof window === 'undefined') return [];
  return parseStoredRules(window.localStorage.getItem(STORAGE_KEY));
};

export const saveNotificationRules = (rules: NotificationRule[]) => {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(rules));
};

export const upsertSpeedRule = ({
  deviceId,
  vehicleName,
  limit,
}: {
  deviceId: number;
  vehicleName: string;
  limit: number | null;
}): NotificationRule => {
  const now = new Date().toISOString();
  const rules = getNotificationRules();
  const existingIndex = rules.findIndex(
    (rule) => rule.deviceId === deviceId && rule.metric === 'speed'
  );

  const nextRule: NotificationRule = {
    id: existingIndex >= 0 ? rules[existingIndex].id : `speed-${deviceId}`,
    deviceId,
    vehicleName,
    metric: 'speed',
    limit,
    enabled: true,
    createdAt: existingIndex >= 0 ? rules[existingIndex].createdAt : now,
    updatedAt: now,
  };

  if (existingIndex >= 0) {
    rules[existingIndex] = nextRule;
  } else {
    rules.push(nextRule);
  }

  saveNotificationRules(rules);
  return nextRule;
};

export const upsertStatusRule = ({
  deviceId,
  vehicleName,
  metric,
  enabled,
}: {
  deviceId: number;
  vehicleName: string;
  metric: 'device_offline' | 'device_online';
  enabled: boolean;
}): NotificationRule => {
  const now = new Date().toISOString();
  const rules = getNotificationRules();
  const existingIndex = rules.findIndex(
    (rule) => rule.deviceId === deviceId && rule.metric === metric
  );

  const nextRule: NotificationRule = {
    id: existingIndex >= 0 ? rules[existingIndex].id : `${metric}-${deviceId}`,
    deviceId,
    vehicleName,
    metric,
    limit: null,
    enabled,
    createdAt: existingIndex >= 0 ? rules[existingIndex].createdAt : now,
    updatedAt: now,
  };

  if (existingIndex >= 0) {
    rules[existingIndex] = nextRule;
  } else {
    rules.push(nextRule);
  }

  saveNotificationRules(rules);
  return nextRule;
};

export const parseSpeedLimitPrompt = (input: string): number | null | undefined => {
  const normalized = input.trim().toLowerCase();
  if (!normalized) return undefined;

  if (
    /(clear|remove|disable)\s+(speed\s+)?limit/.test(normalized) ||
    /\b(limit)\s*(to)?\s*(null|none)\b/.test(normalized)
  ) {
    return null;
  }

  if (!/(speed|km\/?h|limit|alert|cross|exceed|over)/.test(normalized)) {
    return undefined;
  }

  const numberMatch = normalized.match(/(\d+(?:\.\d+)?)\s*(km\/?h|kph|mph|mi\/?h)?/);
  if (!numberMatch) return undefined;

  const rawValue = Number(numberMatch[1]);
  const unit = (numberMatch[2] || '').toLowerCase();
  const value =
    unit === 'mph' || unit === 'mi/h' || unit === 'mih'
      ? rawValue * MPH_TO_KMH
      : rawValue;
  if (!Number.isFinite(value)) return undefined;

  const rounded = Math.round(value);
  if (rounded < MIN_SPEED_LIMIT_KMH) return MIN_SPEED_LIMIT_KMH;
  if (rounded > MAX_SPEED_LIMIT_KMH) return MAX_SPEED_LIMIT_KMH;
  return rounded;
};

export const parsePromptRuleCommand = (
  input: string
): ParsedPromptRuleCommand | undefined => {
  const normalized = input.trim().toLowerCase();
  if (!normalized) return undefined;

  const speedLimit = parseSpeedLimitPrompt(normalized);
  if (speedLimit !== undefined) {
    return { kind: 'speed', limit: speedLimit };
  }

  const asksOffline = /\b(offline|went\s+offline|is\s+offline)\b/.test(normalized);
  const asksOnline = /\b(online|came\s+online|is\s+online)\b/.test(normalized);
  const wantsAlert = /\b(alert|notification|notify|notify me|give me)\b/.test(normalized);
  const wantsDisable = /\b(clear|remove|disable|stop)\b/.test(normalized);

  // Prioritize disable intent when both "clear/remove" and "alert/notify" are present.
  if (asksOffline && wantsDisable) return { kind: 'device_offline', enabled: false };
  if (asksOnline && wantsDisable) return { kind: 'device_online', enabled: false };
  if (asksOffline && wantsAlert) return { kind: 'device_offline', enabled: true };
  if (asksOnline && wantsAlert) return { kind: 'device_online', enabled: true };

  return undefined;
};
