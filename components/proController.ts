
// Centralized controller for Pro features and Paywall logic
// Toggle ENABLE_PAYWALL to control global access

export const PAYWALL_CONFIG = {
  // Set to TRUE to enforce paywall (users must pay).
  // Set to FALSE to disable paywall (everyone gets Pro features).
  ENABLED: false, 
};

/**
 * Determines if a user should have Pro access based on global config and their payment status.
 * @param hasPaid - The actual payment status of the user (from DB/LocalStorage)
 * @returns boolean - Whether the user gets Pro features
 */
export const getProStatus = (hasPaid: boolean): boolean => {
  // If paywall is disabled, everyone is Pro
  if (!PAYWALL_CONFIG.ENABLED) return true;
  
  // Otherwise, respect the user's actual payment status
  return hasPaid;
};
