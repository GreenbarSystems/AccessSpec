# Search demand for "AI basics" and "AI for business / accounting / finance" questions (YouTube, TikTok, Google), as of late September 2026

**Source access log (read this first):**
- **BLOCKED (tried directly, the egress proxy refused):** suggestqueries.google.com (YouTube `ds=yt` and Google versions), clients1.google.com, google.com/complete, duckduckgo.com/ac, api.bing.com osjson, old.reddit.com, www.reddit.com (WebFetch and WebSearch both refuse reddit.com), api.pullpush.io (Reddit archive), trends.withgoogle.com, www.youtube.com (Culture & Trends reports), explodingtopics.com, kwrds.ai, cpapracticeadvisor.com.
- **No page was read in full.** Every finding below comes from **search-engine result titles and summaries** (WebSearch). The summaries were written by the search tool, so treat their numbers as "reported by the source, not checked by me".
- **So: NO raw YouTube or Google autocomplete suggestions were collected, and no Reddit upvote or comment counts.** The closest public stand-in for query phrasing I could get is the titles of TikTok "Discover" pages. TikTok builds these pages around search phrases, and they sometimes keep user typos. Those titles are listed below.

## 1. Autocomplete suggestions (YouTube and Google) for the seed queries

### Takeaway
I could not collect any autocomplete data: every autocomplete endpoint (Google, YouTube, Bing, DuckDuckGo) was blocked by the sandbox proxy. The best substitute was TikTok Discover page titles, which point to real phrasing of search queries on TikTok (see the list below). The seed list needs to be run again from a machine that has open network access.

### Cited Findings
TikTok Discover page titles found in search results. Each page exists because people search that phrase. Wording is kept exactly as found, including typos:
- "Ai Replace Accountants": the summary reports **272.5K posts** — [TikTok](https://www.tiktok.com/discover/ai-replace-accountants)
- "Accounting Replaced by Ai" — [TikTok](https://www.tiktok.com/discover/accounting-replaced-by-ai)
- "Accountant Tok": the summary reports **921.4K posts** (general accounting, baseline for comparison) — [TikTok](https://www.tiktok.com/discover/accountant-tok)
- "Best Ai Tools for Accounting" — [TikTok](https://www.tiktok.com/discover/best-ai-tools-for-accounting)
- "Besr Ai for Accounting" (typo kept, which suggests an organic user query) — [TikTok](https://www.tiktok.com/discover/besr-ai-for-accounting)
- "Ai Tool for Accounting Students" — [TikTok](https://www.tiktok.com/discover/ai-tool-for-accounting-students)
- "Ai for Accounting Homework" / "Ai Accounting Homework" — [TikTok](https://www.tiktok.com/discover/ai-for-accounting-homework); [TikTok](https://www.tiktok.com/discover/ai-accounting-homework)
- "Ai for Financial Accounting Assignment" — [TikTok](https://www.tiktok.com/discover/ai-for-financial-accounting-assignment)
- "Accounting Ai Tool for Solving Questions" — [TikTok](https://www.tiktok.com/discover/accounting-ai-tool-for-solving-questions)
- "How to Install Claude for Excel" — [TikTok](https://www.tiktok.com/discover/how-to-install-claude-for-excel)
- "How to Use Claude Code Accounting" — [TikTok](https://www.tiktok.com/discover/how-to-use-claude-code-accounting)
- "Putting Bank Statements into Claude Ai" — [TikTok](https://www.tiktok.com/discover/putting-bank-statements-into-claude-ai)
- "How to Use Ai for Spreadsheets" — [TikTok](https://www.tiktok.com/discover/how-to-use-ai-for-spreadsheets)
- "Claude Vs Copilot" — [TikTok](https://www.tiktok.com/discover/claude-vs-copilot)
- "Dhat Gpt Excel" (typo for "chat gpt excel") — [TikTok](https://www.tiktok.com/discover/dhat-gpt-excel)
- "Nate Ai Guy Claude Excel" (a query for a named creator) — [TikTok](https://www.tiktok.com/discover/nate-ai-guy-claude-excel)
- "Popular Chatgpt Trends" — [TikTok](https://www.tiktok.com/discover/popular-chatgpt-trends)
- Example creator video: "Which has the better AI for Excel product: Claude, ChatGPT, or Copilot?" (hashtags #claudeforexcel #chatgptexcel #aitoolsforbusiness) — [TikTok @karl.yeh_ai_explorer](https://www.tiktok.com/@karl.yeh_ai_explorer/video/7620970259582881031)
- Themes the summaries reported on accounting-AI Discover pages: "AI isn't replacing accountants but making good ones exceptional"; AI agents inside WhatsApp that read invoice photos and update spreadsheets; trainee/junior roles "changing rather than disappearing" — [TikTok](https://www.tiktok.com/discover/ai-replace-accountants); [TikTok](https://www.tiktok.com/discover/ai-tool-for-accounting-students)

### Inferences
- On TikTok, accounting-and-AI searches fall into three groups:
  - **Job fear:** "replace accountants"
  - **Student homework help:** "homework", "assignment", "solving questions"
  - **Tool how-tos:** "install Claude for Excel", "bank statements into Claude", "Claude vs Copilot"
- "Claude for Excel" and "Claude Code for accounting" have their own Discover pages. That suggests Claude-specific finance queries have become a searched phrase on TikTok, not only ChatGPT ones. The pages carry no dates, though, so I cannot tell when they appeared.
- Students (homework and assignment queries) look like a separate, sizable audience on TikTok.

### Gaps
- None of the raw autocomplete lists for the 16 seeds or the alphabet-soup variants were collected (all endpoints blocked). **Suggested follow-up:** run `https://suggestqueries.google.com/complete/search?client=firefox&ds=yt&q=<seed>` from a machine with open network access.
- I found no public search-volume numbers for "ai for accountants", "ai fp&a" and similar keywords. The keyword sites (kwrds.ai) were blocked, and the search summaries gave no numbers.
- The TikTok post counts come from search summaries, and their dates are unknown.

## 2. Published trend reports and keyword studies (2025–2026)

### Takeaway
The dated signals I could find show that AI queries are moving from "what is AI" toward practical "how do I use AI for X" questions. Business adoption keeps rising, but slowly, and very small firms lag. I could not open the primary trend sources (Google Trends AI page, YouTube Culture & Trends, Exploding Topics).

### Cited Findings
- Google Year in Search 2025 (published Dec 2025): Gemini was the most-searched topic worldwide. "Tell me about…" searches rose 70% year over year, and "How do I…" queries hit an all-time high (+25%) — [Google blog](https://blog.google/products/search/year-in-search-2025/); [Gadget Hacks](https://android.gadgethacks.com/news/google-year-in-search-2025-reveals-70-rise-in-ai-queries/) (search summary only)
- Search summary: "What is AI" showed "3,233% 5-year search growth globally", and 2025 searches moved from abstract questions toward "how to use AI for work, study, creativity" — [Exploding Topics, "100 Most Asked Questions on Google (Feb 2026)"](https://explodingtopics.com/blog/top-google-questions); [Macao News](https://macaonews.org/features/top-global-search-trends-google-2025/) (the summary blends these sources; I could not confirm which one gave the 3,233% figure)
- In the US, Gemini topped trending searches in 2025 — [Search Engine Journal](https://www.searchenginejournal.com/google-reveals-the-top-searches-of-2025/563738/)
- Google runs a dedicated "Artificial Intelligence Search Trends" page for the US (the page itself was blocked) — [Google Trends](https://trends.withgoogle.com/trends/us/artificial-intelligence-search-trends/?hl=en-US)
- Exploding Topics has an "AI topics" page dated September 2026 (blocked, contents unknown) — [Exploding Topics](https://explodingtopics.com/ai-topics)
- YouTube published a "Human Creativity & AI" Culture & Trends report (tr26) and a 2025 Global Culture & Trends report (Dec 2025). Search summaries say educational content is moving toward niche, specialized channels and short-form explainers — [YouTube tr26](https://www.youtube.com/trends/report/tr26-genai-trends-report/); [YouTube tr25](https://www.youtube.com/trends/report/tr25-global-trends-report/); [NetInfluencer](https://www.netinfluencer.com/youtube-global-culture-and-trends-2025-platform-highlights-creator-innovation-and-regional-content-shifts/)
- US Census BTOS: business AI use held at **17–20%** from Dec 2025 to May 2026. It was **33.9% in Finance & Insurance** against 19.8% nationally, 37% at firms with 250+ employees, and under 20% at firms with 4 or fewer. Use grew at firms with 20+ employees but not significantly at smaller ones — [Census, May 2026](https://www.census.gov/library/stories/2026/05/ai-use-businesses.html)
- Microsoft made Copilot Agent Mode generally available in Word, Excel and PowerPoint on **April 22, 2026**, reporting Excel engagement up 67% (a vendor figure, via a third-party summary). Agent Mode in Excel now also works on local files — [pasqualepillitteri.it](https://pasqualepillitteri.it/en/news/1401/microsoft-copilot-agent-mode-word-excel-powerpoint-april-2026); [Microsoft Tech Community](https://techcommunity.microsoft.com/blog/microsoft365insiderblog/agent-mode-in-excel-now-works-with-your-local-files/4497675)
- AICPA & CIMA Future-Ready Finance survey (fall 2025, reported Feb 2026): 88% of finance leaders expect AI to be the most transformative technology in the next 1–2 years, but only 8% say they are "very well prepared" — [CPA Practice Advisor](https://www.cpapracticeadvisor.com/2026/02/25/aicpa-cima-survey-shows-growing-ai-adoption-gap/178855/) (summary only)
- 60% of tax professionals use AI at least weekly, up from 33% in 2025 (aggregator summary; original source unclear) — [search result set incl. Booke AI / CurateSuite](https://booke.ai/hub/research/ai-accounting-statistics-current)
- Small-business surveys, 2026 (aggregators):
  - Top concerns are reliability and accuracy (45%) and data security (42%).
  - 74% want clearer ROI evidence and 73% want easier tools.
  - Among firms with under 5 employees, 82% say "AI isn't applicable to my business."
  - The top uses are marketing content (68%), customer communication (52%) and admin (47%).
  - Sources: [Capsule CRM](https://capsulecrm.com/blog/small-business-ai-adoption-statistics/); [SBE Council, March 2026](https://sbecouncil.org/wp-content/uploads/2026/03/SBE-Technology-Use-Survey-March-2026-Final-2.pdf). Which statistic came from which source was not verified.
- Accounting enrollment at 4-year schools rose 8.9% in spring 2026, the third straight year of growth (AICPA data, summary only) — [search result](https://www.cpapracticeadvisor.com/2024/04/30/can-ai-pass-the-cpa-exam-groundbreaking-study-reveals-surprising-potential-and-limitations/104699/). Attribution is unclear, so treat it with caution.

### Inferences
- **"How do I use AI to…"** framing fits the direction of search behavior better than "what is AI".
- Small business owners need **ROI proof and trust/accuracy** answers more than feature tours.

### Gaps
- I found no TikTok Creative Center hashtag view counts for #aiforaccountants, #chatgpt, #excel and similar tags (Creative Center not reachable).
- No Think with Google or Semrush/Ahrefs keyword posts on AI-for-accounting keywords surfaced.
- The US Google Trends AI page contents are unknown.

## 3. Reddit questions from finance and accounting professionals (r/Accounting, r/FPandA, r/smallbusiness, r/excel)

### Takeaway
I could not get this. Reddit is blocked at the proxy and excluded from the search tool. No thread titles or upvote/comment counts were collected.

### Cited Findings
- The search results reference a Reddit debate over whether AI will replace chartered accountants, but gave no URL or counts — [OCNJ Daily, Apr 2026](https://ocnjdaily.com/news/2026/apr/02/ai-cant-replace-accountants-could-it-ever/) (search summary only)
- Non-Reddit FP&A practitioner content covers the same kinds of questions: AI for executive summaries, prompting frameworks for financial analysis, and "how to really leverage ChatGPT in your finance role (no hype)" — [CFI](https://corporatefinanceinstitute.com/resources/fpa/using-ai-for-executive-summaries); [CFO Impulse Substack](https://cfoimpulse.substack.com/p/how-to-really-leverage-chatgpt-in); [FP&Hey Substack](https://fpandhey.substack.com/p/practical-ai-does-exist-in-fpanda)

### Inferences
- The same themes appear on TikTok (section 1), which points to likely recurring Reddit themes:
  - job replacement and fewer entry-level roles
  - which tool to use for Excel
  - accuracy and hallucination risk
  - client data privacy

  None of this was verified on Reddit.

### Gaps
- All Reddit evidence is missing. It needs a run with Reddit access, for example r/Accounting and r/FPandA searched for "AI" sorted by top over the past year.

## 4. Rising vs. saturated interest

### Takeaway
This is a tentative read built only on the indirect signals above.
- **Rising:** tool- and brand-specific "AI in Excel" how-tos (Claude for Excel, Copilot Agent Mode, which was released April 2026 and whose Excel use Microsoft reports is growing fast) and practical "how do I use AI for [task]" queries.
- **Mature and crowded:** "will AI replace accountants" (272.5K TikTok posts) and generic "what is AI".

### Cited Findings
- "How do I…" queries at an all-time high in 2025 — [Google blog](https://blog.google/products/search/year-in-search-2025/)
- Copilot Agent Mode GA in April 2026, with Excel engagement +67% (vendor figure) — [pasqualepillitteri.it](https://pasqualepillitteri.it/en/news/1401/microsoft-copilot-agent-mode-word-excel-powerpoint-april-2026)
- Claude-for-Excel and Claude Code accounting Discover pages exist; there is creator content comparing Claude, ChatGPT and Copilot for Excel — [TikTok](https://www.tiktok.com/discover/how-to-install-claude-for-excel); [TikTok](https://www.tiktok.com/discover/claude-vs-copilot)
- "Ai Replace Accountants" has 272.5K posts — [TikTok](https://www.tiktok.com/discover/ai-replace-accountants)
- Small-firm AI use is flat Dec 2025–May 2026 while larger firms grow — [Census](https://www.census.gov/library/stories/2026/05/ai-use-businesses.html)

### Inferences, grouped by audience (a synthesis of the evidence above, not measured demand)
- **General public:**
  - "what is AI" / "how do I use AI for…" / "ChatGPT vs Gemini vs Claude"
  - Mature topic, but conversational how-to phrasing is growing.
- **Small business owners:**
  - "is AI worth it for my business" / "AI for marketing, customer emails, admin" / "is my data safe" / "AI bookkeeping, bank statements into AI"
  - Largely unmet demand: owners say they need ROI and practical training.
- **Finance and accounting professionals:**
  - "will AI replace accountants" (crowded) / "Claude vs Copilot vs ChatGPT for Excel" / "how to install/use Claude for Excel" / "Copilot Agent Mode Excel" / "AI for variance explanations, reconciliations, executive summaries"
  - The tool how-tos are rising.
- **Accounting students:**
  - "AI for accounting homework" / "accounting AI tool for solving questions" / "AI tool for accounting students" / "will AI replace accountants, should I still major in accounting"

### Gaps
- There is no time-series data (Google Trends graphs, dated autocomplete snapshots) to confirm what is rising versus flat. Every rising/saturated call above is inferred.
