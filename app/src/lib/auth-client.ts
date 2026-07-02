"use client";
import { createAuthClient } from "better-auth/react";
import { adminClient } from "better-auth/client/plugins";

/** Browser-side auth client (login form, reset form, sign-out button). */
export const authClient = createAuthClient({
  plugins: [adminClient()],
});
