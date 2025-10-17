const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

// Validação das variáveis de ambiente
if (!process.env.SUPABASE_URL) {
  throw new Error('SUPABASE_URL não está definida no arquivo .env');
}

const supabaseKey = process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_KEY;

if (!supabaseKey) {
  throw new Error('SUPABASE_ANON_KEY ou SUPABASE_KEY não está definida no arquivo .env');
}

// Criar cliente Supabase
const supabase = createClient(
  process.env.SUPABASE_URL,
  supabaseKey,
  {
    auth: {
      persistSession: false
    }
  }
);

module.exports = supabase;

