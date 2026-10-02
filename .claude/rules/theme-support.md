# Theme Support (Dark/Light Mode)

This project supports dark and light themes via CSS custom properties and `[data-theme="dark"]` selectors. **All new UI elements MUST be theme-aware.**

## Rules
- **NEVER** use hardcoded colors in inline styles or JavaScript
- Always use CSS classes that reference CSS variables
- CSS variable naming convention: `--side-calendar-*` (defined in `:root` in `side_panel.css`)

## Key CSS Variables
- **Background**: `--side-calendar-input-bg`, `--side-calendar-textarea-bg`, `--side-calendar-modal-bg`
- **Borders**: `--side-calendar-input-border`, `--side-calendar-textarea-border`, `--side-calendar-border-color`
- **Text**: `inherit` or `--side-calendar-panel-text-color`, `--side-calendar-secondary-text-color`
- **Subtle backgrounds**: `--side-calendar-subtle-bg`, `--side-calendar-subtle-bg-hover`
- **Buttons**: `--side-calendar-btn-secondary-bg`, `--side-calendar-btn-secondary-text`

## Shape, depth and type
Use the shared tokens in `:root` of `side_panel.css` instead of literal values, so the panel and its dialogs stay one design:
- Corners: `--side-calendar-radius-sm` (6px: event blocks, chips, list rows), `-md` (8px: buttons, fields, icon buttons), `-lg` (12px: dialogs, popovers, cards), `-pill`
- Shadows: `--side-calendar-shadow-float` (floating pill), `-popover`, `-dialog`
- Type: `--side-calendar-font-caption` (11px), `-small` (12px), `-body` (13px), `-title` (14px), `-large` (15px)
- Icon buttons: `--side-calendar-icon-button-size` (32px), transparent, `radius-md`, `subtle-bg-hover` on hover

## Options and changelog pages
These pages keep their own colours, `--settings-*` in `src/options/settings-tokens.css` (light in `:root`, dark under `[data-theme="dark"]`), because the side panel's `--side-calendar-*` colours are rewritten at runtime when a theme is picked. Use `--settings-*` for colours there; the shape and type values use the same `--side-calendar-radius-*` / `--side-calendar-font-*` names as the side panel. Build settings with the parts in `src/options/components/base/settings-dom.js` (row, switch, select, button, notice) rather than new markup.

## When Adding New UI Elements
1. Define styles in the appropriate CSS file (`side_panel.css` or `options.css`), **NOT** as inline `style.cssText`
2. Use existing CSS variables for colors, backgrounds, and borders
3. Use `color: inherit` for text to respect the parent theme context
4. If a new variable is needed, add it to both `:root` (light) AND the dark theme override section
5. Verify the element looks correct in both light and dark modes

## Implementation Details
- Dark theme overrides: `[data-theme="dark"]` attribute on `<html>` activates dark mode. Theme colors are managed by `resolveThemeColors()` in `src/lib/color-themes.js` which updates CSS variables at runtime
- Existing patterns to follow: See `input[type="text"]` and `.event-description-input` in `side_panel.css` for form element styling examples
