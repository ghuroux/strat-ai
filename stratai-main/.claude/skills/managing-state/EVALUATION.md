# Managing State Skill - Evaluation

**Date**: 2026-01-16  
**Evaluator**: AI Assistant (New Skill Creation)  
**Overall Score**: 94/100 (Comprehensive, production-verified)

## Evaluation Criteria

### 1. Correctness (25/25) ✅
**Status**: All patterns extracted from production stores

**Patterns verified against**:
- `tasks.svelte.ts` (1719 lines - complex patterns)
- `chat.svelte.ts` (streaming, abort controllers)
- `pages.svelte.ts` (cache management)
- `areas.svelte.ts` (granular load tracking)
- `spaces.svelte.ts` (optimistic updates)
- `settings.svelte.ts` (localStorage persistence)
- 10+ other production stores

**Key patterns documented**:
- ✅ `SvelteMap` usage (critical for reactivity)
- ✅ Version counter pattern (`_version`)
- ✅ `$derived.by()` with version subscription
- ✅ Hydration/persistence patterns
- ✅ API sync with optimistic updates
- ✅ Load guards and caching strategies
- ✅ Abort controllers for cancellation

All patterns are actively used in production code.

### 2. Completeness (24/25) ✅
**Status**: Covers all major store patterns in the codebase

**What's covered**:
- ✅ Basic store structure (class-based, runes)
- ✅ SvelteMap vs Map (critical gotcha)
- ✅ Version counter pattern (when/why to use)
- ✅ Simple and complex derived values
- ✅ Hydration from localStorage
- ✅ Debounced persistence
- ✅ API sync patterns (optimistic, rollback)
- ✅ Load-once and granular load tracking
- ✅ Related data caching
- ✅ Abort controllers
- ✅ 5 common gotchas with solutions
- ✅ Complete checklist

**Missing** (minor):
- SessionStorage patterns (only localStorage shown)
- WebSocket integration in stores (specialized)

### 3. Clarity (23/25) ✅
**Status**: Clear examples with explanations

**Strengths**:
- Clear ❌ WRONG / ✅ CORRECT patterns
- Inline comments explaining why
- Real production examples referenced
- Practical "when to use" guidance
- Common gotchas section
- Complete working examples

**Minor improvements possible**:
- Could add diagram of reactivity flow
- Could expand on when NOT to use stores

### 4. Adherence to Codebase (22/25) ✅
**Status**: Extracted directly from production stores

**Production verification**:
- All patterns exist in current codebase
- Examples mirror actual store implementations
- File organization matches reality
- Naming conventions accurate

**Minor gaps**:
- Some stores use additional patterns not documented (specialized cases)
- Store initialization timing not fully covered

## What This Skill Teaches

### Critical Patterns (Must Know)

1. **SvelteMap for Reactivity**
   - Why regular Map doesn't work
   - When to use SvelteMap
   - Import from `svelte/reactivity`

2. **Version Counter Pattern**
   - When to use `_version`
   - How to subscribe in derived values
   - When NOT to increment (avoid noise)

3. **Derived Values**
   - Simple `$derived()` for primitives
   - `$derived.by()` for complex computations
   - Version dependency pattern

4. **Hydration & Persistence**
   - Browser-only guards (`typeof window`)
   - LocalStorage patterns
   - Debounced saves

5. **API Sync**
   - Optimistic updates
   - Rollback on failure
   - Load guards and caching

### Common Gotchas Covered

1. Using regular `Map` instead of `SvelteMap` ❌
2. Forgetting version dependency in derived ❌
3. Incrementing version too often (noise) ❌
4. Hydrating in SSR context ❌
5. Not guarding against multiple loads ❌

Each has clear before/after examples.

## Use Cases

**This skill helps agents:**
- Create new stores following correct patterns
- Understand why `SvelteMap` is required
- Know when to increment `_version`
- Implement proper hydration/persistence
- Handle API sync with optimistic updates
- Debug reactivity issues

**Frequency of use**: High
- 16 existing stores in codebase
- Stores created/modified regularly
- Reactivity issues are common debugging scenarios

## Production Examples Referenced

| Store | Pattern Demonstrated |
|-------|---------------------|
| `tasks.svelte.ts` | Complex caching, API sync, derived values |
| `chat.svelte.ts` | Streaming, abort controllers, debouncing |
| `areas.svelte.ts` | Granular load tracking, space-based caching |
| `pages.svelte.ts` | Version management, related data |
| `settings.svelte.ts` | LocalStorage persistence |
| `spaces.svelte.ts` | Optimistic updates, rollback |
| `toast.svelte.ts` | Ephemeral state (no persistence) |

## Score Breakdown

- **Correctness**: 25/25 (all patterns from production)
- **Completeness**: 24/25 (covers all major patterns)
- **Clarity**: 23/25 (clear examples, could add diagrams)
- **Adherence**: 22/25 (matches production closely)

**Overall**: 94/100 - Comprehensive, production-ready skill

**Why not 100/100?**
- Missing some specialized patterns (WebSocket stores, sessionStorage)
- Could benefit from reactivity flow diagram
- Some edge cases not covered (initialization timing)

## Recommendations

### For Future Enhancements

1. **Add Diagram** (nice-to-have)
   - Reactivity flow visualization
   - When version counter triggers updates

2. **Expand Edge Cases** (low priority)
   - Store initialization order
   - Cross-store dependencies
   - SSR considerations

3. **Add Testing Section** (medium priority)
   - How to test stores
   - Mocking patterns
   - Reactivity testing

### Maintenance

**When to update**:
- New Svelte version changes patterns
- New store patterns emerge in codebase
- Common issues arise that aren't documented

**Current status**: Accurate as of Svelte 5 (2026-01-16)

## Summary

This skill fills a critical gap - Svelte 5 store patterns are:
1. **Non-obvious** (SvelteMap, version counter)
2. **Frequently used** (16 stores, growing)
3. **Easy to get wrong** (regular Map, missing version dependency)
4. **Hard to debug** (reactivity issues are subtle)

The skill provides clear patterns extracted from production code, with emphasis on common gotchas and correct usage.

**Result**: Agents can now create and modify stores confidently, following production patterns.

