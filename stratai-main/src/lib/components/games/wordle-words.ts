/**
 * Wordle Word Lists
 *
 * Two lists:
 * 1. TARGET_WORDS - Common, recognizable words that make good puzzles
 * 2. VALID_GUESSES - Extended list of all valid 5-letter words for input validation
 *
 * Target words are curated to be:
 * - Common enough that most people know them
 * - Not obscure or offensive
 * - Good variety of letter patterns
 */

// Words that can be the answer (curated for fun gameplay)
export const TARGET_WORDS = [
	// Common words - great for puzzles
	'about', 'above', 'abuse', 'actor', 'acute', 'admit', 'adopt', 'adult', 'after', 'again',
	'agent', 'agree', 'ahead', 'alarm', 'album', 'alert', 'alike', 'alive', 'allow', 'alone',
	'along', 'alter', 'among', 'anger', 'angle', 'angry', 'apart', 'apple', 'apply', 'arena',
	'argue', 'arise', 'armor', 'array', 'arrow', 'asset', 'avoid', 'award', 'aware', 'awful',

	'badge', 'badly', 'baker', 'bases', 'basic', 'basin', 'basis', 'batch', 'beach', 'began',
	'begin', 'begun', 'being', 'belly', 'below', 'bench', 'berry', 'birth', 'black', 'blade',
	'blame', 'blank', 'blast', 'blaze', 'bleed', 'blend', 'bless', 'blind', 'blink', 'block',
	'blood', 'bloom', 'blown', 'board', 'boost', 'booth', 'bound', 'brain', 'brake', 'brand',
	'brave', 'bread', 'break', 'breed', 'brick', 'bride', 'brief', 'bring', 'broad', 'broke',
	'brook', 'brown', 'brush', 'build', 'built', 'bunch', 'burst', 'buyer', 'cabin', 'cable',

	'cache', 'camel', 'candy', 'cargo', 'carry', 'carve', 'catch', 'cause', 'cease', 'chain',
	'chair', 'chalk', 'champ', 'chaos', 'charm', 'chart', 'chase', 'cheap', 'cheat', 'check',
	'cheek', 'cheer', 'chess', 'chest', 'chief', 'child', 'chill', 'china', 'chord', 'chose',
	'chunk', 'civic', 'civil', 'claim', 'clash', 'class', 'clean', 'clear', 'clerk', 'click',
	'cliff', 'climb', 'cling', 'clock', 'clone', 'close', 'cloth', 'cloud', 'coach', 'coast',
	'couch', 'cough', 'could', 'count', 'court', 'cover', 'crack', 'craft', 'crane', 'crash',
	'crazy', 'cream', 'creek', 'creep', 'crest', 'crime', 'crisp', 'cross', 'crowd', 'crown',
	'crude', 'cruel', 'crush', 'curve', 'cycle', 'daily', 'dairy', 'dance', 'dated', 'dealt',

	'death', 'debug', 'debut', 'decay', 'decor', 'decoy', 'delay', 'delta', 'dense', 'depot',
	'depth', 'derby', 'deter', 'devil', 'diary', 'digit', 'diner', 'disco', 'ditch', 'diver',
	'dizzy', 'dodge', 'doing', 'donor', 'donut', 'doubt', 'dough', 'dozen', 'draft', 'drain',
	'drake', 'drama', 'drank', 'drawn', 'dread', 'dream', 'dress', 'dried', 'drift', 'drill',
	'drink', 'drive', 'droit', 'drown', 'drunk', 'dryer', 'dwell', 'dying', 'eager', 'eagle',
	'early', 'earth', 'easel', 'eaten', 'eater', 'edges', 'eerie', 'eight', 'elbow', 'elder',
	'elect', 'elite', 'embed', 'ember', 'empty', 'ended', 'enemy', 'enjoy', 'enter', 'entry',
	'equal', 'equip', 'erase', 'error', 'essay', 'ethos', 'evade', 'event', 'every', 'exact',

	'excel', 'exile', 'exist', 'extra', 'faint', 'fairy', 'faith', 'false', 'fancy', 'fatal',
	'fatty', 'fault', 'favor', 'feast', 'fence', 'ferry', 'fetch', 'fever', 'fiber', 'field',
	'fiery', 'fifth', 'fifty', 'fight', 'final', 'first', 'fixed', 'flame', 'flash', 'flask',
	'fleet', 'flesh', 'flick', 'float', 'flock', 'flood', 'floor', 'flora', 'flour', 'fluid',
	'flush', 'flute', 'focal', 'focus', 'foggy', 'force', 'forge', 'forgo', 'forth', 'forty',
	'forum', 'found', 'frame', 'frank', 'fraud', 'freak', 'fresh', 'fried', 'front', 'frost',
	'fruit', 'fully', 'fungi', 'funny', 'fuzzy', 'gamma', 'gauge', 'genre', 'ghost', 'giant',
	'given', 'giver', 'gland', 'glare', 'glass', 'glaze', 'gleam', 'glide', 'glint', 'globe',

	'glory', 'gloss', 'glove', 'glyph', 'going', 'grace', 'grade', 'grain', 'grand', 'grant',
	'grape', 'graph', 'grasp', 'grass', 'grave', 'gravy', 'graze', 'great', 'greed', 'greek',
	'green', 'greet', 'grief', 'grill', 'grind', 'groan', 'groom', 'gross', 'group', 'grove',
	'growl', 'grown', 'guard', 'guess', 'guest', 'guide', 'guild', 'guilt', 'guise', 'habit',
	'handy', 'happy', 'hardy', 'harsh', 'haste', 'hasty', 'hatch', 'haven', 'hazel', 'heard',
	'heart', 'heath', 'heavy', 'hedge', 'heist', 'hello', 'hence', 'herbs', 'heron', 'hinge',
	'hippo', 'hitch', 'hoard', 'hobby', 'hoist', 'holly', 'homer', 'honey', 'honor', 'horse',
	'hotel', 'hound', 'house', 'hover', 'human', 'humid', 'humor', 'hunch', 'hurry', 'ideal',

	'image', 'imply', 'inbox', 'incur', 'index', 'indie', 'infer', 'inner', 'input', 'intro',
	'irony', 'issue', 'ivory', 'jazzy', 'jeans', 'jelly', 'jewel', 'joint', 'joker', 'jolly',
	'judge', 'juice', 'juicy', 'jumbo', 'jumpy', 'karma', 'kayak', 'khaki', 'knock', 'known',
	'label', 'labor', 'laden', 'lance', 'large', 'laser', 'latch', 'later', 'latex', 'latin',
	'laugh', 'layer', 'leach', 'learn', 'lease', 'least', 'leave', 'ledge', 'legal', 'lemon',
	'level', 'lever', 'light', 'lilac', 'limbo', 'limit', 'linen', 'liner', 'lions', 'liver',
	'llama', 'lobby', 'local', 'lodge', 'lofty', 'logic', 'login', 'loose', 'lorry', 'loser',
	'lotus', 'loved', 'lover', 'lower', 'loyal', 'lucid', 'lucky', 'lunar', 'lunch', 'lyric',

	'macro', 'mafia', 'magic', 'major', 'maker', 'manga', 'mango', 'manor', 'maple', 'march',
	'marry', 'marsh', 'match', 'maybe', 'mayor', 'medal', 'media', 'melon', 'mercy', 'merge',
	'merit', 'merry', 'messy', 'metal', 'meter', 'metro', 'micro', 'midst', 'might', 'mimic',
	'mince', 'minor', 'minus', 'mirth', 'miser', 'misty', 'mixer', 'model', 'modem', 'moist',
	'money', 'month', 'moody', 'moral', 'morph', 'motor', 'motto', 'mould', 'mount', 'mouse',
	'mouth', 'movie', 'muddy', 'mural', 'music', 'musty', 'naive', 'naked', 'named', 'nanny',
	'naval', 'nerve', 'never', 'newer', 'newly', 'nicer', 'niche', 'night', 'ninja', 'ninth',
	'noble', 'noise', 'noisy', 'north', 'notch', 'noted', 'novel', 'nudge', 'nurse', 'nutty',

	'nylon', 'oasis', 'occur', 'ocean', 'olive', 'omega', 'onion', 'onset', 'opera', 'optic',
	'orbit', 'order', 'organ', 'other', 'otter', 'ought', 'ounce', 'outer', 'outgo', 'owner',
	'oxide', 'ozone', 'paint', 'pairs', 'panel', 'panic', 'paper', 'parry', 'party', 'pasta',
	'paste', 'patch', 'path', 'pause', 'peace', 'peach', 'pearl', 'pedal', 'penny', 'perch',
	'peril', 'perky', 'petal', 'petty', 'phase', 'phone', 'photo', 'piano', 'piece', 'pilot',
	'pinch', 'pitch', 'pixel', 'pizza', 'place', 'plaid', 'plain', 'plane', 'plank', 'plant',
	'plate', 'plaza', 'plead', 'pleat', 'plier', 'pluck', 'plumb', 'plume', 'plump', 'plunk',
	'plus', 'poach', 'point', 'poise', 'poker', 'polar', 'pollen', 'pooch', 'poppy', 'porch',

	'poser', 'posit', 'posse', 'pouch', 'pound', 'power', 'prank', 'press', 'price', 'pride',
	'prime', 'print', 'prior', 'prism', 'prize', 'probe', 'prone', 'proof', 'prose', 'proud',
	'prove', 'proxy', 'prune', 'psalm', 'pulse', 'punch', 'pupil', 'puppy', 'purse', 'pushy',
	'qualm', 'quart', 'queen', 'query', 'quest', 'queue', 'quick', 'quiet', 'quilt', 'quirk',
	'quota', 'quote', 'racer', 'radar', 'radio', 'rainy', 'raise', 'rally', 'ranch', 'range',
	'rapid', 'ratio', 'razor', 'reach', 'react', 'ready', 'realm', 'rebel', 'recap', 'refer',
	'reign', 'relax', 'relay', 'relic', 'remix', 'renew', 'repay', 'reply', 'retry', 'rider',
	'ridge', 'rifle', 'right', 'rigid', 'rigor', 'rinse', 'ripen', 'risen', 'risky', 'rival',

	'river', 'roast', 'robin', 'robot', 'rocky', 'rogue', 'roman', 'roost', 'rough', 'round',
	'route', 'rover', 'royal', 'rugby', 'ruler', 'rumor', 'rural', 'rusty', 'sadly', 'safer',
	'saint', 'salad', 'salon', 'salsa', 'salty', 'sandy', 'sassy', 'sauce', 'sauna', 'savor',
	'savvy', 'scale', 'scalp', 'scant', 'scare', 'scarf', 'scary', 'scene', 'scent', 'scope',
	'score', 'scorn', 'scout', 'scrap', 'screw', 'scrub', 'seize', 'sense', 'serif', 'serve',
	'setup', 'seven', 'shade', 'shady', 'shaft', 'shake', 'shaky', 'shall', 'shame', 'shape',
	'share', 'shark', 'sharp', 'shave', 'sheep', 'sheer', 'sheet', 'shelf', 'shell', 'shift',
	'shine', 'shiny', 'shirt', 'shock', 'shore', 'short', 'shout', 'shown', 'showy', 'shrub',

	'shrug', 'siege', 'sight', 'sigma', 'silky', 'silly', 'since', 'sixth', 'sixty', 'skate',
	'skill', 'skimp', 'skirt', 'skull', 'slack', 'slain', 'slang', 'slash', 'slate', 'sleek',
	'sleep', 'slept', 'slice', 'slide', 'slime', 'slimy', 'sling', 'slope', 'sloth', 'small',
	'smart', 'smash', 'smell', 'smile', 'smirk', 'smoke', 'smoky', 'snack', 'snail', 'snake',
	'snare', 'snarl', 'sneak', 'sniff', 'snore', 'snort', 'snout', 'snowy', 'soapy', 'sober',
	'solar', 'solid', 'solve', 'sonar', 'sonic', 'sorry', 'sound', 'south', 'space', 'spade',
	'spare', 'spark', 'spawn', 'speak', 'spear', 'speck', 'speed', 'spell', 'spend', 'spent',
	'spice', 'spicy', 'spill', 'spine', 'spiral', 'spite', 'split', 'spoil', 'spoke', 'spoon',

	'sport', 'spots', 'spray', 'spree', 'sprig', 'squad', 'squat', 'stack', 'staff', 'stage',
	'stain', 'stair', 'stake', 'stale', 'stalk', 'stall', 'stamp', 'stand', 'stank', 'stark',
	'start', 'stash', 'state', 'stave', 'stays', 'steak', 'steal', 'steam', 'steel', 'steep',
	'steer', 'stern', 'stick', 'stiff', 'still', 'sting', 'stink', 'stint', 'stock', 'stoic',
	'stoke', 'stomp', 'stone', 'stony', 'stood', 'stool', 'stoop', 'store', 'stork', 'storm',
	'story', 'stout', 'stove', 'strap', 'straw', 'stray', 'strip', 'strut', 'stuck', 'study',
	'stuff', 'stump', 'stung', 'stunk', 'stunt', 'style', 'sugar', 'suite', 'sunny', 'super',
	'surge', 'sushi', 'swamp', 'swarm', 'swear', 'sweat', 'sweep', 'sweet', 'swell', 'swept',

	'swift', 'swing', 'swipe', 'swirl', 'sword', 'swore', 'sworn', 'swung', 'syrup', 'table',
	'taboo', 'tacky', 'taint', 'taken', 'taker', 'tally', 'talon', 'tangy', 'tango', 'tapas',
	'taper', 'tardy', 'taste', 'tasty', 'taunt', 'taxes', 'teach', 'teary', 'tease', 'teddy',
	'teens', 'tempo', 'tense', 'tenor', 'tenth', 'tepid', 'terms', 'terry', 'terse', 'thank',
	'theft', 'their', 'theme', 'there', 'these', 'thick', 'thief', 'thigh', 'thing', 'think',
	'third', 'thorn', 'those', 'three', 'threw', 'throb', 'throw', 'thumb', 'thump', 'tiger',
	'tight', 'tiled', 'timer', 'timid', 'tipsy', 'tired', 'titan', 'title', 'toast', 'today',
	'token', 'tonic', 'tooth', 'topic', 'torch', 'torso', 'total', 'touch', 'tough', 'towel',

	'tower', 'toxic', 'trace', 'track', 'tract', 'trade', 'trail', 'train', 'trait', 'tramp',
	'trash', 'trawl', 'tread', 'treat', 'trend', 'trial', 'tribe', 'trick', 'tried', 'trike',
	'trill', 'tripe', 'trite', 'troll', 'troop', 'trout', 'truce', 'truck', 'truly', 'trump',
	'trunk', 'truss', 'trust', 'truth', 'tulip', 'tumor', 'tuner', 'tunic', 'turbo', 'tutor',
	'tweak', 'tweed', 'tweet', 'twice', 'twine', 'twirl', 'twist', 'tying', 'udder', 'ulcer',
	'ultra', 'umbra', 'uncle', 'uncut', 'under', 'undid', 'undue', 'unfed', 'unfit', 'union',
	'unite', 'unity', 'until', 'upper', 'upset', 'urban', 'usher', 'using', 'usual', 'utter',
	'vague', 'valid', 'valor', 'value', 'valve', 'vapor', 'vault', 'vegan', 'venom', 'venue',

	'verge', 'verse', 'vibes', 'video', 'vigor', 'villa', 'vinyl', 'viola', 'viper', 'viral',
	'virus', 'visit', 'visor', 'vista', 'vital', 'vivid', 'vocal', 'vodka', 'vogue', 'voice',
	'voila', 'vomit', 'voter', 'vouch', 'vowel', 'wacky', 'wafer', 'wager', 'wagon', 'waist',
	'waltz', 'warty', 'waste', 'watch', 'water', 'waver', 'weary', 'weave', 'wedge', 'weeds',
	'weigh', 'weird', 'welch', 'whale', 'wharf', 'wheat', 'wheel', 'where', 'which', 'while',
	'whine', 'whirl', 'whisk', 'white', 'whole', 'whose', 'widen', 'wider', 'widow', 'width',
	'wield', 'willy', 'wimpy', 'wince', 'windy', 'wiper', 'witch', 'witty', 'wives', 'woken',
	'woman', 'women', 'woods', 'woody', 'woozy', 'world', 'worry', 'worse', 'worst', 'worth',

	'would', 'wound', 'woven', 'wrack', 'wrath', 'wreak', 'wreck', 'wrest', 'wring', 'wrist',
	'write', 'wrong', 'wrote', 'wrung', 'yacht', 'yearn', 'yeast', 'yield', 'young', 'youth',
	'zebra', 'zesty', 'zippy', 'zombi', 'zonal'
];

// All valid 5-letter words (includes target words + more obscure ones)
// This is used to validate user guesses - they must be real words
export const VALID_GUESSES = new Set([
	...TARGET_WORDS,
	// Add more valid words that aren't good targets but are valid guesses
	'aahed', 'aalii', 'abaca', 'abaci', 'aback', 'abaft', 'abamp', 'abase', 'abash', 'abate',
	'abbey', 'abbot', 'abeam', 'abele', 'abets', 'abhor', 'abide', 'abler', 'abode', 'abohm',
	'abort', 'abris', 'abuse', 'abuts', 'abuzz', 'abyes', 'abyss', 'acari', 'acerb', 'aceta',
	'ached', 'aches', 'achoo', 'acids', 'acidy', 'acing', 'acini', 'ackee', 'acmes', 'acned',
	'acnes', 'acock', 'acold', 'acorn', 'acres', 'acrid', 'acted', 'actin', 'actor', 'acute',
	'adage', 'adapt', 'addax', 'added', 'adder', 'addle', 'adeem', 'adept', 'adieu', 'adios',
	'adits', 'adman', 'admen', 'admin', 'admit', 'admix', 'adobe', 'adobo', 'adopt', 'adore',
	'adorn', 'adult', 'adust', 'adzes', 'aecia', 'aegis', 'aeons', 'aerie', 'afars', 'affix',
	'afire', 'afoot', 'afore', 'afoul', 'after', 'again', 'agama', 'agape', 'agars', 'agate',
	'agave', 'agaze', 'agent', 'agers', 'agger', 'aggie', 'aging', 'agios', 'agist', 'aglee',
	// ... truncated for brevity - in production this would include ~12,000 valid 5-letter words
	// For now, we'll validate against TARGET_WORDS only
]);

/**
 * Get a random target word (for practice mode)
 */
export function getRandomWord(): string {
	return TARGET_WORDS[Math.floor(Math.random() * TARGET_WORDS.length)];
}

/**
 * Get today's daily word (deterministic - same for everyone)
 * Uses the date as a seed to pick consistently from the word list
 */
export function getDailyWord(date: Date = new Date()): string {
	// Create a numeric seed from the date (YYYYMMDD format)
	const year = date.getFullYear();
	const month = date.getMonth() + 1;
	const day = date.getDate();
	const seed = year * 10000 + month * 100 + day;

	// Simple hash to get a consistent index
	// This ensures the same date always returns the same word
	const index = seed % TARGET_WORDS.length;
	return TARGET_WORDS[index];
}

/**
 * Get today's date string for tracking (YYYY-MM-DD format)
 */
export function getTodayDateString(): string {
	const now = new Date();
	return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

/**
 * Check if a word is valid (can be guessed)
 */
export function isValidWord(word: string): boolean {
	const normalized = word.toLowerCase().trim();
	// For now, accept target words + some common valid guesses
	return VALID_GUESSES.has(normalized) || TARGET_WORDS.includes(normalized);
}

/**
 * Check a guess against the target word
 * Returns array of letter states: 'correct' | 'present' | 'absent'
 */
export type LetterState = 'correct' | 'present' | 'absent';

export function checkGuess(guess: string, target: string): LetterState[] {
	const result: LetterState[] = new Array(5).fill('absent');
	const targetChars = target.split('');
	const guessChars = guess.toLowerCase().split('');

	// First pass: mark correct letters (green)
	for (let i = 0; i < 5; i++) {
		if (guessChars[i] === targetChars[i]) {
			result[i] = 'correct';
			targetChars[i] = '#'; // Mark as used
		}
	}

	// Second pass: mark present letters (yellow)
	for (let i = 0; i < 5; i++) {
		if (result[i] !== 'correct') {
			const idx = targetChars.indexOf(guessChars[i]);
			if (idx !== -1) {
				result[i] = 'present';
				targetChars[idx] = '#'; // Mark as used
			}
		}
	}

	return result;
}
