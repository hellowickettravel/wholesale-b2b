# Setting up email and security (owner steps)

Everything the code can do is done. These steps are settings in your own accounts (Google, Supabase, Vercel) that only you can change. Do them in this order. Each has a way to check it worked.

## 1. A Google "app password" (5 minutes)

Use the Gmail or Google Workspace address that will send your email (best: `info@wholesalestreet.co.uk`).

1. Sign in to that Google account, open **Security**, and switch on **2-Step Verification** (required for app passwords).
2. Open <https://myaccount.google.com/apppasswords>, name it `Wholesale Street`, press **Create**.
3. Copy the 16-letter password Google shows (spaces do not matter). You see it once.

Limit: a normal Gmail account sends about 500 emails a day; Google Workspace about 2,000. That is plenty for launch.

## 2. Vercel: let the website send its own emails (orders, approvals, reminders)

Vercel > the project > **Settings > Environment Variables** (Production). Add:

| Name | Value |
|---|---|
| `SMTP_HOST` | `smtp.gmail.com` |
| `SMTP_PORT` | `465` |
| `SMTP_USER` | the Google address from step 1 |
| `SMTP_PASS` | the 16-letter app password |
| `EMAIL_FROM` | `Wholesale Street <info@wholesalestreet.co.uk>` (the address must be the one you signed in with, or an alias of it) |
| `ADMIN_NOTIFY_EMAIL` | where you want "new trade account to review" emails |
| `CRON_SECRET` | any long random text (lets the daily safety-net send waiting emails) |
| `NEXT_PUBLIC_SITE_URL` | `https://www.wholesalestreet.co.uk` (the address people really use, with `www`) |

Then **Deployments > the latest > Redeploy**.

Check: sign in to the admin, open **Emails**, press **Send me a test email**. It arrives in your inbox. Emails that were waiting (for example Raju's approval) go out when you press **Send N waiting**.

## 3. Supabase: the sign-up and password-reset emails

These emails (confirm your email, reset password, invitation) are sent by Supabase, not by the website, so Supabase needs the same Google details. Until you do this, Supabase's built-in sender only delivers to your own team addresses.

Supabase dashboard > project `qtztjbnaofonazruovty` > **Authentication > Emails > SMTP Settings**:

- Enable custom SMTP
- Sender email: the Google address; Sender name: `Wholesale Street`
- Host `smtp.gmail.com`, Port `465`, Username: the Google address, Password: the app password

Then **Authentication > Emails > Templates**: paste the four templates from the `supabase/templates/` folder of the repo (Confirm signup, Invite user, Reset password, Change email address), and use the subjects from `supabase/config.toml`.

Then **Authentication > URL Configuration**: Site URL `https://www.wholesalestreet.co.uk`; Redirect URLs: add `https://www.wholesalestreet.co.uk/**`.

Check: open the website in a private window, press **Open an account**, register with an address that is not a team address. The confirmation email arrives, and the link opens the "we are reviewing your account" page.

If you skip this step the website still works: when Supabase cannot send the confirmation email, the registration is saved anyway, the restaurant sees "we have your application", and approving the account in the admin lets them sign in. They just do not get a confirmation email.

## 4. Supabase: two more switches

- **Authentication > Sign In / Providers > Email**: switch on **Prevent use of leaked passwords** (needs Pro) and keep minimum length 8.
- **Authentication > Multi-Factor**: make sure **TOTP** is enabled (it is by default). The admin two-step sign-in needs it.

## 5. Admin account: two-step sign-in and a new password

1. Sign in at `/login`, open **Security** in the admin menu.
2. **Change your password** to a long one that you have not shared anywhere. (A password that has been typed into a chat or an email should be treated as public.)
3. **Set up two-step sign-in**: scan the QR code with Google Authenticator or similar, type the 6-digit code, done. From then on sign-in asks for a code, and the database refuses admin data to a password-only session.
4. Keep a screenshot of the secret key (shown under the QR code) in a safe place. If the phone is lost, the key restores the codes.

If you are ever locked out of the admin (lost phone and no key): in Supabase **SQL editor** run
`delete from auth.mfa_factors where user_id = (select id from auth.users where email = 'YOUR-ADMIN-EMAIL');`
and sign in with the password only. Then set two-step up again.

## 6. Costs, VAT number, bank details

- **Admin > Products > Import costs**: download the price sheet, fill the `cost` column, upload, preview, apply. Until a size has a cost it shows "Price on request" and cannot be ordered.
- **Admin > Settings**: add the VAT number, business address and bank details. If the company is not VAT registered, no VAT may be charged: set VAT to 0% on the categories and sizes.
- The dashboard card **Before you go live** lists whatever is still missing.
