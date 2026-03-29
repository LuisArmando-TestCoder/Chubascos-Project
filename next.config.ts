import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  env: {
    FIREBASE_SERVICE_ACCOUNT: process.env.FIREBASE_SERVICE_ACCOUNT || "",
    FIREBASE_PROJECT_ID: process.env.FIREBASE_PROJECT_ID || "",
    FIREBASE_CLIENT_EMAIL: process.env.FIREBASE_CLIENT_EMAIL || "",
    FIREBASE_PRIVATE_KEY: process.env.FIREBASE_PRIVATE_KEY || "",
    SMTP_HOST: process.env.SMTP_HOST || "",
    SMTP_PORT: process.env.SMTP_PORT || "",
    SMTP_USER: process.env.SMTP_USER || "",
    SMTP_PASS: process.env.SMTP_PASS || "",
    SESSION_SECRET: process.env.SESSION_SECRET || "",
    UPSTASH_REDIS_REST_URL: process.env.UPSTASH_REDIS_REST_URL || "",
    UPSTASH_REDIS_REST_TOKEN: process.env.UPSTASH_REDIS_REST_TOKEN || "",
    KV_URL: process.env.KV_URL || "",
    REDIS_URL: process.env.REDIS_URL || "",
    REDIS_USERNAME: process.env.REDIS_USERNAME || "",
    REDIS_PASSWORD: process.env.REDIS_PASSWORD || "",
    REDIS_HOST: process.env.REDIS_HOST || "",
    REDIS_PORT: process.env.REDIS_PORT || "",
  },
  typescript: {
    ignoreBuildErrors: false,
  },
};

export default nextConfig;
