/**
 * Document Mention Detector — Phase 3: Intelligent Detection
 *
 * Detects when a user's input text references a document by name
 * that exists in the space but is NOT activated in the current area's context.
 *
 * DESIGN PRINCIPLE: Heavily biased toward precision over recall.
 * A false positive (suggesting a doc the user didn't mean) is worse
 * than a false negative (missing a genuine reference). Novice users
 * would find incorrect suggestions confusing and distracting.
 *
 * Three detection tiers (in order of confidence):
 * 1. Exact filename with extension — "check API-Spec.md"
 * 2. Full stem containment — "look at the FH-Proposal-StratGroup"
 * 3. Ordered distinctive words — "check the FH Proposal for StratGroup"
 */

/** Common words that appear in filenames but don't help identify them */
const STOPWORDS = new Set([
	'a', 'an', 'the', 'of', 'in', 'on', 'at', 'to', 'for', 'and', 'or',
	'is', 'are', 'was', 'were', 'be', 'been', 'it', 'its', 'by', 'with',
	'from', 'as', 'this', 'that', 'not', 'but', 'if', 'so', 'my', 'our',
	'new', 'old', 'all', 'no', 'yes', 'do', 'did', 'has', 'had', 'will',
	'can', 'may', 'how', 'what', 'who', 'why', 'when', 'where', 'which'
]);

export interface DocumentCandidate {
	id: string;
	filename: string;
	title?: string;
}

export interface MentionMatch {
	document: DocumentCandidate;
	confidence: 'high' | 'medium';
	matchedVia: 'filename' | 'stem' | 'words' | 'title';
}

/**
 * Normalize text for comparison: lowercase, collapse separators to spaces, trim.
 */
function normalize(text: string): string {
	return text
		.toLowerCase()
		.replace(/[-_().]/g, ' ')  // Separators → spaces
		.replace(/\s+/g, ' ')      // Collapse whitespace
		.trim();
}

/**
 * Extract filename stem (strip extension).
 * "FH-Proposal-StratGroup.pdf" → "FH-Proposal-StratGroup"
 */
function getStem(filename: string): string {
	return filename.replace(/\.[^.]+$/, '');
}

/**
 * Extract "distinctive" words from a stem — words that help uniquely
 * identify this document. Filters out stopwords and very short tokens.
 */
function getDistinctiveWords(stem: string): string[] {
	return normalize(stem)
		.split(' ')
		.filter(w => w.length >= 3 && !STOPWORDS.has(w));
}

/**
 * Check if all words appear in the input text in the same order.
 * Words don't need to be adjacent but must maintain sequence.
 *
 * Example: words=["fh", "proposal", "stratgroup"]
 *   "check the fh proposal for stratgroup" → true (all present in order)
 *   "stratgroup proposal from fh" → false (wrong order)
 */
function allWordsInOrder(inputText: string, words: string[]): boolean {
	let searchFrom = 0;

	for (const word of words) {
		// Find this word at a word boundary starting from searchFrom
		const regex = new RegExp(`\\b${escapeRegex(word)}\\b`, 'g');
		regex.lastIndex = searchFrom;
		const match = regex.exec(inputText);

		if (!match) return false;
		searchFrom = match.index + match[0].length;
	}

	return true;
}

/**
 * Escape special regex characters in a string.
 */
function escapeRegex(str: string): string {
	return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Detect if the user's input mentions any of the provided (unactivated) documents.
 *
 * Returns the best match, or null if no confident match found.
 * Only ONE suggestion at a time to avoid overwhelming the user.
 */
export function detectMentionedDocument(
	inputText: string,
	unactivatedDocuments: DocumentCandidate[]
): MentionMatch | null {
	if (!inputText || inputText.length < 4) return null;
	if (unactivatedDocuments.length === 0) return null;

	const normalizedInput = normalize(inputText);

	// Check each document, return first confident match
	// (could rank by confidence in the future, but one-at-a-time is fine for V1)
	for (const doc of unactivatedDocuments) {
		// Tier 1: Exact filename with extension (highest confidence)
		// e.g., user types "check API-Spec.md"
		if (normalizedInput.includes(normalize(doc.filename))) {
			return { document: doc, confidence: 'high', matchedVia: 'filename' };
		}

		// Tier 2: Full stem containment
		// e.g., user types "look at the FH Proposal StratGroup"
		const stem = getStem(doc.filename);
		const normalizedStem = normalize(stem);

		if (normalizedStem.length >= 5 && normalizedInput.includes(normalizedStem)) {
			return { document: doc, confidence: 'high', matchedVia: 'stem' };
		}

		// Tier 2b: Title containment (if title differs from filename)
		if (doc.title && doc.title !== doc.filename) {
			const normalizedTitle = normalize(doc.title);
			if (normalizedTitle.length >= 5 && normalizedInput.includes(normalizedTitle)) {
				return { document: doc, confidence: 'high', matchedVia: 'title' };
			}
		}

		// Tier 3: All distinctive words in order
		// e.g., user types "check the FH Proposal for StratGroup"
		// Requires ≥ 2 distinctive words to avoid single-word false positives
		const distinctiveWords = getDistinctiveWords(stem);
		if (distinctiveWords.length >= 2 && allWordsInOrder(normalizedInput, distinctiveWords)) {
			return { document: doc, confidence: 'medium', matchedVia: 'words' };
		}

		// Also check title words if different from filename
		if (doc.title && doc.title !== doc.filename) {
			const titleWords = getDistinctiveWords(doc.title);
			if (titleWords.length >= 2 && allWordsInOrder(normalizedInput, titleWords)) {
				return { document: doc, confidence: 'medium', matchedVia: 'words' };
			}
		}
	}

	return null;
}
