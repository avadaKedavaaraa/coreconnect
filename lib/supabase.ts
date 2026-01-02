import { createClient } from '@supabase/supabase-js';

// Safe access to environment variables
const getEnv = (key: string) => {
  try {
    // Safely attempt to read Vite env vars
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
    eq: () => mock,
    // Make the object awaitable (Thenable) returning empty data
    then: (resolve: any) => resolve({ data: [], error: null })
  };
  return mock;
};

// Create client or fallback to mock
export const supabase = (supabaseUrl && supabaseAnonKey)
  ? createClient(supabaseUrl, supabaseAnonKey)
  : { from: () => createMockBuilder() } as any;

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn("Supabase keys missing. App running in offline mode.");
}