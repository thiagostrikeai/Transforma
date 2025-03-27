// config.js
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';

const SUPABASE_URL = 'https://szohuibtrgcrrzqvycdq.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN6b2h1aWJ0cmdjcnJ6cXZ5Y2RxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDMwNTI3MzEsImV4cCI6MjA1ODYyODczMX0.eK_pkVHsKjbUU-UCQXka40W5h5oeZAoGBrYsp7GP48I';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
