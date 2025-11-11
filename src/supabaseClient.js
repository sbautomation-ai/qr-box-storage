import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://rjxaxiqjdtqhlvweyheb.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJqeGF4aXFqZHRxaGx2d2V5aGViIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI4NDYwODAsImV4cCI6MjA3ODQyMjA4MH0.x9uorQ2vkqQ5mHlMfeImmvkEJ-xFPml3QcnFM13OU0Y'

export const supabase = createClient(supabaseUrl, supabaseKey)