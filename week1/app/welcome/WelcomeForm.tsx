"use client";

import { useActionState } from "react";
import Field from "@/components/Field";
import { completeWelcome, type ActionState } from "@/app/profile/actions";

export default function WelcomeForm({ first, last }: { first: string; last: string }) {
  const [state, action, pending] = useActionState<ActionState, FormData>(completeWelcome, {});
  return (
    <form action={action} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field name="first_name" label="First name" defaultValue={first} />
        <Field name="last_name" label="Last name" defaultValue={last} />
      </div>
      {state.error && <p className="text-sm text-red-600">{state.error}</p>}
      <button
        disabled={pending}
        className="w-full rounded-full bg-neutral-900 px-5 py-2.5 text-sm font-medium text-white disabled:opacity-60 dark:bg-white dark:text-neutral-900"
      >
        {pending ? "Saving…" : "Continue"}
      </button>
    </form>
  );
}
