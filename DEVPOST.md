# TastePassport AI — Devpost Submission Draft

## Tagline

**Translate your taste into a city.**

TastePassport AI turns the music, movies, fashion and food you already love into a personalized cultural route in another city.

## Inspiration

Travel recommendations are usually built around popularity: top restaurants, top attractions, top neighborhoods.

But people do not experience cities as generic tourists. They already have a cultural identity shaped by music, films, fashion, food and places they love.

We wanted to build an agent that could answer a different question:

> If this is my taste at home, what does that taste look like somewhere else?

That became TastePassport AI.

## What it does

A user enters a small set of taste signals such as:

- Travis Scott
- Interstellar
- Stone Island
- Japanese food

They also choose:

- where their taste is coming from
- the destination city
- a discovery mode: Safe, Balanced or Unexpected

TastePassport then creates a morning-to-night cultural route.

Every stop includes:

- a category
- time of day
- a reason it fits
- a **Taste Bridge** connecting the stop back to the user's preferences
- a **Route Fit** score

The experience is interactive after generation. A user can tell the agent to replace one specific stop with:

- **More like me**
- **Surprise me more**

Only that stop changes, while the rest of the route remains intact.

## How we built it

TastePassport is built with **Next.js, React and TypeScript** and deployed on **Vercel**.

The backend is structured around the **Qloo Insights API** for cross-domain cultural discovery.

The main recommendation route receives the user's Taste DNA, origin, destination and discovery mode, then turns recommendation results into a sequenced route.

A separate adaptation endpoint handles single-stop changes. This gives the experience an agentic feedback loop instead of making route generation a one-shot action.

The application also contains a clearly labelled Demo Mode so the product remains testable while API access is unavailable. Once `QLOO_API_KEY` is configured, the same backend switches to live Qloo-backed requests.

## Challenges we ran into

The biggest product challenge was avoiding a generic “AI travel planner.”

We focused the concept around **taste translation** rather than general itinerary generation. The route is not supposed to answer “what should everyone visit?” It is supposed to answer “what in this city feels culturally adjacent to me?”

Another challenge was making the experience feel agentic without constantly rebuilding the entire plan. We solved that by allowing targeted single-stop adaptations while preserving the rest of the route.

## Accomplishments that we're proud of

- Built and deployed a complete working web experience
- Designed a distinct Taste DNA / taste translation concept
- Created a morning-to-night cultural route system
- Added explainable Taste Bridges for each stop
- Added controlled serendipity through Safe / Balanced / Unexpected modes
- Added targeted agentic adaptation for individual route stops
- Kept the project publicly accessible and open source

## What we learned

Recommendation quality is only part of the experience. Users also need to understand **why** something was recommended and need a way to push the system closer to, or further away from, their existing preferences.

We also learned that a useful cultural agent should preserve context. When a user dislikes one stop, it should not forget the entire plan and start over.

## What's next for TastePassport AI

- Live Qloo recommendation data across more cultural categories
- Better route balancing between food, music, fashion, film and places
- Natural-language refinement such as “less touristy” or “more fashion focused”
- Saved Taste DNA profiles
- Shared TastePassport routes
- Smarter geographic route ordering
- Deeper explainability based on Qloo relationship signals

## Links

**Live demo:** https://tastepassport-ai.vercel.app

**GitHub:** https://github.com/d3montazh/tastepassport-ai
