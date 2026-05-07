import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://frudrwxdygfticgcwigv.supabase.co';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZydWRyd3hkeWdmdGljZ2N3aWd2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgxMDg4NzgsImV4cCI6MjA5MzY4NDg3OH0.2laDHYhQEiBu0K9iQCiYtf2T3_Q21rnJAAsNByUKJ10';

export const supabase = createClient(supabaseUrl, supabaseKey);
