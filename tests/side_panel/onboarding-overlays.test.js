/**
 * Tests for the first-run overlays (initial setup, tutorial): they start
 * hidden, and a stray Escape must not "finish" them.
 *
 * Regression: both are created hidden through style.display (the base
 * class) without the `hidden` attribute, and _isActive() only looked at the
 * attribute. Any Escape in the side panel (closing a dialog, the memo, the
 * calendar filter) then ran setup's _finish(), which saved the setup
 * defaults over the user's work hours, language and reminder settings, and
 * reloaded the panel.
 */

jest.mock('../../src/lib/storage-helper.js', () => ({ StorageHelper: { get: jest.fn(), set: jest.fn() } }));
jest.mock('../../src/lib/settings-storage.js', () => ({ loadSettings: jest.fn(), saveSettings: jest.fn() }));
jest.mock('../../src/lib/chrome-messaging.js', () => ({ sendMessage: jest.fn() }));
jest.mock('../../src/lib/google-button-helper.js', () => ({ createGoogleSignInButton: jest.fn() }));

import { InitialSetupComponent } from '../../src/side_panel/components/setup/initial-setup-component.js';
import { TutorialComponent } from '../../src/side_panel/components/tutorial/tutorial-component.js';

function fakeElement({ display = '', hiddenAttr = false } = {}) {
  return { style: { display }, hasAttribute: (name) => name === 'hidden' && hiddenAttr };
}

describe.each([
  ['InitialSetupComponent', InitialSetupComponent],
  ['TutorialComponent', TutorialComponent],
])('%s._isActive', (_name, OverlayComponent) => {
  test('is not active before it was ever shown (hidden by style only)', () => {
    const overlay = new OverlayComponent();
    overlay.element = fakeElement({ display: 'none' });
    expect(overlay._isActive()).toBe(false);
  });

  test('is not active once finished (hidden attribute)', () => {
    const overlay = new OverlayComponent();
    overlay.element = fakeElement({ display: 'none', hiddenAttr: true });
    expect(overlay._isActive()).toBe(false);
  });

  test('is active while shown', () => {
    const overlay = new OverlayComponent();
    overlay.element = fakeElement({ display: '' });
    expect(overlay._isActive()).toBe(true);
  });

  test('is not active without an element', () => {
    expect(new OverlayComponent()._isActive()).toBe(false);
  });
});
