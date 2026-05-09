import { createClient } from '@supabase/supabase-js'

// Gunakan import.meta.env agar aplikasi membaca dari Vercel Environment Variables
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseKey);
