/**
 * Number of couplet entries to include in each markdown collection file.
 */
export const ENTRIES_PER_FILE = 50;

/**
 * Maximum number of retry attempts for failed API requests.
 */
export const MAX_RETRIES = 3;

/**
 * Delay in milliseconds between API request retry attempts.
 */
export const RETRY_DELAY_MS = 1000;

/**
 * Maximum number of API requests allowed within the rate limit window.
 * Mirrors the server-side rate limit configuration.
 */
export const RATE_LIMIT_MAX = 30;

/**
 * Rate limit window in seconds. The server allows RATE_LIMIT_MAX requests
 * per this many seconds.
 */
export const RATE_LIMIT_WINDOW_SECONDS = 60;

/**
 * Rate limit window in milliseconds (derived from RATE_LIMIT_WINDOW_SECONDS).
 * Used for sliding-window calculations and 429 retry delays.
 */
export const RATE_LIMIT_WINDOW_MS = RATE_LIMIT_WINDOW_SECONDS * 1000;

/**
 * Base URL of the Kabir Dohe API. Overridable via the COUPLETS_API_URL env var.
 */
export const API_BASE_URL = process.env.COUPLETS_API_URL ?? 'https://kabirdoheapi.vercel.app';

/**
 * SEO keywords appended to each collection file.
 */
export const KABIR_KEYWORDS = [
  // Educational/Student Intent
  'Kabir ke dohe with meaning in English',
  'कबीर के दोहे अर्थ सहित English में',
  'Kabir ke dohe for students',
  'छात्रों के लिए कबीर के दोहे',
  'Kabir Das dohe and arth in Hindi',
  'कबीर दास के दोहे और उनका अर्थ',
  'Easy Kabir dohe for school project',
  'स्कूल प्रोजेक्ट के लिए आसान कबीर के दोहे',

  // Thematic/Life-Lesson Intent
  'Kabir ke dohe on truth and honesty',
  'सत्य और ईमानदारी पर कबीर के दोहे',
  'Kabir quotes on spirituality and God',
  'अध्यात्म और ईश्वर पर कबीर के विचार',
  'Kabir ke dohe on friendship (Mitrata)',
  'मित्रता पर कबीर के दोहे',
  'Kabir Das couplets on ego and pride',
  'अहंकार और घमंड पर कबीर के दोहे',

  // Format-Specific Intent
  'Kabir ke dohe PDF download',
  'कबीर के दोहे PDF डाउनलोड',
  'Best Kabir Das quotes for WhatsApp status',
  'व्हाट्सएप स्टेटस के लिए कबीर दास के विचार',
  'Kabir Amritvani lyrics in Hindi',
  'कबीर अमृतवाणी लिरिक्स हिंदी में',
];

/**
 * Hindi digits for converting Latin numbers to Devanagari numerals.
 */
export const HINDI_DIGITS = ['०', '१', '२', '३', '४', '५', '६', '७', '८', '९'];
