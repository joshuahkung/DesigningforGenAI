export default function Field({ name, label, defaultValue }: { name: string; label: string; defaultValue?: string }) {
  return (
    <label className="block text-left text-sm">
      <span className="mb-1 block font-medium">{label}</span>
      <input
        name={name}
        defaultValue={defaultValue}
        required
        className="w-full rounded-lg border border-black/15 bg-transparent px-3 py-2 outline-none focus:border-neutral-900 dark:border-white/20 dark:focus:border-white"
      />
    </label>
  );
}
