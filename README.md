# oan_grievance_ui

UI for OAN Grievance

This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Configuration

Auth (`/login`, `/register`) is backed by `oan_auth_service` — see its
[Postman collection](https://github.com/Centre-for-Open-Societal-Systems/oan_auth_service/blob/develop/postman/oan_auth_collection.json)
for the full API. The browser never talks to it directly: `/api/auth/*` and
`/api/proxy/*` Next.js routes hold the actual host server-side and manage the
session as an httpOnly cookie. Point those routes at a running instance by
setting, in `.env.local`:

```
AUTH_API_BASE_URL=https://your-auth-service-host
```

Without it, the auth routes return a clear 500 instead of a bare fetch failure.

## Getting Started

First, run the development server:

```bash
pnpm dev
# or
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
