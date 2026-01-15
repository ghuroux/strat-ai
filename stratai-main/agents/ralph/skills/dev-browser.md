---
name: dev-browser
description: "Browser verification for UI stories. Use when testing UI components, verifying page content, or checking visual appearance. Triggers on: verify in browser, test UI, check page, screenshot, visual test."
---

# Dev Browser Skill

## Purpose

Provide browser-based verification for UI stories. This skill guides agents on how to verify UI changes using browser automation.

## When to Use

- UI component stories need visual verification
- Page layouts need to be confirmed
- Interactive elements need testing
- Visual appearance needs validation

---

## Two Types of Verification

### 1. Functional Testing (Behavior)

Use when checking that elements exist and work correctly.

**Method:** `take_snapshot` (accessibility tree as text)

**Best for:**
- Verifying element exists
- Checking text content
- Testing button clicks
- Form submissions
- Navigation flows

**Why:** Returns structured text that agents can read and verify programmatically.

### 2. Visual Testing (Appearance)

Use when checking layout, colors, styling.

**Method:** `take_screenshot`

**Best for:**
- Layout verification
- Color and styling checks
- Animation verification
- Responsive design testing
- Design comparison

**Why:** Captures visual state for appearance verification.

---

## Token-Efficient Methods

Choose the right method based on your needs:

| Method | Use Case | Token Efficiency |
|--------|----------|------------------|
| `getInteractiveOutline()` | Discover clickable elements | ⭐⭐⭐ Most efficient |
| `getOutline()` | Understand page structure | ⭐⭐ Very efficient |
| `getVisibleText()` | Extract readable content | ⭐⭐ Very efficient |
| `getAISnapshot()` | Full accessibility tree | ⭐ Standard |
| `take_screenshot` | Visual appearance | Uses vision tokens |

---

## Verification Patterns

### Pattern 1: Verify Element Exists

```markdown
**Verify:**
1. Navigate to the page
2. Use `take_snapshot` to capture accessibility tree
3. Confirm element with expected text/role exists
```

**Example Check:**
```
Verify button "Save Configuration" exists on /admin/models page
```

### Pattern 2: Verify Text Content

```markdown
**Verify:**
1. Navigate to the page
2. Use `getVisibleText()` to extract page text
3. Confirm expected text is present
```

**Example Check:**
```
Verify text "Model Configuration System" appears on page
Verify user name "John Doe" appears in header
```

### Pattern 3: Verify Form Submission

```markdown
**Verify:**
1. Navigate to form page
2. Use `getInteractiveOutline()` to find form elements
3. Fill in form fields
4. Click submit button
5. Verify success message or redirect
```

### Pattern 4: Verify Visual Layout

```markdown
**Verify:**
1. Navigate to the page
2. Use `take_screenshot` to capture appearance
3. Confirm layout matches design
4. Check colors and styling
```

### Pattern 5: Verify Responsive Design

```markdown
**Verify:**
1. Set viewport to mobile size (375x667)
2. Use `take_screenshot`
3. Confirm mobile layout is correct
4. Set viewport to desktop size (1280x800)
5. Use `take_screenshot`
6. Confirm desktop layout is correct
```

---

## Writing UI Acceptance Criteria

For UI stories, include specific verification steps:

### Component Story AC

```markdown
**Acceptance Criteria:**
- [ ] Component renders with sample data
- [ ] Loading state displays correctly
- [ ] Error state displays correctly
- [ ] Interactions work (clicks, inputs)
- [ ] npm run check passes
- [ ] npm run lint passes
- [ ] **Verify in browser:**
  - Navigate to page showing component
  - Use `take_snapshot` to verify element structure
  - Confirm expected text is present
  - Test click interactions
```

### Page Story AC

```markdown
**Acceptance Criteria:**
- [ ] Page loads without errors
- [ ] Data fetched and displayed
- [ ] Navigation works correctly
- [ ] Responsive layout on mobile
- [ ] npm run check passes
- [ ] npm run lint passes
- [ ] **Verify in browser:**
  - Navigate to page URL
  - Use `getVisibleText()` to verify content
  - Test navigation links
  - Check mobile viewport (375px width)
```

### Form Story AC

```markdown
**Acceptance Criteria:**
- [ ] Form renders with correct fields
- [ ] Validation shows errors for invalid input
- [ ] Submit button is disabled until valid
- [ ] Success message on submit
- [ ] npm run check passes
- [ ] npm run lint passes
- [ ] **Verify in browser:**
  - Navigate to form page
  - Use `getInteractiveOutline()` to find inputs
  - Test validation with invalid input
  - Submit with valid data
  - Verify success message
```

---

## Common Verification Scenarios

### Scenario: New Admin Page

```markdown
**Verify:**
1. Start dev server: `npm run dev`
2. Navigate to http://localhost:5173/admin/models
3. Verify page title "Model Configuration" is visible
4. Verify table of models is displayed
5. Verify "Add Configuration" button exists
6. Click "Add Configuration"
7. Verify modal opens with form fields
```

### Scenario: Form Validation

```markdown
**Verify:**
1. Navigate to form page
2. Click submit without filling required fields
3. Verify error messages appear for each required field
4. Fill in required fields with valid data
5. Verify error messages disappear
6. Verify submit button becomes enabled
```

### Scenario: List with Pagination

```markdown
**Verify:**
1. Navigate to list page
2. Verify items are displayed
3. Verify pagination controls exist
4. Click "Next" button
5. Verify new items are displayed
6. Verify page indicator updates
```

### Scenario: Responsive Layout

```markdown
**Verify at 375px width (mobile):**
- Navigation is collapsed to hamburger menu
- Content is single column
- Buttons are full width

**Verify at 1280px width (desktop):**
- Navigation is visible
- Content uses multi-column layout
- Buttons are inline
```

---

## Dev Server Setup

Before browser verification:

```bash
# Start the dev server
cd stratai-main
npm run dev

# Server runs at http://localhost:5173
```

Ensure the dev server is running before attempting browser verification.

---

## Error Recovery

If verification fails:

1. **Element not found:**
   - Check if page loaded fully
   - Verify correct URL
   - Check for loading states
   - Use `take_screenshot` to see current state

2. **Unexpected content:**
   - Check if data is loaded
   - Verify API calls succeeded
   - Check for error states

3. **Layout issues:**
   - Check viewport size
   - Verify CSS is loaded
   - Check for console errors

---

## Integration with AC Generator

The AC Generator skill automatically includes browser verification for UI stories:

```markdown
- [ ] **Verify in browser using dev-browser skill:**
  - [Specific verification steps]
```

This ensures all UI stories have explicit verification requirements.

---

## Reference

- **Functional testing:** Use `take_snapshot` for behavior verification
- **Visual testing:** Use `take_screenshot` for appearance verification
- **Token efficiency:** Prefer `getInteractiveOutline()` and `getVisibleText()`
- **AC patterns:** See `agents/ralph/skills/ac-generator.md`

