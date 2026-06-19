import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    "Отсутствуют переменные окружения Supabase. Задайте NEXT_PUBLIC_SUPABASE_URL и NEXT_PUBLIC_SUPABASE_ANON_KEY в .env.local"
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  global: {
    // Запрещаем Next/Vercel кэшировать REST-ответы Supabase —
    // дашборд всегда читает свежие данные из базы.
    fetch: (input, init) => fetch(input, { ...init, cache: "no-store" }),
  },
});
