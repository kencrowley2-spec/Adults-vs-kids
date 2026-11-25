# Draw It! Visual Charades

Draw It opens at `/family/arcade?game=draw`. On one device, players alternate drawing a silent clue and guessing. The artist can peek at an optional idea card. The partner locks one guess before the sketch reader runs. A confident reading appears beside the partner’s answer. When the reader abstains, cannot load, or is skipped, the artist’s answer field starts with the partner’s exact guess and can be edited. Only the artist awards the human guesser a point. Each round gives both players a turn.

## Sketch reader

The browser downloads the quantized model on its first reading. It crops the finished bitmap, normalizes the visible ink to a 20 × 20 grid, and runs a small neural network trained on 88 doodle categories. The reader sees the pixels, with all erasures and undo operations applied. Idea cards and player guesses are never inputs. No account, provider credentials or per-drawing network request is necessary for this reader.

The model was trained on 145,200 samples from Google, Inc.’s [Quick, Draw! dataset](https://github.com/googlecreativelab/quickdraw-dataset), licensed under [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/). The weights and preprocessing are adaptations. Use `scripts/draw-it/train.py` to rebuild the weights. With the shipped confidence cutoffs, the quantized model offered a guess for 48.2% of 13,200 held-out in-category bitmaps and identified 88.4% of those guesses correctly. Free-form family drawings can be outside the model’s vocabulary.

Signed-in families can explicitly request a second opinion on unclear sketches when the existing server-side OpenAI integration is enabled with `DRAW_IT_AI_ENABLED=true` and `OPENAI_API_KEY`. The endpoint requires a verified session, same-origin JSON, a bounded PNG and the existing atomic Supabase usage budget. Only that opt-in sends a picture to the provider. An uncertain response, failure or timeout keeps the partner’s guess.

Guest rounds require no gallery save. Member drawings save to the private Clubhouse Gallery in the background, with an option to retry a failed save. Match completion and rematches use the existing Arcade result and guest-allowance handling.

Run `npm run test:draw` for the match, controller and optional provider endpoint tests.
