# Safewørd

A sleek, dark-themed, minimalist website for the band Safewørd, built with Next.js 14 and React 18.

## Features

- Next.js 14 (Pages Router) and React 18
- Responsive, minimal UI styled with CSS Modules
- `/api/chat` route for AI-powered interactions
- Deploys on Vercel with environment variable support

## Getting started

Prerequisites: Node.js v18 or later and npm.

```bash
npm install
cp .env.example .env.local   # then fill in OPENAI_API_KEY
npm run dev
```

The site runs at http://localhost:3000.

## Environment variables

| Variable              | Description                                                 |
| --------------------- | ----------------------------------------------------------- |
| `OPENAI_API_KEY`      | Server-side key used by `/api/chat`. Never commit its value. |
| `REPLICATE_API_TOKEN` | Server-side token for Replicate-backed features.            |

Do not prefix secrets with `NEXT_PUBLIC_`: that inlines them into the browser bundle.

## Project layout

```
pages/           routes (index.js) and API routes (api/chat.js)
styles/          global styles and CSS modules
public/images/   static assets
__tests__/       Jest unit tests
gumroad-page/    standalone static store page
```

## Scripts

- `npm run dev` — start the dev server
- `npm run build` — production build
- `npm start` — serve the production build
- `npm test` / `npm run test:coverage` — Jest unit tests
