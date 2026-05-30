# Deploying ChamaVault

This guide covers deploying ChamaVault to production with Vercel and Supabase.

## Prerequisites

- A [Vercel](https://vercel.com) account (Hobby plan is fine)
- A [Supabase](https://supabase.com) project (free tier works for small chamas)
- A [Resend](https://resend.com) account (for email notifications)
- (Optional) [Africa's Talking](https://africastalking.com) account for SMS
- (Optional) [OpenAI](https://platform.openai.com) API key for AI meeting minutes

---

## Step 1: Set Up Supabase

### 1.1 Create a Supabase project

Go to [app.supabase.com](https://app.supabase.com) → New Project.

- Name: `chamavault`
- Database password: Generate a strong password and save it
- Region: Choose the closest to your users (e.g., `eu-west` for Europe)

### 1.2 Run the database schema

1. Open the SQL Editor in your Supabase dashboard
2. Copy the contents of `supabase/schema.sql`
3. Paste into the SQL Editor and run it
4. All tables, indexes, and RLS policies will be created

### 1.3 (Optional) Load seed data

1. Replace `USER-UUID-HERE` in `supabase/seed.sql` with the UUID of a test user
2. Run the seed SQL in the SQL Editor

### 1.4 Get API keys

Go to Project Settings → API:
- Copy `Project URL` → This is your `NEXT_PUBLIC_SUPABASE_URL`
- Copy `anon public` key → This is your `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- Go to Project Settings → API → `service_role` key → This is `SUPABASE_SERVICE_ROLE_KEY`

---

## Step 2: Set Up Resend (Email)

1. Create a [Resend](https://resend.com) account
2. Go to API Keys → Create API Key
3. Add your sending domain and verify it (or use the test domain for development)
4. Copy the API key → This is `RESEND_API_KEY`

---

## Step 3: Deploy to Vercel

### 3.1 Push to GitHub

```bash
git remote add origin https://github.com/your-org/chamavault.git
git push -u origin main
```

### 3.2 Connect Vercel

1. Go to [vercel.com](https://vercel.com) → New Project
2. Import your GitHub repository
3. Configure build settings (auto-detected for Next.js):
   - Framework: Next.js
   - Build command: `npm run build`
   - Output directory: `.next`
   - Install command: `npm install`

### 3.3 Add environment variables

In the Vercel project settings → Environment Variables, add:

| Key | Value | Notes |
|-----|-------|-------|
| `NEXT_PUBLIC_SUPABASE_URL` | Your Supabase project URL | |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Your Supabase anon key | |
| `SUPABASE_SERVICE_ROLE_KEY` | Your Supabase service role key | |
| `RESEND_API_KEY` | Your Resend API key | |
| `AT_API_KEY` | Africa's Talking API key | Optional |
| `AT_USERNAME` | Africa's Talking username | Optional |
| `AT_SENDER_ID` | ChamaVault | Optional |
| `OPENAI_API_KEY` | OpenAI API key | Optional |

### 3.4 Deploy

Click "Deploy". Vercel will build and deploy your application.

---

## Step 4: Post-Deployment Configuration

### 4.1 Set the site URL in Supabase

1. Go to Supabase → Authentication → URL Configuration
2. Set **Site URL** to your Vercel domain (e.g., `https://chamavault.vercel.app`)
3. Add redirect URLs:
   - `https://chamavault.vercel.app/auth/callback`
   - `https://chamavault.vercel.app` (and any custom domain)

### 4.2 Configure authentication redirects

In your Supabase dashboard → Authentication → Settings:
- Confirm that the redirect URLs match your deployed URL

### 4.3 Verify everything works

1. Visit your deployed URL
2. Create an account (signup)
3. Create a chama
4. Test contributions, loans, and meetings

---

## Optional Integrations

### M-Pesa Daraja API

To process M-Pesa payments:

1. Create a [Safaricom Developer](https://developer.safaricom.co.ke) account
2. Create an app and get Consumer Key and Consumer Secret
3. Add to environment variables:
   - `MPESA_CONSUMER_KEY`
   - `MPESA_CONSUMER_SECRET`
   - `MPESA_PASSKEY`
   - `MPESA_SHORTCODE`

### Stripe (International Payments)

For Stripe checkout in KES:

1. Create a [Stripe](https://stripe.com) account
2. Get your publishable and secret keys
3. Add to environment variables:
   - `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`
   - `STRIPE_SECRET_KEY`

### OpenAI Meeting Minutes Assistant

To enable AI-generated meeting minutes:

1. Get an [OpenAI API key](https://platform.openai.com)
2. Add `OPENAI_API_KEY` to environment variables
3. The "Generate Minutes" button on the meetings page will use GPT-4o-mini

---

## Custom Domain

1. Go to Vercel → Project → Settings → Domains
2. Add your custom domain (e.g., `www.chamavault.co.ke`)
3. Follow Vercel's DNS instructions
4. Update the Site URL in Supabase (Authentication → URL Configuration)

---

## Monitoring

- Vercel provides built-in analytics and logs
- Supabase dashboard shows database usage and API calls
- Check Vercel Functions logs for any API errors

---

## Troubleshooting

**Login not working**: Verify redirect URLs in Supabase Authentication settings match your deployed domain.

**Email notifications not sending**: Check that your Resend domain is verified. Use `onboarding@resend.dev` for testing.

**SMS not sending**: Africa's Talking API key is optional. SMS will be skipped if not configured (no errors).

**Database errors**: Check Supabase SQL Editor for any failed migrations. Run `supabase/schema.sql` again if needed.
