# BEACTIVE – Powered by Bea

Mobile-first training diary for Bea: workout program, set logging, running log,
progress charts, goals and milestones. All UI text is in Swedish.

Originally built in Lovable; now runs standalone on **Supabase** (database + login)
and **Vercel** (hosting). See `SETUP.md` for how it is wired up.

## Development

```sh
npm install
cp .env.example .env   # fill in the Supabase URL and publishable key
npm run dev
```

Stack: TanStack Start (React 19), Tailwind CSS 4, Supabase and Nitro (builds for Vercel automatically).
Architecture notes are in `AGENTS.md`.
