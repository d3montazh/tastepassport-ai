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

The backend is designed around the Qloo Insights API. With a valid key configured, the app calls Qloo for destination-aware cultural recommendations and maps the results into the route experience.

Environment variables:

```env
QLOO_API_KEY=your_key_here
QLOO_BASE_URL=https://api.qloo.com/v2
```

API keys are never committed to the repository.

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
QLOO_BASE_URL=https://api.qloo.com/v2
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
