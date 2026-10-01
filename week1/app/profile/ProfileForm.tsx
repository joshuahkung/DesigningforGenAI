"use client";

import { useActionState, useRef, useState } from "react";
import { createClient } from "@/utils/supabase/client";
import Avatar from "@/components/Avatar";
import Field from "@/components/Field";
import { updateProfile, type ActionState } from "./actions";

type Props = { userId: string; email: string; first: string; last: string; avatar: string | null };

export default function ProfileForm({ userId, email, first, last, avatar }: Props) {
  const [state, action, pending] = useActionState<ActionState, FormData>(updateProfile, {});
  const [preview, setPreview] = useState<string | null>(avatar);
  const [avatarUrl, setAvatarUrl] = useState("");
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  // Upload the image to Supabase Storage; only its public URL is saved in the profiles table.
  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) return setUploadError("Please choose an image file.");
    if (file.size > 5 * 1024 * 1024) return setUploadError("Image must be under 5 MB.");

    setUploadError(null);
    setUploading(true);
    setPreview(URL.createObjectURL(file));

    const supabase = createClient();
    const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
    const path = `${userId}/${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from("avatars").upload(path, file, { contentType: file.type });
    setUploading(false);
    if (error) {
      setUploadError(error.message);
      setPreview(avatar);
      return;
    }
    setAvatarUrl(supabase.storage.from("avatars").getPublicUrl(path).data.publicUrl);
  }

  const name = `${first} ${last}`.trim() || email;

  return (
    <form action={action} className="space-y-6">
      <div className="flex items-center gap-5">
        <Avatar src={preview} name={name} size={80} />
        <div>
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="rounded-full border border-black/15 px-4 py-2 text-sm font-medium dark:border-white/20"
          >
            {uploading ? "Uploading…" : "Upload photo"}
          </button>
          <p className="mt-1 text-xs text-neutral-500">JPG, PNG or WebP, up to 5 MB. Click Save to keep it.</p>
          {uploadError && <p className="mt-1 text-xs text-red-600">{uploadError}</p>}
        </div>
        <input ref={fileRef} type="file" accept="image/*" onChange={onFile} className="hidden" />
        <input type="hidden" name="avatar_url" value={avatarUrl} />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field name="first_name" label="First name" defaultValue={first} />
        <Field name="last_name" label="Last name" defaultValue={last} />
      </div>

      <label className="block text-sm">
        <span className="mb-1 block font-medium">Email</span>
        <input
          value={email}
          disabled
          className="w-full rounded-lg border border-black/10 bg-neutral-100 px-3 py-2 text-neutral-500 dark:border-white/10 dark:bg-neutral-900"
        />
      </label>

      <div className="flex items-center gap-4">
        <button
          disabled={pending || uploading}
          className="rounded-full bg-neutral-900 px-5 py-2.5 text-sm font-medium text-white disabled:opacity-60 dark:bg-white dark:text-neutral-900"
        >
          {pending ? "Saving…" : "Save changes"}
        </button>
        {state.ok && !pending && <span className="text-sm text-green-600">Saved.</span>}
        {state.error && <span className="text-sm text-red-600">{state.error}</span>}
      </div>
    </form>
  );
}
