# Supabase Authentication Setup for Studio Clay Admin

This guide will help you set up Supabase authentication for the Studio Clay admin panel.

## Step 1: Create a Supabase Project

1. Go to [Supabase](https://supabase.com/) and sign in or create an account
2. Create a new project
3. Choose a name for your project (e.g., "studioclay")
4. Choose a secure database password (save this somewhere safe)
5. Select the region closest to your users
6. Click "Create project"

## Step 2: Get Your API Keys

1. In your Supabase project dashboard, go to Project Settings (gear icon in the sidebar)
2. Click on "API" in the settings menu
3. Copy your "Project URL" and add it to your `.env.local` file as `NEXT_PUBLIC_SUPABASE_URL`
4. Copy your "anon" key (public API key) and add it to your `.env.local` file as `NEXT_PUBLIC_SUPABASE_ANON_KEY`

## Step 3: Configure Authentication

1. In the Supabase dashboard, go to "Authentication" in the sidebar
2. Under "Authentication settings":
   - Enable "Email" provider
   - Disable "Email confirmations" (unless you want to require email verification)
   - Save changes

## Step 4: Create Admin Users

### Option 1: Using the Dashboard
1. Go to "Authentication" > "Users" in the Supabase dashboard
2. Click "Add user"
3. Enter the admin email and password
4. Click "Create user"

### Option 2: Import from CSV
1. Edit the `admin_users.csv` file in this project with your admin email and a secure password
2. In Supabase, go to "SQL Editor"
3. Create a new query
4. Use the following SQL to import your admin user:

```sql
-- Create a temporary table
CREATE TEMP TABLE temp_users (
  email VARCHAR,
  password VARCHAR,
  created_at TIMESTAMPTZ,
  confirmed_at TIMESTAMPTZ,
  user_metadata JSONB
);

-- Import from CSV file (you'll need to upload the CSV)
COPY temp_users FROM '/path/to/admin_users.csv' CSV HEADER;

-- Insert users
INSERT INTO auth.users (
  email,
  encrypted_password,
  email_confirmed_at,
  created_at,
  updated_at,
  raw_user_meta_data
)
SELECT
  email,
  crypt(password, gen_salt('bf')),
  confirmed_at,
  created_at,
  created_at,
  user_metadata
FROM temp_users;

-- Clean up
DROP TABLE temp_users;
```

## Step 5: Verify Setup

1. Start your Next.js development server with `npm run dev`
2. Navigate to `/admin` in your browser
3. Try logging in with your admin credentials
4. You should be redirected to the admin dashboard after successful login

## Troubleshooting

- If you can't log in, check the Supabase authentication logs in the Supabase dashboard
- Verify your environment variables are set correctly in `.env.local`
- Check browser console for any errors 