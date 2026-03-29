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

## When Adding New UI Elements
1. Define styles in the appropriate CSS file (`side_panel.css` or `options.css`), **NOT** as inline `style.cssText`
2. Use existing CSS variables for colors, backgrounds, and borders
3. Use `color: inherit` for text to respect the parent theme context
4. If a new variable is needed, add it to both `:root` (light) AND the dark theme override section
5. Verify the element looks correct in both light and dark modes

## Implementation Details
- Dark theme overrides: Colors that need dark-mode-specific values are set via JS (`applyDarkThemeColors` in the settings system) which updates CSS variables at runtime
- Existing patterns to follow: See `input[type="text"]` and `.event-description-input` in `side_panel.css` for form element styling examples
