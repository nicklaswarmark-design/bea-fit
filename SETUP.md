# BEACTIVE – så hänger appen ihop

Appen körs på två gratistjänster:

- **Supabase** är databasen och sköter inloggning (e-post + lösenord).
- **Vercel** visar webbsidan. Den byggs om automatiskt varje gång koden på GitHub ändras.

## Databasen (Supabase)

Hela databasen (tabeller, säkerhetsregler, standardprogrammet och övningsbiblioteket med 53 övningar)
finns i `supabase/setup.sql`. Ska appen någon gång flyttas till ett nytt Supabase-projekt:
öppna **SQL Editor**, klistra in hela filen och klicka **Run**.

Under **Authentication → URL Configuration** ska **Site URL** vara appens adress
(`https://bea-fit-sandy.vercel.app`) och samma adress med `/**` på slutet ska finnas under
**Redirect URLs**. Annars pekar bekräftelsemejlen fel.

## Webbsidan (Vercel)

Vercel-projektet behöver fyra miljövariabler (**Settings → Environment Variables**):

| Name | Value |
|---|---|
| `VITE_SUPABASE_URL` | Project URL från Supabase |
| `SUPABASE_URL` | samma igen |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Publishable key (`sb_publishable_…`) |
| `SUPABASE_PUBLISHABLE_KEY` | samma igen |

Ändrar du en variabel: gör en **Redeploy** under **Deployments**.

## Bra att veta

- **Nya användare** registrerar sig själva på inloggningssidan och får standardprogrammet automatiskt.
- **Paus vid inaktivitet:** Supabase gratisplan pausar databasen efter en veckas inaktivitet.
  Logga in på supabase.com och klicka **Restore project** om appen slutar fungera efter ett uppehåll.
