# TastePassport AI

**TastePassport AI** is an agentic cultural discovery experience built for the **Qloo Agentic Hackathon 2026**.

Instead of asking “what is popular in New York?”, TastePassport asks a more personal question:

> **What is the New York equivalent of my taste?**

A user gives a few signals from their real cultural identity — music, movies, fashion, food, places — and TastePassport translates those signals into a personalized morning-to-night route in another city.

## Live demo

- **App:** https://tastepassport-ai.vercel.app
- **Repository:** https://github.com/d3montazh/tastepassport-ai

The public deployment currently supports a transparent **Demo Mode** when no Qloo API key is configured. As soon as `QLOO_API_KEY` is added in the deployment environment, the app switches to live Qloo-backed recommendations automatically.

## Why this is different

Most travel recommendation products rank what is generally popular. TastePassport instead tries to preserve the user's cultural identity across locations.

Example:

- Origin: **Kyiv**
- Destination: **New York**
- Taste DNA: **Travis Scott, Interstellar, Stone Island, Japanese food**

The agent turns that into a sequenced cultural route and explains the **taste bridge** behind each stop.

## Current features

- Cross-domain **Taste DNA** input
- **Taste translation** from one city into another
- Discovery modes: **Safe / Balanced / Unexpected**
- Morning-to-night route sequencing
- Per-stop **Taste Bridge** explanations
- Per-stop **Route Fit** score
- **Taste Translation Map** connecting user taste signals to the generated route
- Cinematic multi-stage generation feedback while the agent builds the route
- Agent strategy panel showing how the route is being adapted
- Interactive **More like me** replacement for a single stop
- Interactive **Surprise me more** replacement for a single stop
- Single-stop adaptation without rebuilding the rest of the route
- **Natural-language full-route refinement** such as “Make it less touristy”, “More fashion-focused”, “Make it cheaper”, or “More nightlife”
- Full-route refinement preserves the time structure while rebalancing the day around the user’s instruction
- Responsive dark UI with scroll motion and cursor-reactive Taste DNA visualization
- Mobile-specific layout polish for the builder, loading flow, route cards, Taste Map and agent controls
- **Build another passport** action after the generated route
- Public Vercel deployment
- Transparent fallback Demo Mode while API access is unavailable

## Agentic interaction

TastePassport is not just a one-shot recommendation list.

After the initial route is generated, the user can adapt individual stops:

- **More like me** pulls one stop closer to the strongest taste signals.
- **Surprise me more** widens the discovery radius for one stop.

The user can also talk to the full route in plain English. Prompts such as **“Make it less touristy”**, **“More fashion-focused”**, **“Make it cheaper”**, or **“More nightlife”** rebalance the whole day while preserving the route’s morning-to-night structure and the original Taste DNA.

This creates two levels of control: targeted single-stop changes and higher-level whole-route direction.

## Explainability

TastePassport is designed to show more than a recommendation list. The **Taste Translation Map** visualizes how individual taste signals connect to route stops, while Taste Bridges and Route Fit scores explain the relationship at the stop level.

## Qloo integration

All three backend routes call the Qloo Hackathon server at `https://hackathon.api.qloo.com`. The shared server client resolves taste names with `GET /search`, then sends the resolved IDs to `GET /v2/insights` with the destination filter. The API key is sent only in the `X-Api-Key` header; it is never returned to the browser or logged. The old `QLOO_BASE_URL` setting is no longer used.

Requests have a 12-second overall deadline. Missing credentials, authentication failures, rate limits, malformed responses, empty matches and network errors use the existing localized demo responses with `meta.fallback: true`. Replacement excludes existing stop names. Refinement preserves time slots and requires enough distinct results; it never repeats a single live result to fill the day.

Refinement recognizes the existing English, Russian, Ukrainian, Spanish and Chinese intent patterns. It translates budget and less-touristy requests into price/popularity filters and resolves category names through `/v2/tags`. Unsupported instructions or unavailable category tags use the labeled fallback. This is deterministic intent matching, not general LLM understanding. Route Fit percentages remain the application's presentation heuristics, not Qloo affinity scores; opening times and travel feasibility are not verified.

Environment variables:

```env
QLOO_API_KEY=your_key_here
# Qloo server: https://hackathon.api.qloo.com (fixed server-side)
```

API keys are never committed to the repository.

### Vercel setup

1. Open the `tastepassport-ai` project in the `taste-passport` Vercel team, then **Settings → Environment Variables**.
2. Add `QLOO_API_KEY` with your hackathon key, enable **Sensitive**, and select **Production** (and **Preview** if you want live preview testing). Do not use a `NEXT_PUBLIC_` prefix or paste the key into source files, issues, or logs.
3. Deploy the integration branch for preview testing, or merge it and deploy production. After changing the variable, use **Deployments → Redeploy** on a deployment containing the integration changes. Existing deployments do not pick up new environment values.
4. Generate a route, replace a stop, and refine the route. Successful live responses report `meta.source: "Qloo Insights API"` and `meta.fallback: false`. A demo label indicates fallback, not a verified live connection.

See [Vercel environment variables](https://vercel.com/docs/environment-variables/managing-environment-variables) and [sensitive variables](https://vercel.com/docs/environment-variables/sensitive-environment-variables).

### Verification

Run `npm ci`, `npm test`, and `npm run build`. Tests mock Qloo and cover all three routes, five fallback locales, live request parameters, replacement exclusions, refinement slot preservation, missing credentials, empty/insufficient results, invalid requests and upstream failures. A real-key smoke test must be run separately after configuring the environment.

## Tech stack

- **Next.js**
- **React**
- **TypeScript**
- **Qloo Insights API**
- **Vercel**

## Project structure

```text
app/
  api/
    recommend/       # builds the main route
    replace/         # adapts a single stop
    refine/          # refines the full route from a natural-language instruction
  page.tsx           # interactive client experience
  scroll-effects.tsx # reveal motion + cursor interaction
  results-actions.tsx# build-another-passport results action
  globals.css
  enhancements.css
  animations.css
  cursor-blob.css
  taste-map.css
  mobile-polish.css
```

## Run locally

```bash
npm install
```

Create `.env.local`:

```env
QLOO_API_KEY=your_key_here
# Qloo server: https://hackathon.api.qloo.com (fixed server-side)
```

Then run:

```bash
npm run dev
```

Open:

```text
http://localhost:3000
```

## Hackathon goal

TastePassport explores a simple idea: **taste can travel**.

The long-term direction is to make the agent understand not just what a person likes, but how adventurous they want to be, which parts of their identity they want preserved, and which parts they want challenged when entering a new city.

## License

MIT
