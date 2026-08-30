import { request } from "node:https";

export type EmailMessage = { to: string; subject: string; text: string };

export async function sendTransactionalEmail(message: EmailMessage): Promise<{ delivered: boolean; mode: "webhook" | "demo" }> {
  const webhook = process.env.EMAIL_WEBHOOK_URL;
  if (!webhook) {
    console.info("Transactional email queued in demo mode (EMAIL_WEBHOOK_URL is not configured)");
    return { delivered: false, mode: "demo" };
  }
  const url = new URL(webhook);
  const body = JSON.stringify({ from: process.env.EMAIL_FROM || "orders@904mealprepz.com", ...message });
  await new Promise<void>((resolve, reject) => {
    const req = request({ hostname: url.hostname, port: url.port || 443, path: `${url.pathname}${url.search}`, method: "POST", headers: { "Content-Type": "application/json", "Content-Length": Buffer.byteLength(body) } }, (response) => {
      response.on("data", () => undefined);
      response.on("end", () => response.statusCode && response.statusCode < 300 ? resolve() : reject(new Error(`Email provider returned ${response.statusCode}`)));
    });
    req.setTimeout(5000, () => req.destroy(new Error("Email provider timed out")));
    req.on("error", reject);
    req.write(body);
    req.end();
  });
  return { delivered: true, mode: "webhook" };
}