import { createClient } from '@supabase/supabase-js';

const supabaseUrl = "https://ieeulzolpbmrbspazcqi.supabase.co";
const supabaseAnonKey = "sb_publishable_NJsNdbljBnQwW0Jm7EWGaQ_WtCy82RO";

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
