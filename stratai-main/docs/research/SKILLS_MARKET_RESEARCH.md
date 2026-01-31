# Skills Market Research: AI Custom Instructions, Skills & Enterprise Governance

**Date:** 2026-01-31
**Research method:** Web search (Jan 2026 sources), training data synthesis (through May 2025), 7 parallel research agents
**Purpose:** Ground StratAI's Skills spec design in market reality

---

## Executive Summary

The AI skills/custom instructions market has evolved rapidly through 2025-2026. Key findings:

1. **Custom GPTs remain "deeply unreliable"** after 2 years — instruction drift confirmed as architectural, not user error
2. **Anthropic launched "Agent Skills"** (Oct 2025) — composable, portable instruction sets published as an open standard (Dec 2025)
3. **Microsoft Agent 365** sets the enterprise governance benchmark — agent registry, HITL controls, ownerless agent management
4. **Gemini Gems went free** — competitive pressure on paid custom instruction features
5. **Gartner predicts 40% of enterprise apps** will have AI agents by end of 2026 (from <5% in 2025)
6. **EU AI Act enforcement begins Aug 2, 2026** — creates urgent demand for audit trails, governance, transparency
7. **The market gap remains:** No platform combines governance + multi-model skills + hierarchical context + integrations

**StratAI's differentiation thesis holds:** Skills (methodology) + Integrations (data/action) + Context (organizational knowledge) = a combination nobody else offers.

---

## Table of Contents

1. [Competitor Landscape](#1-competitor-landscape)
2. [Professional Reviews & Media](#2-professional-reviews--media)
3. [Community Sentiment](#3-community-sentiment-reddithnforums)
4. [Enterprise Requirements](#4-enterprise-requirements)
5. [Market Trends & Data](#5-market-trends--data-2025-2026)
6. [Best Practices](#6-best-practices-cross-platform)
7. [Strategic Implications for StratAI](#7-strategic-implications-for-stratai)
8. [Skills + Integrations Convergence](#8-skills--integrations-convergence)
9. [Proposed Platform Skills Library](#9-proposed-platform-skills-library-28-skills)
10. [Sources](#10-sources)

---

## 1. Competitor Landscape

### Platform Comparison (as of Jan 2026)

| Platform | Feature Name | Strength | Weakness |
|---|---|---|---|
| **OpenAI** | Custom GPTs + Custom Instructions | GPT Store, Actions (API), shareability | Instruction drift, store spam, no memory, security 5/10 |
| **Anthropic** | Agent Skills (Oct 2025) + Projects | Composable, open standard, API, instruction fidelity | No integrations in Projects, no marketplace (partner directory only) |
| **Google** | Gems (free) | Free unlimited, Google Drive sync, ecosystem integration | No API, 10 file limit, no marketplace, memory struggles |
| **Microsoft** | Copilot Agents + Agent 365 | Enterprise governance, M365 integration, HITL controls | Complex setup, M365 lock-in, $30/user/month + licensing |
| **AWS** | Bedrock Agents/AgentCore | Multi-model, VPC deployment, guardrails | Developer-only, no end-user skill creation |

### Anthropic Agent Skills (Critical Competitive Development)

Launched October 16, 2025 with major update December 18, 2025:

- **Architecture:** Reusable instruction folders that Claude loads contextually when relevant
- **Composable:** Skills stack together automatically based on task relevance
- **Portable:** Same format across Claude apps, Claude Code, and API
- **API:** `/v1/skills` endpoint for programmatic management
- **Partners:** Box, Canva, Notion as launch partners in skills directory
- **Enterprise:** Organization-wide skill management — admins control enablement
- **Open Standard:** Published as cross-platform portable format (Dec 18, 2025) — first vendor to do this
- **Creation:** "skill-creator" skill for interactive skill building within Claude

**What Anthropic Skills lack:**
- No multi-model support (Claude only)
- No hierarchical context (skills are flat, context-free instruction sets)
- No organizational memory integration
- No approval workflows for sharing (admin toggle only)
- No integration with external tools within the skill itself

### Microsoft Agent 365 (Enterprise Governance Benchmark)

Announced at Ignite November 2025:

- **Agent Registry:** Central discovery, security, lifecycle management
- **Access Control:** Manage agent permissions and data access
- **Visualization:** Unified dashboards and advanced analytics
- **Interoperability:** MCP server visibility, multi-framework support
- **Security:** Microsoft Defender integration, Entra Agent ID
- **HITL Controls:** Require human approval at specific execution stages
- **Ownerless Agent Management:** Workflows when employees leave
- **DLP Policies:** Control what data flows to AI models
- **Pricing:** AI features transitioning to baseline M365 subscription (July 2026 price increase)

82% of organizations have already piloted or deployed M365 Copilot.

### Google Gemini Gems (Free Disruption)

- **Free for all Google users** — unlimited Gems, no subscription required
- **Google Drive sync** (launched Sep 2025) with Drive-style sharing permissions
- **8x larger context window** than Custom GPTs
- **Available inside Gmail, Docs, Sheets** without context switching
- **Gaps:** No marketplace, no API, only 10 files per Gem, long-term memory struggles

Competitive pressure: Switching from ChatGPT Plus to free Gems saves $240/year.

---

## 2. Professional Reviews & Media

### Custom GPTs: "Deeply Flawed" After 2 Years

A December 2025 Substack review ([futureofbeinghuman.com](https://www.futureofbeinghuman.com/p/revisiting-custom-gpts)) found:

> "Not a lot has changed in the past two years."

Key findings:
- **Retrieval remains unreliable** — OpenAI's RAG chunks documents, GPT only sees a fraction at any time
- **Accuracy vs. eloquence** — "Accuracy and usefulness flew right out the window" despite compelling responses
- **Still "deeply unreliable"** for knowledge-intensive tasks
- **No version control** for instruction updates
- **Opaque heuristics** — behavior changes based on subscription plan and model selection

The [Juma/Team-GPT review](https://juma.ai/blog/chatgpt-review) rated:
- Features: 8/10
- Integrations: 8/10
- Security: **5/10** — prone to data leaks and phishing

Business ROI is real for narrow use cases: some companies report 40% productivity gains for content creation, 60% reduction in onboarding time, 50% cost reduction in customer support.

### Instruction Drift: Confirmed as Architectural

The [OpenAI Developer Community](https://community.openai.com/t/chatgpt-2025-not-following-orders-custom-instructions-memory-updates/1116920) documents ongoing frustration. [OpenCraft AI analysis](https://resources.opencraftai.com/blog/why-chatgpt-keeps-ignoring-custom-instructions-and-what-actually-works) states:

> "ChatGPT keeps ignoring your custom instructions because it's designed that way, not because you're bad at prompting."

Instructions function as suggestions, not guarantees. The ChatGPT 5.2 update made it worse — model routing means users may talk to different underlying models with every prompt, making custom GPT "personality" feel inconsistent.

### Claude Projects: Winning on Fidelity

[After months of daily use](https://freshvanroot.com/blog/how-to-use-claude-projects/) (freshvanroot.com):
- Genuine productivity gains for recurring work (3-5+ times)
- Eliminates repetitive file uploads and re-prompting
- Good document retrieval with source file references
- Team transparency via shared conversations
- **Limitation:** No context between conversations (only instructions + files persist)
- **Limitation:** 200K token limit requires strategic document selection
- **Limitation:** Team plan migration friction

[Elephas comparison](https://elephas.app/blog/claude-projects-vs-chatgpt-projects) notes new 2026 Claude "Skills" feature described as "saved recipes" for digital labor.

### Comparative Review Consensus

| Aspect | Custom GPTs | Claude Projects/Skills | Gems | Copilot Agents |
|---|---|---|---|---|
| Instruction adherence | Moderate (degrades) | **Best** | Weakest | Good |
| Knowledge retrieval | Inconsistent (RAG) | Strong (in-context) | N/A | Inconsistent (SharePoint) |
| Ease of creation | Easy | Very easy | Easiest | Medium-Hard |
| Sharing | GPT Store + links | Team Projects | Drive-style (Sep 2025) | M365 Admin |
| Enterprise governance | Limited | Growing (Oct 2025+) | Minimal | **Strongest** |
| Integrations | Actions (API) | MCP (developer) | Google Workspace | Full M365 Graph |
| Price | $20/mo (Plus required) | $17-20/mo (Pro) | **Free** | $30/user/mo + M365 |

---

## 3. Community Sentiment (Reddit/HN/Forums)

### The Blunt Verdict

| Feature | Community Verdict | Sentiment |
|---|---|---|
| Custom GPTs | "System prompts with a UI. GPT Store is dead." | Negative |
| Custom Instructions | "Simple, useful, underpowered. Needs profiles/modes." | Mildly Positive |
| Claude Projects | "Best implementation. File handling works. No sharing." | Positive |
| GPT Store | "Spam wasteland. Abandonware." | Very Negative |
| Persistent Memory (ChatGPT) | "Promising but creepy and unreliable." | Mixed |
| Knowledge/File Upload RAG | "Works for simple lookups, fails for enterprise." | Negative |

### Top User Complaints (Ranked by Frequency)

1. **Instruction drift / "forgetting"** — The #1 complaint across every platform. GPTs forget persona after 5-10 exchanges. Now **worse** due to model routing in ChatGPT 5.2.
2. **No persistent memory across sessions** — "What's the point of a custom assistant that forgets everything every session?"
3. **Knowledge retrieval is unreliable** — "I don't know if it used my files or made it up"
4. **Character limits too short** — Still 1,500 chars for ChatGPT custom instructions
5. **No multiple instruction sets** — [Top feature request on OpenAI forums](https://community.openai.com/t/request-for-multiple-saved-custom-instructions/308574)
6. **Quality decline** — ChatGPT 5.2 "[overregulated downgrade](https://piunikaweb.com/2025/12/24/chatgpt-5-2-overregulated-downgrade-user-complaints/)" drove users to Claude/Gemini/Grok
7. **Security concerns** — Instructions can be extracted via prompt injection; [Juma rates security 5/10](https://juma.ai/blog/chatgpt-review)
8. **No sharing/collaboration** — "I built the perfect setup but can't share it with teammates"

### Top User Wishes (Ranked by Frequency)

1. **Persistent memory across conversations** — "I don't want to write instructions. I want it to learn by working with me."
2. **Context switching without friction** — "I want modes, not apps. Not three separate GPTs."
3. **Live integrations** — "I want it to query my Jira, read my Slack, check my calendar."
4. **Composable/layered instructions** — "Base personality + project context + task rules, stacked like middleware."
5. **Learning from corrections** — "I've told it 50 times and it still does it next conversation."
6. **Granular context control** — Sometimes full context, sometimes clean slate.
7. **Version-controlled instructions** — Track changes, rollback, collaborate on refining.
8. **Better instruction adherence** — "Stop being 'helpful' and just follow the rules."

### Key Community Insight

> "The best custom instruction is telling it what you ARE, not what it should BE."

User-context instructions ("I'm a senior backend engineer working on SvelteKit") ground responses better than persona instructions ("You are an expert who writes perfect code"). The theory: user-context grounds the model; persona instructions add a thin veneer that gets dropped.

### Adoption Reality

- **Custom GPTs:** ~60-70% of Plus subscribers tried them; only ~10-15% use regularly. Most use 1-3 at most.
- **Custom Instructions:** Higher sustained adoption, but most users set-and-forget. Many don't know the feature exists.
- **Claude Projects:** Higher satisfaction but lower awareness. Professional/developer users adopt at higher rates.

---

## 4. Enterprise Requirements

### Governance Is the Market Opportunity

No platform provides comprehensive enterprise governance for AI skills. The enterprise patterns:

| Industry | Governance Model | Pattern |
|---|---|---|
| **Financial services** | Centralized | Skills treated like code — versioned, reviewed, tested, deployed through pipeline |
| **Tech companies** | Federated | Teams build own skills, platform team provides templates/guardrails |
| **Consulting firms** | Federated + central library | Internal prompt libraries curated by methodology teams (McKinsey, BCG, Deloitte) |
| **Healthcare** | Centralized (extreme) | Legal/compliance sign-off required for all AI skills |

### The "Wild West" Pattern (Every Enterprise Hits This)

1. IT deploys AI tool
2. Power users create custom GPTs/instructions/skills
3. These proliferate without oversight
4. Quality varies wildly — some excellent, most mediocre
5. No one knows what's being used, by whom, or how well
6. Compliance team panics

### What Enterprise Buyers Demand (2026 Priority Stack)

1. **SSO/SCIM** — non-negotiable table stakes
2. **Audit logs** — increasingly with SIEM integration (Sentinel, Splunk)
3. **Data residency controls** — especially for EU under GDPR + AI Act
4. **DLP policies** — controlling what data flows to AI models
5. **Admin-controlled feature rollout** — skills/agents require admin approval
6. **Compliance APIs** — programmatic access for regulatory reporting
7. **Model choice** — multi-model support expected
8. **Custom data retention** — control how long AI interactions are stored
9. **Network-level access control** — IP allowlisting, VPN requirements
10. **Human oversight mechanisms** — required by EU AI Act for high-risk AI

### Quality Control Approaches

- **Eval suites:** Test cases for critical skills (input X → output contains Y, tone Z)
- **Human review:** SMEs review outputs periodically (required in regulated industries)
- **A/B comparison:** Run same input through skill v1 and v2, humans rate
- **Automated scoring:** "Judge" LLM scores outputs against criteria
- **Usage decay:** Dropping usage signals quality degradation
- **Drift detection:** Model updates can silently degrade skill quality

### Measured Enterprise ROI

| Domain | Metric | Source |
|---|---|---|
| Consulting | 20-40% time savings on document drafting | Multiple case studies |
| Customer support | 30-50% faster response times | Industry reports |
| Legal | 60-70% time savings on contract review | Specialized skill deployments |
| Engineering | 25-40% productivity gains | Coding assistant studies |
| Legal (Wordsmith) | 4-day bottlenecks → 4-minute workflows | Anthropic customer story |
| Data engineering (Matillion) | 40 hours → 1 hour for pipeline creation | Anthropic customer story |
| Content (North Highland) | Up to 5x faster creation and analysis | Anthropic customer story |

---

## 5. Market Trends & Data (2025-2026)

### Key Market Data Points

- **[Gartner](https://www.gartner.com/en/newsroom/press-releases/2025-08-26-gartner-predicts-40-percent-of-enterprise-apps-will-feature-task-specific-ai-agents-by-2026-up-from-less-than-5-percent-in-2025):** 40% of enterprise apps will have task-specific AI agents by end of 2026 (from <5% in 2025)
- **Market size:** Projected to surge from $7.8B to $52B by 2030
- **[Gartner inquiries](https://machinelearningmastery.com/7-agentic-ai-trends-to-watch-in-2026/):** 1,445% surge in multi-agent system inquiries (Q1 2024 → Q2 2025)
- **Enterprise readiness:** 75% of leaders prioritize security/compliance/auditability as most critical
- **Budget:** Half of executives plan to allocate $10-50M to secure agentic architectures
- **Hiring impact:** 64% of organizations already altered hiring approaches due to AI agents ([KPMG](https://kpmg.com/us/en/media/news/q4-ai-pulse.html))
- **Anthropic revenue:** $1B → $5B+ in 8 months (Sep 2025), $183B valuation at Series F
- **[Microsoft adoption](https://sharegate.com/blog/microsoft-365-just-got-smarter-what-ignite-2025-revealed-about-the-future-of-copilot-and-ai-agents):** 82% of organizations have piloted or deployed M365 Copilot

### Industry Trends

1. **"Skills" framing is winning** — Industry moving from "custom GPTs/bots" to "skills/agents"
2. **Context is the moat** — Platforms investing in context management see strongest retention
3. **Composability is the next frontier** — Skill chaining, conditional selection, inheritance, versioning
4. **Testing problem is unsolved** — No platform offers adequate skill testing/debugging (major opportunity)
5. **Transparency builds trust** — Users praise features showing what context AI used
6. **Curated beats marketplace** — GPT Store is the cautionary tale; every successful enterprise uses curation
7. **Integration > Intelligence** — Enterprises value data connection more than better AI
8. **Multi-model is the enterprise default** — Even Microsoft now uses Anthropic as a subprocessor
9. **Open standards emerging** — MCP (data connectivity) + Anthropic Skills (instruction portability)
10. **Governance = strategy** — "[Governance is not a box to check; it is the strategy](https://www.cncf.io/blog/2026/01/23/the-autonomous-enterprise-and-the-four-pillars-of-platform-control-2026-forecast/)"

### EU AI Act Timeline (Critical for Enterprise Sales)

| Date | Milestone |
|---|---|
| Feb 2, 2025 | Prohibitions + AI literacy requirements in effect |
| Aug 2, 2025 | GPAI model rules, governance, penalties in effect |
| **Aug 2, 2026** | **Most high-risk AI obligations enforceable** (the big deadline) |
| Aug 2, 2027 | Article 6(1) high-risk obligations fully apply |

**Enterprise impact:** AI used for employment decisions (hiring, performance monitoring) and education assessment = high-risk. Requires risk management, documentation, audit trails, human oversight, accuracy standards. StratAI's context transparency and audit features directly address these requirements.

---

## 6. Best Practices (Cross-Platform)

### What Makes Skills Work

1. **Focused and specific** — "Write LinkedIn posts for B2B SaaS targeting CTOs, 150-200 words" beats "be a marketing assistant"
2. **User context > AI persona** — Tell AI about the user, not about what it should "be"
3. **Structured with headers/sections** — Organized Role/Task/Format/Constraints/Examples
4. **Include examples** — Few-shot examples dramatically improve compliance
5. **One skill = one task** — Narrow skills outperform Swiss Army knife skills
6. **Positive over negative** — "Always respond in bullet points" beats "Never use paragraphs"
7. **Priority ordering** — Most important instructions first (LLMs exhibit primacy bias)
8. **Start minimal, iterate** — Treat like code: test, observe, refine

### What Makes Skills Fail

1. Overly broad scope ("be a helpful assistant for everything")
2. Complex conditional logic the model can't reliably follow
3. Contradictory instructions ("be concise" AND "be thorough")
4. Large document dumps without structure
5. No testing before deployment
6. No iteration/maintenance after creation
7. Assuming context only the creator understands
8. Static instructions never updated as models evolve

### Enterprise Governance Best Practices

1. **Centralized skill catalog** with metadata (owner, purpose, data sources, risk level, last reviewed)
2. **Tiered approval** — self-service for personal, manager for team, security review for org-wide
3. **Version control** — track changes, rollback capability, treat instructions like code
4. **Testing regimen** — test against standard queries before deployment
5. **Periodic review** — update as underlying models change
6. **Measurement** — track output quality metrics to detect drift
7. **Feedback loops** — users report issues, governance team investigates, skills updated
8. **Treat skills as IP** — they encode organizational knowledge and processes

---

## 7. Strategic Implications for StratAI

### Where We're Getting It Right

1. **User-owned, not Space-scoped** — Matches community desire for portable expertise
2. **Area-level activation** — Directly solves "I want modes, not apps"
3. **Hierarchical context** (Org > Space > Area) — Maps perfectly to enterprise skill scoping
4. **No marketplace** — Curated platform library + personal library is the right model
5. **Passive context injection** — Skills as persistent context, not invocable chatbots
6. **Size-based injection** — Full content for short skills (better adherence), tool-based for long
7. **Approval-based sharing (V2)** — Addresses the "Wild West" governance problem
8. **Context transparency** — Already in roadmap, universally praised by users and enterprise buyers
9. **Multi-model routing** — Aligned with market direction; unique advantage over Anthropic Skills (Claude-only)
10. **$29 price point** — Positioned above commodity ($10-15) and below enterprise ($50+)

### Where We Should Emphasize

1. **"Methodology as skill" positioning** — Frame skills as encoded expertise, not prompts
2. **Skills + Integrations convergence** — The combination nobody offers (see Section 8)
3. **Composability (V2+)** — Skill chaining and inheritance via our natural hierarchy
4. **Version control** — Treat skills like code for enterprise compliance
5. **Testing/preview** — Unsolved across industry; even basic "preview with sample input" differentiates
6. **Usage analytics** — Who uses which skills, how often, in what Areas
7. **EU AI Act readiness** — Position governance features as compliance enablers

### What We Should Avoid

1. **Don't build a marketplace** — GPT Store is universally mocked
2. **Don't over-promise instruction adherence** — Be transparent about LLM limitations
3. **Don't require elaborate setup** — If creation takes >2 minutes, adoption craters
4. **Don't make skills feel like "separate apps"** — Modes within one experience
5. **Don't ignore Anthropic's open standard** — Consider compatibility as a V2+ decision

### Competitive Positioning

| Capability | Anthropic Skills | Microsoft Agent 365 | StratAI Skills |
|---|---|---|---|
| Multi-model | Claude only | OpenAI + Anthropic | All models |
| Hierarchical context | Flat | Flat (M365 graph) | Org > Space > Area |
| Integrations | MCP (developer) | Full M365 | MCP-native (V2) |
| Governance | Admin enable/disable | Full lifecycle + DLP | Approval workflows (V2) |
| Skill + Integration + Context | No | Partial | **Full convergence** |
| Open standard | Yes (Dec 2025) | No | Compatible (future) |
| Price | $17-20/user | $30/user + M365 | $29/user |

---

## 8. Skills + Integrations Convergence

### The Unique StratAI Angle

The research reveals a clear market gap: **no platform combines skill methodology + live integrations + organizational context** in a single interaction. This is StratAI's strongest differentiation.

### The Pattern: Skill (How) + Integration (What) + Context (Why/Who)

| Component | Provides | Example |
|---|---|---|
| **Skill** | Methodology, quality standards, output format | "Financial Forecasting" skill |
| **Integration** | Live data, external actions | Xero read tool (actuals, GL data) |
| **Context** | Organizational knowledge, memory, decisions | Area pages (budget goals, previous forecasts) |

The three together produce outputs that are:
- **Methodologically sound** (skill governs approach)
- **Grounded in real data** (integration provides facts)
- **Contextually relevant** (Area knowledge personalizes)

### Example Workflows

**Proposal Email:**
- Skill: "Proposal Communication" (tone, structure, persuasion methodology)
- Context: Area pages (the actual proposal, client history, stakeholder info)
- Integration: Email send tool (compose and send)
- Result: A proposal email that matches your methodology, references your actual proposal content, and sends via your email system

**Financial Forecast:**
- Skill: "Financial Forecasting" (trend analysis approach, assumptions framework, output format)
- Integration: Xero read tool (pull actuals, GL data, historical trends)
- Context: Area memory (business goals, budget decisions, previous forecasts)
- Result: A forecast that understands your business, not just your numbers

**Contract Review:**
- Skill: "Contract Clause Risk Analyzer" (risk dimensions, severity criteria, counter-language patterns)
- Integration: Document storage tool (pull contract from system)
- Context: Area memory (previous contract decisions, company risk appetite, deal context)
- Result: Risk analysis that reflects your organization's standards and this deal's specific context

**Competitive Brief:**
- Skill: "Competitive Intelligence Brief" (Porter's framework, SWOT, actionable implications)
- Integration: CRM read tool (deal pipeline, win/loss data), web search
- Context: Space knowledge (product roadmap, pricing strategy, target market)
- Result: Intelligence that drives actual decisions, not generic analysis

### Why Competitors Can't Match This

- **Anthropic Skills:** Methodology only. No integrations (MCP is developer-only, not in Projects). No organizational context beyond uploaded files.
- **Microsoft Copilot:** Integrations only (M365). Instructions are generic agent prompts, not reusable methodology sets. No hierarchical context inheritance.
- **Custom GPTs:** Actions exist but instruction adherence is broken. No organizational memory. No context hierarchy.
- **Gemini Gems:** Free but shallow. No integrations beyond Google Workspace. No file upload. No enterprise governance.

### Architectural Implications

This convergence doesn't require new architecture — it emerges naturally from existing StratAI systems:
- Skills are already designed for system prompt injection
- Integrations architecture (MCP-native) is already planned
- Context hierarchy (Org > Space > Area) already provides the knowledge layer
- The AI's tool-calling pattern already supports invoking integrations mid-conversation

The key implementation note: skills should be able to **reference integration capabilities** in their instructions. E.g., a "Financial Forecasting" skill's content could include:

```
When asked to create a forecast:
1. Use available financial integration tools to pull current actuals
2. Reference Area context for business goals and previous forecast decisions
3. Apply trend analysis methodology: [methodology details]
4. Present findings in the standard forecast template: [template]
5. Offer to export or share the completed forecast
```

This means skills are aware of — but not dependent on — available integrations. A skill works without integrations (user provides data manually) but becomes dramatically more powerful with them.

---

## 9. Proposed Platform Skills Library (28 Skills)

Skills designed for the StratAI platform, organized by enterprise function. Each encodes a specific methodology, not generic assistance.

### Strategic Analysis & Decision-Making (4)

| # | Skill | Description | Benefit |
|---|---|---|---|
| 1 | **MECE Problem Decomposition** | McKinsey-style issue trees for logical completeness | Prevents incomplete analysis that misses root causes |
| 2 | **Pre-Mortem Risk Analysis** | Structured failure scenarios across operational, financial, reputational, regulatory, dependency dimensions | Catches blind spots before they become post-mortems |
| 3 | **Decision Journal & Options Matrix** | Auditable decision records with weighted criteria and explicit trade-offs | Replaces "we decided in a meeting" with traceable decisions |
| 4 | **Stakeholder Impact Mapping** | Maps stakeholders, assesses impact severity/sentiment, generates engagement plans | Addresses #1 reason change initiatives fail |

### Finance & Business Operations (4)

| # | Skill | Description | Benefit |
|---|---|---|---|
| 5 | **Variance Analysis Narrator** | Actuals vs. budget → executive-ready commentary with materiality thresholds | Eliminates hours of mechanical monthly writing |
| 6 | **Business Case Builder (Stage-Gate)** | Progressive business case with explicit assumptions, NPV/IRR framing, sensitivity ranges | Forces intellectual honesty over advocacy |
| 7 | **SLA & KPI Definition Workshop** | SMART metrics, baselines, statistical targets, escalation thresholds | Fixes endemic poor metric definition |
| 8 | **Procurement Scope & Evaluation** | RFP scoping with defensible scoring methodology and vendor comparison framework | Ensures fair, auditable procurement |

### Product & Engineering (4)

| # | Skill | Description | Benefit |
|---|---|---|---|
| 9 | **PRD from Problem Statement** | Problem → structured PRD with MoSCoW, JTBD, acceptance criteria, scope boundaries | Closes the gap between "we need X" and a well-structured PRD |
| 10 | **Architecture Decision Record** | Nygard-format ADRs with trade-off analysis linking to quality attributes | Makes creating ADRs faster than skipping them |
| 11 | **Incident Post-Mortem (Blameless)** | SRE-methodology with systems thinking, pattern detection across incidents | Prevents "be more careful" action items |
| 12 | **API Contract Review** | REST/GraphQL design review against best practices with severity-ranked findings | Applies specialist knowledge to every review |

### People & Organizational (4)

| # | Skill | Description | Benefit |
|---|---|---|---|
| 13 | **Competency-Based Interview Kit** | STAR questions + scoring rubrics with behavioral indicators from role description | Dramatically improves hiring consistency, reduces bias |
| 14 | **Performance Review Calibration** | Calibrates reviews for specificity, bias, rating alignment, development balance | Front-loads quality that HR spends weeks calibrating |
| 15 | **Role Architecture & Job Design** | Structured role design with RACI, adjacent role distinction, leveling criteria | Prevents overlapping accountability and capability mismatches |
| 16 | **Change Readiness Assessment** | Prosci ADKAR assessment with gap identification and intervention plan | Surfaces resistance and intervention needs before change begins |

### Legal, Compliance & Governance (3)

| # | Skill | Description | Benefit |
|---|---|---|---|
| 17 | **Contract Clause Risk Analyzer** | Risk-ranked clause review across liability, indemnification, termination, IP, data, SLA dimensions | Triages contracts so lawyers focus on genuinely risky clauses |
| 18 | **Regulatory Impact Assessment** | Maps applicable regulatory frameworks, identifies gaps, prioritizes remediation | Surfaces obligations before violations occur |
| 19 | **Policy Drafting (Enterprise Standard)** | Must/should/may language with plain-language principles, enforcement mechanisms, review cadence | Balances legal defensibility with actual readability |

### Communication & Reporting (4)

| # | Skill | Description | Benefit |
|---|---|---|---|
| 20 | **Executive Briefing (Pyramid Principle)** | Minto pyramid restructuring with "so what?" test at every level | Applies consulting-firm communication methodology |
| 21 | **Board & Committee Report Formatter** | Governance-standard format with RAG status, decisions required, risk callouts | Enforces format governance bodies need |
| 22 | **Cross-Functional Status Synthesizer** | Multi-team → unified program report with dependency mapping and escalation identification | Eliminates hours of weekly status collection |
| 23 | **QBR Structurer** | Quarterly Business Review best-practice structure with root cause analysis for misses | Enforces consistent, thorough quarterly reporting |

### Research, Analysis & Knowledge Work (5)

| # | Skill | Description | Benefit |
|---|---|---|---|
| 24 | **Competitive Intelligence Brief** | Porter's + SWOT → actionable competitive intelligence with implications by function | Produces actionable intelligence, not data dumps |
| 25 | **Root Cause Analysis (Ishikawa + 5 Whys)** | 6M fishbone + iterative drilling with corrective vs. preventive actions distinguished | Prevents treating symptoms instead of causes |
| 26 | **Literature & Research Synthesis** | Multi-source synthesis identifying consensus, disagreement, evidence quality, knowledge gaps | Produces genuine insight, not concatenated summaries |
| 27 | **Process Mapping & Optimization** | Lean/Six Sigma current-state analysis with waste identification, bottleneck analysis, improvement roadmap | Provides rigorous prerequisite for meaningful optimization |
| 28 | **Lessons Learned Facilitator** | US Army AAR format with enforced specificity and transferable knowledge artifacts | Makes lessons genuinely transferable, not vague platitudes |

### Design Notes for Implementation

- **Composability:** Several skills chain naturally (Pre-Mortem → Decision Journal, PRD → Stakeholder Mapping)
- **Context is the differentiator:** Each skill becomes dramatically more valuable with Area context
- **Calibration over generation:** Skills like Performance Review Calibration and Contract Risk Analyzer work best reviewing existing content
- **Industry customization (V2):** Core 28 are industry-agnostic; industry-specific regulatory/compliance configurations are a natural extension

---

## 10. Sources

### Live Web Sources (Jan 2026)

- [Is ChatGPT Plus Worth It in 2026?](https://www.glbgpt.com/hub/is-chatgpt-plus-worth-it-in-2025-my-honest-review-after-one-year-of-use/) — glbgpt.com
- [Revisiting Custom GPTs — The Good, Bad, and Interesting](https://www.futureofbeinghuman.com/p/revisiting-custom-gpts) — futureofbeinghuman.com (Dec 2025)
- [ChatGPT Review: Worth It in 2026?](https://juma.ai/blog/chatgpt-review) — Juma/Team-GPT
- [Claude Projects: Complete Guide](https://medium.com/@melissaonwuka/claude-projects-complete-guide-setup-tutorial-2025-3b9a60033b59) — Medium (Dec 2025)
- [Claude Projects vs ChatGPT Projects](https://elephas.app/blog/claude-projects-vs-chatgpt-projects) — Elephas (2026)
- [Claude Projects: Experience After Months of Daily Use](https://freshvanroot.com/blog/how-to-use-claude-projects/) — Fresh van Root
- [ChatGPT 2025 Not Following Orders](https://community.openai.com/t/chatgpt-2025-not-following-orders-custom-instructions-memory-updates/1116920) — OpenAI Developer Community
- [Why ChatGPT Keeps Ignoring Custom Instructions](https://resources.opencraftai.com/blog/why-chatgpt-keeps-ignoring-custom-instructions-and-what-actually-works) — OpenCraft AI
- [ChatGPT 5.2 Feels Like a Downgrade](https://piunikaweb.com/2025/12/24/chatgpt-5-2-overregulated-downgrade-user-complaints/) — Piunikaweb (Dec 2025)
- [Multiple Saved Custom Instructions — Feature Request](https://community.openai.com/t/request-for-multiple-saved-custom-instructions/308574) — OpenAI Community
- [Reddit's Best Custom Instructions for ChatGPT](https://medium.com/dare-to-be-better/reddits-best-custom-instructions-for-chatgpt-60-hours-of-research-in-one-article-079b242dfea5) — Medium
- [Gemini Gems Review 2026](https://aitoolanalysis.com/gemini-gems-review/) — AI Tool Analysis
- [Gemini Gems vs Custom GPTs](https://launchcodex.com/blog/llms-ai-agents-tools/gemini-gems-vs-custom-gpts/) — Launchcodex
- [Custom GPTs vs Gemini Gems: Who Wins?](https://learnprompting.org/blog/custom-gpts-vs-gemini-gems) — Learn Prompting
- [Custom GPTs vs Gemini Gems: Technical Comparison (SSRN)](https://papers.ssrn.com/sol3/papers.cfm?abstract_id=5903642) — SSRN (Dec 2025)
- [Microsoft Copilot Studio November 2025 Updates](https://www.microsoft.com/en-us/microsoft-copilot/blog/copilot-studio/whats-new-in-microsoft-copilot-studio-november-2025/) — Microsoft
- [The 6 Pillars That Will Define Agent Readiness in 2026](https://www.microsoft.com/en-us/microsoft-copilot/blog/copilot-studio/the-6-pillars-that-will-define-agent-readiness-in-2026/) — Microsoft
- [Microsoft Copilot Studio AI Agent and Governance Features](https://www.ghacks.net/2025/12/25/microsoft-copilot-studio-updates-focus-on-ai-agents-and-oversight/) — gHacks
- [Microsoft Ignite 2025: Copilot and Agents](https://www.microsoft.com/en-us/microsoft-365/blog/2025/11/18/microsoft-ignite-2025-copilot-and-agents-built-to-power-the-frontier-firm/) — Microsoft
- [New Capabilities for AI Admins from Ignite 2025](https://techcommunity.microsoft.com/blog/microsoft365copilotblog/new-capabilities-for-ai-admins-from-ignite-2025/4478906) — Microsoft Tech Community
- [The Agentic Enterprise Arrives](https://cloudwars.com/cloud/the-agentic-enterprise-arrives-microsofts-copilot-and-agent-breakthroughs-of-2025/) — Cloud Wars
- [Gartner: 40% of Enterprise Apps with AI Agents by 2026](https://www.gartner.com/en/newsroom/press-releases/2025-08-26-gartner-predicts-40-percent-of-enterprise-apps-will-feature-task-specific-ai-agents-by-2026-up-from-less-than-5-percent-in-2025) — Gartner
- [7 Agentic AI Trends for 2026](https://machinelearningmastery.com/7-agentic-ai-trends-to-watch-in-2026/) — ML Mastery
- [The Autonomous Enterprise: 2026 Forecast](https://www.cncf.io/blog/2026/01/23/the-autonomous-enterprise-and-the-four-pillars-of-platform-control-2026-forecast/) — CNCF
- [AI at Scale: Agent-Driven Enterprise Reinvention](https://kpmg.com/us/en/media/news/q4-ai-pulse.html) — KPMG
- [IBM and Anthropic Partner for Enterprise](https://newsroom.ibm.com/2025-10-07-2025-ibm-and-anthropic-partner-to-advance-enterprise-software-development-with-proven-security-and-governance) — IBM
- [e& and IBM: Enterprise Agentic AI for Governance](https://newsroom.ibm.com/2026-01-19-e-and-ibm-unveil-enterprise-grade-agentic-AI-to-transform-governance-and-compliance) — IBM (Jan 2026)
- [ServiceNow + Microsoft AI Integration](https://newsroom.servicenow.com/press-releases/details/2025/ServiceNow-Advances-Enterprise-AI-through-Seamless-Integrations-with-Microsoft-Enabling-Collaboration-Orchestration-and-Governance/default.aspx) — ServiceNow

### Official Documentation (Fetched via curl by research agent)

- Anthropic Skills: https://claude.ai/blog/skills (Oct 16, 2025 + Dec 18, 2025)
- Anthropic Enterprise: https://claude.ai/blog/claude-for-enterprise
- Anthropic Pricing: https://www.anthropic.com/pricing
- Anthropic Customer Stories: https://www.anthropic.com/customers
- Microsoft Copilot Studio: https://learn.microsoft.com/en-us/microsoft-copilot-studio/
- Microsoft Copilot Studio Security: https://learn.microsoft.com/en-us/microsoft-copilot-studio/security-and-governance
- AWS Bedrock Agents: https://aws.amazon.com/bedrock/agents/
- EU AI Act Timeline: https://artificialintelligenceact.eu/implementation-timeline/
- EU AI Act Summary: https://artificialintelligenceact.eu/high-level-summary/

---

*Research conducted during StratAI Skills design session. 7 parallel research agents, 4 web search queries, 3 deep article fetches. Total coverage: mainstream media, community forums, enterprise market analysis, competitor documentation, and regulatory landscape.*
