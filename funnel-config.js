/* All dates are fixed ISO 8601 dates with an explicit timezone offset.
 * Main videos and the booking event must be supplied before opening this funnel.
 * Never put API tokens or webhook secrets in this public file.
 */
window.FUNNEL_CONFIG = Object.freeze({
  webinar: {
    startsAt: '2026-11-15T20:00:00+01:00',
    timeZone: 'Europe/Belgrade',
    calendarDurationMinutes: 90,
    title: '5 grešaka u oglašavanju koje moraš da ispraviš da bi profitabilno i predvidivo skalirao svoj webshop',
    joinUrl: ''
  },
  videos: {
    thankYou: '', // Vimeo, YouTube, or a direct HTTPS mp4/webm URL.
    callConfirmation: '',
    replay: ''
  },
  thankYouBookingRevealSeconds: 300,
  replay: {
    availableAt: '', // Real release date; never the visitor's first visit.
    expiresAt: ''    // Real deadline, four days after release. Include +01:00.
  },
  booking: {
    calendlyUrl: '', // Stefan's 15-minute analysis EVENT link, not a profile.
    confirmationPath: '../ccp/',
    // Map each form field to its actual Calendly custom question a1...a10.
    // Add matching questions to the event first. All answers must be mapped.
    questionMap: {
      product: '', budget: '', revenue: '', manager: '', problem: '',
      goal: '', readiness: '', webshop: '', instagram: ''
    }
  },
  privacyPolicyUrl: ''
});
