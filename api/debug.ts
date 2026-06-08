import app from "../server/app";

export default async function handler(req: any, res: any) {
  const steps: any[] = [];
  
  const tryImport = async (name: string, path: string) => {
    const start = Date.now();
    try {
      await import(path);
      steps.push({ name, path, status: "OK", duration: Date.now() - start });
    } catch (err: any) {
      steps.push({
        name,
        path,
        status: "ERROR",
        message: err?.message || String(err),
        stack: err?.stack,
        duration: Date.now() - start,
      });
    }
  };

  await tryImport("express", "express");
  await tryImport("dotenv/config", "dotenv/config");
  await tryImport("mysql2", "mysql2");
  await tryImport("drizzle-orm", "drizzle-orm");
  await tryImport("drizzle-orm-mysql2", "drizzle-orm/mysql2");
  await tryImport("jose", "jose");
  await tryImport("trpc-server", "@trpc/server");
  await tryImport("env", "../server/_core/env.ts");
  await tryImport("cookies", "../server/_core/cookies.ts");
  await tryImport("sdk", "../server/_core/sdk.ts");
  await tryImport("db", "../server/db.ts");
  await tryImport("routers", "../server/routers.ts");
  await tryImport("app", "../server/app.ts");

  res.status(200).json({
    nodeVersion: process.version,
    appLoaded: !!app,
    steps,
  });
}
