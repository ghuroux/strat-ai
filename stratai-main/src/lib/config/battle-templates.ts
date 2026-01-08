/**
 * Battle Templates - Pre-defined prompts for common Arena comparison scenarios
 */

export interface BattleTemplate {
	id: string;
	name: string;
	category: TemplateCategory;
	icon: string;
	description: string;
	prompt: string;
}

export type TemplateCategory = 'coding' | 'creative' | 'analysis' | 'reasoning' | 'research' | 'general';

export const TEMPLATE_CATEGORIES: Record<TemplateCategory, { label: string; color: string; requiresTools?: boolean }> = {
	coding: { label: 'Coding', color: 'text-green-400 bg-green-500/20' },
	creative: { label: 'Creative', color: 'text-purple-400 bg-purple-500/20' },
	analysis: { label: 'Analysis', color: 'text-blue-400 bg-blue-500/20' },
	reasoning: { label: 'Reasoning', color: 'text-amber-400 bg-amber-500/20' },
	research: { label: 'Research', color: 'text-cyan-400 bg-cyan-500/20', requiresTools: true },
	general: { label: 'General', color: 'text-surface-400 bg-surface-500/20' }
};

export const BATTLE_TEMPLATES: BattleTemplate[] = [
	// Coding Templates
	{
		id: 'code-review',
		name: 'Code Review',
		category: 'coding',
		icon: '🔍',
		description: 'Get detailed code review and suggestions',
		prompt: `Please review this code and provide:
1. Bug identification (if any)
2. Performance improvements
3. Code style and best practices
4. Security considerations

\`\`\`
// Paste your code here
\`\`\``
	},
	{
		id: 'algorithm-impl',
		name: 'Algorithm Challenge',
		category: 'coding',
		icon: '⚡',
		description: 'Implement an efficient algorithm',
		prompt: `Implement a function that finds the longest palindromic substring in a given string.

Requirements:
- Time complexity should be O(n²) or better
- Include edge cases handling
- Add clear comments explaining the approach
- Provide time/space complexity analysis`
	},
	{
		id: 'debug-code',
		name: 'Debug Helper',
		category: 'coding',
		icon: '🐛',
		description: 'Help debug problematic code',
		prompt: `I have this code that's not working as expected:

\`\`\`
// Paste your buggy code here
\`\`\`

Expected behavior: [describe what should happen]
Actual behavior: [describe what's happening]

Please help me identify and fix the issue.`
	},
	{
		id: 'refactor',
		name: 'Refactoring',
		category: 'coding',
		icon: '🔧',
		description: 'Refactor code for better quality',
		prompt: `Please refactor this code to improve:
- Readability and maintainability
- SOLID principles adherence
- Error handling
- Type safety

Keep the same functionality but make it production-ready.

\`\`\`
// Paste your code here
\`\`\``
	},

	// Creative Templates
	{
		id: 'story-prompt',
		name: 'Story Writing',
		category: 'creative',
		icon: '📖',
		description: 'Generate creative fiction',
		prompt: `Write a short story (500-800 words) with the following elements:
- Genre: Science fiction
- Setting: A space station orbiting a dying star
- Theme: The meaning of sacrifice
- Must include dialogue between at least two characters

Be creative with the plot and character development.`
	},
	{
		id: 'explain-simple',
		name: 'ELI5 Explanation',
		category: 'creative',
		icon: '🎓',
		description: 'Explain complex topics simply',
		prompt: `Explain quantum entanglement as if you were talking to a curious 10-year-old.

Use:
- Simple analogies from everyday life
- No jargon or technical terms
- An engaging, conversational tone
- A memorable example they can visualize`
	},
	{
		id: 'marketing-copy',
		name: 'Marketing Copy',
		category: 'creative',
		icon: '📣',
		description: 'Create compelling marketing content',
		prompt: `Write compelling marketing copy for a new productivity app that uses AI to automatically organize tasks and suggest optimal work schedules.

Include:
1. A catchy headline
2. 3 key benefit statements
3. A call-to-action
4. Social proof element (testimonial style)

Target audience: Busy professionals aged 25-45`
	},

	// Analysis Templates
	{
		id: 'pros-cons',
		name: 'Pros & Cons Analysis',
		category: 'analysis',
		icon: '⚖️',
		description: 'Balanced analysis of options',
		prompt: `Provide a detailed pros and cons analysis of using microservices architecture vs monolithic architecture for a new e-commerce platform expecting 100k daily users.

For each architecture, include:
- At least 5 pros and 5 cons
- Real-world examples
- Recommendations based on team size and expertise
- Cost implications`
	},
	{
		id: 'summarize',
		name: 'Document Summary',
		category: 'analysis',
		icon: '📝',
		description: 'Summarize long content',
		prompt: `Please provide a comprehensive summary of the following text:

[Paste your long text here]

Include:
1. Executive summary (2-3 sentences)
2. Key points (bulleted list)
3. Main arguments or findings
4. Implications or conclusions
5. Any notable quotes`
	},
	{
		id: 'compare-tech',
		name: 'Tech Comparison',
		category: 'analysis',
		icon: '🔬',
		description: 'Compare technologies or tools',
		prompt: `Compare React, Vue, and Svelte for building a modern web application.

Evaluate each on:
- Learning curve
- Performance
- Ecosystem and community
- TypeScript support
- State management
- Build tooling
- Best use cases

Provide a recommendation based on different team scenarios.`
	},

	// Reasoning Templates
	{
		id: 'logic-puzzle',
		name: 'Logic Puzzle',
		category: 'reasoning',
		icon: '🧩',
		description: 'Solve complex logic problems',
		prompt: `Solve this logic puzzle step by step:

Five houses in a row are painted different colors. In each house lives a person of a different nationality. Each owner drinks a different beverage, smokes a different brand of cigarette, and keeps a different pet.

Given clues:
1. The Brit lives in the red house
2. The Swede keeps dogs
3. The Dane drinks tea
4. The green house is on the left of the white house
5. The green house owner drinks coffee
6. The person who smokes Pall Mall keeps birds
7. The owner of the yellow house smokes Dunhill
8. The man living in the center house drinks milk
9. The Norwegian lives in the first house
10. The man who smokes Blends lives next to the one who keeps cats

Who owns the fish?`
	},
	{
		id: 'math-problem',
		name: 'Math Problem',
		category: 'reasoning',
		icon: '🔢',
		description: 'Solve mathematical problems',
		prompt: `Solve this problem with detailed steps:

A train leaves Station A at 9:00 AM traveling at 60 mph towards Station B. Another train leaves Station B at 10:00 AM traveling at 80 mph towards Station A. If the stations are 280 miles apart, at what time will the trains meet?

Show:
1. Your reasoning process
2. The mathematical setup
3. Step-by-step solution
4. Final answer with units`
	},
	{
		id: 'ethical-dilemma',
		name: 'Ethical Analysis',
		category: 'reasoning',
		icon: '🤔',
		description: 'Analyze ethical dilemmas',
		prompt: `Analyze this ethical dilemma from multiple philosophical perspectives:

A self-driving car's AI must make an impossible choice: swerve left to avoid hitting 3 pedestrians but hit 1 pedestrian, or continue straight knowing it will hit all 3. The single pedestrian is a child; the three are elderly adults.

Discuss:
1. Utilitarian perspective
2. Deontological (duty-based) perspective
3. Virtue ethics perspective
4. Your reasoned conclusion
5. How should AI systems be programmed to handle such scenarios?`
	},

	// Research Templates (require web search / tool use)
	{
		id: 'current-events',
		name: 'Current Events',
		category: 'research',
		icon: '📰',
		description: 'Research recent news and developments',
		prompt: `Research the latest developments in AI regulation and policy from the past month.

Provide:
1. Key recent announcements or legislation
2. Which countries/regions are leading
3. Industry reactions
4. Potential impact on businesses
5. Sources for your information

Focus on factual, verifiable information from reliable sources.`
	},
	{
		id: 'market-research',
		name: 'Market Research',
		category: 'research',
		icon: '📊',
		description: 'Research market trends and data',
		prompt: `Research the current state of the electric vehicle market.

Include:
1. Top manufacturers by market share (with recent numbers)
2. Latest trends in battery technology
3. Government incentives currently available
4. Price trends over the past year
5. Predictions from industry analysts

Cite your sources where possible.`
	},
	{
		id: 'competitor-analysis',
		name: 'Competitor Analysis',
		category: 'research',
		icon: '🔎',
		description: 'Research and compare companies',
		prompt: `Research and compare the current offerings of major cloud providers (AWS, Azure, Google Cloud).

Analyze:
1. Latest pricing changes (if any recent updates)
2. New services launched this year
3. Market share trends
4. Strengths and weaknesses
5. Recent customer reviews or case studies

Provide factual, up-to-date information.`
	},
	{
		id: 'fact-check',
		name: 'Fact Checker',
		category: 'research',
		icon: '✅',
		description: 'Verify claims with sources',
		prompt: `Fact-check and research the following claim:

"[INSERT CLAIM TO VERIFY]"

Provide:
1. Verdict: True, False, Partially True, or Unverifiable
2. Evidence supporting your verdict
3. Context that might be missing from the claim
4. Original sources where the claim originated
5. Reliable sources that confirm or refute it

Be thorough and cite your sources.`
	},

	// General Templates
	{
		id: 'explain-concept',
		name: 'Concept Explainer',
		category: 'general',
		icon: '💡',
		description: 'Explain any concept clearly',
		prompt: `Explain [YOUR TOPIC HERE] in a comprehensive but accessible way.

Structure your explanation:
1. One-sentence definition
2. Why it matters
3. How it works (with examples)
4. Common misconceptions
5. Practical applications
6. Further learning resources`
	},
	{
		id: 'brainstorm',
		name: 'Brainstorming',
		category: 'general',
		icon: '🧠',
		description: 'Generate creative ideas',
		prompt: `I need creative ideas for [YOUR CHALLENGE HERE].

Generate:
- 10 conventional ideas
- 5 unconventional/wild ideas
- 3 ideas that combine different approaches

For each idea, briefly explain:
- How it would work
- Potential challenges
- Why it might succeed`
	},
	{
		id: 'debate',
		name: 'Debate Both Sides',
		category: 'general',
		icon: '⚔️',
		description: 'Argue multiple perspectives',
		prompt: `Present compelling arguments for BOTH sides of this debate:

"Remote work should be the default for all knowledge workers"

For each side:
1. Present 5 strong arguments
2. Anticipate and counter opposing arguments
3. Use data/examples where possible
4. Acknowledge valid points from the other side

Then provide a balanced synthesis.`
	}
];

/**
 * Get templates by category
 */
export function getTemplatesByCategory(category: TemplateCategory): BattleTemplate[] {
	return BATTLE_TEMPLATES.filter((t) => t.category === category);
}

/**
 * Get all unique categories with counts
 */
export function getCategoriesWithCounts(): Array<{ category: TemplateCategory; count: number }> {
	const counts = new Map<TemplateCategory, number>();
	for (const template of BATTLE_TEMPLATES) {
		counts.set(template.category, (counts.get(template.category) || 0) + 1);
	}
	return Array.from(counts.entries()).map(([category, count]) => ({ category, count }));
}
