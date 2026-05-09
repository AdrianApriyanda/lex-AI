import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://ambivezatorsghoazaui.supabase.co'
const supabaseKey = 'sb_publishable_i9LXthom62P6-zJzpxcldQ_mRN2kEl4'

export const supabase = createClient(supabaseUrl, supabaseKey)
