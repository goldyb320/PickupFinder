"use server";

export async function isDevBypassEnabled(): Promise<boolean> {
  return process.env.AUTH_DEV_BYPASS === "true";
}
