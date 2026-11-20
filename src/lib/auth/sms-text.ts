/** SMS wording (English only; brand name as is). Kept out of src/content because SMS is sent server-side. */
export function otpSms(code: string): string {
  return `Medisent AI code: ${code}. It stops working after 10 minutes. Never share it.`;
}

/** Next.js implements redirect() by throwing; actions that catch errors must let it through. */
export function isRedirectError(error: unknown): boolean {
  return typeof error === "object" && error !== null && "digest" in error && String((error as { digest: unknown }).digest).startsWith("NEXT_REDIRECT");
}
