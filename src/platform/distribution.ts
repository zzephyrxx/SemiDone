/** Set by the dedicated App Store build, never inferred from the operating system. */
export const isAppStore = import.meta.env.VITE_DISTRIBUTION === 'app-store';
export const privacyPolicyUrl = import.meta.env.VITE_PRIVACY_POLICY_URL || '';
