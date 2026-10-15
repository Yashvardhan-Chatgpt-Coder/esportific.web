# Vercel deployment setup

The repository stays in one GitHub repository. Create two Vercel projects from that repository and set each project's **Root Directory**:

| Vercel project | Root Directory | Framework |
| --- | --- | --- |
| Frontend | `.` (repository root) | TanStack Start |
| Backend | `backend` | Express |

The frontend uses Nitro's Vercel preset. The backend exports its Express app for Vercel Functions and keeps the existing `npm start` local workflow.

## Frontend environment

Set `VITE_API_URL` to the backend deployment URL with `/api` appended, for example `https://your-backend.vercel.app/api`. Set this for Production and Preview as appropriate, then redeploy the frontend.

`VITE_GOOGLE_CLIENT_ID` is optional while Google sign-in remains hidden. Values beginning with `VITE_` are public browser configuration and must never contain secrets.

## Backend environment

Set these in the backend Vercel project for Production:

- `MONGO_URI` — production MongoDB connection string. Restrict the database network access and database user to the minimum required.
- `JWT_SECRET` — a new, random production secret; do not reuse a development secret.
- `CLOUDINARY_CLOUD_NAME`
- `CLOUDINARY_API_KEY`
- `CLOUDINARY_API_SECRET`
- `RESEND_API_KEY` — required for OTP delivery.
- `RESEND_FROM_EMAIL` — use `Esportific <noreply.esportific@rangrove.com>` after the sender domain is verified.

`GOOGLE_CLIENT_ID` is optional while Google sign-in remains hidden. `PORT` is for local development only; Vercel supplies the serverless port.

Do not commit `.env` files. Add backend secrets using the backend project's Vercel Environment Variables settings, then deploy the backend before setting `VITE_API_URL` and deploying the frontend. The production frontend domain is expected to be `app.esportific.rangrove.com`.
