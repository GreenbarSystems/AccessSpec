# AI Business 101 Professor: accounting channel handoff

Everything decided so far, so a new chat can continue without the old one. The files live in `GreenbarSystems/AccessSpec`, branch `claude/creation-factory-harness-review-lfta13`, folder `ai-business-101/`.

## The channel
- **Name:** AI Business 101 Professor, on YouTube (long-form and Shorts) and TikTok.
- **Owner:** 25+ years in accounting and finance, now working in AI for accounting.
- **Topics:** AI, accounting basics, accounting standards, business, FP&A.
- **Primary audience:** small business owners. Second: finance and accounting pros, for AI-in-Excel content. The channel serves all four audiences.
- **Replaces:** the Mythic Lore Shorts, whose views were declining. That factory lives in `GreenbarSystems/mythic-lore-factory`, and much of its pipeline can be reused: gates, captions, render, QC and upload.

## How videos get made (owner's time: reading scripts only)
1. Claude writes the script and a scene plan. Facts are checked against free sources such as OpenStax *Principles of Accounting*, never made up.
2. The owner reads the script in one take on his phone and sends the audio. That's all he does: no timing, no screen recording, no on-camera work.
3. Claude handles the rest:
   - noise cleanup
   - caption timing
   - chalkboard animation (Remotion, drawn in code, zero video credits)
   - quizzes
   - render, QC and private upload
4. **Long-form lessons:** 4–6 min. **Shorts:** 20–25 s cut from quiz moments and examples.

## Tone
From the owner's voice memo (`scripts/voice-memo-transcript.txt`):
- Candid practitioner, not textbook. Short personal stories, like his manager drawing T's on the whiteboard.
- Contrarian titles ("Why debits and credits suck").
- Everyday examples: the $1 bottle of water, the house and the mortgage, the water stand.
- One memory hook per idea.

## Visual design (locked)
- **One chalkboard for the whole video,** intro and lesson alike: green board, wood frame, brown surround, slow push-in, eraser wipes between sections. No switching to other backgrounds.
- **Fonts** (in `animation/public/`, from @fontsource):
  - Cabin Sketch for titles and big words
  - Kalam for everything else
- **Colors:**

| Use | Hex |
|---|---|
| Chalk white | `#f3f1e7` |
| Yellow (credits, emphasis) | `#ffe27a` |
| Blue (debits) | `#9fd4ff` |
| Pink (warnings, "SUCK") | `#ff9b8a` |

- **Chalk lines** reveal left to right with a chalk stick riding the edge. T-accounts, circles and underlines draw themselves.
- **Background:** while he talks about himself, his background is handwritten on the board.
- **Quizzes:** a "Quick quiz!" board, a 5-second chalk countdown from 5 to 1, the answer circled.
- **Photo:** his photo in a yellow-ringed circle on the intro, which then shrinks to a top-left badge with the lesson name.
  - The photo was a car selfie. The background was removed with rembg (`isnet-general-use`; model from GitHub releases) and replaced with chalkboard green. The photo is **not in git**; ask him to re-attach it.
- **Captions:** a sans-serif bar at the bottom. It could switch to Kalam; the owner hasn't decided.
- **Code:** `animation/src/`, with `chalk.tsx` holding the shared Board, Chalk, Stroke and Eraser components.
  - Needs Remotion 4 plus React 19, the same versions as mythic-lore-factory.
  - Also needs `public/intro.wav`, `public/audio.wav` and `public/photo.png`; media is not committed.

## Audio
- Noise cleanup works in ffmpeg: `highpass=f=80,arnndn=m=sh.rnnn:mix=0.9,afftdn=nf=-30,loudnorm=I=-16:TP=-1.5:LRA=11`. The RNNoise model `sh.rnnn` comes from GitHub, GregorR/rnnoise-models.
- On his memo it gained about 8 dB of separation between voice and noise.
- Advice given: record in a room with soft furnishings, phone 6–8 inches from the mouth, fans off. If it still sounds roomy, get a lavalier or USB mic.
- **Local transcription:** sherpa-onnx with the Whisper small.en model from GitHub (`k2-fsa/sherpa-onnx` releases, `asr-models`). Hugging Face is blocked in this environment.

## Launch plan: playlist "Accounting 101 in Plain English"
Launch lessons 1–3 together, plus a channel trailer (the chalkboard intro). Every lesson must stand alone with a 10-second recap. Keep in-lesson intros to about 15 seconds.

| # | Lesson | Status |
|---|---|---|
| 1 | **What the hell is A = L + E?** A = L + E, what accounting is, the house example, the water stand, R − E = NI, and the cascade (Revenue − Expenses → Net Income → Retained Earnings → Equity → A = L + E, tying the income statement to the balance sheet). 3 quizzes, about 5½ min. | Script ready: `scripts/lesson-01-a-equals-l-plus-e.md`. Waiting for his recording. |
| 2 | Why debits and credits suck (and how they click) | Script ready: `scripts/lesson-02-debits-and-credits.md`. Trim its intro to 15 s in the edit. Animation plan: `scripts/lesson-02-mock-and-animation-plan.md` |
| 3 | Your first journal entries: buy, sell, pay (the $1 water) | To write |
| 4 | Profit vs cash: why profitable businesses go broke | To write |
| 5 | The 3 financial statements in 5 minutes | To write |
| 6 | Accrual vs cash accounting | To write |

After that comes an AI track, for example "I asked AI to do my journal entries — here's what it got wrong."

**Title note:** check YouTube's advertiser-friendly guidelines on "hell" in a title before publishing Lesson 1. The fallback is "What Is A = L + E? (The Equation Every Business Runs On)".

## Accuracy rules (errors already caught in his memo)
- Debit = left and credit = right. Neither means good or bad.
- Assets, expenses and dividends increase with debits. Liabilities, equity and revenue increase with credits.
- Buying inventory: Dr Inventory / Cr Accounts Payable. Selling it: Dr COGS / Cr Inventory, plus Dr Cash / Cr Revenue.
- Retained earnings = profit kept after owner withdrawals or dividends.

## Research (`reports/Accounting and AI Shorts demand.md`)
- It ranks 26 Short topics and 5 long-form ideas, gives an Oct–Jan tax and CPA calendar, and checks the format against policy.
- **Evidence is weak:** YouTube, autocomplete, Reddit and TikTok were blocked, so there are no view counts.
- **To get real data,** either:
  - allow those hosts in the environment's network settings, or
  - add a YouTube Data API key, then pull views for the 59 video IDs in the report.
- **Policy fit:** his real voice plus original graphics fits YouTube's July 2025 and July 2026 inauthentic-content rules. The main risk is a series whose episodes look interchangeable, so vary the visuals per lesson. Avoid an AI clone of his voice or an AI avatar giving finance advice.

## Next steps
1. He records Lesson 1, and optionally Lesson 2, and attaches the audio plus his photo.
2. Clean the audio, transcribe it and time it, then build the Lesson 1 chalkboard scenes from the plan in its script. Add the balance-scale animation and the cascade flow chart.
3. Render Lesson 1, both long-form and 3 Shorts, and send them for review.
4. Set up a proper repo for the channel (e.g. `ai-business-101`), reusing the mythic-lore-factory pipeline.
