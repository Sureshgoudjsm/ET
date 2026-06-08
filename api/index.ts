let appInstance: any = null;

process.on("uncaughtException", (err) => {
  console.error("UNCAUGHT EXCEPTION AT STARTUP:", err);
});

process.on("unhandledRejection", (reason) => {
  console.error("UNHANDLED REJECTION AT STARTUP:", reason);
});

export default async function handler(req: any, res: any) {
  try {
    if (!appInstance) {
      const module = await import("../server/app");
      appInstance = module.default;
    }
    return appInstance(req, res);
  } catch (err: any) {
    console.error("CRITICAL RUNTIME ERROR:", err);
    res.status(500).json({
      error: true,
      message: err?.message || String(err),
      stack: err?.stack,
    });
  }
}
