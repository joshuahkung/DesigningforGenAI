export const metadata = { title: "Privacy · Captions" };

export default function PrivacyPage() {
  return (
    <main className="mx-auto w-full max-w-2xl space-y-4 px-4 py-10 text-sm leading-6">
      <h1 className="text-3xl font-bold">Privacy Policy</h1>
      <p className="text-neutral-500">Last updated October 1, 2026</p>
      <p>
        Captions is a student project built for COMS6998 (Designing for GenAI) at Columbia University. It is not a
        commercial product.
      </p>
      <h2 className="pt-2 text-lg font-semibold">What we collect</h2>
      <p>
        When you sign in with Google we receive your email address, name, and profile picture. We store your email,
        the first and last name you enter, and any profile photo you upload.
      </p>
      <h2 className="pt-2 text-lg font-semibold">How we use it</h2>
      <p>
        Only to sign you in and show your profile inside the app. We do not sell, share, or use your data for
        advertising.
      </p>
      <h2 className="pt-2 text-lg font-semibold">Where it lives</h2>
      <p>Data is stored with Supabase (database and file storage) and the app is hosted on Vercel.</p>
      <h2 className="pt-2 text-lg font-semibold">Deleting your data</h2>
      <p>Contact the developer via joshuakung.com and we will delete your account and profile.</p>
    </main>
  );
}
