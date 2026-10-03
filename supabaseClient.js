import { createClient } from '@supabase/supabase-js';

// Read values from .env
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_KEY;

// Create client
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkConnection() {
    const { data, error } = await supabase.from('profiles').select('*').limit(1);

    if (error) {
        console.error("❌ Supabase connection failed:", error.message);
    } else {
        console.log("✅ Supabase connected! Data:", data);
    }
}

checkConnection();
