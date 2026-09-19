"use client";
import { createAuthClient } from "better-auth/react";

// No baseURL: the client talks to the origin it was served from. A NEXT_PUBLIC value here is inlined at build
// time, so one build could not serve staging and production (and a local build pointed at localhost).
export const authClient = createAuthClient();

export const { signIn, signUp, signOut, useSession } = authClient;
