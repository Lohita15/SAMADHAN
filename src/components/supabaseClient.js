import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://lglcwnuncibyusjaktrv.supabase.co";
const supabaseAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxnbGN3bnVuY2lieXVzamFrdHJ2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU5MjU2MDgsImV4cCI6MjA4MTUwMTYwOH0.AHUMmO9iGLfQ0Qgq95dWbmdn7Bg1EzHbfoCZt8Wk5x4";

export const supabase = createClient(supabaseUrl, supabaseAnonKey);





