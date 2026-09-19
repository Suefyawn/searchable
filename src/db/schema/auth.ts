import { check, index, sqliteTable, text } from "drizzle-orm/sqlite-core";
import { bool, createdAt, enumCheckSql, enumColumn, json, textEnum, timestampMs, updatedAt } from "./_shared";

// Tables follow better-auth's core schema (field names are what the Drizzle adapter maps on).
// `role` is an additional field declared in src/lib/auth.ts.

export const userRole = textEnum("user_role", ["user", "business_owner", "editor", "admin"]);

export const users = sqliteTable(
  "users",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    email: text("email").notNull().unique(),
    emailVerified: bool("email_verified").default(false).notNull(),
    image: text("image"),
    role: enumColumn("role", userRole).default("user").notNull(),
    /** Per-kind email switches (leads, outbid, digest); a missing key means on. See src/lib/notify.ts. */
    notificationPrefs: json("notification_prefs").$type<Record<string, boolean>>().default({}).notNull(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [index("users_email_idx").on(t.email), check("users_role_check", enumCheckSql("role", userRole))],
);

export const sessions = sqliteTable(
  "sessions",
  {
    id: text("id").primaryKey(),
    expiresAt: timestampMs("expires_at").notNull(),
    token: text("token").notNull().unique(),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [index("sessions_user_id_idx").on(t.userId)],
);

export const accounts = sqliteTable(
  "accounts",
  {
    id: text("id").primaryKey(),
    accountId: text("account_id").notNull(),
    providerId: text("provider_id").notNull(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    accessToken: text("access_token"),
    refreshToken: text("refresh_token"),
    idToken: text("id_token"),
    accessTokenExpiresAt: timestampMs("access_token_expires_at"),
    refreshTokenExpiresAt: timestampMs("refresh_token_expires_at"),
    scope: text("scope"),
    password: text("password"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [index("accounts_user_id_idx").on(t.userId)],
);

export const verifications = sqliteTable(
  "verifications",
  {
    id: text("id").primaryKey(),
    identifier: text("identifier").notNull(),
    value: text("value").notNull(),
    expiresAt: timestampMs("expires_at").notNull(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [index("verifications_identifier_idx").on(t.identifier)],
);

/**
 * Admin API keys made from /admin/api-keys. Only the SHA-256 of the key is stored; `prefix` is the first characters
 * shown in admin so a key can be recognised. A request with `Authorization: Bearer <key>` acts as the admin who
 * made the key, with the key's role. Revoking sets `revoked_at`; the row stays for the audit trail.
 */
export const apiKeys = sqliteTable(
  "api_keys",
  {
    id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    name: text("name").notNull(),
    prefix: text("prefix").notNull(),
    keyHash: text("key_hash").notNull().unique(),
    role: enumColumn("role", userRole).default("admin").notNull(),
    createdBy: text("created_by").references(() => users.id, { onDelete: "set null" }),
    lastUsedAt: timestampMs("last_used_at"),
    revokedAt: timestampMs("revoked_at"),
    createdAt: createdAt(),
  },
  (t) => [index("api_keys_created_by_idx").on(t.createdBy), check("api_keys_role_check", enumCheckSql("role", userRole))],
);
