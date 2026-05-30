import { createClient } from '@supabase/supabase-js';

import type { Database } from './supabase.types.js';
import { loadedEnvPath } from './load-env.js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceRoleKey) {
  throw new Error(`SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be defined in ${loadedEnvPath}`);
}

export const supabaseAdmin = createClient<Database>(supabaseUrl, supabaseServiceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});
