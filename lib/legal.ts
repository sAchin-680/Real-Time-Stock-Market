export const LEGAL = {
  effective: 'October 1, 2026',
  product: 'Tickline',
  /** Public contact for privacy and legal requests. */
  contact: process.env.NEXT_PUBLIC_CONTACT_EMAIL?.trim() || '',
  contactUrl: 'https://github.com/sAchin-680/Real-Time-Stock-Market/issues',
} as const;

export const LEGAL_PAGES = [
  { href: '/terms', label: 'Terms of Service' },
  { href: '/privacy', label: 'Privacy Policy' },
  { href: '/disclaimer', label: 'Risk & Data Disclaimer' },
] as const;
