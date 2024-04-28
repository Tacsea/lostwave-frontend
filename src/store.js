import { writable } from 'svelte/store';

// Define writable stores for each filter
export const includeLostwave = writable(true);
export const includeCoverage = writable(false);
export const includeMentions = writable(false);
export const includeOtherSites = writable(false);
export const includeFound = writable(false);
export const includeLost = writable(false);
export const includeHidden = writable(false);
export const excludeHoaxes = writable(false);
export const dropdownOpen = writable(false);

