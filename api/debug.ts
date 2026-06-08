export default function handler(req: any, res: any) {
  res.status(200).json({
    nodeVersion: process.version,
    env: {
      NODE_ENV: process.env.NODE_ENV,
      VERCEL: process.env.VERCEL,
      VERCEL_ENV: process.env.VERCEL_ENV,
      HAS_DATABASE_URL: !!process.env.DATABASE_URL,
      DATABASE_URL_PREFIX: process.env.DATABASE_URL ? process.env.DATABASE_URL.substring(0, 15) : null,
      HAS_JWT_SECRET: !!process.env.JWT_SECRET,
      HAS_OAUTH_SERVER_URL: !!process.env.OAUTH_SERVER_URL,
    },
  });
}
