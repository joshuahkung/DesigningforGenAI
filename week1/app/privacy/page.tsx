export const metadata = { title: "Privacy · Captions" };

export default function PrivacyPage() {
  return (
    <main className="mx-auto w-full max-w-2xl space-y-4 px-4 py-10 text-sm leading-6">
      <h1 className="text-3xl font-bold">Privacy Policy</h1>
      <p className="text-neutral-500">Last updated October 7, 2026</p>
      <p>
        Captions is a student project built for COMS6998 (Designing for GenAI) at Columbia University. It is not a
        commercial product.
      </p>
      <h2 className="pt-2 text-lg font-semibold">What we collect</h2>
      <p>
        When you sign in with Google we receive your email address, name, and profile picture. We store your email,
        the first and last name you enter, and any profile photo you upload. We also store the photos you post for
        captioning, the captions written for them, and your votes.
      </p>
      <h2 className="pt-2 text-lg font-semibold">How we use it</h2>
      <p>
        To sign you in, show your profile, and run the caption feed. Photos you post are sent to Google&apos;s Gemini
        API to write captions, and the photos and captions are shown to other signed-in users. Your individual votes
        are visible only to you; other users see totals. We do not sell your data or use it for advertising.
      </p>
      <h2 className="pt-2 text-lg font-semibold">Where it lives</h2>
      <p>Data is stored with Supabase (database and file storage) and the app is hosted on Vercel.</p>
      <h2 className="pt-2 text-lg font-semibold">Deleting your data</h2>
      <p>Contact the developer via joshuakung.com and we will delete your account, profile, photos, and votes.</p>
    </main>
  );
}
