# Top long-form YouTube videos: accounting, business/finance basics, small-business tax, CPA exam, "what is AI", AI for finance work

Research dates: 2026-09-28 to 2026-09-29. US/English focus.

**READ THIS FIRST: access log and what the data can and cannot support.**

- **Blocked (both curl and WebFetch, EGRESS_BLOCKED or proxy 403 on CONNECT):** www.youtube.com, m.youtube.com, youtube-nocookie.com, i.ytimg.com, the Invidious mirrors (yewtu.be, inv.nadeko.net, invidious.nerdvpn.de), the Piped APIs (pipedapi.kavin.rocks, api.piped.private.coffee), noembed.com, Social Blade, vidIQ, Playboard, SPEAKRJ, CreatorDB, ThoughtLeaders, NetWorthSpot, youtubers.me, NoxInfluencer, HypeAuditor, Class Central, LearnSignal, videohighlight.com, Bing, DuckDuckGo, Google Search, web.archive.org, summarize.tech. googleapis.com was reachable but returned 403 because there is no API key.
- **Read in full: none.** I could not fetch a single page.
- **Search-engine summaries only:** everything below comes from the WebSearch tool. It returns result titles, URLs and a model-written summary of the snippets. Some of those summaries include publish dates or channel subscriber and total-view figures that the summarizer took from Social Blade, vidIQ or SPEAKRJ snippets. **No per-video view counts appeared in any search result.** I never saw a YouTube page, so no view count here was "seen as displayed". Following the no-estimate rule, the table's view-count column reads "not observed" throughout.
- **Result:** this file gives (a) a candidate list of about 55 relevant long-form videos, with URLs and the publish dates that search summaries reported, and (b) channel-level subscriber and view figures that search summaries attributed to third-party stat sites. The ranking by views and the "fastest-growing 2024–2026" question **still need a pass where YouTube is reachable**, for example the YouTube Data API v3 `videos?part=statistics,contentDetails` for the video IDs below, or a browser session.

---

## 1. For each topic cluster, which videos have the most views, and which recent (2024–2026) videos gained views fastest?

### Takeaway
Ranking by views was not possible: YouTube and every mirror or stats site were blocked, and search snippets carried no per-video view counts. What I could build is a candidate list of relevant long-form videos, with video IDs and the publish dates the search summaries reported. Once a machine with YouTube access looks up the views, this list becomes the table.

### Cited Findings: candidate video table
Column notes: "Views" is not observed in every row (see the access log). "Published" is the date the search summary reported, not verified on YouTube. Length was not observed unless the title states it. The channel is named only where a source named it. Audience is my classification from the title.

**A. Accounting basics**

| # | Title | Channel | Views | Published | Length | Audience | Source |
|---|---|---|---|---|---|---|---|
| 1 | Accounting for Beginners #1 / Debits and Credits / Assets = Liabilities + Equity | CPA Strength (per search summary, unverified) | not observed | not observed | not observed | beginners, students | [YouTube](https://www.youtube.com/watch?v=_pTU4gwmcMs); [search summary via teracourses/sites.google](https://teracourses.com/en/lesson/accounting-fundamentals-course6-lesson1) |
| 2 | The ACCOUNTING BASICS for BEGINNERS | not observed | not observed | not observed | not observed | beginners | [videohighlight listing](https://videohighlight.com/v/Gua2Bo_G-J0?mediaType=youtube&language=en&summaryType=compressed&aiFormatted=false) (video ID Gua2Bo_G-J0) |
| 3 | ACCOUNTING BASICS for Beginners (Whole Playlist) | Accounting Stuff (playlist) | not observed | n/a (playlist) | n/a | beginners, bookkeepers | [YouTube playlist](https://www.youtube.com/playlist?list=PL5zKSeS09l339nB6ujJPQ9Rsv99_b-aTb) |
| 4 | Understanding & Reading Financial Statements | not observed | not observed | Apr 2020 | not observed | beginners, business owners | [YouTube](https://www.youtube.com/watch?v=mnJDA3YXL9g) |
| 5 | Financial Statements Explained \| Balance Sheet \| Income Statement \| Cash Flow Statement | not observed | not observed | Feb 2024 | not observed | beginners | [YouTube](https://www.youtube.com/watch?v=e8qbynFb4Zc) |
| 6 | Learn How To Read Financial Statements for Dummies - Balance Sheet & Income Statement {the basics} | not observed | not observed | Jan 2021 | not observed | beginners | [YouTube](https://www.youtube.com/watch?v=NodZcLvH4l0) |
| 7 | How to Read and Understand a Balance Sheet \| Business: Explained | not observed | not observed | May 2022 | not observed | beginners, business | [YouTube](https://www.youtube.com/watch?v=BfXhpe1XxdI) |
| 8 | The KEY to Understanding Financial Statements | not observed | not observed | not observed | not observed | beginners | [YouTube](https://www.youtube.com/watch?v=_F6a0ddbjtI) |
| 9 | How To Read Financial Statements In 9 Minutes!! Easier Than You Think! | not observed | not observed | Jun 2024 | ~9 min (per title) | beginners, investors | [YouTube](https://www.youtube.com/watch?v=fb7YCVR5fIU) |
| 10 | FINANCIAL STATEMENTS: all the basics in 8 MINS! | not observed | not observed | Oct 2022 | ~8 min (per title) | beginners | [YouTube](https://www.youtube.com/watch?v=Fi1wkUczuyk) |
| 11 | How to Read & Analyze the Balance Sheet Like a CFO \| The Complete Guide to Balance Sheet Analysis | not observed | not observed | not observed | not observed | business owners, managers | [YouTube](https://www.youtube.com/watch?v=DMv9JC_K37Y) |

**B. Business/finance basics** (overlaps with A)

| # | Title | Channel | Views | Published | Length | Audience | Source |
|---|---|---|---|---|---|---|---|
| 12 | Fundamental Analysis (about 30-minute tutorial on company valuation using accounting concepts) | The Organic Chemistry Tutor | not observed | not observed | ~30 min (per search summary) | students, investors | [Class Central listing (search summary)](https://www.classcentral.com/index.php/course/youtube-fundamental-analysis-154584) |

**C. Small-business bookkeeping and taxes**

| # | Title | Channel | Views | Published | Length | Audience | Source |
|---|---|---|---|---|---|---|---|
| 13 | LLC vs Corporation for Small Business \| Inc. & LLC Taxes Explained | not observed | not observed | 2020-04-29 | not observed | SB owners | [YouTube](https://www.youtube.com/watch?v=bPCac4xdYz4) |
| 14 | How to File Small Business Taxes (Sole Prop, LLC, S Corp, C Corp) | not observed | not observed | 2026-01-14 | not observed | SB owners | [YouTube](https://www.youtube.com/watch?v=oEMwFgo2Hsw) |
| 15 | Small Business Tax Basics EXPLAINED for BEGINNERS, STARTUPS, and LLC | not observed | not observed | 2025-11-16 | not observed | new SB owners | [YouTube](https://www.youtube.com/watch?v=j-C12y65NBg) |
| 16 | Tax Differences EXPLAINED: LLC, S Corp, Partnership, Sole Prop | not observed | not observed | 2023-02-02 | not observed | SB owners | [YouTube](https://www.youtube.com/watch?v=D3Y1EEtb1cA) |
| 17 | Small Business Taxes for Beginners (LLCs and S-Corps explained for artists and creatives) | not observed | not observed | 2026-05-08 | not observed | creators, freelancers | [YouTube](https://www.youtube.com/watch?v=ofLAFCpoL4I) |
| 18 | LLC vs S-Corp Differences and Benefits Explained | not observed | not observed | 2025-08-14 | not observed | SB owners | [YouTube](https://www.youtube.com/watch?v=q89QmTAWl8w) |
| 19 | CPA EXPLAINS Tax Differences: LLC, S Corp, C Corp, Partnership, Sole Prop | not observed | not observed | 2023-10-12 | not observed | SB owners | [YouTube](https://www.youtube.com/watch?v=DqTZRNZngec) |
| 20 | How LLC Taxes Work (S Corp vs C Corp vs Sole Proprietor Explained) | not observed | not observed | 2026-01-13 | not observed | SB owners | [YouTube](https://www.youtube.com/watch?v=Z32iKgcUubY) |
| 21 | The Only Video You Need For LLC's And S-Corps | not observed | not observed | 2026-07-21 | not observed | SB owners | [YouTube](https://www.youtube.com/watch?v=vps_hbwNu0Q) |
| 22 | LLC: Taxes, Liability, and IRS Elections Made Simple | not observed | not observed | 2026-05-04 | not observed | SB owners | [YouTube](https://www.youtube.com/watch?v=dQQ8Ga6IHuo) |
| 23 | Easy BOOKKEEPING Steps for Beginners! (Quickbooks Online Tutorial 2025) | not observed | not observed | not observed | not observed | SB owners, new bookkeepers | [YouTube](https://www.youtube.com/watch?v=dRpHKba6pbg) |
| 24 | Quickbooks Bookkeeping Tutorial For Business Owners 2026 (Step-By-Step) | not observed | not observed | not observed | not observed | SB owners | [YouTube](https://www.youtube.com/watch?v=0kiqmm6BeIw) |
| 25 | QuickBooks Online: Full Tutorial for Beginners | not observed | not observed | not observed | not observed | SB owners | [YouTube](https://m.youtube.com/watch?v=VpU0N3Y6xXs) |
| 26 | How To Do Bookkeeping With QuickBooks Online | not observed | not observed | not observed | not observed | SB owners | [YouTube](https://m.youtube.com/watch?v=5MLjvpUsuwM) |
| 27 | Learn 80% of QuickBooks in under 30 minutes! | not observed | not observed | not observed | <30 min (per title) | SB owners | [YouTube](https://m.youtube.com/watch?v=pGMmwt7GRns) |
| 28 | How to do a full month of bookkeeping in QBO {full tutorial} | not observed | not observed | not observed | not observed | bookkeepers | [YouTube](https://m.youtube.com/watch?v=ewI_X5M_Awg) |

**D. CPA exam**

| # | Title | Channel | Views | Published | Length | Audience | Source |
|---|---|---|---|---|---|---|---|
| 29 | How To Pass The CPA Exam: Study Tips and Schedule (Mike Potenza, national instructor) | not observed | not observed | Jan 2024 | not observed | CPA candidates | [YouTube](https://www.youtube.com/watch?v=7G-wZCs3Huk) |
| 30 | How to Pass the CPA Exam While Working Full Time \| 5 Tips for Efficient Planning & Studying | not observed | not observed | Apr 2021 | not observed | working candidates | [YouTube](https://www.youtube.com/watch?v=Rq8ZkGzZbMc) |
| 31 | How I Passed All 4 Parts of the CPA Exam In 5 Months: Tips, Study Schedule + Template, Results | not observed | not observed | Jul 2022 | not observed | candidates | [YouTube](https://www.youtube.com/watch?v=CHFzrlUDqm8) |
| 32 | Best CPA Study Strategies: How to Pass the CPA Exam | not observed | not observed | Mar 2026 | not observed | candidates | [YouTube](https://www.youtube.com/watch?v=17a1BFFLRQc) |
| 33 | How To Study For The CPA Exam | not observed | not observed | not observed | not observed | candidates | [YouTube](https://www.youtube.com/watch?v=_yETQvFlkxI) |
| 34 | The 5 Critical CPA Exam Study Strategies You Need to Be Doing | SuperfastCPA (podcast episode, per summary) | not observed | Sep 2024 | not observed | candidates | [YouTube](https://www.youtube.com/watch?v=NI2dO3D4VtM) |
| 35 | How I Passed the CPA Exam in Six Weeks | not observed | not observed | not observed | not observed | candidates | [YouTube](https://www.youtube.com/watch?v=PHm49R8kYTE) |

**E. "What is AI" / AI explainers**

| # | Title | Channel | Views | Published | Length | Audience | Source |
|---|---|---|---|---|---|---|---|
| 36 | Artificial Intelligence In 10 Minutes \| What Is Artificial Intelligence? \| AI Explained \| Simplilearn | Simplilearn | not observed | not observed | ~10 min (per title) | beginners | [YouTube](https://www.youtube.com/watch?v=cW9shEB8h5E) |
| 37 | Generative AI in a Nutshell - how to survive and thrive in the age of AI (full-day course in 18 min) | not observed in results (see Gaps) | not observed | not observed | ~18 min (per summary) | general professionals | [YouTube](https://www.youtube.com/watch?v=2IK3DFHRFfw) |
| 38 | Generative AI Explained In 5 Minutes \| What Is GenAI? | not observed | not observed | not observed | ~5 min | beginners | [YouTube](https://www.youtube.com/watch?v=NRmAXDWJVnU) |
| 39 | What Is Generative AI? \| Explained for Beginners | not observed | not observed | not observed | not observed | beginners | [YouTube](https://www.youtube.com/watch?v=oaaaLtrG36Y) |
| 40 | Generative AI explained in 2 minutes | not observed | not observed | not observed | ~2 min (short-form, a benchmark only) | beginners | [YouTube](https://m.youtube.com/watch?v=rwF-X5STYks) |

**F. AI for business/accounting/finance (Excel, ChatGPT, Claude, Copilot)**

| # | Title | Channel | Views | Published | Length | Audience | Source |
|---|---|---|---|---|---|---|---|
| 41 | 10X Excel Skills with ChatGPT AI \| Excel Tutorial | not observed | not observed | 2025-01-26 | not observed | office workers | [YouTube](https://www.youtube.com/watch?v=OGLPxZ2YfUg) |
| 42 | How to Use ChatGPT in Excel (Full Beginner Tutorial) | not observed | not observed | 2026-06-08 | not observed | office workers | [YouTube](https://www.youtube.com/watch?v=w-Oj6wIm4IQ) |
| 43 | How to Use ChatGPT with Excel for Macros & Formulas! | not observed | not observed | 2024-06-24 | not observed | Excel users | [YouTube](https://www.youtube.com/watch?v=qMcL_U77BzI) |
| 44 | How to Integrate ChatGPT into Excel (Easy Integration) | not observed | not observed | 2023-07-24 | not observed | Excel users | [YouTube](https://www.youtube.com/watch?v=u_sGPfM_qzs) |
| 45 | ChatGPT For Excel: Tips & Tricks to 10X Your Productivity | not observed | not observed | 2024-01-16 | not observed | office workers | [YouTube](https://www.youtube.com/watch?v=UdlnPB78stE) |
| 46 | Bring ChatGPT INSIDE Excel to Solve ANY Problem Lightning FAST | Leila Gharani | not observed | not observed (LinkedIn post ~early 2023) | not observed | Excel users | [LinkedIn post](https://www.linkedin.com/posts/leilagharani_bring-chatgpt-inside-excel-to-solve-any-problem-activity-7028398104521379840-r44x) |
| 47 | Can ChatGPT Properly Solve Your Complex Excel Spreadsheet Problems? | Leila Gharani | not observed | not observed (~Jan 2023) | not observed | Excel users | [LinkedIn post](https://mt.linkedin.com/posts/leilagharani_how-chatgpt-can-help-with-your-complex-excel-activity-7019278761342742528-uQ2W) |
| 48 | Don't Use ChatGPT Until You Watch This Video | Leila Gharani | not observed | not observed (~Sep 2023) | not observed | general professionals | [LinkedIn post](https://www.linkedin.com/posts/leilagharani_dont-use-chatgpt-until-you-watch-this-video-activity-7110594424732024833-ZHPk) |
| 49 | 10 ChatGPT Life Hacks — That'll Change How You Work | Jeff Su | not observed ("one of the most-watched AI productivity videos", per a secondary profile) | not observed | not observed | corporate knowledge workers | [Automation Atlas profile](https://automationatlas.io/creators/jeff-su/) |
| 50 | ChatGPT Tutorial for Beginners: How to Actually Get Work Done with AI | Kevin Stratvert | not observed | 2026-07-01 (blog post date) | not observed | beginners, office workers | [kevinstratvert.com](https://kevinstratvert.com/2026/07/01/chatgpt-tutorial-for-beginners-how-to-actually-get-work-done-with-ai/) |
| 51 | ChatGPT Work Tutorial for Beginners | Kevin Stratvert | not observed | 2026-08-27 (blog post date) | not observed | office workers | [kevinstratvert.com](https://kevinstratvert.com/2026/08/27/chatgpt-work-tutorial-for-beginners/) |
| 52 | Copilot in Excel - The ULTIMATE 2026 Tutorial for Busy Professionals | not observed | not observed | 2025-12-10 | not observed | professionals | [YouTube](https://www.youtube.com/watch?v=LmHyfkSTYRI) |
| 53 | How to Use Copilot in Excel: Full Tutorial 2026 | not observed | not observed | 2026-06-18 | not observed | Excel users | [YouTube](https://www.youtube.com/watch?v=gJnMV75Bxhk) |
| 54 | How to Use Copilot in Excel: Full Tutorial (2025) | not observed | not observed | 2025-10-07 | not observed | Excel users | [YouTube](https://www.youtube.com/watch?v=z8L2w5utx-M) |
| 55 | Copilot in Excel Just Changed Finance Forever (Tutorial) | not observed | not observed | 2026-06-03 | not observed | finance pros | [YouTube](https://www.youtube.com/watch?v=j_4At6WIPh8) |
| 56 | How to use Copilot in Excel - The Complete Beginners Course | not observed | not observed | 2025-11-24 | not observed | beginners | [YouTube](https://www.youtube.com/watch?v=tOYbdpfRYkM) |
| 57 | Claude Built a Wall Street–Level Financial Model in Excel in 10 Minutes! | not observed | not observed | Feb 2026 | not observed | finance pros | [YouTube](https://www.youtube.com/watch?v=DlhRdwZ5XEc) |
| 58 | Claude + Excel Just Changed Accounting Forever! (Tutorial) (builds a P&L and balance sheet from company data) | not observed | not observed | not observed | not observed | accountants | [YouTube](https://www.youtube.com/watch?v=iUw2CeiIudE) |
| 59 | Claude for Finance Just Leveled Up: Excel Plugins, Flux Analysis & AI Coworkers | not observed | not observed | Mar 2026 | not observed | FP&A, accountants | [YouTube](https://www.youtube.com/watch?v=40p2i7VUKGM) |
| 60 | I Built a Complete AI Finance Team With Claude (Full Tutorial) | not observed | not observed | Jul 2026 | not observed | finance pros, SB owners | [YouTube](https://www.youtube.com/watch?v=W_FVT5JvEDM) |
| 61 | Build Financial Statements from a Journal in Excel Using Claude AI | not observed | not observed | not observed | not observed | accountants, students | [YouTube](https://www.youtube.com/watch?v=hrdlzpZJQ9Q) |
| 62 | I Spent Hours Testing Claude for Excel (Here's the 80% You Need in 11 min) | not observed | not observed | not observed | ~11 min (per title) | Excel users | [YouTube](https://www.youtube.com/watch?v=A497pr1bcyw) |
| 63 | ChatGPT for Accountants 101 & Practical Examples | Hector Garcia, CPA (per summary) | not observed | not observed | not observed | accountants | [YouTube](https://www.youtube.com/watch?v=JVoTQXxma6Q) |
| 64 | ChatGPT for Accountants (with Use Cases) | not observed | not observed | not observed | not observed | accountants | [YouTube](https://www.youtube.com/watch?v=CFAMh7NMqgo) |
| 65 | A ChatGPT Guide for Accounting Firms (2025) | not observed | not observed | 2025 (per title) | not observed | tax and bookkeeping firm owners | [YouTube](https://www.youtube.com/watch?v=JbZjCQowd9Q) |
| 66 | ChatGPT Practice in Accounting: Custom Chart of Accounts Creation | not observed | not observed | not observed | not observed | bookkeepers | [YouTube](https://www.youtube.com/watch?v=6K4yxcy8l2M) |

Other finding:
- Microsoft published "Copilot in Excel: Built for the era of Frontier Finance" on 2026-06-25, which shows the vendor is pushing Excel AI for finance teams in mid-2026. — [Microsoft 365 Blog](https://www.microsoft.com/en-us/microsoft-365/blog/2026/06/25/copilot-in-excel-built-for-the-era-of-frontier-finance/)

### Inferences
- Recency: in the AI-for-finance cluster, most results the search engine surfaced were published from late 2025 to mid-2026. Claude for Excel videos cluster in Feb–Jul 2026 and Copilot in Excel videos in Oct 2025–Jun 2026. The newest ChatGPT-for-Excel videos are also recent (2026-06-08). This suggests heavy creator supply, and probably demand, around "AI inside Excel for finance" in 2026. Without view data, "fastest-growing" is **not established**.
- LLC and S-corp tax videos keep appearing in 2025–2026 (7 of 10 results were dated 2025-08 or later). A steady stream of new videos on one question usually means the demand is evergreen. That is an inference, not a view-based finding.

### Gaps
- **No per-video view counts** for any cluster, so I could not rank videos or measure growth velocity. Fix: query the YouTube Data API (`videos.list` with `part=statistics,contentDetails,snippet`) for the IDs above, or collect the counts manually in a browser.
- Lengths and channel names are missing for most rows because the result titles did not include them.
- The candidate list comes from search-engine relevance, not a view ranking. Well-known high-view videos that did not surface may be missing, for example The Organic Chemistry Tutor's accounting playlist uploads and Edspira's most-viewed uploads.
- The "Generative AI in a Nutshell" video (2IK3DFHRFfw) is, from memory, by Henrik Kniberg. Search did not confirm this, so it is not asserted in the table.

---

## 2. Which channels dominate each cluster? Subscriber counts where visible

### Takeaway
Only channel-level figures were visible, all taken from search summaries of third-party stat sites and with no data date given. In accounting basics, Accounting Stuff (about 1.05M subscribers) and Edspira (about 372K) lead, and Farhat Lectures (about 260K) covers CPA exam prep. For AI productivity, Jeff Su (1.2M to 1.68M, sources conflict) and Kevin Stratvert (5.85M across platforms) are large. Futurepedia figures conflict (180K to 670K).

### Cited Findings
- **Accounting Stuff** (James, ex-Big 4 accountant, posting since 2018; audience of bookkeepers, students and small-business owners): 1,050,000 subscribers, 274 videos, 45.3M total views. Data date not stated. — [SPEAKRJ / Social Blade via search summary](https://www.speakrj.com/audit/report/accountingstuff/youtube); [channel](https://www.youtube.com/@AccountingStuff)
- **Edspira** (Michael McLaughlin, PhD, CPA): 372,000 subscribers, 1,228 videos, 67.5M total views. Another source says "over 340,000 subscribers and 600,000 monthly views" and calls it the "number one YouTube channel for accounting education". — [SPEAKRJ via search summary](https://www.speakrj.com/audit/report/edspira/youtube); [edspira.com](https://www.edspira.com/)
- **Farhat Lectures** (CPA, CMA and EA exam prep plus college accounting): 260,000 subscribers, over 13M total views, over 2,200 videos, about 6 uploads a week. — [vidIQ / Social Blade via search summary](https://vidiq.com/youtube-stats/channel/UCOYjmNfEFcUPDgihxwSSReA/)
- **The Organic Chemistry Tutor**: about 10M subscribers and about 2B total views. It is mainly a STEM channel. Search found a roughly 30-minute "Fundamental Analysis" video but did not confirm its accounting-video views. — [CreatorDB / vidIQ via search summary](https://creatordb.app/creatorstats/the-organic-chemistry-tutor/)
- **Jeff Su** (former Googler; corporate knowledge-worker audience; AI productivity with ChatGPT, Gemini and Notion): about 1.2M subscribers by Dec 2025 per one profile, "around 1.68 million" per the same summary citing more recent data. Jeff Su's own LinkedIn post announced reaching 1M. — [Automation Atlas](https://automationatlas.io/creators/jeff-su/); [LinkedIn](https://www.linkedin.com/posts/jsu05_youtube-activity-7307385291906920448-GEuV)
- **Kevin Stratvert**: "over 5.85 million subscribers and 30 million views monthly" across YouTube, Instagram, TikTok, X and Facebook combined, not YouTube alone. — [kevinstratvert.com via search summary](https://kevinstratvert.com/2026/08/27/chatgpt-work-tutorial-for-beginners/)
- **Futurepedia**: conflicting figures. One summary says 670K subscribers, 166 videos, 38M total views and about 23.9K average views per video. Another says 180K+. A third says 2M+ across its network of channels. — [developereducators.com](https://developereducators.com/channel/futurepedia_io/); [futurepedia.io](https://www.futurepedia.io/about-us)
- **Leila Gharani**: made several ChatGPT-in-Excel videos in 2023 (see rows 46–48). No subscriber count was visible. — [SPEAKRJ listing (blocked)](https://www.speakrj.com/audit/report/UCJtUOos_MwJa_Ewii-R3cJA/youtube)
- **Simplilearn**: its "Artificial Intelligence In 10 Minutes" video surfaced for "what is AI". No subscriber count was visible. — [YouTube](https://www.youtube.com/watch?v=cW9shEB8h5E)
- **CPA exam channels named in results**: Universal CPA Review ("#1 Course for Visual Learners"; posts MCQ and simulation explanation videos) and SuperfastCPA (podcast-style strategy episodes). — [Universal CPA](https://www.universalcpareview.com/ask-joey/best-youtube-channel-for-cpa-exam-help/); [YouTube](https://www.youtube.com/watch?v=NI2dO3D4VtM)
- **AI for accountants**: Hector Garcia, CPA, makes "ChatGPT for Accountants 101" and "Advanced ChatGPT Concepts for Accountants". — [YouTube](https://www.youtube.com/watch?v=JVoTQXxma6Q)

### Inferences
- Of the named accounting channels, Accounting Stuff has the most views per video: about 45.3M over 274 videos, or roughly 165K per video. Edspira averages about 55K and Farhat about 6K, derived from the cited totals. So Accounting Stuff's approach (fewer videos, beginner-friendly visuals) earns far more views per video than lecture libraries. The totals were not seen first-hand and have no data date, so treat these as approximate.

### Gaps
- No subscriber counts were visible for Leila Gharani, Tiago Forte, Simplilearn, the small-business tax channels (their names did not appear in results), the Copilot and Claude tutorial creators, or Universal CPA and SuperfastCPA.
- Social Blade, vidIQ and Playboard were all blocked, so none of the figures above could be checked against a primary source or dated.

---

## 3. What title patterns and question formats recur among the top performers?

### Takeaway
I could only analyze patterns across the titles that surfaced, not across videos confirmed as top performers. Recurring formulas: "for Beginners" or "for Dummies", an explicit time promise ("in 8 MINS", "in 10 Minutes", "80% in 11 min"), versus comparisons ("LLC vs S-Corp"), "EXPLAINED" or "CPA EXPLAINS" for authority, year stamps ("2025", "2026"), and hyperbolic change claims ("Just Changed Finance/Accounting Forever").

### Cited Findings
- Beginner framing: "Accounting for Beginners #1", "ACCOUNTING BASICS for Beginners", "Learn How To Read Financial Statements for Dummies", "Small Business Tax Basics EXPLAINED for BEGINNERS", "How to Use ChatGPT in Excel (Full Beginner Tutorial)". — [1](https://www.youtube.com/watch?v=_pTU4gwmcMs), [2](https://www.youtube.com/watch?v=NodZcLvH4l0), [3](https://www.youtube.com/watch?v=j-C12y65NBg), [4](https://www.youtube.com/watch?v=w-Oj6wIm4IQ)
- Time-boxed promise: "FINANCIAL STATEMENTS: all the basics in 8 MINS!", "How To Read Financial Statements In 9 Minutes!!", "Artificial Intelligence In 10 Minutes", "Learn 80% of QuickBooks in under 30 minutes!", "Here's the 80% You Need in 11 min", "Wall Street–Level Financial Model in Excel in 10 Minutes!". — [1](https://www.youtube.com/watch?v=Fi1wkUczuyk), [2](https://www.youtube.com/watch?v=fb7YCVR5fIU), [3](https://www.youtube.com/watch?v=cW9shEB8h5E), [4](https://m.youtube.com/watch?v=pGMmwt7GRns), [5](https://www.youtube.com/watch?v=A497pr1bcyw), [6](https://www.youtube.com/watch?v=DlhRdwZ5XEc)
- Comparison and choice: "LLC vs S-Corp", "LLC vs Corporation", "Tax Differences: LLC, S Corp, Partnership, Sole Prop". — [1](https://www.youtube.com/watch?v=q89QmTAWl8w), [2](https://www.youtube.com/watch?v=bPCac4xdYz4), [3](https://www.youtube.com/watch?v=D3Y1EEtb1cA)
- "The only video you need" or completeness claims: "The Only Video You Need For LLC's And S-Corps", "Complete Beginners Course", "ULTIMATE 2026 Tutorial". — [1](https://www.youtube.com/watch?v=vps_hbwNu0Q), [2](https://www.youtube.com/watch?v=tOYbdpfRYkM), [3](https://www.youtube.com/watch?v=LmHyfkSTYRI)
- Personal-proof story ("How I…"): "How I Passed All 4 Parts of the CPA Exam In 5 Months", "How I Passed the CPA Exam in Six Weeks", "I Built a Complete AI Finance Team With Claude". — [1](https://www.youtube.com/watch?v=CHFzrlUDqm8), [2](https://www.youtube.com/watch?v=PHm49R8kYTE), [3](https://www.youtube.com/watch?v=W_FVT5JvEDM)
- "Changed … Forever" hype, specific to AI: "Copilot in Excel Just Changed Finance Forever", "Claude + Excel Just Changed Accounting Forever!". — [1](https://www.youtube.com/watch?v=j_4At6WIPh8), [2](https://www.youtube.com/watch?v=iUw2CeiIudE)
- Productivity multiplier: "10X Excel Skills with ChatGPT", "10X Your Productivity", "10 ChatGPT Life Hacks". — [1](https://www.youtube.com/watch?v=OGLPxZ2YfUg), [2](https://www.youtube.com/watch?v=UdlnPB78stE), [Automation Atlas](https://automationatlas.io/creators/jeff-su/)
- Warning hook: "Don't Use ChatGPT Until You Watch This Video" (Leila Gharani). — [LinkedIn](https://www.linkedin.com/posts/leilagharani_dont-use-chatgpt-until-you-watch-this-video-activity-7110594424732024833-ZHPk)
- A secondary profile says Jeff Su's "10 ChatGPT Life Hacks" worked because it showed specific corporate use cases: meeting transcripts turned into action items, emails drafted in your own voice, and Excel formulas from natural language. — [Automation Atlas](https://automationatlas.io/creators/jeff-su/)

### Inferences
- The recurring question formats are "What is X?", "How to read X", "X vs Y (which should I choose?)", "How do I pass X?" and "How do I use [AI tool] in Excel for [task]?". These map directly to 30–60 second lesson hooks. This is based on how often the patterns appear, not on views.

### Gaps
- Without view counts I cannot tell which patterns actually outperform. Pattern frequency is not the same as performance.

---

## 4. Which subtopics inside the long-form videos (chapters) look like natural 30–60 second lessons?

### Takeaway
I could not read chapter lists, because video pages and summary sites were blocked. The subtopics below come from the content descriptions in search summaries and from the titles. Each is a single concept that fits a short lesson.

### Cited Findings
- Debits and credits rules, the accounting equation (Assets = Liabilities + Equity) and double-entry basics are the core of "Accounting for Beginners #1". — [teracourses summary](https://teracourses.com/en/lesson/accounting-fundamentals-course6-lesson1); [YouTube](https://www.youtube.com/watch?v=_pTU4gwmcMs)
- The Accounting Stuff basics playlist covers the Accounting Equation, T Accounts, and Debits and Credits. — [channel description via search](https://www.youtube.com/@AccountingStuff)
- Financial-statement videos split into three units: income statement, balance sheet and cash flow statement. — [YouTube](https://www.youtube.com/watch?v=e8qbynFb4Zc); [YouTube](https://www.youtube.com/watch?v=mnJDA3YXL9g)
- Small-business tax videos split by entity type (sole prop, LLC, S corp, C corp, partnership) and by IRS elections. — [YouTube](https://www.youtube.com/watch?v=oEMwFgo2Hsw); [YouTube](https://www.youtube.com/watch?v=dQQ8Ga6IHuo)
- QuickBooks and bookkeeping videos cover a monthly bookkeeping routine (a full month in QBO) and the "80%" core features. — [YouTube](https://m.youtube.com/watch?v=ewI_X5M_Awg); [YouTube](https://m.youtube.com/watch?v=pGMmwt7GRns)
- CPA videos cover study schedules, studying while working full time, and MCQ and simulation explanations. — [YouTube](https://www.youtube.com/watch?v=Rq8ZkGzZbMc); [Universal CPA](https://www.universalcpareview.com/ask-joey/best-youtube-channel-for-cpa-exam-help/)
- AI-for-finance use cases in titles and summaries: building a P&L and balance sheet from company data, flux (variance) analysis, building financial statements from a journal, Excel formulas from natural language, macros, creating a custom chart of accounts, and turning meeting transcripts into action items. — [YouTube](https://www.youtube.com/watch?v=iUw2CeiIudE); [YouTube](https://www.youtube.com/watch?v=40p2i7VUKGM); [YouTube](https://www.youtube.com/watch?v=hrdlzpZJQ9Q); [YouTube](https://www.youtube.com/watch?v=qMcL_U77BzI); [YouTube](https://www.youtube.com/watch?v=6K4yxcy8l2M); [Automation Atlas](https://automationatlas.io/creators/jeff-su/)
- AI explainer subtopics: what generative AI is, and what it produces (text, images, video, music, code), with prompts and deepfakes among the covered concepts. — [YouTube](https://www.youtube.com/watch?v=KhpF1Y7f6-0); [YouTube](https://m.youtube.com/watch?v=rwF-X5STYks)

### Inferences
Candidate 30–60 second lesson topics. Each is one concept with one example. Write them originally; do not copy any video's content.
- Accounting: the accounting equation in one example; debits vs credits in one rule; what a T-account is; revenue vs profit; cash vs accrual; what a balance sheet shows; what an income statement shows; why cash flow differs from profit.
- Small business: sole prop vs LLC for taxes; what an S-corp election does; what a monthly bookkeeping routine includes; what a chart of accounts is.
- CPA: how the exam is structured; a study-while-working plan; how to approach a simulation question.
- AI basics: what AI is vs what generative AI is; what a prompt is; why AI "hallucinates" (the videos surfaced did not describe this, so it is my addition).
- AI at work: asking ChatGPT, Claude or Copilot to write an Excel formula; a flux or variance analysis prompt; turning a journal into statements; drafting a chart of accounts; reviewing AI output before trusting it.

### Gaps
- There is no chapter or timestamp data for any video. Fix: read `ytInitialData` or the description timestamps from each video page where YouTube is reachable.
- Growth velocity, views per day and subscriber data for the 2024–2026 videos all still need to be collected.
