# Page Sharing Phase 2 - Testing Plan

> **Status:** Ready for Testing
> **Date:** 2026-01-13
> **Prerequisite:** Phase 1 Backend Complete, Phase 2 Frontend Complete

---

## Testing Overview

This plan covers 88 acceptance criteria organized into 4 testing phases:
1. **Critical Path** (must work) - 25 criteria
2. **Feature Complete** (full functionality) - 35 criteria
3. **Edge Cases & Errors** - 15 criteria
4. **Polish & Accessibility** - 13 criteria

---

## Phase 1: Critical Path Testing (Priority: HIGH)

These are the core flows that must work for the feature to be usable.

### 1.1 Share Button & Modal Open
| # | Test | Status |
|---|------|--------|
| 1 | Open an existing page you own | ☐ |
| 2 | Share button visible in header | ☐ |
| 3 | Click Share → modal opens | ☐ |
| 4 | Modal shows page title in header | ☐ |
| 5 | Close button (X) closes modal | ☐ |
| 6 | Escape key closes modal | ☐ |
| 7 | Click outside closes modal | ☐ |

### 1.2 Visibility Display
| # | Test | Status |
|---|------|--------|
| 8 | 3 visibility cards shown (Private/Area/Space) | ☐ |
| 9 | Current visibility (Private) is selected | ☐ |
| 10 | Area card shows area name ("StraTech Group") | ☐ |
| 11 | Space card shows space name ("Work") | ☐ |
| 12 | Info box explains current visibility | ☐ |

### 1.3 Share List Display
| # | Test | Status |
|---|------|--------|
| 13 | Owner shown first with name and "(You)" badge | ☐ |
| 14 | Owner has "Owner" badge with lock icon | ☐ |
| 15 | Previously added shares display with names | ☐ |
| 16 | Shares show permission badges (Viewer/Editor/Admin) | ☐ |
| 17 | Header shows count: "People with Access (N)" | ☐ |

### 1.4 Add Share (Basic)
| # | Test | Status |
|---|------|--------|
| 18 | Search input visible when Private | ☐ |
| 19 | Type 2+ characters → search triggers | ☐ |
| 20 | Search results appear | ☐ |
| 21 | Click user → adds them as Viewer | ☐ |
| 22 | Toast shows "Added {name} as viewer" | ☐ |
| 23 | New share appears in list | ☐ |

### 1.5 Change Permission (Basic)
| # | Test | Status |
|---|------|--------|
| 24 | Click permission badge → dropdown opens | ☐ |
| 25 | Select different permission → saves | ☐ |

**Phase 1 Complete:** ☐ (25/25 passing)

---

## Phase 2: Feature Complete Testing (Priority: MEDIUM)

Full functionality testing including all operations.

### 2.1 Search & Invite Details
| # | Test | Status |
|---|------|--------|
| 26 | Search placeholder: "Search by name or email..." | ☐ |
| 27 | Search debounced (doesn't fire on every keystroke) | ☐ |
| 28 | Loading spinner during search | ☐ |
| 29 | Users show: avatar, name, email | ☐ |
| 30 | Groups show: icon, name, member count | ☐ |
| 31 | Results exclude page owner | ☐ |
| 32 | Results exclude already-shared users | ☐ |
| 33 | Escape closes search results | ☐ |
| 34 | Click outside closes search results | ☐ |

### 2.2 Permission Selector Details
| # | Test | Status |
|---|------|--------|
| 35 | Dropdown shows 3 options with descriptions | ☐ |
| 36 | Current permission has checkmark | ☐ |
| 37 | Selecting same permission just closes dropdown | ☐ |
| 38 | Loading spinner during permission save | ☐ |
| 39 | Toast: "Changed {name} to {permission}" | ☐ |
| 40 | Cannot change own permission (no selector shown) | ☐ |

### 2.3 Remove Share
| # | Test | Status |
|---|------|--------|
| 41 | X button visible on each share (except owner) | ☐ |
| 42 | X button turns red on hover | ☐ |
| 43 | Click X → confirmation modal appears | ☐ |
| 44 | Confirmation shows user/group name | ☐ |
| 45 | Cancel button closes confirmation | ☐ |
| 46 | Remove button removes share | ☐ |
| 47 | Toast: "Removed {name}" | ☐ |
| 48 | Share disappears from list | ☐ |
| 49 | Cannot remove owner (no X button) | ☐ |

### 2.4 Visibility Changes
| # | Test | Status |
|---|------|--------|
| 50 | Click Area → selects it | ☐ |
| 51 | Click Space → selects it | ☐ |
| 52 | Click Private → selects it | ☐ |
| 53 | Search section hidden when Area/Space | ☐ |
| 54 | Share list hidden when Area/Space | ☐ |
| 55 | Info box updates for each visibility | ☐ |
| 56 | Toast: "Page is now {visibility}" | ☐ |

### 2.5 Visibility Confirmation (when shares exist)
| # | Test | Status |
|---|------|--------|
| 57 | Private→Area with shares shows confirmation | ☐ |
| 58 | Private→Space with shares shows confirmation | ☐ |
| 59 | Confirmation shows share count to be removed | ☐ |
| 60 | Cancel keeps current visibility | ☐ |
| 61 | Confirm changes visibility and removes shares | ☐ |
| 62 | Area→Private doesn't require confirmation | ☐ |

**Phase 2 Complete:** ☐ (37/37 passing)

---

## Phase 3: Edge Cases & Error Handling (Priority: MEDIUM-LOW)

### 3.1 Error Scenarios
| # | Test | Status |
|---|------|--------|
| 63 | Add share fails → error toast shown | ☐ |
| 64 | Permission change fails → error toast, dropdown stays open | ☐ |
| 65 | Remove share fails → error toast | ☐ |
| 66 | Visibility change fails → error toast | ☐ |
| 67 | Search returns no results → appropriate message | ☐ |

### 3.2 Edge Cases
| # | Test | Status |
|---|------|--------|
| 68 | Empty shares list shows "No one else has access" | ☐ |
| 69 | Very long user names truncate properly | ☐ |
| 70 | Very long group names truncate properly | ☐ |
| 71 | Multiple shares sort correctly (owner first, then alpha) | ☐ |
| 72 | Rapid permission changes don't cause issues | ☐ |

### 3.3 Keyboard Navigation
| # | Test | Status |
|---|------|--------|
| 73 | Arrow keys navigate search results | ☐ |
| 74 | Enter selects highlighted result | ☐ |
| 75 | Tab through modal elements works | ☐ |

**Phase 3 Complete:** ☐ (13/13 passing)

---

## Phase 4: Polish & Accessibility (Priority: LOW)

### 4.1 Visual Polish
| # | Test | Status |
|---|------|--------|
| 76 | Permission badges use correct colors (gray/green/blue) | ☐ |
| 77 | Hover states on all interactive elements | ☐ |
| 78 | Transitions smooth (150-200ms) | ☐ |
| 79 | Works in dark mode | ☐ |
| 80 | Works in light mode | ☐ |
| 81 | Consistent styling with area sharing modal | ☐ |

### 4.2 Mobile Responsive
| # | Test | Status |
|---|------|--------|
| 82 | Modal full-screen on <768px viewport | ☐ |
| 83 | Touch targets 44x44px minimum | ☐ |
| 84 | Scrolling works smoothly on mobile | ☐ |

### 4.3 Accessibility
| # | Test | Status |
|---|------|--------|
| 85 | Modal has role="dialog" | ☐ |
| 86 | Modal has aria-modal="true" | ☐ |
| 87 | Search has aria-autocomplete="list" | ☐ |
| 88 | All icon buttons have aria-label | ☐ |

**Phase 4 Complete:** ☐ (13/13 passing)

---

## Issue Tracking

### Bugs Found
| # | Description | Severity | Status |
|---|-------------|----------|--------|
| | | | |

### Missing Features
| # | Description | Priority | Status |
|---|-------------|----------|--------|
| | | | |

### Polish Items
| # | Description | Priority | Status |
|---|-------------|----------|--------|
| | | | |

---

## Test Data Setup

Before testing, ensure you have:
1. At least one other user in your space/area (for search results)
2. A page you own in a non-deleted area
3. Optionally: A group with members (for group sharing test)

If you don't have other users, search will return no results - that's expected behavior.

---

## Summary

| Phase | Criteria | Passing | Status |
|-------|----------|---------|--------|
| 1. Critical Path | 25 | 0 | ☐ |
| 2. Feature Complete | 37 | 0 | ☐ |
| 3. Edge Cases | 13 | 0 | ☐ |
| 4. Polish | 13 | 0 | ☐ |
| **Total** | **88** | **0** | ☐ |

---

## Next Steps After Testing

1. **If all critical path passes:** Move to Phase 3 (Audit UI)
2. **If bugs found:** Fix bugs, re-test affected criteria
3. **After Phase 2 complete:** Update CLAUDE.md session log, commit changes
