import { createClient } from '@supabase/supabase-js'

// ใส่ URL และ Key เป็นข้อความตรงๆ ในเครื่องหมายคำพูด (' ')
const supabaseUrl = 'https://rzxlrpgeushkdwyvshbf.supabase.co'
const supabaseAnonKey = 'sb_publishable_gHA0BrkTQnvvNZqZdfTafA_8IH3yMc1'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)