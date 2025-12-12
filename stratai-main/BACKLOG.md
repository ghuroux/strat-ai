# StratAI Development Backlog

This file tracks planned features and improvements organized by topic.

---

## 1. Prompt Caching Optimization

**Status**: Phase 1 Complete (System Prompt Caching)
**Priority**: High
**Potential Savings**: 50-90% reduction in API costs

### Completed
- [x] Automatic system prompt caching via LiteLLM config
- [x] Cache control types added to API interfaces
- [x] Cache header logging for monitoring

### Phase 2: Conversation History Caching
- [ ] Add cache breakpoints to conversation history
- [ ] Mark the last user message before current as cached
- [ ] Strategic breakpoints every N messages

**Implementation**: Modify `+server.ts` to add `cache_control: {type: "ephemeral"}` to conversation history messages, not just system prompts.

### Phase 3: Cost Tracking UI
- [ ] Parse cache statistics from API responses (`cache_read_input_tokens`, `cache_creation_input_tokens`)
- [ ] Store per-conversation cache stats
- [ ] Display savings in UI (e.g., "Saved $0.04 this conversation")
- [ ] Add cache hit indicator to messages

### Phase 4: Intelligent Cache Management
- [ ] Detect cache TTL expiration (5 min for Anthropic)
- [ ] Pre-warm cache for frequently used system prompts
- [ ] Optimize system prompt structure for cache efficiency
- [ ] Consider 1-hour TTL for stable content

### Phase 5: Analytics & Insights
- [ ] Track cache hit rates per conversation
- [ ] Dashboard showing overall caching effectiveness
- [ ] Identify conversations that benefit most from caching
- [ ] Monthly savings reports

### Technical Notes
- Anthropic: 90% discount on cached reads, 25% premium on cache writes, 5-min TTL
- OpenAI: 50% discount, automatic caching for 1024+ token prompts
- Minimum cacheable content: ~1024 tokens (model-dependent)
- Cache is per-model, per-prompt prefix

---

## 2. Token Estimation & Context Management

**Status**: Complete
**Priority**: High

### Completed
- [x] Accurate token counting with js-tiktoken
- [x] Message overhead calculation (~4 tokens per message)
- [x] Image token estimation (1 token per 750 pixels)
- [x] Context window percentage display

### Future Improvements
- [ ] Real-time token count as user types
- [ ] Warning when approaching context limit
- [ ] Automatic conversation summarization when near limit
- [ ] Per-model token cost display

---

## 3. Chat Persistence & History

**Status**: Not Started
**Priority**: Critical (Core Feature)

### Phase 1: Local Storage Persistence
- [ ] Save conversations to browser localStorage
- [ ] Auto-save on each message
- [ ] Restore current conversation on page refresh
- [ ] Handle storage quota limits gracefully

### Phase 2: Chat History Sidebar
- [ ] Sidebar with list of past conversations
- [ ] Chat titles (auto-generated from first message or AI-suggested)
- [ ] Timestamp and preview for each chat
- [ ] Search across chat history
- [ ] Delete individual chats

### Phase 3: Chat Management
- [ ] Rename conversations
- [ ] Pin important chats
- [ ] Archive old conversations
- [ ] Bulk delete/export

### Phase 4: Cloud Sync (Future)
- [ ] Optional account system
- [ ] Sync chats across devices
- [ ] End-to-end encryption option
- [ ] Conversation sharing

### Technical Considerations
- localStorage limit: ~5-10MB per domain
- Consider IndexedDB for larger storage needs
- Compression for long conversations
- Migration strategy when moving to cloud

---

## 5. User Experience Enhancements

**Status**: Not Started
**Priority**: Medium

### Prompt Templates
- [ ] Save frequently used prompts
- [ ] Quick-access template selector
- [ ] Variable substitution in templates
- [ ] Share templates between users

### Keyboard Shortcuts
- [ ] `Cmd/Ctrl + Enter` to send
- [ ] `Cmd/Ctrl + K` for quick model switch
- [ ] `Cmd/Ctrl + /` for command palette
- [ ] `Escape` to cancel generation

### Message Editing
- [ ] Edit sent messages and regenerate
- [ ] Fork conversation from any point
- [ ] Compare different response branches

### Code Features
- [ ] Syntax highlighting in responses
- [ ] One-click code copy
- [ ] Code block language detection
- [ ] Run code snippets (sandboxed)

---

## 6. Export & Sharing

**Status**: Not Started
**Priority**: Low

### Export Formats
- [ ] Export conversation as Markdown
- [ ] Export as PDF
- [ ] Export as JSON (for backup/import)

### Sharing
- [ ] Generate shareable conversation links
- [ ] Privacy controls for shared conversations
- [ ] Embed conversations in external sites

---

## 7. Advanced Model Features

**Status**: Partial
**Priority**: Medium

### Completed
- [x] Extended thinking for Claude models
- [x] Model capability detection
- [x] Fallback model configuration

### Future
- [ ] Multi-model comparison (ask same question to multiple models)
- [ ] Model routing based on task type
- [ ] Fine-tuned model support
- [ ] Local model integration (Ollama)

---

## 8. Search & RAG

**Status**: Not Started
**Priority**: Medium

### Web Search Integration
- [ ] Real-time web search during conversations
- [ ] Source citation in responses
- [ ] Search result preview

### Document RAG
- [ ] Upload documents for context
- [ ] Vector search across uploaded files
- [ ] Citation of source documents

---

## Priority Matrix

| Feature | Impact | Effort | Priority |
|---------|--------|--------|----------|
| Chat Persistence (localStorage) | **Critical** | Medium | **P0** |
| Chat History Sidebar | **Critical** | Medium | **P0** |
| New Chat / Chat Switching | **Critical** | Low | **P0** |
| Conversation History Caching | High | Low | P1 |
| Cost Tracking UI | Medium | Medium | P2 |
| Keyboard Shortcuts | Medium | Low | P2 |
| Message Editing | High | High | P3 |
| Export to Markdown | Low | Low | P3 |
| Multi-model Comparison | Medium | High | P4 |

---

## Notes

- **World-class chat basics first**: Persistence and history are table stakes for any chat app
- Focus on features that reduce costs or improve daily usability
- Caching has the best ROI - low effort, high savings
- UI polish can wait until core functionality is solid
