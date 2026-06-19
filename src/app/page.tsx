import { supabase } from "@/lib/supabaseClient";
import type { Defect } from "@/lib/types";
import Dashboard from "@/components/Dashboard";

// Демо-данные: всегда свежее чтение из Supabase, без кэша Next/Vercel
export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

async function getDefects(): Promise<{ defects: Defect[]; error: string | null }> {
  const { data, error } = await supabase
    .from("defects")
    .select("*")
    .order("detected_at", { ascending: false });

  if (error) {
    return { defects: [], error: error.message };
  }
  return { defects: (data as Defect[]) ?? [], error: null };
}

export default async function Page() {
  const { defects, error } = await getDefects();

  if (error) {
    return (
      <main className="flex h-screen items-center justify-center p-6">
        <div className="max-w-md rounded-lg border border-red-200 bg-red-50 p-6 text-center">
          <h1 className="text-lg font-semibold text-red-800">
            Не удалось загрузить данные
          </h1>
          <p className="mt-2 text-sm text-red-700">{error}</p>
          <p className="mt-3 text-xs text-red-600">
            Проверьте переменные окружения Supabase в .env.local.
          </p>
        </div>
      </main>
    );
  }

  return <Dashboard defects={defects} />;
}
