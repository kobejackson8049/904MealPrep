import app from "@workspace/api-server/app";

export default function handler(req, res) {
  const requestUrl = new URL(req.url || "/api", "http://localhost");
  const forwardedPath = requestUrl.searchParams.get("path");

  if (forwardedPath) {
    requestUrl.searchParams.delete("path");
    const query = requestUrl.searchParams.toString();
    req.url = `/api/${forwardedPath}${query ? `?${query}` : ""}`;
  }

  return app(req, res);
}