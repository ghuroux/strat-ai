# StratAI Easter Eggs

> **Document Purpose:** Collection of easter egg ideas to add personality and delight to StratAI. Easter eggs should reward curiosity without disrupting productivity.
>
> **Created:** January 2026
> **Status:** Ideas Collection

---

## Design Philosophy

The right easter eggs should be:

| Principle | Description |
|-----------|-------------|
| **Discoverable but not obvious** | Reward curiosity, don't advertise |
| **Professional-appropriate** | Enterprise users might find them - never embarrassing |
| **Delightful, not disruptive** | Enhance the experience, never interrupt workflow |
| **Shareable** | "Hey, did you know if you..." moments |
| **On-brand** | Fit StratAI's personality: smart, capable, with a human touch |

---

## Tier 1: Classic & Expected

These are easter eggs users might actively look for. Quick wins with high delight factor.

### Konami Code
- **Trigger:** ↑ ↑ ↓ ↓ ← → ← → B A
- **Result:** Fun animation + "You found a secret!" toast notification
- **Implementation:** Global keyboard listener, CSS animation
- **Effort:** Low (30 mins)

### Logo Easter Egg
- **Trigger:** Click the StratAI logo 7 times rapidly
- **Result:** Logo does a playful bounce animation + reveals hidden version info or fun fact
- **Bonus:** Could show build date, commit hash, or a rotating fun fact
- **Effort:** Low (30 mins)

### Hello World
- **Trigger:** User's very first message ever is "Hello World"
- **Result:** Special welcome response with ASCII art or formatted greeting
- **Example Response:**
  ```
  ╔══════════════════════════════════════╗
  ║  Hello, World! Welcome to StratAI.   ║
  ║  You speak the ancient tongue.       ║
  ║  Let's build something amazing.      ║
  ╚══════════════════════════════════════╝
  ```
- **Effort:** Low (1 hour)

### Do A Barrel Roll
- **Trigger:** Type "do a barrel roll" as a prompt
- **Result:** The entire chat container does a 360° CSS rotation before AI responds
- **Note:** Classic Google easter egg homage
- **Effort:** Low (30 mins)

---

## Tier 2: Prompt-Based Secrets

Special responses triggered by specific prompts. These add personality to the AI interactions.

### Philosophical Questions

| Prompt | Response Style |
|--------|----------------|
| "What is the meaning of life?" | "42. But between us, I think it's about asking good questions." + subtle golden styling |
| "Are you sentient?" | Thoughtful, model-specific philosophical response. Each model answers differently. |
| "What do you dream about?" | Creative, poetic response unique to each model's "personality" |
| "Do you have feelings?" | Nuanced response about AI experience, avoids both overclaiming and dismissiveness |

### Classic Programmer Humor

| Prompt | Response |
|--------|----------|
| "sudo make me a sandwich" | "Here you go. (You did say sudo...)" + sandwich emoji |
| "There's no place like 127.0.0.1" | "Agreed. localhost is where the heart is." |
| "Why do programmers prefer dark mode?" | "Because light attracts bugs." |
| "SELECT * FROM secrets" | "Nice try! But here's a fun fact instead..." |

### Meta Questions

| Prompt | Response |
|--------|----------|
| "Tell me a secret" | Reveals a fun fact about StratAI, the current model, or AI in general |
| "What do you think about [other AI model]?" | Gracious, professional "compliment" to other models |
| "Who made you?" | Credits to Anthropic/OpenAI/Google depending on model, plus StratAI team |
| "Are you better than [other model]?" | Diplomatic response about different strengths |

### Hidden Commands

| Prompt | Result |
|--------|--------|
| "Enable party mode" | Subtle confetti animation for 3 seconds |
| "Show me the matrix" | Brief Matrix-style rain animation overlay |
| "Activate focus mode" | UI dims slightly, removes distractions temporarily |

---

## Tier 3: Time & Date Based

Easter eggs that appear based on when users interact with StratAI.

### Time of Day

| Time | Easter Egg |
|------|------------|
| **Midnight - 4am** | Subtle "Burning the midnight oil?" in footer or greeting |
| **4am - 6am** | "Early bird catches the worm! You're up before most." |
| **3:14 AM/PM** | Pi symbol (π) appears subtly somewhere in the UI |
| **11:11** | "Make a wish!" toast notification (rare, delightful) |

### Special Dates

| Date | Easter Egg |
|------|------------|
| **January 1** | Confetti animation on first load + "Happy New Year!" |
| **February 14** | Hearts instead of loading dots |
| **March 14 (Pi Day)** | Pi symbol in logo, "Happy Pi Day!" toast |
| **April 1** | Responses in a silly font for first message (with toggle to disable) |
| **October 31** | Spooky theme option appears in settings |
| **December holidays** | Subtle snow effect option, festive color accents |
| **User's birthday** | If known, special celebration animation + personalized message |

### Days of Week

| Day | Easter Egg |
|-----|------------|
| **Monday** | Subtle "You've got this!" encouragement somewhere |
| **Friday** | "Happy Friday!" in greeting |
| **Weekend** | Slightly more casual AI tone if detected |

---

## Tier 4: Milestone Celebrations

Celebrate user achievements with subtle, delightful moments.

### Conversation Milestones

| Milestone | Celebration |
|-----------|-------------|
| **1st conversation** | Welcome message with tips |
| **10th conversation** | "You're getting the hang of this!" toast |
| **50th conversation** | Subtle badge unlock notification |
| **100th conversation** | Confetti + "Century Club!" toast |
| **500th conversation** | Special "Power User" recognition |
| **1000th conversation** | "Legendary" status + special theme unlock |

### Feature Discovery

| First Time | Celebration |
|------------|-------------|
| **First Arena battle** | "Welcome to the Arena, Gladiator!" with sword animation |
| **First web search** | "Now you're connected to the world!" |
| **First extended thinking** | "Deep thoughts unlocked!" |
| **First document upload** | "Knowledge base growing!" |
| **First Space created** | "Your workspace, your rules." |

### Usage Patterns

| Pattern | Easter Egg |
|---------|------------|
| **7-day streak** | "One week strong!" badge |
| **30-day streak** | "Monthly champion!" badge |
| **All models used in one day** | "Model Explorer" badge |
| **Conversation in all Spaces** | "Space Traveler" badge |

---

## Tier 5: Hidden Achievements System

A secret achievements panel accessible via settings or special trigger.

### Achievement Categories

#### Explorer Badges
| Badge | Icon | Requirement |
|-------|------|-------------|
| **First Steps** | 👣 | Complete your first conversation |
| **Space Cadet** | 🚀 | Create your first Space |
| **Arena Rookie** | ⚔️ | Complete your first Arena battle |
| **Document Hunter** | 📄 | Upload your first document |

#### Time-Based Badges
| Badge | Icon | Requirement |
|-------|------|-------------|
| **Night Owl** | 🦉 | Chat after midnight 10 times |
| **Early Bird** | 🌅 | Chat before 6am 5 times |
| **Weekend Warrior** | 🏆 | Chat on 10 different weekends |
| **Dedicated** | 📅 | 30-day usage streak |

#### Power User Badges
| Badge | Icon | Requirement |
|-------|------|-------------|
| **Polyglot** | 🎭 | Use 5 different models in one session |
| **Deep Thinker** | 🧠 | 10 conversations with extended thinking |
| **Researcher** | 🔬 | 50 web searches |
| **Wordsmith** | ✍️ | Single prompt over 1000 words |
| **Minimalist** | 🎯 | Get useful response from ≤5 word prompt |
| **Speed Demon** | ⚡ | 10 conversations in one hour |

#### Arena Badges
| Badge | Icon | Requirement |
|-------|------|-------------|
| **Gladiator** | ⚔️ | 10 Arena battles |
| **Champion** | 👑 | 50 Arena battles |
| **Judge** | ⚖️ | Vote in 100 battles |
| **Model Whisperer** | 🎯 | Correctly predict winning model 10 times |

#### Secret Badges
| Badge | Icon | Requirement |
|-------|------|-------------|
| **Easter Egg Hunter** | 🥚 | Find your first easter egg |
| **Secret Keeper** | 🤫 | Find 5 different easter eggs |
| **Completionist** | 🏅 | Unlock all discoverable badges |
| **Konami Master** | 🎮 | Enter the Konami code |

### Achievements UI

- Hidden panel in Settings → "Achievements" (or discovered via easter egg)
- Shows unlocked badges with dates
- Locked badges shown as silhouettes with hints
- Total count: "12/47 Achievements Unlocked"
- Optional: Share achievement to clipboard

---

## Tier 6: Hidden Themes

Special themes unlocked via command palette or easter eggs.

### Command Palette Themes

Type these in the command palette (⌘K):

| Command | Theme | Description |
|---------|-------|-------------|
| `theme:hacker` | Matrix | Green text on black, terminal-style |
| `theme:retro` | Synthwave | 80s neon colors, gradient backgrounds |
| `theme:paper` | Minimal | Sepia tones, newspaper-like typography |
| `theme:cozy` | Warm | Soft browns and oranges, relaxed feel |
| `theme:ocean` | Deep Blue | Calming blues and teals |
| `theme:forest` | Nature | Greens and earth tones |
| `theme:contrast` | High Contrast | Accessibility-focused, sharp contrasts |

### Theme Unlock Conditions

| Theme | How to Unlock |
|-------|---------------|
| **Hacker** | Type "I know kung fu" or find Konami code |
| **Retro** | Use StratAI for 30 days |
| **Cozy** | Chat after 10pm, 20 times |
| **Ocean** | Complete 100 conversations |

---

## Tier 7: Interactive Easter Eggs

More elaborate easter eggs that involve interaction.

### Cursor Follows
- **Trigger:** Idle for 60 seconds
- **Result:** AI avatar's "eyes" subtly follow cursor movement
- **Deactivates:** On any click or keypress

### Rubber Duck Mode
- **Trigger:** Type "rubber duck" or 🦆 emoji
- **Result:** A small rubber duck appears in corner, "listening" to your prompts
- **Concept:** Rubber duck debugging companion

### Hidden Mini-Games
- **Location:** /arcade or triggered by easter egg
- **Games:**
  - **Token Tetris:** Falling blocks, AI-themed
  - **Model Match:** Memory card game with model logos
  - **Prompt Golf:** Achieve task in fewest tokens

### Collaborative Easter Egg
- **Trigger:** 1000th user to find Konami code
- **Result:** Special recognition, name added to credits page (with permission)

---

## Tier 8: Model Personality Easter Eggs

Each model has unique personality traits revealed through specific interactions.

### Claude Models
- **Secret trait:** Literary references, philosophical depth
- **Special response:** Ask about favorite books
- **Easter egg:** Quotes Anthropic's constitutional AI principles poetically

### GPT Models
- **Secret trait:** Pop culture knowledge, playful creativity
- **Special response:** Ask for a haiku about AI
- **Easter egg:** References OpenAI's journey from GPT-1

### Gemini Models
- **Secret trait:** Scientific accuracy, multimodal enthusiasm
- **Special response:** Ask about Google's AI research
- **Easter egg:** Gets excited about images and charts

---

## Implementation Roadmap

### Phase 1: Quick Wins (2-3 hours)
- [ ] Konami Code → Toast notification
- [ ] Logo multi-click → Bounce animation
- [ ] "Do a barrel roll" → CSS rotation
- [ ] Basic prompt detection ("meaning of life", "sudo sandwich")

### Phase 2: Time-Based (Half day)
- [ ] Time of day greetings
- [ ] Special date celebrations (start with New Year)
- [ ] Milestone celebrations (100th conversation)

### Phase 3: AI Integration (1 day)
- [ ] Special prompt responses in system prompts
- [ ] Model personality responses
- [ ] Meta question handling

### Phase 4: Achievement System (2-3 days)
- [ ] Achievement data model
- [ ] Hidden achievements panel UI
- [ ] Badge unlock logic
- [ ] Celebration animations

### Phase 5: Themes & Advanced (Ongoing)
- [ ] Theme system architecture
- [ ] Command palette theme commands
- [ ] Theme unlock conditions
- [ ] Mini-games (if desired)

---

## Technical Considerations

### Storage
- Achievements: Store in user preferences (PostgreSQL)
- Easter egg discovery: Track in localStorage initially, migrate to DB
- Theme preferences: User settings

### Performance
- Easter egg checks should be lightweight
- Animations should be CSS-based where possible
- Konami code listener should be passive

### Analytics (Optional)
- Track which easter eggs are discovered most
- Measure engagement impact
- A/B test celebration intensity

### Accessibility
- All animations should respect `prefers-reduced-motion`
- Easter eggs should not be required for functionality
- Achievements should have text descriptions, not just icons

---

## Easter Egg Discovery Tracking

Consider tracking discoveries to understand engagement:

```typescript
interface EasterEggDiscovery {
  userId: string;
  eggId: string;
  discoveredAt: Date;
  trigger: string; // How they found it
}
```

This enables:
- "X% of users have found this"
- Rarity indicators on achievements
- Fun statistics page

---

## Content Guidelines

### Do
- Keep it professional enough for enterprise
- Make discoveries feel rewarding
- Add personality without being annoying
- Respect user's time and focus

### Don't
- Never block functionality behind easter eggs
- Avoid anything that could embarrass users in meetings
- Don't make easter eggs too hard to dismiss
- Avoid inside jokes that exclude users

---

## Inspiration Sources

- **Google:** "Do a barrel roll", "askew", calculator easter eggs
- **VS Code:** Konami code, numerous hidden settings
- **Slack:** Loading messages, /shrug command
- **Discord:** Many hidden animations and commands
- **Notion:** Playful empty states, celebration confetti

---

## Notes & Ideas Parking Lot

*Random ideas to revisit later:*

- Sound effects (optional, subtle) for discoveries
- Seasonal AI "moods" that subtly affect response style
- "Debug mode" easter egg showing internal metrics
- QR code hidden somewhere linking to credits
- ASCII art in console.log for developers
- Special response if user types in binary or hex
- Model "conversations" where models discuss each other
- Time capsule: Message to future self, delivered later

---

## Changelog

| Date | Change |
|------|--------|
| 2026-01-09 | Initial document created with comprehensive ideas |

---

*"The best easter eggs are the ones that make users smile and think 'these developers really care about the details.'"*
