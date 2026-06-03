import type { Express, Request, Response } from "express";
import { ENV } from "./env";

export function registerStorageProxy(app: Express) {
  (app as any).get("/manus-storage/*", async (req: Request, res: Response) => {
    const key = ((req as any).params as Record<string, string>)[0];
    if (!key) {
      (res as any).status(400).send("Missing storage key");
      return;
    }

    if (!ENV.forgeApiUrl || !ENV.forgeApiKey) {
      (res as any).status(500).send("Storage proxy not configured");
      return;
    }

    try {
      const forgeUrl = new URL(
        "v1/storage/presign/get",
        ENV.forgeApiUrl.replace(/\/+$/, "") + "/",
      );
      forgeUrl.searchParams.set("path", key);

      const forgeResp = await fetch(forgeUrl, {
        headers: { Authorization: `Bearer ${ENV.forgeApiKey}` },
      });

      if (!forgeResp.ok) {
        const body = await forgeResp.text().catch(() => "");
        console.error(`[StorageProxy] forge error: ${forgeResp.status} ${body}`);
        (res as any).status(502).send("Storage backend error");
        return;
      }

      const { url } = (await forgeResp.json()) as { url: string };
      if (!url) {
        (res as any).status(502).send("Empty signed URL from backend");
        return;
      }

      (res as any).set("Cache-Control", "no-store");
      (res as any).redirect(307, url);
    } catch (err) {
      console.error("[StorageProxy] failed:", err);
      (res as any).status(502).send("Storage proxy error");
    }
  });
}
