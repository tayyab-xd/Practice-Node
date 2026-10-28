import { z } from "zod";

export const loginBodySchema = z.object({
  // Trimmed and lowercased here, replacing the manual
  // `typeof email === "string" ? email.trim().toLowerCase() : ""` in the old controller.
  // Not `z.email()`: users_fn_login matches a login identifier, which
  // may not always be a strict email address.
  email: z.string().trim().toLowerCase().min(1, "Email is required").max(254),

  // Never trim a password. Only require it, and cap the length so
  // nobody can send a huge string to bcrypt.
  password: z.string().min(1, "Password is required").max(128),

  // The frontend may send 1 or "1": coerce handles both.
  business_id: z.coerce.number().int().positive(),
});

export type LoginBody = z.infer<typeof loginBodySchema>;
