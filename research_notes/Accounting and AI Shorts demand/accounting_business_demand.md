# Search demand for accounting basics, business basics, small-business finance and CPA-exam questions (YouTube / TikTok / Google, US, reference date 2026-09-28)

**Source access log (read this first).** Nearly all primary signal sources were blocked by the sandbox egress proxy on 2026-09-28. The WebSearch tool could not reach reddit.com at all.
- **BLOCKED (both curl and WebFetch):** suggestqueries.google.com (YouTube and Google autocomplete), www.reddit.com and old.reddit.com (HTML and JSON), ads.tiktok.com (Creative Center), www.tiktok.com, www.aicpa-cima.com, 300hours.com, www.keysearch.co, www.seopital.co and www.cpapracticeadvisor.com. WebSearch with `allowed_domains: reddit.com` returned "domains not accessible to our user agent".
- **READ IN FULL:** none. Every WebFetch attempt was blocked.
- **SEEN ONLY AS SEARCH-ENGINE SUMMARIES/SNIPPETS:** the WebSearch results cited below (Becker, ipassthecpaexam, UWorld, TaxBandits, OnPay, Avalara, TurboTax, TaxAct, IRS.gov/faqs, NerdWallet, KeySearch and others). A model summarised these results, so any figure attributed to them is unverified and should be checked before publishing.
- **Consequence:** these notes contain **no raw autocomplete suggestions and no Reddit thread titles or upvote counts**. None are made up. The spaces are marked as gaps, and a runnable collection method is given for a machine without the proxy.

## What do YouTube and Google autocomplete suggestions show for the seed terms (including alphabet-soup variants)?

### Takeaway
Autocomplete data could not be collected because suggestqueries.google.com is blocked in this sandbox. The only indirect evidence is which titles publishers use, from search result titles. Those titles repeat the same phrasings: "debits and credits explained", "…for small business owners", "how to pay yourself as an LLC / S-corp" and "owner's draw".

### Cited Findings
- Publishers wrote many 2026 articles titled around "debits and credits" for business owners. Examples: "Debit vs. credit: A guide to small business accounting" (Commerce Bank, 2026), "Debits and Credits Explained (2026): The Simple Guide for Small Business Owners" (Jupid), and "Debits and credits: A practical guide for business owners", which is syndicated CPA-firm content dated 2026/09 on at least two firm sites. These show where publishers are putting effort. They are not volume data. — [Commerce Bank](https://www.commercebank.com/business/trends-and-insights/2026/debit-vs-credit-a-guide-to-small-business-accounting); [Jupid](https://jupid.com/blog/debits-and-credits-explained-2026); [DPC Advisors, Sept 2026](https://www.dpc-advisors.com/2026/09/debits-and-credits-a-practical-guide-for-business-owners/); [E.S. Evans, Sept 2026](https://www.esevans.com/2026/09/debits-and-credits-a-practical-guide-for-business-owners/)
- Major publishers target the phrases "how to pay yourself as an LLC", "how to pay yourself as a business owner", "how to pay yourself with an LLC", "owners draw" and "how to pay yourself as an S-corp". The SBA also runs an event called "How to Pay Yourself as a Small Business Owner". — [NerdWallet LLC](https://www.nerdwallet.com/business/learn/how-to-pay-yourself-as-an-llc); [NerdWallet S-corp](https://www.nerdwallet.com/article/small-business/how-to-pay-yourself-as-an-s-corp); [Shopify](https://www.shopify.com/blog/how-to-pay-yourself-with-an-llc); [Motley Fool Ascent](https://www.fool.com/the-ascent/small-business/payroll/articles/owners-draw/); [SBA](https://www.sba.gov/event/81035)
- "EBITDA margin" and "EBITDA vs gross margin" are well covered by finance-education sites (WallStreetPrep, CFI, WallStreetMojo, Klipfolio). No volume figures were shown. — [WallStreetPrep](https://www.wallstreetprep.com/knowledge/ebitda-margin/); [CFI](https://corporatefinanceinstitute.com/resources/valuation/ebitda-margin/); [WallStreetMojo](https://www.wallstreetmojo.com/ebitda-margin/)

### Inferences
- The recurring title phrasings suggest search phrasing templates: "X explained", "X for small business owners", "X vs Y" (debit vs credit, cash vs accrual, EBITDA vs gross margin), "how to pay yourself as [entity]" and "[topic] 2026". Treat these as hypotheses until autocomplete is actually pulled.

### Gaps
- **No raw YouTube (ds=yt) or Google autocomplete suggestions were collected for any of the 21 seeds** ("what is accounting", "accounting basics", "debits and credits", "balance sheet", "income statement", "cash flow statement", "accrual vs cash", "depreciation", "bookkeeping for small business", "small business taxes", "llc taxes", "s corp", "how to pay yourself", "profit vs cash flow", "what is ebitda", "gross margin", "how to read financial statements", "cpa exam", "far cpa", "reg cpa", "quickbooks"). No alphabet-soup variants were collected either. Reason: suggestqueries.google.com was denied by the egress proxy with CONNECT 403, and WebFetch returned EGRESS_BLOCKED.
- To collect them on an unrestricted machine, run `for s in "accounting basics" ...; do for x in "" a b c ... z; do curl -s "https://suggestqueries.google.com/complete/search?client=firefox&ds=yt&hl=en&gl=us&q=$(printf %s "$s $x" | jq -sRr @uri)"; done; done`, then repeat without `ds=yt` for Google.

## What do published keyword studies or trend reports say about volume for these topics?

### Takeaway
No public source with dated monthly volumes for the educational seed terms was found (debits and credits, EBITDA, balance sheet and so on). Search engines only surface volume numbers for service-intent keywords aimed at accounting firms. Those numbers were seen as snippets without dates. TikTok Creative Center was blocked.

### Cited Findings
- "Tax Preparation Services": 18,100 searches per month (search-summary snippet; the article date and the tool behind the figure were not visible, and the page was not read). The attribution is unclear: the snippet came from a list of "SEO for accountants" results that included KeySearch, Seopital, NisonCo, TOA Global and CPA Site Solutions (2022). — [KeySearch accounting keywords](https://www.keysearch.co/top-keywords/accounting-keywords) / [Seopital](https://www.seopital.co/blog/seo-keywords-for-accountants) (unverified; fetch blocked)
- "Financial accounting advisory services": average 590 searches per month, keyword difficulty 31% (snippet only; source page and date unverified). — same result set as above
- "Certified bookkeeper near me" is described as the top bookkeeping-services keyword by intent and volume. No number was given. — [Seopital bookkeeping keywords](https://www.seopital.co/blog/seo-keywords-for-bookkeeping) (snippet only)
- TikTok context: one industry article says the audience for tax and money content on TikTok watches "eight hours of it a week", and puts the creator economy at "$205 billion". These come from a search summary of a CPA Practice Advisor piece dated 2026-02-19. The article itself was blocked, so the survey sponsor and methodology were not seen. Treat both numbers as unverified. — [CPA Practice Advisor, 2026-02-19](https://www.cpapracticeadvisor.com/2026/02/19/online-creators-worried-about-finances-and-income-taxes-a-growing-opportunity-for-tax-accounting-pros/178423/)
- TikTok has /discover landing pages for "accountant for content creators", "accountant for influencers" and "cpa", and /tag pages for #cpa and #cpas. Discover pages are usually created for recurring searches, so their existence points to real search activity. The counts could not be read. — [TikTok discover: accountant for content creators](https://www.tiktok.com/discover/accountant-for-content-creators); [TikTok discover: cpa](https://www.tiktok.com/discover/cpa?lang=en); [#cpa](https://www.tiktok.com/tag/cpa?lang=en)

### Inferences
- The "accountant for content creators / influencers" discover pages, together with the creator-tax coverage, suggest a TikTok niche in "taxes for creators / side hustlers". It overlaps with the small-business-owner audience.

### Gaps
- No verified monthly volumes for any educational seed term. The KeySearch, Seopital and similar pages were blocked, and the snippets did not include these terms.
- No Google Trends data. trends.google.com was not tried after the other Google endpoints were blocked, and it generally needs JS or an API.
- No TikTok Creative Center hashtag views or post counts: ads.tiktok.com was blocked.

## What questions recur most on Reddit (r/smallbusiness, r/Bookkeeping, r/Accounting, r/CPA, r/Entrepreneur, r/personalfinance)?

### Takeaway
Reddit could not be read in any form. old.reddit, the www JSON endpoints and WebSearch with reddit.com were all blocked, so no thread titles or upvote/comment counts were collected. Recurring themes can only be inferred from non-Reddit sources (below) and have to be marked as such.

### Cited Findings
- Owner-pay questions have strong enough demand that NerdWallet, Shopify, Motley Fool, ADP and the SBA all publish on them. The core content they repeat: single-member LLC owners pay themselves by owner's draw, with no W-2. Draws are subject to income and self-employment tax, and estimated quarterly taxes are needed. An LLC taxed as an S-corp or C-corp has to pay the owner a salary. — [NerdWallet](https://www.nerdwallet.com/business/learn/how-to-pay-yourself-as-an-llc); [Shopify](https://www.shopify.com/blog/how-to-pay-yourself-with-an-llc); [ADP self-employed payroll](https://www.adp.com/resources/articles-and-insights/articles/s/self-employed-payroll.aspx)
- The IRS has a dedicated page on "S corporation compensation and medical insurance issues" covering the reasonable salary rule, a common S-corp question. — [IRS](https://irs.gov/businesses/small-businesses-self-employed/s-corporation-compensation-and-medical-insurance-issues)
- CPA-candidate interest in "hardest section" and pass-rate content: nine or more prep-provider pages titled "CPA Exam Pass Rates 2026" or "hardest CPA exam section" came up. Snippet figures, all unverified: FAR 42.47% in Q2 2026, about 43% cumulative for 2026 and the lowest of any section; REG 66.87% in Q2 2026; AUD 49.38%; BAR 45.62%; ISC about 67%; TCP about 80%. — [UWorld (updated Q1 2026)](https://accounting.uworld.com/cpa-review/cpa-exam/pass-rates/); [Atlas CPA Index](https://atlascpaindex.com/study/pass-rates); [300hours](https://300hours.com/cpa-pass-rates/); [Andrew Katz Tutoring](https://andrewkatztutoring.com/hardest-cpa-exam-section-2026/)

### Inferences
- Likely recurring Reddit themes, based on publisher coverage and not on Reddit itself: how to pay myself (draw vs salary), when to elect S-corp and what counts as a reasonable salary, LLC taxes in the first year, quarterly estimated taxes, 1099 rules, QuickBooks vs alternatives, which CPA section to take first, and FAR difficulty. **This list is unverified against Reddit.**

### Gaps
- No Reddit thread titles, upvote counts or comment counts, for any subreddit. On an open machine, `https://www.reddit.com/r/<sub>/top.json?t=year&limit=100` (with a User-Agent) or old.reddit search would give them.

## Which topics are evergreen vs. seasonal, and what matters for Oct–Dec 2026?

### Takeaway
Oct–Dec 2026 has three strong seasonal hooks for small-business owners: the October 15 extension deadline, year-end tax planning, and the build-up to the January 15, 2027 Q4 estimated payment and early-2027 1099 filing. That filing season is the first under the new $2,000 1099-NEC/MISC threshold. For CPA candidates, the October 2026 discipline window (BAR/ISC/TCP) and its December score release are the hooks.

### Cited Findings
- 2026 estimated tax dates: Q1 April 15, 2026; Q2 June 15, 2026; Q3 September 15, 2026; Q4 January 15, 2027. — [TaxAct 2026 dates](https://blog.taxact.com/important-tax-dates-and-deadlines-2026/); [IRS estimated tax FAQ](https://www.irs.gov/faqs/estimated-tax); [Tavella Group](https://www.tavellagroup.com/insights/2026-estimated-tax-deadlines) (search summary)
- Extended individual returns for tax year 2025 are due October 15, 2026. That date is listed among the 2026 deadlines (Apr 15, Jun 15, Sep 15, Oct 15). — [ustax.tools](https://ustax.tools/tax-deadlines/) (search summary)
- 1099 threshold change (OBBBA §70433): the 1099-NEC/1099-MISC reporting threshold rises from $600 to $2,000 for payments made after December 31, 2025. It applies to forms filed in early 2027 and is indexed for inflation from 2027. Contractors still have to report income under $2,000. — [TaxBandits](https://www.taxbandits.com/irs-updates/form-1099-changes-2026/); [OnPay](https://onpay.com/insights/1099-reporting-threshold-updates/); [Avalara](https://www.avalara.com/blog/en/north-america/2025/07/one-big-beautiful-bill-act-1099-reporting-threshold.html); [TurboTax OBBBA 2026](https://turbotax.intuit.com/tax-tips/general/one-big-beautiful-bill-tax-changes-for-the-2026-tax-year/c4gkEcMW7)
- CPA exam: the Core sections (AUD, FAR, REG) can be taken year-round. The Discipline sections (BAR, ISC, TCP) are offered only in 2026 windows Jan 1–31, Apr 1–30, Jul 1–31 and Oct 1–31. Scores for the October window are reported for about December 16, 2026 (target date, subject to change). — [Becker](https://www.becker.com/cpa-review/cpa-exam-score-release-dates); [ipassthecpaexam](https://ipassthecpaexam.com/cpa-exam-testing-windows/); [AICPA](https://www.aicpa-cima.com/resources/article/find-out-when-youll-get-your-cpa-exam-score) (search summary only; AICPA page blocked). One snippet gave the April-window score date as "by May 1", which looks wrong because the window closes April 30. It conflicts with normal practice, so do not use it without checking.

### Inferences
- January 31, 2027 is a Sunday (checked with `date`), so the 1099-NEC recipient and IRS filing deadline for 2026 payments should move to **Monday, February 1, 2027**. This is inferred from the weekend rule. No IRS source for 2027 was read.
- October 15, 2026 falls on a Thursday and January 15, 2027 on a Friday (checked with `date`).
- Seasonal calendar for Oct–Dec 2026 content:
  - October: extension deadline (Oct 15), the CPA discipline window, and "should I elect S-corp for next year".
  - November: year-end tax moves and depreciation/Section 179 purchases before Dec 31. This follows standard practice; no 2026 source was read.
  - December: year-end close and bookkeeping clean-up, the Dec 16 CPA score release, and the new $2,000 1099 rule ahead of January filing.
  - Early January: Q4 estimated payment (Jan 15) and 1099s (Feb 1).
- Evergreen topics: debits and credits, the three financial statements, accrual vs cash, EBITDA and gross margin, profit vs cash flow, how to pay yourself, QuickBooks how-tos, and FAR study and "hardest section".

### Gaps
- IRS.gov 2027 filing-season pages were not read. Confirm the 1099 due date and any inflation-adjusted threshold for 2027 at irs.gov.
- The official AICPA/NASBA core-section score release targets for Oct–Dec 2026 were not verified (AICPA and 300hours were blocked).
- No Google Trends seasonality curves were retrieved for "estimated taxes", "1099" or "S corp election".
