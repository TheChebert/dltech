import "server-only";

function required(name: string) {
  const value = process.env[name];
  if (!value) throw new Error("Missing required server environment variable: " + name);
  return value;
}

export function getSupabasePublicEnv() {
  return {
    url: required("NEXT_PUBLIC_SUPABASE_URL"),
    publishableKey: required("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY"),
  };
}

export function getSupabaseServerEnv() {
  return {
    ...getSupabasePublicEnv(),
    secretKey: required("SUPABASE_SECRET_KEY"),
  };
}

export function getSiteUrl() {
  if (process.env.NEXT_PUBLIC_SITE_URL) return process.env.NEXT_PUBLIC_SITE_URL;
  if (process.env.VERCEL_PROJECT_PRODUCTION_URL) return "https://" + process.env.VERCEL_PROJECT_PRODUCTION_URL;
  return "http://localhost:3000";
}
