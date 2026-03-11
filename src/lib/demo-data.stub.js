/**
 * demo-data.stub.js
 *
 * Production stub — replaces demo-data.js when built without --env demo.
 * All demo-specific functions are no-ops or return safe production defaults.
 * isDemoMode() always returns false, so no demo code path is reachable.
 */

export function isDemoMode()              { return false; }
export function setDemoMode()             {}

export function getCurrentTime()          { return new Date(); }
export function getDemoCurrentTime()      { return new Date(); }
export function getDemoCurrentTimeString(){ return '12:00'; }
export function setDemoCurrentTime()      {}

export function getDemoLang()             { return 'auto'; }
export function setDemoLang()             {}

export function getDemoScenario()         { return 'dev_team'; }
export function setDemoScenario()         {}

export async function getDemoScenarioList()  { return []; }
export async function getDemoEvents()        { return []; }
export async function getDemoLocalEvents()   { return []; }
export async function getDemoMemoContent()   { return null; }
export async function getDemoCalendars()     { return []; }

export function getDemoOptionsSettings() {
    return {};
}
