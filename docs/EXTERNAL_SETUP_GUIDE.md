# ADES External Setup Guide

This document describes the manual setup required outside the codebase.

---

## 1. GitHub repo

Repository name:
- `ades-agent-design-studio`

Working approach:
- GitHub web only
- keep work on `main` for now
- use github.dev if browser editing is helpful

Suggested initial repo folders:
- `app`
- `components`
- `lib`
- `types`
- `docs`
- `public`

---

## 2. Vercel setup

### Goal
Deploy ADES from GitHub and manage environment variables.

### Steps
1. Open Vercel.
2. Click **Add New** → **Project**.
3. Import the GitHub repository `ades-agent-design-studio`.
4. Keep framework detection on automatic or select Next.js if asked.
5. Keep the default project name unless you want a custom one.
6. Deploy once.

### After first deploy
Go to:
- Project Settings → Environment Variables

Add later:
- `OPENAI_API_KEY`
- all Firebase web config variables

After adding or changing env vars:
- redeploy the app

---

## 3. Firebase project setup

### Goal
Provide Google auth and Firestore persistence.

### Steps
1. Open Firebase console.
2. Click **Create a project**.
3. Name it something like `ades-agent-design-studio`.
4. Disable Google Analytics unless you specifically want it.
5. Create the project.

---

## 4. Add a web app in Firebase

### Steps
1. Inside the Firebase project, click **Add app**.
2. Choose **Web**.
3. App nickname: `ades-web`.
4. Do not enable Firebase Hosting.
5. Register app.
6. Copy the Firebase web config shown on screen.

You will later map those values into Vercel environment variables.

---

## 5. Enable Google sign-in

### Steps
1. In Firebase console, open **Authentication**.
2. Click **Get started** if needed.
3. Open **Sign-in method**.
4. Click **Google**.
5. Enable it.
6. Choose a support email.
7. Save.

---

## 6. Create Firestore

### Steps
1. In Firebase console, open **Firestore Database**.
2. Click **Create database**.
3. Choose **Production mode**.
4. Pick the closest region to your target users.
5. Create the database.

Afterward:
- rules will need to be set for per-user isolation
- structure will be added by the app automatically as documents are created

---

## 7. Firebase authorized domains

After Vercel deployment, ensure your Vercel domain is authorized for auth if required.

### Steps
1. In Firebase console, open **Authentication**.
2. Look for authorized domains or settings related to allowed domains.
3. Add your Vercel production domain if it is not already accepted.
4. Add preview domains only if needed later.

---

## 8. OpenAI setup

### Goal
Enable AI generation and critique.

### Steps
1. Open your OpenAI platform account.
2. Create or locate an API key.
3. Copy it.
4. Add it to Vercel as `OPENAI_API_KEY`.

The app should only call OpenAI from server-side routes.
Do not expose this key in client code.

---

## 9. Environment variables to add in Vercel

Map the Firebase web app config to these variables:

- `NEXT_PUBLIC_FIREBASE_API_KEY`
- `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`
- `NEXT_PUBLIC_FIREBASE_PROJECT_ID`
- `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`
- `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`
- `NEXT_PUBLIC_FIREBASE_APP_ID`

Add:
- `OPENAI_API_KEY`

Optional later:
- `NEXT_PUBLIC_APP_URL`

---

## 10. Suggested Firestore collections

The app will use these collections:

- `users`
- `projects`
- `usage`

These should be created automatically by app writes when code is live.

---

## 11. Lean launch recommendation

For the first live version:
- keep sign-in required
- keep usage caps low
- do not expose a public anonymous generation endpoint
- keep Storage unused
- focus on a good board UX and exports first

---

## 12. Manual setup completion checklist

You are done with external setup when:
- GitHub repo exists
- Vercel project is connected
- Firebase project exists
- Firebase web app exists
- Google sign-in is enabled
- Firestore exists
- Vercel env vars are added
- production deployment succeeds
