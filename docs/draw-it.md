# DRAW IT! — review build

Implementation is on `feature/draw-it`. Do not merge, migrate the production database, or deploy production until the family has tested and approved the game.

The game uses a blank canvas, five tools, ten colors, adjustable sizes, undo/redo/reversible clear, one locked human guess, blind AI recognition, artist's actual answer, artist-confirmed points, balanced alternating turns, 3/5/unlimited rounds, ties, and rematches. One round includes one drawing by each side. AI never scores. Unlimited matches can end after a complete pair of turns. Tied and kid-versus-kid matches do not write an Adults/Kids lifetime win, matching existing platform behavior.

The existing selected family roster supplies names. A new catalog tile launches a full-screen controller; other games remain intact. DRAW IT is excluded from Random 3 Game Challenge because its turn structure and required external service differ from those games.

## AI setup still required

The connected Vercel project had no OPENAI_API_KEY when inspected. Recognition has **not** been validated against a real provider. Test-service responses in automated tests are explicitly marked and never ship as successful fallback guesses.

Configure a server-only `OPENAI_API_KEY`, an appropriate provider account/data-retention configuration for the intended child audience, and `DRAW_IT_AI_ENABLED=true` in the review environment. Optional `DRAW_IT_VISION_MODEL` defaults to `gpt-4.1-mini`. Never use a public-prefixed key. No dependency or client key is needed. The server calls the Responses API with an inline PNG and `store:false`. Only the picture and a fixed prompt are sent, not player names, human guesses, or intended answers. Provider safety retention may apply; the game discloses this. No image or answer is logged or written to our database/storage.

Apply `supabase/migrations/20261106000100_draw_it.sql` in an isolated review database before testing persistence and real recognition. It adds an RLS-protected counter table, an authenticated-only atomic budget function, and extends the existing result validator for DRAW IT. The endpoint fails closed if the migration or budget is unavailable. Limits are 30 calls/family/day, 500 calls overall/day, and 4 seconds between calls per family. Failed provider calls consume budget. Image bodies are bounded before parsing, PNG dimensions are checked, and requests require verified membership plus same origin. The provider request times out after 25 seconds. Errors preserve the picture and offer retry or skipping AI; no successful guess is fabricated.

## Verification

Passed:

- Production Next.js build and TypeScript check.
- Existing account access, Arcade regression, and completed-result API tests.
- DRAW IT controller/model tests: undo/redo/clear, escaping, blind image-only payload, service-fixture reveal, service failure and skipping, switching, balanced 3/5-round matches, unlimited finish, scoring, ties, completion and clean rematch.
- DRAW IT API fixtures: auth/origin/content type, key missing, oversized request, malformed image, guessed-answer rejection, database failure, rate limit, success schema, store:false and honest upstream failure.
- Browser QA at 390×844 and 360×640 portrait plus 844×390 landscape. Drawing, undo, locked guess, genuine unavailable-service screen, actual-answer reveal, artist-confirmed point and next artist were exercised. Drawing screen fits without internal scrolling at 360×640 and 844×390.

Commands:

```sh
npm run build
npm test
npm run test:arcade
node --experimental-strip-types tests/arcade-results.mjs
npm run test:draw
```

Not yet verified: real provider recognition quality, live database migration/persistence, physical iOS/Android finger input, or microphone permissions/transcription on those devices. Test these with the family before final approval. Browser testing used mouse input and phone-size frames, not physical mobile hardware. No production environment variables or database were changed.
