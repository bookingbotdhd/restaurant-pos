import { z } from "zod";

export const loginSchema = z.object({
  // Login ID: an email address or a phone number (delivery riders sign in with their phone).
  email: z.string().trim().min(3).max(200),
  password: z.string().min(4).max(200),
  // Authenticator code or recovery code, once two-factor auth is on.
  totp: z.string().trim().min(6).max(20).optional(),
});
export type LoginDto = z.infer<typeof loginSchema>;

export const registerSchema = z.object({
  restaurantName: z.string().min(1),
  branchName: z.string().min(1).default("Main Branch"),
  ownerName: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(8),
});
export type RegisterDto = z.infer<typeof registerSchema>;

export const pinLoginSchema = z.object({
  userId: z.string(),
  pin: z.string().min(4).max(8),
});
export type PinLoginDto = z.infer<typeof pinLoginSchema>;

// Manager-PIN approval: a manager types their PIN on the shared till to
// approve one gated action (a discount, a void). Unlike pin-login this does
// NOT sign anyone in and sets no cookie — it only proves, for the next few
// minutes, that a manager was standing at the till. The backend answers
// with a short-lived approval token; the gated request carries that token
// and the server re-checks it before acting.
export const verifyManagerPinSchema = z.object({
  pin: z.string().regex(/^\d{4,8}$/, "PIN must be 4-8 digits"),
});
export type VerifyManagerPinDto = z.infer<typeof verifyManagerPinSchema>;

export const managerPinApprovalSchema = z.object({
  approvalToken: z.string(),
  manager: z.object({
    id: z.string(),
    name: z.string(),
    roleName: z.string(),
  }),
  expiresInSeconds: z.number(),
});
export type ManagerPinApproval = z.infer<typeof managerPinApprovalSchema>;

export const sessionUserSchema = z.object({
  id: z.string(),
  restaurantId: z.string(),
  name: z.string(),
  roleId: z.string(),
  roleName: z.string(),
  permissions: z.array(z.string()),
});
export type SessionUser = z.infer<typeof sessionUserSchema>;

export const twoFactorCodeSchema = z.object({ code: z.string().trim().min(6).max(20) });
export const twoFactorDisableSchema = z.object({
  password: z.string().min(1),
  code: z.string().trim().min(6).max(20),
});
