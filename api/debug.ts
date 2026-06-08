import { ENV } from "../server/_core/env";
import { getSessionCookieOptions } from "../server/_core/cookies";

export default async function handler(req: any, res: any) {
  res.status(200).json({
    nodeVersion: process.version,
    envLoaded: !!ENV,
    cookiesLoaded: !!getSessionCookieOptions,
  });
}
