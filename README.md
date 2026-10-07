# TastePassport AI

TastePassport AI turns the things a person already loves — music, movies, brands, food and culture — into personalized recommendations for a destination city.

The project is built for the Qloo hackathon and uses the Qloo Insights API as its cultural recommendation engine.

## Core idea

A user enters interests such as:

- Travis Scott
- Interstellar
- Stone Island
- Japanese food

Then selects a city and a discovery mode:

- **Safe** — recommendations close to existing taste
- **Balanced** — familiar + discovery
- **Unexpected** — more surprising, less obvious matches

TastePassport asks Qloo for cross-domain recommendations and turns them into a compact cultural route.

## Current MVP

- Next.js frontend
- Qloo-powered recommendation API route
- City-aware place recommendations
- Cross-domain taste inputs
- Safe / Balanced / Unexpected discovery modes
- Explainability-ready recommendation flow

## Run locally

1. Install dependencies:

```bash
npm install
```

2. Copy `.env.example` to `.env.local` and add your Qloo API key:

```env
QLOO_API_KEY=your_key_here
QLOO_BASE_URL=https://api.qloo.com/v2
```

3. Start the app:

```bash
npm run dev
```

4. Open `http://localhost:3000`

## Security

Never commit `.env.local` or API keys to GitHub.

## Planned next steps

- Add LLM-generated natural-language explanations
- Add multi-category route generation
- Add recommendation images / richer cards
- Add saved Taste DNA profile
- Add deploy-ready configuration

## License

MIT
