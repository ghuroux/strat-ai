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
	'zebra', 'zesty', 'zippy', 'zombi', 'zonal',

	// Additional common words - great for puzzles
	// Food & Drink
	'bacon', 'bagel', 'beans', 'berry', 'broth', 'cider', 'cocoa', 'crepe', 'curry', 'donut',
	'fudge', 'gouda', 'gravy', 'honey', 'jelly', 'latte', 'mocha', 'olive', 'onion', 'pecan',
	'salsa', 'scone', 'spice', 'steak', 'toast', 'tonic', 'wafer', 'yeast',

	// Animals
	'bison', 'camel', 'chimp', 'coral', 'coypu', 'dingo', 'finch', 'gecko', 'goose', 'hippo',
	'hyena', 'koala', 'lemur', 'llama', 'moose', 'otter', 'panda', 'perch', 'quail', 'raven',
	'robin', 'shark', 'shrew', 'skunk', 'sloth', 'snail', 'squid', 'stork', 'tiger', 'viper',
	'whale', 'zebra',

	// Music & Arts
	'album', 'banjo', 'bongo', 'cello', 'chant', 'chord', 'dance', 'drama', 'drums', 'flute',
	'genre', 'opera', 'piano', 'polka', 'radio', 'tempo', 'tonal', 'tunes', 'viola', 'voice',

	// Technology
	'admin', 'bytes', 'cache', 'click', 'cloud', 'codec', 'crash', 'cyber', 'debug', 'email',
	'error', 'fiber', 'flash', 'glitch', 'input', 'linux', 'modem', 'mouse', 'patch', 'pixel',
	'proxy', 'query', 'reboot', 'router', 'setup', 'virus', 'webby',

	// Sports & Games
	'caddy', 'cards', 'chess', 'coach', 'court', 'draft', 'field', 'final', 'match', 'medal',
	'pitch', 'poker', 'racer', 'rugby', 'serve', 'skate', 'sport', 'squad', 'swing', 'teams',
	'tempo', 'track', 'vault',

	// Nature & Weather
	'beach', 'blaze', 'bloom', 'bough', 'brook', 'cliff', 'creek', 'delta', 'dunes', 'field',
	'flood', 'foggy', 'frost', 'grove', 'haven', 'humid', 'misty', 'ocean', 'ozone', 'plant',
	'rainy', 'ridge', 'river', 'rocky', 'shore', 'slope', 'snowy', 'solar', 'storm', 'sunny',
	'swamp', 'tidal', 'trail', 'trees', 'windy', 'woods',

	// Emotions & Traits
	'angry', 'bliss', 'brave', 'calm', 'eager', 'happy', 'jolly', 'loyal', 'moody', 'noble',
	'perky', 'proud', 'quiet', 'sassy', 'silly', 'smart', 'sorry', 'timid', 'upset', 'vivid',
	'wacky', 'weary', 'witty', 'worry',

	// Body & Health
	'ankle', 'belly', 'brain', 'cheek', 'elbow', 'flesh', 'heart', 'joint', 'liver', 'lungs',
	'mouth', 'nerve', 'organ', 'pulse', 'spine', 'teeth', 'thigh', 'thumb', 'wrist',

	// Home & Objects
	'broom', 'chair', 'clock', 'couch', 'decor', 'drape', 'floor', 'frame', 'glass', 'knife',
	'ledge', 'manor', 'panel', 'piano', 'plate', 'shelf', 'table', 'towel', 'walls', 'wheel',

	// Actions & Verbs
	'begin', 'blink', 'boost', 'build', 'catch', 'chase', 'climb', 'crawl', 'dance', 'dwell',
	'fetch', 'float', 'grasp', 'greet', 'guide', 'hover', 'judge', 'knock', 'laugh', 'learn',
	'match', 'pause', 'pinch', 'plant', 'reach', 'scoop', 'shout', 'sleep', 'smile', 'speak',
	'spend', 'spill', 'stand', 'start', 'steal', 'sweep', 'teach', 'think', 'throw', 'trade',
	'twist', 'watch', 'write',

	// Time & Place
	'after', 'below', 'early', 'epoch', 'first', 'local', 'month', 'night', 'north', 'often',
	'point', 'south', 'today', 'urban', 'until', 'weeks', 'where', 'world', 'years'
];

// All valid 5-letter words (includes target words + more obscure ones)
// This is used to validate user guesses - they must be real words
export const VALID_GUESSES = new Set([
	...TARGET_WORDS,
	// Common valid guesses that aren't ideal puzzle targets
	'aahed', 'abbey', 'abbot', 'abhor', 'abide', 'abler', 'abode', 'abort', 'abyss', 'acorn',
	'acres', 'acrid', 'acted', 'adage', 'adapt', 'added', 'adder', 'adept', 'adieu', 'adios',
	'adobe', 'adopt', 'adore', 'adorn', 'aegis', 'aeons', 'afire', 'afoot', 'afoul', 'agape',
	'agate', 'agave', 'aging', 'aglow', 'agony', 'aioli', 'aired', 'aisle', 'alarm', 'algae',
	'alias', 'alibi', 'alien', 'align', 'allay', 'alley', 'allot', 'allow', 'alloy', 'aloft',
	'aloha', 'aloof', 'alpha', 'altar', 'amass', 'amaze', 'amber', 'amble', 'amend', 'amine',
	'amino', 'amiss', 'amity', 'amour', 'ample', 'amply', 'angel', 'angst', 'anime', 'anise',
	'annex', 'annoy', 'annul', 'anode', 'antic', 'antsy', 'anvil', 'aorta', 'aphid', 'apnea',
	'apple', 'april', 'apron', 'aptly', 'arbor', 'ardor', 'argon', 'argue', 'arise', 'arose',
	'arson', 'artsy', 'ascot', 'ashen', 'ashes', 'aside', 'askew', 'assay', 'atone', 'attic',
	'audio', 'audit', 'augur', 'aunts', 'avail', 'avert', 'avian', 'avoid', 'await', 'awake',
	'awash', 'awful', 'awoke', 'axial', 'axiom', 'axion', 'aztec', 'azure',

	// B words
	'babel', 'backs', 'badge', 'badly', 'baggy', 'baldy', 'balls', 'balmy', 'banal', 'bands',
	'bangs', 'banks', 'barbs', 'bards', 'bared', 'barge', 'barks', 'barns', 'baron', 'basal',
	'based', 'bases', 'baste', 'batch', 'bated', 'bathe', 'baton', 'batty', 'bawdy', 'beads',
	'beady', 'beaks', 'beams', 'beard', 'bears', 'beast', 'beats', 'beaut', 'bebop', 'becks',
	'beefs', 'beefy', 'beeps', 'beers', 'beets', 'begat', 'beget', 'begun', 'beige', 'being',
	'belch', 'bells', 'belle', 'belts', 'bends', 'bendy', 'beret', 'berth', 'bests', 'bikes',
	'binge', 'biome', 'biped', 'birch', 'birds', 'bites', 'black', 'bland', 'blare', 'bleat',
	'bleed', 'blend', 'blimp', 'blithe', 'bloat', 'blobs', 'bloke', 'blond', 'blogs', 'blots',
	'blown', 'blows', 'blues', 'bluff', 'blunt', 'blurb', 'blurs', 'blurt', 'blush', 'boats',
	'boded', 'bodes', 'boggy', 'bogus', 'boils', 'bolds', 'bolts', 'bombs', 'bonds', 'boned',
	'bones', 'bonus', 'books', 'booms', 'boons', 'boots', 'booze', 'boozy', 'borax', 'bored',
	'borer', 'bores', 'borne', 'bosom', 'bossy', 'botch', 'bound', 'bouts', 'bowed', 'bowel',
	'bower', 'bowls', 'boxed', 'boxer', 'boxes', 'brace', 'brags', 'braid', 'brail', 'brash',
	'brass', 'brats', 'brawn', 'brays', 'bread', 'bream', 'brews', 'briar', 'bribe', 'brier',
	'brigs', 'brine', 'brink', 'briny', 'brisk', 'broil', 'broke', 'brood', 'brows', 'bruin',
	'brunt', 'brute', 'bucks', 'buddy', 'budge', 'bugle', 'bugs', 'bulbs', 'bulge', 'bulgy',
	'bulks', 'bulky', 'bulls', 'bully', 'bumps', 'bumpy', 'bunch', 'bunks', 'bunny', 'bunts',
	'buoys', 'burly', 'burns', 'burnt', 'burps', 'burro', 'burrs', 'bursa', 'buses', 'bushy',
	'busts', 'busty', 'butts', 'buxom', 'bylaw', 'bytes',

	// C words
	'cabby', 'cacao', 'cadet', 'caged', 'cages', 'cagey', 'cairn', 'caked', 'cakes', 'calfs',
	'calls', 'calms', 'camps', 'campy', 'canal', 'candy', 'caned', 'canes', 'canoe', 'canon',
	'caped', 'caper', 'capes', 'cards', 'cared', 'carer', 'cares', 'carob', 'carol', 'carps',
	'carry', 'carts', 'cases', 'casks', 'caste', 'casts', 'catch', 'cater', 'catty', 'caulk',
	'cause', 'caves', 'cease', 'cedar', 'ceded', 'cedes', 'cells', 'cents', 'chafe', 'chaff',
	'champ', 'chaps', 'chard', 'chars', 'chary', 'chasm', 'chats', 'cheat', 'cheek', 'cheep',
	'cheer', 'chefs', 'chemo', 'chert', 'chick', 'chide', 'chili', 'chime', 'chimp', 'chink',
	'chins', 'chips', 'chirp', 'chits', 'chive', 'choir', 'choke', 'chomp', 'chops', 'chore',
	'chose', 'chuck', 'chuff', 'chugs', 'chump', 'chums', 'chunk', 'churn', 'chute', 'cider',
	'cigar', 'cinch', 'circa', 'cited', 'cites', 'civet', 'civic', 'civvy', 'clack', 'clads',
	'claim', 'clamp', 'clams', 'clang', 'clank', 'clans', 'claps', 'clasp', 'class', 'claws',
	'clays', 'cleat', 'clefs', 'cleft', 'clerk', 'click', 'cliff', 'climb', 'cling', 'clink',
	'clips', 'cloak', 'clods', 'clogs', 'clone', 'clops', 'close', 'cloth', 'clots', 'cloud',
	'clout', 'clove', 'clown', 'clubs', 'cluck', 'clued', 'clues', 'clump', 'clung', 'clunk',

	// D words
	'daddy', 'daily', 'dally', 'dames', 'damps', 'dandy', 'dares', 'darks', 'darns', 'darts',
	'dated', 'dater', 'dates', 'datum', 'daunt', 'dawns', 'deals', 'dealt', 'deans', 'dears',
	'deary', 'debit', 'debts', 'decal', 'decks', 'decry', 'deeds', 'deems', 'deeps', 'deers',
	'deity', 'delay', 'dells', 'delve', 'demon', 'demos', 'denim', 'dents', 'depot', 'derby',
	'desks', 'deter', 'detox', 'deuce', 'dials', 'diary', 'diced', 'dicer', 'dices', 'dicey',
	'dicks', 'diets', 'digit', 'dills', 'dilly', 'dimer', 'dimes', 'dimly', 'dined', 'diner',
	'dines', 'dingo', 'dings', 'dingy', 'dinky', 'diode', 'dippy', 'dirge', 'dirty', 'disco',
	'discs', 'dishy', 'disks', 'ditch', 'ditto', 'ditty', 'divan', 'divas', 'diver', 'dives',
	'divot', 'dizzy', 'docks', 'dodge', 'dodgy', 'dodos', 'doers', 'dogma', 'doing', 'dolls',
	'dolly', 'domed', 'domes', 'donor', 'donut', 'dooms', 'doors', 'dopes', 'dopey', 'dorks',
	'dorky', 'dorms', 'dorsa', 'dosed', 'doser', 'doses', 'doted', 'doter', 'dotes', 'dotty',
	'doubt', 'dough', 'douse', 'doves', 'dowdy', 'dowel', 'downs', 'downy', 'dowry', 'doyen',
	'dozed', 'dozen', 'dozer', 'dozes', 'drabs', 'draft', 'drags', 'drain', 'drake', 'drank',
	'drape', 'drawl', 'drawn', 'draws', 'drays', 'dread', 'dream', 'drear', 'dregs', 'dress',
	'dribs', 'dried', 'drier', 'dries', 'drift', 'drill', 'drink', 'drips', 'drive', 'droit',
	'droll', 'drone', 'drool', 'droop', 'drops', 'dross', 'drove', 'drown', 'drugs', 'druid',
	'drums', 'drunk', 'dryer', 'dryly', 'duals', 'ducal', 'ducks', 'ducky', 'ducts', 'dudes',
	'duels', 'duets', 'duffs', 'dukes', 'dulls', 'dully', 'dummy', 'dumps', 'dumpy', 'dunce',
	'dunes', 'dunks', 'duped', 'duper', 'dupes', 'dural', 'dusty', 'dutch', 'duvet', 'dwarf',
	'dwell', 'dwelt', 'dyers', 'dying', 'dykes',

	// E words
	'eager', 'eagle', 'eared', 'earls', 'early', 'earns', 'earth', 'eased', 'easel', 'eases',
	'eaten', 'eater', 'eaves', 'ebbed', 'ebony', 'edged', 'edger', 'edges', 'edgier', 'edict',
	'edify', 'edits', 'eerie', 'egads', 'egged', 'egret', 'eight', 'eject', 'elate', 'elbow',
	'elder', 'elect', 'elegy', 'elfin', 'elide', 'elite', 'elope', 'elude', 'elves', 'email',
	'embed', 'ember', 'emcee', 'emery', 'emirs', 'emits', 'emote', 'empty', 'enact', 'ended',
	'ender', 'endow', 'enema', 'enemy', 'enjoy', 'ennui', 'enrol', 'ensue', 'enter', 'entry',
	'envoy', 'epoch', 'epoxy', 'equal', 'equip', 'erase', 'erect', 'erode', 'erred', 'error',
	'erupt', 'essay', 'ether', 'ethic', 'ethos', 'evade', 'evens', 'event', 'every', 'evict',
	'evoke', 'exact', 'exalt', 'exams', 'excel', 'exert', 'exile', 'exist', 'exits', 'expat',
	'extol', 'extra', 'exude', 'exult', 'eying', 'eyrie',

	// F words
	'fable', 'faced', 'facer', 'faces', 'facet', 'facts', 'faded', 'fader', 'fades', 'fails',
	'faint', 'fairs', 'fairy', 'faith', 'faked', 'faker', 'fakes', 'falls', 'false', 'famed',
	'fancy', 'fangs', 'farce', 'fared', 'fares', 'farms', 'fatal', 'fated', 'fates', 'fatso',
	'fatty', 'fault', 'fauna', 'fauns', 'favor', 'fawns', 'faxed', 'faxes', 'fazed', 'fazes',
	'fears', 'feast', 'feats', 'fecal', 'feces', 'feeds', 'feels', 'feign', 'feint', 'fella',
	'felon', 'femme', 'femur', 'fence', 'fends', 'feral', 'ferry', 'fetal', 'fetch', 'feted',
	'fetes', 'fetid', 'fetus', 'feud', 'feuds', 'fever', 'fewer', 'fiber', 'fibre', 'ficus',
	'field', 'fiend', 'fiery', 'fifth', 'fifty', 'fight', 'filch', 'filed', 'filer', 'files',
	'filet', 'fills', 'filly', 'films', 'filmy', 'filth', 'final', 'finch', 'finds', 'fined',
	'finer', 'fines', 'fired', 'firer', 'fires', 'firms', 'first', 'fishy', 'fists', 'fitly',
	'fits', 'fitted', 'fiver', 'fives', 'fixed', 'fixer', 'fixes', 'fizzy', 'fjord', 'flack',
	'flags', 'flair', 'flake', 'flaky', 'flame', 'flank', 'flaps', 'flare', 'flash', 'flask',
	'flats', 'flaws', 'flays', 'fleas', 'fleck', 'flees', 'fleet', 'flesh', 'flick', 'flied',
	'flier', 'flies', 'fling', 'flint', 'flips', 'flirt', 'float', 'flock', 'flogs', 'flood',
	'floor', 'flops', 'flora', 'floss', 'flour', 'flout', 'flown', 'flows', 'flubs', 'flues',
	'fluff', 'fluid', 'fluke', 'fluky', 'flung', 'flunk', 'flush', 'flute', 'foams', 'foamy',
	'focal', 'focus', 'fogey', 'foggy', 'foils', 'foist', 'folds', 'folks', 'folly', 'fonts',
	'foods', 'fools', 'foray', 'force', 'forge', 'forgo', 'forks', 'forms', 'forte', 'forth',
	'forts', 'forty', 'forum', 'fossil', 'foster', 'fouls', 'found', 'fount', 'fours', 'fowls',
	'foxes', 'foyer', 'frail', 'frame', 'frank', 'fraud', 'frays', 'freak', 'freed', 'freer',
	'frees', 'fresh', 'friar', 'fried', 'fries', 'frisk', 'frizz', 'frock', 'frogs', 'frolic',
	'front', 'frost', 'froth', 'frown', 'froze', 'fruit', 'frump', 'fudge', 'fuels', 'fugal',
	'fugue', 'fully', 'fumed', 'fumer', 'fumes', 'funds', 'fungi', 'funks', 'funky', 'funny',
	'furry', 'fused', 'fuses', 'fussy', 'fusty', 'futon', 'fuzzy',

	// G words
	'gable', 'gaffe', 'gaily', 'gains', 'gaits', 'gales', 'galls', 'games', 'gamer', 'gamma',
	'gamut', 'gangs', 'gaped', 'gaper', 'gapes', 'garbs', 'gases', 'gasps', 'gassy', 'gated',
	'gates', 'gauge', 'gaunt', 'gauze', 'gauzy', 'gavel', 'gawks', 'gawky', 'gazer', 'gazes',
	'gears', 'gecko', 'geeks', 'geeky', 'geese', 'geezer', 'gels', 'gems', 'genes', 'genie',
	'genre', 'gents', 'genus', 'germs', 'ghost', 'giant', 'gibed', 'gibes', 'giddy', 'gifts',
	'gilds', 'gills', 'gilts', 'gimpy', 'girth', 'girly', 'gismo', 'gists', 'given', 'giver',
	'gives', 'gizmo', 'glade', 'gland', 'glare', 'glass', 'glaze', 'gleam', 'glean', 'glebe',
	'glees', 'glens', 'glide', 'glint', 'glitz', 'gloat', 'globe', 'globs', 'gloom', 'glory',
	'gloss', 'glove', 'glows', 'glued', 'glues', 'gluey', 'glugs', 'gluts', 'glyph', 'gnarl',
	'gnars', 'gnash', 'gnats', 'gnaws', 'gnome', 'goads', 'goals', 'goats', 'godly', 'goers',
	'going', 'golds', 'golfs', 'goner', 'gongs', 'gonna', 'goods', 'goody', 'gooey', 'goofs',
	'goofy', 'goons', 'goose', 'gored', 'gores', 'gorge', 'gotta', 'gouge', 'gourd', 'gowns',
	'grace', 'grade', 'grads', 'graft', 'grail', 'grain', 'grams', 'grand', 'grant', 'grape',
	'graph', 'grasp', 'grass', 'grate', 'grave', 'gravy', 'grays', 'graze', 'great', 'greed',
	'greek', 'green', 'greet', 'greys', 'grief', 'grift', 'grill', 'grime', 'grimy', 'grind',
	'grins', 'gripe', 'grips', 'grits', 'groan', 'groat', 'groin', 'groom', 'grope', 'gross',
	'group', 'grout', 'grove', 'growl', 'grown', 'grows', 'grubs', 'gruel', 'gruff', 'grump',
	'grunt', 'guano', 'guard', 'guava', 'guess', 'guest', 'guide', 'guild', 'guilt', 'guise',
	'gulch', 'gulfs', 'gulls', 'gulps', 'gummy', 'gumps', 'gunks', 'gunky', 'gunny', 'guppy',
	'gurus', 'gusto', 'gusts', 'gusty', 'gutsy', 'gutta', 'guys', 'gypsy',

	// H words
	'habit', 'hacks', 'hails', 'hairs', 'hairy', 'hales', 'halfs', 'halls', 'halos', 'halts',
	'halve', 'hands', 'handy', 'hangs', 'hanks', 'happy', 'hardy', 'harem', 'harms', 'harps',
	'harpy', 'harsh', 'haste', 'hasty', 'hatch', 'hated', 'hater', 'hates', 'hauls', 'haunt',
	'haven', 'haves', 'havoc', 'hawks', 'hazed', 'hazel', 'hazer', 'hazes', 'heads', 'heady',
	'heals', 'heaps', 'heard', 'hears', 'heart', 'heats', 'heave', 'heavy', 'hedge', 'heeds',
	'heels', 'hefts', 'hefty', 'heist', 'helix', 'hello', 'helms', 'helps', 'hence', 'henna',
	'herbs', 'herds', 'heron', 'heros', 'hertz', 'hewed', 'hewer', 'hexed', 'hexes', 'hicks',
	'hided', 'hider', 'hides', 'highs', 'hiked', 'hiker', 'hikes', 'hills', 'hilly', 'hilts',
	'hinds', 'hinge', 'hints', 'hippo', 'hippy', 'hired', 'hirer', 'hires', 'hitch', 'hived',
	'hives', 'hoard', 'hoars', 'hoary', 'hobby', 'hobos', 'hocks', 'hoist', 'holds', 'holed',
	'holes', 'holey', 'holly', 'holms', 'homer', 'homes', 'homey', 'honed', 'honer', 'hones',
	'honey', 'honks', 'honor', 'hoods', 'hooey', 'hoofs', 'hooks', 'hooky', 'hoops', 'hoots',
	'hoped', 'hoper', 'hopes', 'horde', 'horns', 'horny', 'horse', 'hosed', 'hoses', 'hotel',
	'hotly', 'hound', 'hours', 'house', 'hovel', 'hover', 'howdy', 'howls', 'hubby', 'huffs',
	'huffy', 'huger', 'hulks', 'hulky', 'hulls', 'human', 'humid', 'humor', 'humps', 'humpy',
	'humus', 'hunch', 'hunks', 'hunky', 'hunts', 'hurls', 'hurry', 'hurts', 'husks', 'husky',
	'hussy', 'hutch', 'hyena', 'hymen', 'hymns', 'hyped', 'hyper', 'hypes',

	// I-Z words (common ones)
	'icier', 'icing', 'ideal', 'ideas', 'idiom', 'idiot', 'idled', 'idler', 'idles', 'idols',
	'igloos', 'image', 'imams', 'imbue', 'impel', 'imply', 'inbox', 'incur', 'index', 'indie',
	'inept', 'inert', 'infer', 'infos', 'inks', 'inked', 'inlet', 'inner', 'input', 'inter',
	'intro', 'irate', 'irked', 'irony', 'isled', 'isles', 'issue', 'itchy', 'items', 'ivory',

	'jab', 'jabs', 'jacks', 'jaded', 'jades', 'jails', 'jakes', 'jambs', 'jams', 'janky',
	'jaunt', 'jazzy', 'jeans', 'jeeps', 'jeers', 'jello', 'jelly', 'jerks', 'jerky', 'jests',
	'jewel', 'jiffy', 'jilts', 'jimmy', 'jinks', 'jinxs', 'jived', 'jiver', 'jives', 'jobs',
	'jocks', 'johns', 'joins', 'joint', 'joked', 'joker', 'jokes', 'jokey', 'jolly', 'jolts',
	'joust', 'joyed', 'judge', 'juice', 'juicy', 'julep', 'jumbo', 'jumps', 'jumpy', 'junco',
	'junks', 'junky', 'juror', 'justs',

	'kales', 'karma', 'kayak', 'kazoo', 'kebab', 'keels', 'keens', 'keeps', 'kelps', 'kempt',
	'ketch', 'keyed', 'khaki', 'kicks', 'kiddo', 'kills', 'kilns', 'kilts', 'kinds', 'kinda',
	'kings', 'kinks', 'kinky', 'kiosk', 'knack', 'knead', 'kneed', 'kneel', 'knees', 'knelt',
	'knife', 'knits', 'knobs', 'knock', 'knoll', 'knots', 'known', 'knows', 'koala', 'kudos',

	'label', 'labor', 'laced', 'lacer', 'laces', 'lacey', 'lacks', 'laded', 'laden', 'lades',
	'ladle', 'lager', 'laird', 'lairs', 'lakes', 'lambs', 'lamed', 'lamer', 'lames', 'lamps',
	'lance', 'lands', 'lanes', 'lanky', 'lapel', 'lapse', 'large', 'larks', 'larva', 'laser',
	'lasso', 'lasts', 'latch', 'later', 'latex', 'lathe', 'latin', 'lauds', 'laugh', 'layer',
	'leafy', 'leaks', 'leaky', 'leans', 'leant', 'leaps', 'leapt', 'learn', 'lease', 'leash',
	'least', 'leave', 'ledge', 'leech', 'leeks', 'leers', 'leery', 'lefts', 'lefty', 'legal',
	'lemma', 'lemon', 'lemur', 'lends', 'leper', 'level', 'lever', 'lexis', 'liars', 'libel',
	'licks', 'lifer', 'lifts', 'light', 'liked', 'liken', 'liker', 'likes', 'lilac', 'limbo',
	'limbs', 'limed', 'limes', 'limey', 'limit', 'limps', 'lined', 'linen', 'liner', 'lines',
	'lingo', 'links', 'lions', 'lipid', 'lisps', 'lists', 'liter', 'lithe', 'litre', 'lived',
	'liven', 'liver', 'lives', 'livid', 'llama', 'llano', 'loads', 'loafs', 'loams', 'loamy',
	'loans', 'loath', 'lobby', 'lobed', 'lobes', 'local', 'locus', 'lodge', 'lofts', 'lofty',
	'logic', 'login', 'logon', 'loins', 'loner', 'longs', 'looks', 'looms', 'loons', 'loony',
	'loops', 'loopy', 'loose', 'loots', 'loped', 'loper', 'lopes', 'lords', 'lorry', 'loser',
	'loses', 'lossy', 'lotus', 'louse', 'lousy', 'louts', 'loved', 'lover', 'loves', 'lower',
	'lowly', 'loyal', 'lucid', 'lucks', 'lucky', 'lulls', 'lumps', 'lumpy', 'lunar', 'lunch',
	'lunge', 'lungs', 'lurch', 'lured', 'lurer', 'lures', 'lurks', 'lusts', 'lusty', 'lymph',
	'lynch', 'lyric',

	'macho', 'macro', 'madam', 'madly', 'mafia', 'magic', 'magma', 'maids', 'mails', 'maims',
	'mains', 'maize', 'major', 'maker', 'makes', 'males', 'malls', 'malts', 'malty', 'mamas',
	'mambo', 'maned', 'manes', 'manga', 'mango', 'mangy', 'mania', 'manic', 'manly', 'manor',
	'maple', 'march', 'mares', 'marks', 'marry', 'marsh', 'masks', 'mason', 'mass', 'masts',
	'match', 'mated', 'mater', 'mates', 'matey', 'maths', 'matte', 'mauls', 'maven', 'maxed',
	'maxes', 'maxim', 'maybe', 'mayor', 'mazes', 'meads', 'meals', 'mealy', 'means', 'meant',
	'meats', 'meaty', 'mecca', 'medal', 'media', 'medic', 'meeds', 'meek', 'meets', 'melds',
	'melee', 'melon', 'melts', 'memo', 'memos', 'mends', 'menus', 'meows', 'mercy', 'merge',
	'merit', 'merry', 'messy', 'metal', 'meted', 'meter', 'metes', 'metro', 'mezzo', 'micro',
	'midst', 'might', 'miked', 'mikes', 'milks', 'milky', 'mills', 'mimed', 'mimer', 'mimes',
	'mimic', 'mince', 'minds', 'mined', 'miner', 'mines', 'mingy', 'minim', 'minor', 'mints',
	'minty', 'minus', 'mired', 'mires', 'mirth', 'miser', 'missy', 'mists', 'misty', 'miter',
	'mitre', 'mitts', 'mixed', 'mixer', 'mixes', 'moans', 'moats', 'mocks', 'modal', 'model',
	'modem', 'modes', 'moist', 'molar', 'molds', 'moldy', 'moles', 'molls', 'molts', 'momma',
	'mommy', 'money', 'monks', 'month', 'mooch', 'moods', 'moody', 'moons', 'moors', 'moose',
	'moped', 'moper', 'mopes', 'moral', 'moray', 'morph', 'morse', 'morts', 'mossy', 'motel',
	'motes', 'moths', 'motif', 'motor', 'motto', 'mould', 'moult', 'mound', 'mount', 'mourn',
	'mouse', 'mousy', 'mouth', 'moved', 'mover', 'moves', 'movie', 'mowed', 'mower', 'mucks',
	'mucky', 'mucus', 'muddy', 'muffs', 'muffy', 'muggy', 'mulch', 'mules', 'mulls', 'mumps',
	'munch', 'mural', 'murks', 'murky', 'mused', 'muser', 'muses', 'mushy', 'music', 'musks',
	'musky', 'mussy', 'musty', 'muted', 'muter', 'mutes', 'mutts', 'muzzy', 'myths',

	'naans', 'nacho', 'nails', 'naive', 'naked', 'named', 'namer', 'names', 'nanny', 'napes',
	'nappy', 'narcs', 'narks', 'nasal', 'nasty', 'natal', 'naval', 'navel', 'naves', 'navvy',
	'neaps', 'nears', 'necks', 'needs', 'needy', 'nerds', 'nerdy', 'nerve', 'nervy', 'nests',
	'never', 'newer', 'newly', 'newsy', 'newts', 'nexus', 'nicer', 'niche', 'nicks', 'niece',
	'nifty', 'night', 'nimbi', 'ninja', 'ninny', 'ninth', 'nippy', 'nitro', 'nodal', 'noddy',
	'nodes', 'noise', 'noisy', 'nomad', 'nonce', 'nooks', 'noons', 'noose', 'norms', 'north',
	'nosed', 'noses', 'nosey', 'notch', 'noted', 'noter', 'notes', 'nouns', 'novel', 'nubby',
	'nuked', 'nukes', 'nulls', 'numbs', 'nurse', 'nutty', 'nylon', 'nymph',

	'oaken', 'oared', 'oases', 'oasis', 'oaten', 'oater', 'oaths', 'occur', 'ocean', 'ocher',
	'ochre', 'octet', 'octyl', 'oculi', 'odder', 'oddly', 'odors', 'odour', 'offal', 'offed',
	'offer', 'often', 'ogled', 'ogler', 'ogles', 'ogres', 'oiled', 'oiler', 'oinks', 'okays',
	'olden', 'older', 'oldie', 'olive', 'ombre', 'omega', 'omens', 'omits', 'onset', 'oozed',
	'oozes', 'opens', 'opera', 'opine', 'opium', 'opted', 'optic', 'orbit', 'orcas', 'order',
	'organ', 'other', 'otter', 'ought', 'ounce', 'ousts', 'outdo', 'outed', 'outer', 'outgo',
	'outre', 'ovals', 'ovary', 'ovate', 'ovens', 'overt', 'ovoid', 'ovule', 'owing', 'owled',
	'owned', 'owner', 'oxide', 'ozone',

	'paced', 'pacer', 'paces', 'packs', 'pacts', 'paddy', 'padre', 'paean', 'pagan', 'paged',
	'pager', 'pages', 'pains', 'paint', 'pairs', 'paler', 'pales', 'palms', 'palmy', 'palsy',
	'panda', 'paned', 'panel', 'panes', 'pangs', 'panic', 'pansy', 'pants', 'panty', 'papal',
	'papas', 'papaw', 'paper', 'parch', 'pared', 'parer', 'pares', 'paris', 'parks', 'parry',
	'parse', 'parts', 'party', 'paste', 'pasts', 'pasty', 'patch', 'pated', 'pater', 'pates',
	'paths', 'patio', 'patsy', 'patty', 'pause', 'paved', 'paver', 'paves', 'pawns', 'payed',
	'payee', 'payer', 'peace', 'peach', 'peaks', 'peaky', 'peals', 'pearl', 'pears', 'peats',
	'peaty', 'pecks', 'pedal', 'peeks', 'peels', 'peeps', 'peers', 'pelts', 'penal', 'pence',
	'penny', 'perch', 'perks', 'perky', 'perms', 'pesky', 'pesto', 'pests', 'petal', 'peter',
	'petty', 'phase', 'phone', 'phony', 'photo', 'piano', 'picks', 'picky', 'piece', 'piety',
	'piggy', 'pigmy', 'piked', 'piker', 'pikes', 'piled', 'piler', 'piles', 'pills', 'pilot',
	'pimps', 'pinch', 'pined', 'pines', 'pings', 'pinko', 'pinks', 'pinky', 'pinny', 'pinto',
	'pints', 'pinup', 'pious', 'piped', 'piper', 'pipes', 'pique', 'pitch', 'piths', 'pithy',
	'piton', 'pitta', 'pivot', 'pixel', 'pixie', 'pizza', 'place', 'plaid', 'plain', 'plait',
	'plane', 'plank', 'plans', 'plant', 'plate', 'playa', 'plays', 'plaza', 'plead', 'pleas',
	'pleat', 'plebe', 'plebs', 'plied', 'plier', 'plies', 'plink', 'plods', 'plonk', 'plops',
	'plots', 'ploys', 'pluck', 'plugs', 'plumb', 'plume', 'plump', 'plums', 'plumy', 'plunk',
	'plush', 'poach', 'pocks', 'pocky', 'podgy', 'poems', 'poets', 'point', 'poise', 'poked',
	'poker', 'pokes', 'pokey', 'polar', 'poled', 'poler', 'poles', 'polka', 'polls', 'polyp',
	'pomp', 'ponds', 'pongs', 'ponys', 'pooch', 'pooed', 'pools', 'poops', 'popes', 'poppy',
	'porch', 'pored', 'porer', 'pores', 'porgy', 'pork', 'porks', 'porky', 'porno', 'ports',
	'posed', 'poser', 'poses', 'posit', 'posse', 'posts', 'potty', 'pouch', 'poult', 'pound',
	'pours', 'pouts', 'pouty', 'power', 'prams', 'prank', 'prate', 'prawn', 'prays', 'preen',
	'press', 'prexy', 'preys', 'price', 'prick', 'pride', 'pried', 'prier', 'pries', 'prigs',
	'prima', 'prime', 'primp', 'prims', 'print', 'prior', 'prism', 'priss', 'privy', 'prize',
	'probe', 'prods', 'profs', 'promo', 'proms', 'prone', 'prong', 'proof', 'props', 'prose',
	'prosy', 'proud', 'prove', 'prowl', 'prows', 'proxy', 'prude', 'prune', 'pryer', 'psalm',
	'pubic', 'puffy', 'pulls', 'pulps', 'pulpy', 'pulse', 'pumps', 'punch', 'punks', 'punky',
	'punny', 'punts', 'pupae', 'pupal', 'pupas', 'pupil', 'puppy', 'puree', 'purer', 'purge',
	'purrs', 'purse', 'pushy', 'pussy', 'putts', 'putty', 'pygmy', 'pylon',

	'quack', 'quaff', 'quail', 'qualm', 'quark', 'quart', 'quasi', 'queen', 'queer', 'quell',
	'query', 'quest', 'queue', 'quick', 'quids', 'quiet', 'quiff', 'quill', 'quilt', 'quips',
	'quirk', 'quits', 'quota', 'quote', 'quoth',

	'rabbi', 'rabid', 'raced', 'racer', 'races', 'racks', 'radar', 'radii', 'radio', 'radix',
	'radon', 'rafts', 'raged', 'rager', 'rages', 'raids', 'rails', 'rains', 'rainy', 'raise',
	'rajah', 'raked', 'raker', 'rakes', 'rally', 'ramps', 'ranch', 'rands', 'range', 'rangy',
	'ranks', 'rants', 'rapid', 'raspy', 'rated', 'rater', 'rates', 'ratio', 'ratty', 'raved',
	'ravel', 'raven', 'raver', 'raves', 'rawer', 'rawly', 'rayon', 'razed', 'razer', 'razes',
	'razor', 'reach', 'react', 'reads', 'ready', 'realm', 'reams', 'reaps', 'rears', 'rebel',
	'rebid', 'rebut', 'recap', 'recur', 'recut', 'redid', 'redo', 'redos', 'reeds', 'reedy',
	'reeks', 'reeky', 'reels', 'refer', 'refit', 'regal', 'reign', 'reins', 'relax', 'relay',
	'relic', 'relit', 'remit', 'remix', 'renal', 'rends', 'renew', 'rents', 'repay', 'repel',
	'reply', 'repos', 'rerun', 'reset', 'resin', 'rests', 'retry', 'reuse', 'revel', 'revue',
	'rhino', 'rhyme', 'rider', 'rides', 'ridge', 'rids', 'rifle', 'rifts', 'right', 'rigid',
	'rigor', 'riled', 'riles', 'rills', 'rinds', 'rings', 'rinks', 'rinse', 'riots', 'ripen',
	'riper', 'risen', 'riser', 'rises', 'risks', 'risky', 'rites', 'ritzy', 'rival', 'rived',
	'riven', 'river', 'rives', 'rivet', 'roach', 'roads', 'roams', 'roars', 'roast', 'robed',
	'robes', 'robin', 'robot', 'rocks', 'rocky', 'rodeo', 'rogue', 'roles', 'rolls', 'roman',
	'romps', 'roofs', 'rooks', 'rooms', 'roomy', 'roost', 'roots', 'roped', 'roper', 'ropes',
	'roses', 'rosin', 'rotor', 'rouge', 'rough', 'round', 'rouse', 'route', 'routs', 'roved',
	'rover', 'roves', 'rowdy', 'rowed', 'rower', 'royal', 'rucks', 'ruddy', 'ruder', 'rugby',
	'ruin', 'ruins', 'ruled', 'ruler', 'rules', 'rumba', 'rumor', 'rumps', 'runes', 'rungs',
	'runny', 'runts', 'runty', 'rupee', 'rural', 'rusts', 'rusty', 'saber',

	'sable', 'sabre', 'sacks', 'sadly', 'safer', 'safes', 'sagas', 'sager', 'sages', 'sahib',
	'sails', 'saint', 'sakes', 'salad', 'salon', 'salsa', 'salts', 'salty', 'salve', 'salvo',
	'samba', 'sands', 'sandy', 'saner', 'sangs', 'sapid', 'sappy', 'saree', 'sarge', 'sassy',
	'satay', 'sated', 'sates', 'satin', 'satyr', 'sauce', 'saucy', 'sauna', 'saute', 'saved',
	'saver', 'saves', 'savor', 'savoy', 'savvy', 'sawed', 'sayer', 'scabs', 'scads', 'scald',
	'scale', 'scalp', 'scaly', 'scamp', 'scams', 'scans', 'scant', 'scare', 'scarf', 'scars',
	'scary', 'scats', 'scene', 'scent', 'schmo', 'scoff', 'scold', 'scone', 'scoop', 'scoot',
	'scope', 'score', 'scorn', 'scots', 'scour', 'scout', 'scowl', 'scram', 'scrap', 'scree',
	'screw', 'scrim', 'scrip', 'scrub', 'scrum', 'scuba', 'scuds', 'scuff', 'sculk', 'scull',
	'seals', 'seams', 'seamy', 'sears', 'seats', 'sects', 'sedan', 'seedy', 'seeks', 'seems',
	'seeps', 'seers', 'seize', 'sells', 'semen', 'semis', 'sends', 'sense', 'sepia', 'sepoy',
	'septa', 'serfs', 'serge', 'serif', 'serum', 'serve', 'servo', 'setup', 'seven', 'sever',
	'sewed', 'sewer', 'sexed', 'sexes', 'shade', 'shady', 'shaft', 'shags', 'shake', 'shaky',
	'shale', 'shall', 'shame', 'shams', 'shank', 'shape', 'shard', 'share', 'shark', 'sharp',
	'shave', 'shawl', 'sheaf', 'shear', 'sheds', 'sheen', 'sheep', 'sheer', 'sheet', 'sheik',
	'shelf', 'shell', 'shied', 'shier', 'shies', 'shift', 'shill', 'shims', 'shine', 'shins',
	'shiny', 'ships', 'shire', 'shirk', 'shirr', 'shirt', 'shits', 'shive', 'shoal', 'shock',
	'shoed', 'shoes', 'shone', 'shook', 'shoos', 'shoot', 'shops', 'shore', 'shorn', 'short',
	'shots', 'shout', 'shove', 'shown', 'shows', 'showy', 'shred', 'shrew', 'shrub', 'shrug',
	'shuck', 'shuns', 'shunt', 'shush', 'shuts', 'shyer', 'shyly', 'sibyl', 'sided', 'sides',
	'sidle', 'siege', 'sieve', 'sifts', 'sighs', 'sight', 'sigma', 'signs', 'silks', 'silky',
	'sills', 'silly', 'silts', 'silty', 'since', 'sinew', 'sings', 'sinks', 'sinus', 'sired',
	'siren', 'sires', 'sissy', 'sitar', 'sited', 'sites', 'sixth', 'sixty', 'sized', 'sizer',
	'sizes', 'skate', 'skeet', 'skein', 'skids', 'skied', 'skier', 'skies', 'skill', 'skimp',
	'skims', 'skins', 'skint', 'skips', 'skirt', 'skits', 'skulk', 'skull', 'skunk', 'slabs',
	'slack', 'slags', 'slain', 'slake', 'slams', 'slang', 'slant', 'slaps', 'slash', 'slate',
	'slats', 'slays', 'sleds', 'sleek', 'sleep', 'sleet', 'slept', 'slice', 'slick', 'slide',
	'slime', 'slimy', 'sling', 'slink', 'slips', 'slits', 'slobs', 'slogs', 'slope', 'slops',
	'slosh', 'sloth', 'slots', 'slows', 'slubs', 'slues', 'slugs', 'slums', 'slung', 'slunk',
	'slurp', 'slurs', 'slush', 'slyly', 'smack', 'small', 'smart', 'smash', 'smear', 'smell',
	'smelt', 'smile', 'smirk', 'smite', 'smith', 'smock', 'smogs', 'smoke', 'smoky', 'smote',
	'snack', 'snafu', 'snags', 'snail', 'snake', 'snaky', 'snaps', 'snare', 'snarl', 'sneak',
	'sneer', 'snick', 'snide', 'sniff', 'snips', 'snits', 'snobs', 'snoop', 'snore', 'snort',
	'snots', 'snout', 'snowy', 'snubs', 'snuck', 'snuff', 'snugs', 'soapy', 'soars', 'sober',
	'socks', 'sodas', 'sofas', 'softy', 'soggy', 'soils', 'solar', 'soled', 'soles', 'solid',
	'solos', 'solve', 'sonar', 'songs', 'sonic', 'sonny', 'sooth', 'soots', 'sooty', 'soppy',
	'sorry', 'sorts', 'so', 'sough', 'souls', 'sound', 'soups', 'soupy', 'sours', 'south',
	'sowed', 'sower', 'space', 'spade', 'spams', 'spans', 'spare', 'spark', 'spars', 'spasm',
	'spate', 'spawn', 'speak', 'spear', 'speck', 'specs', 'speed', 'spell', 'spend', 'spent',
	'sperm', 'spice', 'spicy', 'spied', 'spiel', 'spier', 'spies', 'spike', 'spiky', 'spill',
	'spilt', 'spine', 'spins', 'spiny', 'spire', 'spite', 'spits', 'splat', 'splay', 'split',
	'spoke', 'spoof', 'spook', 'spool', 'spoon', 'spore', 'sport', 'spots', 'spout', 'spray',
	'spree', 'sprig', 'sprit', 'sprout', 'spruce', 'spuds', 'spume', 'spumy', 'spunk', 'spurn',
	'spurs', 'spurt', 'squad', 'squat', 'squaw', 'squib', 'squid', 'stabs', 'stack', 'staff',
	'stage', 'stags', 'staid', 'stain', 'stair', 'stake', 'stale', 'stalk', 'stall', 'stamp',
	'stand', 'stank', 'staph', 'stare', 'stark', 'stars', 'start', 'stash', 'state', 'stave',
	'stays', 'stead', 'steak', 'steal', 'steam', 'steed', 'steel', 'steep', 'steer', 'stems',
	'steno', 'steps', 'stern', 'stews', 'stick', 'stiff', 'stile', 'still', 'stilt', 'sting',
	'stink', 'stint', 'stirr', 'stirs', 'stock', 'stoic', 'stoke', 'stole', 'stomp', 'stone',
	'stony', 'stood', 'stool', 'stoop', 'stops', 'store', 'stork', 'storm', 'story', 'stout',
	'stove', 'stows', 'strap', 'straw', 'stray', 'strep', 'strew', 'strip', 'strop', 'strum',
	'strut', 'stubs', 'stuck', 'studs', 'study', 'stuff', 'stump', 'stums', 'stung', 'stunk',
	'stuns', 'stunt', 'style', 'suave', 'sucks', 'sucky', 'suede', 'suets', 'sugar', 'suite',
	'suits', 'sulks', 'sulky', 'sully', 'sumac', 'sumps', 'sunks', 'sunny', 'sunup', 'super',
	'surer', 'surfs', 'surfy', 'surge', 'surly', 'sushi', 'swabs', 'swamp', 'swams', 'swank',
	'swans', 'swaps', 'swarm', 'swash', 'swath', 'swats', 'sways', 'swear', 'sweat', 'sweep',
	'sweet', 'swell', 'swept', 'swift', 'swigs', 'swill', 'swims', 'swine', 'swing', 'swipe',
	'swirl', 'swish', 'swiss', 'swoon', 'swoop', 'sword', 'swore', 'sworn', 'swung', 'sylph',
	'synod', 'syrup',

	'tabby', 'table', 'taboo', 'tacit', 'tacks', 'tacky', 'tacos', 'tails', 'taint', 'taken',
	'taker', 'takes', 'tales', 'talks', 'talky', 'tally', 'talon', 'tamed', 'tamer', 'tames',
	'tamps', 'tangs', 'tangy', 'tanks', 'taper', 'tapes', 'tardy', 'tarps', 'tarry', 'tarts',
	'tarty', 'tasks', 'taste', 'tasty', 'tatty', 'taunt', 'tawny', 'taxed', 'taxer', 'taxes',
	'taxis', 'teach', 'teaks', 'teals', 'teams', 'tears', 'teary', 'tease', 'teats', 'techs',
	'techy', 'teddy', 'teens', 'teeny', 'teeth', 'tells', 'telly', 'tempo', 'temps', 'tempt',
	'tends', 'tense', 'tenth', 'tents', 'tepee', 'tepid', 'terms', 'terns', 'terry', 'terse',
	'tests', 'testy', 'texts', 'thank', 'thaws', 'theft', 'their', 'theme', 'hence', 'there',
	'these', 'thick', 'thief', 'thigh', 'thing', 'think', 'thins', 'third', 'thong', 'thorn',
	'those', 'three', 'threw', 'throb', 'throw', 'thrum', 'thuds', 'thugs', 'thumb', 'thump',
	'thyme', 'tiara', 'tibia', 'ticks', 'tidal', 'tided', 'tides', 'tiers', 'tiger', 'tight',
	'tikes', 'tilde', 'tiled', 'tiler', 'tiles', 'tilts', 'timed', 'timer', 'times', 'timid',
	'tinct', 'tinny', 'tints', 'tippy', 'tipsy', 'tired', 'tires', 'titan', 'title', 'titty',
	'tizzy', 'toads', 'toady', 'toast', 'today', 'toddy', 'toffs', 'toffy', 'token', 'tolls',
	'tombs', 'tomes', 'tommy', 'tonal', 'toned', 'toner', 'tones', 'tongs', 'tonic', 'tonks',
	'tools', 'tooth', 'toots', 'topaz', 'topic', 'topps', 'torch', 'torso', 'torts', 'total',
	'totem', 'touch', 'tough', 'tours', 'touts', 'towed', 'towel', 'tower', 'towns', 'toxic',
	'toxin', 'trace', 'track', 'tract', 'trade', 'trail', 'train', 'trait', 'tramp', 'trams',
	'trans', 'traps', 'trash', 'trawl', 'trays', 'tread', 'treat', 'trees', 'trend', 'tress',
	'triad', 'trial', 'tribe', 'trick', 'tried', 'trier', 'tries', 'trigs', 'trike', 'trill',
	'trims', 'trios', 'trips', 'trite', 'troll', 'tromp', 'troop', 'trope', 'troth', 'trots',
	'trout', 'trove', 'truce', 'truck', 'trued', 'truer', 'trues', 'truly', 'trump', 'trunk',
	'truss', 'trust', 'truth', 'tryst', 'tubed', 'tuber', 'tubes', 'tucks', 'tufts', 'tulip',
	'tumid', 'tummy', 'tumor', 'tumps', 'tunas', 'tuned', 'tuner', 'tunes', 'tunic', 'turbo',
	'turds', 'turfs', 'turfy', 'turns', 'tutor', 'tutus', 'tuxes', 'twain', 'twang', 'tweak',
	'tweed', 'tweet', 'twice', 'twigs', 'twill', 'twine', 'twirl', 'twist', 'twixt', 'tying',
	'tykes', 'typed', 'types', 'typos',

	'udder', 'ulcer', 'ultra', 'umbra', 'umped', 'umpth', 'unarm', 'unbar', 'uncle', 'uncut',
	'under', 'undid', 'undue', 'unfed', 'unfit', 'unify', 'union', 'unite', 'units', 'unity',
	'unlit', 'unmet', 'unpin', 'unrig', 'unrip', 'unsay', 'unset', 'untie', 'until', 'unwed',
	'unwet', 'unwit', 'unwon', 'upper', 'upset', 'urate', 'urban', 'urged', 'urger', 'urges',
	'urine', 'usage', 'users', 'usher', 'using', 'usual', 'usurp', 'usury', 'uteri', 'utter',

	'vague', 'vales', 'valet', 'valid', 'valor', 'value', 'valve', 'vamps', 'vanes', 'vangs',
	'vapid', 'vapor', 'vases', 'vasts', 'vault', 'vaunt', 'veals', 'veeps', 'veers', 'vegan',
	'veils', 'veins', 'veiny', 'veldt', 'venal', 'vends', 'venom', 'vents', 'venue', 'verbs',
	'verge', 'verse', 'verso', 'verve', 'vests', 'vetch', 'vexed', 'vexes', 'vials', 'viand',
	'vibes', 'vicar', 'video', 'views', 'vigil', 'vigor', 'viler', 'villa', 'vills', 'vines',
	'vinyl', 'viola', 'viols', 'viper', 'viral', 'virus', 'visas', 'vised', 'vises', 'visit',
	'visor', 'vista', 'vital', 'vivid', 'vixen', 'vizor', 'vocal', 'vodka', 'vogue', 'voice',
	'voids', 'voila', 'voles', 'volts', 'vomit', 'voted', 'voter', 'votes', 'vouch', 'vowed',
	'vowel', 'vroom', 'vulva',

	'wacko', 'wacky', 'waded', 'wader', 'wades', 'wafer', 'wafts', 'waged', 'wager', 'wages',
	'wagon', 'waifs', 'wails', 'waist', 'waits', 'waive', 'waked', 'waken', 'waker', 'wakes',
	'walks', 'walls', 'wands', 'waned', 'wanes', 'wants', 'wards', 'wared', 'wares', 'warms',
	'warns', 'warps', 'warts', 'warty', 'washy', 'wasps', 'waspy', 'waste', 'watch', 'water',
	'watts', 'waved', 'waver', 'waves', 'wavey', 'waxed', 'waxen', 'waxer', 'waxes', 'weals',
	'weans', 'wears', 'weary', 'weave', 'webby', 'weber', 'wedge', 'wedgy', 'weeds', 'weedy',
	'weeks', 'weeny', 'weeps', 'weepy', 'weigh', 'weird', 'weirs', 'welch', 'wells', 'welsh',
	'welts', 'wench', 'wends', 'wests', 'wetly', 'whack', 'whale', 'whams', 'wharf', 'wheat',
	'wheel', 'whelk', 'whelm', 'whelp', 'where', 'which', 'whiff', 'while', 'whims', 'whine',
	'whiny', 'whips', 'whirl', 'whirr', 'whirs', 'whisk', 'white', 'whits', 'whole', 'whoop',
	'whose', 'wicks', 'widen', 'wider', 'widow', 'width', 'wield', 'wifes', 'wifey', 'wifty',
	'wiled', 'wiles', 'wills', 'willy', 'wilts', 'wimps', 'wimpy', 'wince', 'winch', 'winds',
	'windy', 'wined', 'wines', 'winey', 'wings', 'winks', 'wiped', 'wiper', 'wipes', 'wired',
	'wirer', 'wires', 'wispy', 'witch', 'withe', 'withy', 'witty', 'wives', 'wizen', 'woken',
	'wolfs', 'woman', 'wombs', 'women', 'wonks', 'wonky', 'wonts', 'woods', 'woody', 'wooed',
	'wooer', 'woofs', 'wools', 'wooly', 'woozy', 'words', 'wordy', 'works', 'world', 'worms',
	'wormy', 'worry', 'worse', 'worst', 'worth', 'would', 'wound', 'woven', 'wowed', 'wrack',
	'wraps', 'wrath', 'wreak', 'wreck', 'wrest', 'wrier', 'wring', 'wrist', 'write', 'writs',
	'wrong', 'wrote', 'wrung', 'wryly',

	'xenon', 'xerox',

	'yacht', 'yahoo', 'yanks', 'yards', 'yarns', 'yawls', 'yawns', 'yeahs', 'yearn', 'years',
	'yeast', 'yells', 'yelps', 'yield', 'yikes', 'yodel', 'yokes', 'yolks', 'young', 'yourn',
	'yours', 'youth', 'yowls', 'yucky', 'yukky', 'yummy', 'yurts',

	'zappy', 'zazen', 'zeals', 'zebra', 'zeros', 'zests', 'zesty', 'zilch', 'zincs', 'zines',
	'zings', 'zingy', 'zippy', 'zonal', 'zoned', 'zoner', 'zones', 'zonks', 'zooms'
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
