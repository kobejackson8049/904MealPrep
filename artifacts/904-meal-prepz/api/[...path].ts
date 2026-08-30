import app from "@workspace/api-server/app";

// Vercel discovers this file as the catch-all same-origin API function.
// Its workspace dependencies are compiled into the deployed serverless bundle.
export default app;
