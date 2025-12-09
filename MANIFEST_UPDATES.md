# Manifest.json Updates for Paid Plan Implementation

This document outlines the required changes to `manifest.json` to support the paid plan functionality.

## Required Changes

### 1. Add Host Permissions for License API

Add the following host permissions to allow the extension to communicate with your license validation server:

```json
{
  "host_permissions": [
    "https://www.googleapis.com/*",
    "https://your-license-api.com/*",
    "https://api.stripe.com/*"
  ]
}
```

**Replace `your-license-api.com` with your actual license API domain.**

### 2. Update Content Security Policy (Optional but Recommended)

If using external payment processing, update the CSP to allow connections to payment and license APIs:

```json
{
  "content_security_policy": {
    "extension_pages": "script-src 'self'; object-src 'self'; connect-src 'self' https://www.googleapis.com https://your-license-api.com https://api.stripe.com;"
  }
}
```

### 3. Ensure Storage Permission Exists

The existing permissions already include `storage`, which is required for license data. Verify it exists:

```json
{
  "permissions": [
    "sidePanel",
    "identity",
    "storage",  // <-- Required for license storage
    "notifications",
    "alarms"
  ]
}
```

### 4. Optional: Add Web Accessible Resources (if needed)

If your payment flow requires accessing extension resources from external pages:

```json
{
  "web_accessible_resources": [
    {
      "resources": [
        "src/payment/success.html",
        "src/payment/cancel.html"
      ],
      "matches": ["<all_urls>"]
    }
  ]
}
```

## Complete Updated manifest.json Example

Here's a complete example based on the current `manifest.sample.json`:

```json
{
  "manifest_version": 3,
  "default_locale": "en",
  "name": "SideTimeTable",
  "version": "2.0.0",
  "description": "__MSG_appDesc__",

  "permissions": [
    "sidePanel",
    "identity",
    "storage",
    "notifications",
    "alarms"
  ],

  "host_permissions": [
    "https://www.googleapis.com/*",
    "https://your-license-api.com/*",
    "https://api.stripe.com/*"
  ],

  "content_security_policy": {
    "extension_pages": "script-src 'self'; object-src 'self'; connect-src 'self' https://www.googleapis.com https://your-license-api.com https://api.stripe.com;"
  },

  "oauth2": {
    "client_id": "YOUR_GOOGLE_CLIENT_ID",
    "scopes": ["https://www.googleapis.com/auth/calendar.readonly"]
  },

  "key": "YOUR_EXTENSION_KEY",

  "action": {
    "default_popup": "src/side_panel/side_panel.html"
  },

  "side_panel": {
    "default_path": "src/side_panel/side_panel.html"
  },

  "background": {
    "service_worker": "dist/background.bundle.js"
  },

  "options_page": "src/options/options.html",

  "icons": {
    "16": "src/img/icon16.png",
    "32": "src/img/icon32.png",
    "48": "src/img/icon48.png",
    "128": "src/img/icon128.png"
  },

  "commands": {
    "open-side-panel": {
      "suggested_key": {
        "default": "Ctrl+Shift+S",
        "mac": "Command+Shift+S"
      },
      "description": "__MSG_toggleSidePanelShortcut__"
    }
  },

  "web_accessible_resources": [
    {
      "resources": [
        "src/payment/success.html",
        "src/payment/cancel.html"
      ],
      "matches": ["<all_urls>"]
    }
  ]
}
```

## Implementation Steps

1. **Copy manifest.sample.json to manifest.json** (if not already done)
   ```bash
   cp manifest.sample.json manifest.json
   ```

2. **Apply the changes above** to your `manifest.json`

3. **Replace placeholder domains**:
   - `your-license-api.com` → Your actual license API domain (e.g., `sidetimetable-license.your-domain.com`)
   - `YOUR_GOOGLE_CLIENT_ID` → Your Google OAuth2 client ID
   - `YOUR_EXTENSION_KEY` → Your Chrome extension key

4. **Test the changes**:
   - Run `npm run build`
   - Reload extension in `chrome://extensions/`
   - Check browser console for any CSP or permission errors

## Security Considerations

### Host Permissions

Host permissions grant the extension ability to make requests to specified domains. Only add domains you control or trust:

- ✅ **Good**: `https://your-license-api.com/*` (your controlled server)
- ✅ **Good**: `https://www.googleapis.com/*` (Google APIs)
- ❌ **Bad**: `<all_urls>` (avoid unless absolutely necessary)

### Content Security Policy

The CSP ensures that the extension only loads scripts and resources from trusted sources:

- `script-src 'self'` - Only load scripts from the extension itself
- `connect-src` - Whitelist domains for fetch/XHR requests
- Never use `'unsafe-eval'` or `'unsafe-inline'` unless absolutely required

### Storage Permission

The `storage` permission allows the extension to:
- Store license data in `chrome.storage.sync` (synced across devices)
- Store user preferences
- Limit: 100KB per extension (sync storage)

License data structure is small (~1-2KB), so this is sufficient.

## License API Domain Setup

### Option 1: Firebase (Recommended for Quick Setup)

If using Firebase, use your project's functions domain:

```json
{
  "host_permissions": [
    "https://*.cloudfunctions.net/*"
  ]
}
```

Or with custom domain:
```json
{
  "host_permissions": [
    "https://api.your-domain.com/*"
  ]
}
```

### Option 2: Supabase

If using Supabase Edge Functions:

```json
{
  "host_permissions": [
    "https://*.supabase.co/*"
  ]
}
```

Or with custom domain:
```json
{
  "host_permissions": [
    "https://api.your-domain.com/*"
  ]
}
```

### Option 3: Custom Server

For self-hosted API:

```json
{
  "host_permissions": [
    "https://api.your-domain.com/*"
  ]
}
```

Ensure your server:
- Uses HTTPS (required for Chrome extensions)
- Has proper CORS headers
- Implements rate limiting
- Has SSL certificate (Let's Encrypt or commercial)

## Stripe Integration

### Required Permissions

For Stripe Checkout integration, add:

```json
{
  "host_permissions": [
    "https://api.stripe.com/*",
    "https://checkout.stripe.com/*"
  ]
}
```

### CSP Updates

Add Stripe domains to `connect-src`:

```json
{
  "content_security_policy": {
    "extension_pages": "script-src 'self'; connect-src 'self' https://api.stripe.com https://checkout.stripe.com;"
  }
}
```

## Testing Permissions

### Verify Permissions Are Granted

After updating manifest and reloading the extension:

1. Go to `chrome://extensions/`
2. Find SideTimeTable
3. Click "Details"
4. Check "Permissions" section
5. Verify all required permissions are listed

### Test API Connectivity

Open browser console and test:

```javascript
// Test license API connectivity
fetch('https://your-license-api.com/api/health')
  .then(response => response.json())
  .then(data => console.log('API health:', data))
  .catch(error => console.error('API error:', error));
```

### Common Issues

**Issue**: `net::ERR_BLOCKED_BY_CLIENT`
- **Cause**: Missing host permission
- **Fix**: Add domain to `host_permissions`

**Issue**: CSP violation errors
- **Cause**: Attempting to connect to non-whitelisted domain
- **Fix**: Add domain to CSP `connect-src` directive

**Issue**: Permission warnings during extension load
- **Cause**: New permissions added require user consent
- **Fix**: Users will see a permission prompt on extension update (this is expected)

## User Privacy Considerations

### Minimal Data Collection

The license system should only collect:
- License key
- Extension version
- Validation timestamps

**Do NOT collect**:
- Calendar data
- Personal events
- User location
- Browsing history

### Update Privacy Policy

Update your privacy policy (`docs/privacy.html`) to include:

```markdown
## License Validation

SideTimeTable Premium requires license validation to activate premium features.

We collect:
- License key (for validation)
- Extension version (for compatibility checks)
- Last validation timestamp (to manage license status)

We do NOT collect:
- Calendar events or content
- Personal information beyond email (if provided during purchase)
- Usage analytics (unless explicitly opted-in)

License data is transmitted over HTTPS and stored securely.
```

## Chrome Web Store Listing Updates

When submitting an update with new permissions, you'll need to:

1. **Justify New Permissions**: Explain why each permission is needed
   - Example: "host_permissions for your-license-api.com is required to validate premium license keys"

2. **Privacy Disclosure**: Update privacy practices in Chrome Web Store
   - Data collected: License key, extension version
   - Data usage: License validation only
   - Data sharing: Not shared with third parties (except payment processor)

3. **Version Bump**: Update to 2.0.0 (major version for new permissions)

## Rollback Plan

If issues arise with the new permissions:

1. Keep version 1.x available in Git
2. Can republish previous version if needed
3. Users can downgrade manually if critical issues occur

## Next Steps

After updating manifest.json:

1. ✅ Test locally with `npm run build`
2. ✅ Verify permissions in `chrome://extensions/`
3. ✅ Test license validation flow
4. ✅ Test checkout integration
5. ✅ Submit Chrome Web Store review with permission justification
6. ✅ Monitor user feedback after release

---

**Last Updated**: 2025-12-09
**Version**: 1.0
**Status**: Ready for Implementation
