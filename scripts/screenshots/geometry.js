/**
 * geometry.js - Single source of truth for the screenshot frame geometry.
 *
 * capture.js sizes its viewports from these values and compose.js interpolates
 * them into the browser-frame CSS; keeping them here prevents the two from
 * drifting (a drifted capture would be silently stretched into the frame).
 */

const CANVAS_W = 1280; // Chrome Web Store standard screenshot size
const CANVAS_H = 800;
const TABSTRIP_H = 40; // mock browser tab strip
const TOOLBAR_H = 44; // mock browser toolbar
const SP_HEADER_H = 36; // mock side-panel header bar
const PANEL_W = 384; // side panel width

const CONTENT_H = CANVAS_H - TABSTRIP_H - TOOLBAR_H; // page area height
const PANEL_H = CONTENT_H - SP_HEADER_H; // side panel capture height
const PAGE_W = CANVAS_W - PANEL_W; // backdrop page width beside the panel

module.exports = {
    CANVAS_W, CANVAS_H, TABSTRIP_H, TOOLBAR_H, SP_HEADER_H,
    PANEL_W, CONTENT_H, PANEL_H, PAGE_W,
};
