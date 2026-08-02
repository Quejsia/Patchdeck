import { createClient } from '@supabase/supabase-js';

// The publishable key is safe to expose in frontend code by design — it can
// only do what the database's RLS policies and exposed functions allow,
// which for this project is exactly two narrow operations (see
// syncApi.js). See supabase/README.md for the full setup.
const SUPABASE_URL = 'https://yshqccorruqtjkwaoxgs.supabase.co';
const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_lm6VfzonheP2lbcHJwBqog_NWT_McFo';

export const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);
