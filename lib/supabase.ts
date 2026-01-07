import { createClient } from '@supabase/supabase-js';

// Safe access to environment variables
const getEnv = (key: string) => {
  try {
    // In Vite, env vars are exposed on import.meta.env
    // They are replaced at BUILD time.
    return (import.meta as any).env?.[key] || '';
  } catch (e) {
    return '';
  }
};

const supabaseUrl = getEnv('VITE_SUPABASE_URL');
const supabaseAnonKey = getEnv('VITE_SUPABASE_ANON_KEY');

// Mock builder to prevent crashes when Supabase is not configured
const createMockBuilder = () => {
  const mock: any = {
    select: () => mock,
    order: () => mock,
    insert: () => mock,
    delete: () => mock,
    update: () => mock,
    eq: () => mock,
    upsert: () => mock,
    single: () => mock,
    maybeSingle: () => mock,
    // Make the object awaitable (Thenable) returning empty data
    then: (resolve: any) => resolve({ data: [], error: null })
  };
  return mock;
};

// Debugging block
if (!supabaseUrl || !supabaseAnonKey) {
  console.group("⚠️ CoreConnect: Supabase Connection Debug");
  console.log("Status: OFFLINE / MOCK MODE");
  console.log(`VITE_SUPABASE_URL found? ${supabaseUrl ? 'YES' : 'NO'}`);
  console.log(`VITE_SUPABASE_ANON_KEY found? ${supabaseAnonKey ? 'YES' : 'NO'}`);
  if (!supabaseUrl) console.error("❌ VITE_SUPABASE_URL is missing. Ensure it is set in Netlify Env Vars.");
  if (!supabaseAnonKey) console.error("❌ VITE_SUPABASE_ANON_KEY is missing. Ensure it is set in Netlify Env Vars.");
  console.info("💡 TIP: If you added these keys recently, you MUST trigger a new build ('Clear cache and deploy site') for them to apply.");
  console.groupEnd();
} else {
  console.log("✅ CoreConnect: Supabase Credentials Loaded");
}

// Create client or fallback to mock
export const supabase = (supabaseUrl && supabaseAnonKey)
  ? createClient(supabaseUrl, supabaseAnonKey)
  : { from: () => createMockBuilder() } as any;
