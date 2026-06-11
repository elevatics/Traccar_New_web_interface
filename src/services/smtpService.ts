import { traccarGet, traccarPut } from "@/api/traccarRequest";

// ── Types ────────────────────────────────────────────────────────────────────

export interface SmtpConfig {
  smtpHost: string;
  smtpPort: number;
  smtpSecure: boolean;
  smtpUsername: string;
  smtpPassword: string;
  smtpFromAddress: string;
  smtpFromName: string;
}

export const DEFAULT_SMTP: SmtpConfig = {
  smtpHost: "",
  smtpPort: 587,
  smtpSecure: false,
  smtpUsername: "",
  smtpPassword: "",
  smtpFromAddress: "",
  smtpFromName: "Elevatics Fleet",
};

// ── SMTP config via Traccar server settings ───────────────────────────────────

/** Fetch current Traccar server config and extract SMTP fields. */
export const getSmtpConfig = async (): Promise<SmtpConfig> => {
  const server = (await traccarGet("/server")) as Record<string, any>;
  const attrs = server.attributes || {};
  return {
    smtpHost: String(attrs["mail.smtp.host"] ?? ""),
    smtpPort: Number(attrs["mail.smtp.port"] ?? 587),
    smtpSecure: Boolean(attrs["mail.smtp.ssl.enable"] ?? attrs["mail.smtp.starttls.enable"] ?? false),
    smtpUsername: String(attrs["mail.smtp.username"] ?? ""),
    smtpPassword: String(attrs["mail.smtp.password"] ?? ""),
    smtpFromAddress: String(attrs["mail.smtp.from"] ?? ""),
    smtpFromName: String(attrs["mail.smtp.fromName"] ?? "Elevatics Fleet"),
  };
};

/** Merge SMTP fields into the current server config attributes and save. */
export const saveSmtpConfig = async (fields: SmtpConfig): Promise<void> => {
  const current = (await traccarGet("/server")) as Record<string, any>;
  const attributes = { ...(current.attributes || {}) };

  attributes["mail.smtp.host"] = fields.smtpHost;
  attributes["mail.smtp.port"] = fields.smtpPort;
  
  // Gmail requires STARTTLS on 587 or SSL on 465
  if (fields.smtpSecure) {
    if (fields.smtpPort === 465) {
      attributes["mail.smtp.ssl.enable"] = true;
      attributes["mail.smtp.starttls.enable"] = false;
    } else {
      attributes["mail.smtp.ssl.enable"] = false;
      attributes["mail.smtp.starttls.enable"] = true;
      attributes["mail.smtp.starttls.required"] = true;
    }
  } else {
    attributes["mail.smtp.ssl.enable"] = false;
    attributes["mail.smtp.starttls.enable"] = false;
  }

  attributes["mail.smtp.auth"] = Boolean(fields.smtpUsername);
  attributes["mail.smtp.username"] = fields.smtpUsername;
  
  if (fields.smtpPassword) {
    attributes["mail.smtp.password"] = fields.smtpPassword;
  }

  attributes["mail.smtp.from"] = fields.smtpFromAddress;
  attributes["mail.smtp.fromName"] = fields.smtpFromName;

  await traccarPut("/server", {
    ...current,
    attributes,
  });
};

// ── Password reset via Traccar /api/password/reset ───────────────────────────

const TRACCAR_API_BASE = "/api";

/**
 * Step 1 — Request a password reset email.
 * Traccar sends an email with a reset link if SMTP is configured.
 * Always resolves successfully (no info leakage on unknown emails).
 */
export const requestPasswordReset = async (email: string): Promise<void> => {
  const response = await fetch(`${TRACCAR_API_BASE}/password/reset`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ email }),
  });

  // 4xx = real error (e.g. SMTP not configured), 5xx = server error
  if (!response.ok && response.status !== 200) {
    const text = await response.text().catch(() => "");
    const errorMsg = text || `Server returned ${response.status}`;

    if (response.status === 500 && errorMsg.toLowerCase().includes("smtp")) {
      throw new Error(
        "Email delivery is not configured on this server. Please contact your administrator."
      );
    }
    if (response.status === 404) {
      throw new Error(
        "Password reset endpoint not available. Please contact your administrator."
      );
    }
    throw new Error(errorMsg || "Password reset request failed.");
  }
};

/**
 * Step 2 — Confirm the reset using the token from the email link.
 * Traccar validates the token and updates the password.
 */
export const confirmPasswordReset = async (
  token: string,
  password: string
): Promise<void> => {
  const response = await fetch(`${TRACCAR_API_BASE}/password/update`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ token, password }),
  });

  if (!response.ok) {
    const text = await response.text().catch(() => "");
    if (response.status === 400 || response.status === 401) {
      throw new Error(
        "This reset link is invalid or has expired. Please request a new one."
      );
    }
    throw new Error(text || `Password reset failed (${response.status}).`);
  }
};
