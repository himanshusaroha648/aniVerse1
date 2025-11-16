import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('⚠️  ERROR: Supabase credentials not found!');
  console.error('Please set SUPABASE_URL and SUPABASE_ANON_KEY environment variables');
  throw new Error('Missing Supabase credentials');
}

export const supabase = createClient(supabaseUrl, supabaseKey);

console.log('✅ Supabase client initialized');
