export const supabaseUrl = (
  import.meta.env.VITE_SUPABASE_URL ||
  "https://sqoytpwiasctmngskrgk.supabase.co"
).replace(/\/$/, "");
export const endpoint = `${supabaseUrl}/functions/v1/soundbridge`;
export const publishableKey =
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
  "sb_publishable_gdMxLzpG52z_gQiADirEQQ_OoL2WSqB";
