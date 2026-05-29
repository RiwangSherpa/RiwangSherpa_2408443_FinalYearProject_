# StudyBuddy

## Khalti Subscription Testing

StudyBuddy Pro uses Khalti Web Checkout (KPG-2). Payment initiation and lookup happen on the FastAPI backend; the React frontend only redirects to Khalti and calls the backend verification endpoint after Khalti returns.

1. Create a Khalti sandbox merchant account at `https://test-admin.khalti.com/`.
2. Copy `.env.example` to `.env` and set `KHALTI_SECRET_KEY` to the sandbox live secret key. Keep it backend-only.
3. Use `KHALTI_BASE_URL=https://dev.khalti.com/api/v2`, `FRONTEND_URL=http://localhost:5173`, and `SUBSCRIPTION_PRICE_NPR=999` for local testing.
4. Start the backend and frontend, sign in, open `/subscription`, and click `Pay with Khalti`.
5. In Khalti sandbox, use test Khalti IDs like `9800000000`, MPIN `1111`, and OTP `987654`.
6. After Khalti redirects to `/subscription/callback`, the frontend calls `/api/subscriptions/khalti/verify`; Pro is activated only if Khalti lookup returns `Completed` with the expected amount.
7. Test cancelled/failed flows by cancelling checkout or using an invalid/pending sandbox flow. StudyBuddy should keep the user on Free and show a retry option.

