import app from "../server/app";

process.on("uncaughtException", (err) => {
  console.error("UNCAUGHT EXCEPTION:", err);
});

process.on("unhandledRejection", (reason) => {
  console.error("UNHANDLED REJECTION:", reason);
});

export default async function handler(req: any, res: any) {
  try {
    return app(req, res);
  } catch (err: any) {
    console.error("CRITICAL RUNTIME ERROR:", err);
    res.status(500).json({
      error: true,
      message: err?.message || String(err),
      stack: err?.stack,
    });
  }
}
