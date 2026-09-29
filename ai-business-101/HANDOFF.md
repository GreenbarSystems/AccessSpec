# AI Business 101 Professor: accounting channel handoff (start here)

Everything decided so far, so a new chat can continue without the old one. This file is self-contained: both lesson scripts are appended at the end. The files live in `GreenbarSystems/AccessSpec`, branch `claude/creation-factory-harness-review-lfta13`, folder `ai-business-101/`.

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

## Production practices to build in from Lesson 1
From reviewing the open-source "claude-motion-design" pipeline (the article only; its repo hasn't been reviewed). Our engine stays Remotion, which already renders each frame deterministically from its frame number. Add these four:
1. **Stills gate:** render about 4 key frames of every lesson and review them before the full render. Fixes cost minutes on a still and a full re-render otherwise.
2. **Phone-size critique:**
   - Build a 2 fps contact sheet plus a 360 px-wide phone sheet.
   - Score 1–10 on hook in the first 2 s, readability at phone size, motion, variety (something new every 2–4 s), composition, accounting accuracy and sound sync.
   - Fix the top 3 problems and repeat until every score is 8 or above.
3. **Frame-range re-renders:** re-render only the seconds that changed; never re-render a whole video for a small fix.
4. **Sound:**
   - Place every sound effect on its measured peak, not its file start. The quiz ticks were placed late this way.
   - Add a soft chalk-scratch under each write-on.
   - Duck any music bed under the voice.
- **Skip:** 8× subframe motion blur (chalk writing doesn't need it) and beat-synced cutting (lessons are timed to the voice, not to music).

## Working preferences (owner)
- Short, direct answers. No guesses; say when something is unverified. Push back on bad ideas.
- Render only when asked or at a milestone; the owner dislikes waiting on unnecessary full re-renders.
- He only reads scripts. Never ask him to time, screen-record or appear on camera.

## Next steps
1. He records Lesson 1, and optionally Lesson 2, and attaches the audio plus his photo.
2. Clean the audio, transcribe it and time it, then build the Lesson 1 chalkboard scenes from the plan in its script. Add the balance-scale animation and the cascade flow chart.
3. Render Lesson 1, both long-form and 3 Shorts, and send them for review.
4. Set up a proper repo for the channel (e.g. `ai-business-101`), reusing the mythic-lore-factory pipeline.


---

# Appendix A: Lesson 1 script


About 5½ minutes. Read it in one take, the way you'd explain it to a new staff accountant.
- **[pause]** = breathe, about 1 second. The chalkboard animation uses these as cue points.
- **[quiz pause]** = stop talking for about 5 seconds. The countdown plays there.
- If you stumble, pause and restart the sentence; I'll cut the mistake.

---

**HOOK**

What the hell is A equals L plus E? [pause]
Every business on earth runs on this one little equation: your corner coffee shop, Apple, even your own household. [pause]
Give me four minutes, and it will never confuse you again. [pause]

**INTRO (about 15 seconds)**

I'm the AI Business 101 Professor. Twenty-five years in accounting and finance, and these days I work in AI for accounting. [pause]
This is lesson one. Let's go. [pause]

**WHAT ACCOUNTING REALLY IS**

Accounting is just keeping score of three things. [pause]
What a business has. What it owes. And what's left over for the owners. [pause]

**A, L AND E**

A is for assets: what you have. Cash, inventory, equipment, and money your customers still owe you. [pause]
L is for liabilities: what you owe. Loans, bills you haven't paid yet, wages you owe your people. [pause]
E is for equity: what's left for the owners after you pay everything you owe. [pause]
Put them together: assets equal liabilities plus equity. [pause]
Here's the way to think about it. Everything a business has was paid for by somebody. Either somebody you owe, that's liabilities, or the owners, that's equity. [pause]

**THE HOUSE**

You already use this at home. [pause]
Say you have a three-hundred-thousand-dollar house, and you owe two hundred forty thousand on the mortgage. [pause]
Your equity is sixty thousand. [pause]
Three hundred equals two-forty plus sixty. That's the whole equation. [pause]

**QUIZ 1**

Quick quiz. A business has fifty thousand dollars in assets and twenty thousand in liabilities. What's the equity? [quiz pause]
Thirty thousand. Fifty equals twenty plus thirty. [pause]

**THE WATER STAND**

Now let's watch it move. You start a little water stand. [pause]
You put in one hundred dollars of your own money. Cash, an asset, goes up a hundred. Equity goes up a hundred. One hundred equals zero plus one hundred. [pause]
You buy fifty dollars of bottled water from a supplier, and you'll pay them later. Inventory goes up fifty. What you owe, accounts payable, goes up fifty. One-fifty equals fifty plus one hundred. [pause]
Then you sell one bottle for a dollar cash. That bottle cost you fifty cents. [pause]
Cash goes up a dollar. Inventory goes down fifty cents. Your assets grew by fifty cents, and that fifty cents is profit, so it lands in equity. [pause]
One-fifty and fifty cents equals fifty plus one hundred and fifty cents. [pause]
It balances. Every single time. [pause]

**QUIZ 2**

Your turn. You pay the supplier the fifty dollars you owe, in cash. What happens to the equation? [quiz pause]
Cash goes down fifty, and what you owe goes down fifty. One hundred and fifty cents equals zero plus one hundred and fifty cents. Still balanced. [pause]

**THE SECOND EQUATION: R − E = NI**

Now, remember that fifty cents of profit? Where did it come from? [pause]
That's our second equation: R minus E equals N I. Revenue minus expenses equals net income. [pause]
And yes, accountants used the letter E twice. Up top, E is equity. Down here, E is expenses. Thanks, accounting. [pause]
For the water stand: revenue, one dollar. Expenses, the fifty cents the bottle cost us. Net income, fifty cents. [pause]

**HOW IT ALL CASCADES**

Here's how the two equations connect. [pause]
Revenue minus expenses gives you net income. That's the income statement. [pause]
Net income flows into retained earnings: the profit the business keeps, after anything the owners take out. [pause]
Retained earnings is part of equity. [pause]
And equity sits right in A equals L plus E. That's the balance sheet. [pause]
So the income statement explains how equity changed during the period, and the balance sheet shows where everything stands at the end. [pause]
Two statements, one system. They always tie. [pause]

**QUIZ 3**

Last one. A business has revenue of ten thousand dollars and expenses of seven thousand. What's the net income, and does equity go up or down? [quiz pause]
Three thousand dollars of net income, and equity goes up three thousand, as long as the owners don't take it out. [pause]

**WHY IT MATTERS**

That's why it's called the balance sheet. It has to balance. [pause]
And here's the secret for next time: the left side of A equals L plus E is the left side of a T-account. That's where debits come from. [pause]

**CLOSE**

Next lesson: why debits and credits suck, and how this equation makes them click. [pause]
Drop your quiz answers in the comments, and I'll tell you if you got them right.

---

## Chalkboard animation plan (same board, fonts and colors as the sample)

| Beat | On the board |
|---|---|
| Hook | **A = L + E** is written huge in the title font. A big "?" is chalked beside it, then circled. |
| Intro | Your photo card, then it shrinks to the corner badge. "Lesson 1" is written. |
| What accounting is | Three chalk columns appear: **HAVE · OWE · LEFT OVER**. |
| A, L and E | Each heading gets its letter (A / L / E) with small sketches as you name them: a cash stack, a box of inventory, a bill marked "unpaid", an owner stick figure. |
| Paid for by somebody | Arrows are chalked from L and E over to A. |
| The house | A chalk house with $300K; a mortgage bar ($240K) and an equity bar ($60K) fill the house to exactly its height. |
| Quiz 1 | Board wipe, "Quick quiz!", 5-4-3-2-1 countdown, answer circled. |
| The water stand | A running tally line at the top, **A = L + E**, updates with each step, and the numbers visibly change. A chalk balance scale tips and levels after every transaction. |
| Quiz 2 | Countdown. Both sides drop by 50 and the scale stays level. |
| R − E = NI | **R − E = NI** is written under the first equation. The two E's flash, and "equity" and "expenses" are labeled with a chalk "!?". The water stand numbers fill in: $1.00 − $0.50 = $0.50. |
| The cascade | A chalk flow chart builds top-down, each box drawn as you name it: **Revenue − Expenses → Net Income → Retained Earnings → Equity → A = L + E**. An "INCOME STATEMENT" bracket goes around the top and a "BALANCE SHEET" bracket around the bottom. A chalk "$0.50" dot travels down the chain. |
| Quiz 3 | Countdown. $10,000 − $7,000 = $3,000 is filled in, and the equity arrow points up. |
| Why it matters | "BALANCE SHEET" is written. The equation slides under a T, with A on the left and L + E on the right: the setup for Lesson 2. |
| Close | Next-lesson teaser: "Debits & credits SUCK" in pink. |

**Numbers check** (every step balances):

| Step | Assets | = Liabilities | + Equity |
|---|---|---|---|
| Owner puts in $100 | 100.00 | 0 | 100.00 |
| Buy $50 of water on credit | 150.00 | 50.00 | 100.00 |
| Sell one bottle for $1 (cost $0.50) | 150.50 | 50.00 | 100.50 |
| Pay the supplier $50 | 100.50 | 0 | 100.50 |

**Shorts from this lesson (20–25 s each):**
1. "What the hell is A = L + E?" (the house example)
2. "$50K assets, $20K liabilities: what's the equity?" (quiz)
3. "Watch a water stand balance itself" (the tally)

**Title note:** YouTube's ad-friendly guidelines treat mild words like "hell" much more leniently than strong profanity, but check how "hell" in a title is handled in the current Advertiser-friendly content guidelines before you publish. If you'd rather not risk it, a fallback is "What Is A = L + E? (The Equation Every Business Runs On)".


---

# Appendix B: Lesson 2 script


Read it straight through in one take, about 4 minutes. Talk the way you would to a new staff accountant sitting next to you.
- **[pause]** = take a breath, about 1 second. The animation uses these as cue points.
- **[quiz pause]** = stop talking for about 5 seconds. The countdown plays there.
- If you stumble, pause, then restart that sentence. I'll cut the mistake.

---

**INTRO**

Hi, I'm the AI Business 101 Professor. [pause]
I should also say accounting professor, because on this channel we'll cover AI, accounting basics, accounting standards, some business, and some financial planning and analysis. [pause]
I have over twenty-five years of experience in accounting and finance, and these days I work in the AI accounting space. [pause]
So I hope you'll join me. [pause]
Let's start with our first lesson: why debits and credits suck. [pause]

**THE STORY**

Early in my career, my manager would walk up to the whiteboard, draw a big T, and start working through an accounting problem. [pause]
And I'd think, what the heck? I learned this in my very first accounting class. [pause]
But the longer I've been in this career, the more I use that T. It's the fastest way to think through any transaction. [pause]

**THE T-ACCOUNT**

This is a T-account. It's literally a T. [pause]
The left side is debits. The right side is credits. That's it. [pause]
Debit means left. Credit means right. Nothing about good or bad. [pause]

**THE RULE**

Here's the rule that never breaks. [pause]
Assets, expenses, and dividends go up with a debit. [pause]
Liabilities, equity, and revenue go up with a credit. [pause]
A simple way to remember it: a debit shows where the money went. A credit shows where it came from. [pause]

**QUIZ 1**

Quick quiz. Your cash goes up. Debit or credit? [quiz pause]
Debit. Cash is an asset, and assets go up on the left. [pause]

**EXAMPLE 1: SELL THE WATER**

Let's sell something. A bottle of water. It costs one dollar, and the customer pays cash. [pause]
We need two T-accounts: Cash and Revenue. [pause]
Our cash went up, so we put one dollar on the debit side of Cash, the left side. [pause]
We earned revenue, so we put one dollar on the credit side of Revenue, the right side. [pause]
Side by side: one dollar on the left, one dollar on the right. Debits equal credits, every single time. [pause]

**EXAMPLE 2: BUY THE WATER**

But where did that water come from? [pause]
We bought it for fifty cents, and we haven't paid the supplier yet. [pause]
Inventory goes up, so we debit Inventory fifty cents. [pause]
We owe the supplier, so we credit Accounts Payable fifty cents. [pause]
When we sell the bottle, that fifty cents moves out of Inventory and into Cost of Goods Sold. [pause]
Revenue, one dollar. Cost, fifty cents. We just made fifty cents of profit. [pause]

**QUIZ 2**

Your turn. We pay the supplier the fifty cents in cash. Which account gets the debit? [quiz pause]
Accounts Payable. We owe less, so the liability goes down with a debit, and cash goes down with a credit. [pause]

**RECAP AND CLOSE**

So: debit is left, credit is right. Every entry has both, and they always match. [pause]
Draw the T, and you'll never get lost. [pause]
Next lesson: why a profitable business can still run out of cash. [pause]
Drop your quiz answers in the comments, and I'll tell you if you got them right.

---

## What changed from your test recording

- **Liabilities and equity are on the right.** The test said "left," which was a slip of the tongue.
- **"Balance sheet left is good, right is bad" is gone.** An equity increase is a credit and it's good. The rule above always holds.
- **Buying the water is now a debit to Inventory**, not "inventory expense." It moves to Cost of Goods Sold when you sell.
- **Small cleanups:** "reporting" is now "recording," filler words are out, and the sentences are shorter.

## Recording tips (free, and they matter more than the mic)

- **Pick a soft room.** A closet with clothes or a bedroom beats a kitchen or office with hard walls.
- **Get the phone close.** Hold it about 6–8 inches from your mouth, slightly off to the side so your breaths don't pop.
- **Cut the background sound.** Turn off fans, the HVAC and the TV, and silence notifications.
- **Leave room to trim.** Record 2 seconds of silence at the start and at the end; I use it to measure the room noise.
