import { createClient } from "@/utils/supabase/server";
import { cookies } from "next/headers";

export default async function Page() {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  const { data: captions, error } = await supabase
    .from("captions")
    .select()
    .order("id");

  if (error) return <p className="p-8 text-red-600">Error: {error.message}</p>;

  return (
    <main className="mx-auto max-w-2xl p-8">
      <h1 className="mb-6 text-3xl font-bold">Captions</h1>
      <ul className="space-y-4">
        {captions?.map((c) => (
          <li key={c.id} className="rounded-lg border p-4">
            {c.content}
          </li>
        ))}
      </ul>
    </main>
  );
}
