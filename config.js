/* Fill the confirmed event and integration details before opening registrations.
   While any AEvent field is empty the form stays in preview mode; no lead is saved or sent.
   A fixed ISO event date is used. Expired events never silently roll into next week. */
window.WEBINAR_CONFIG = Object.freeze({
  startsAt: '2026-11-15T20:00:00+01:00',
  timeZone: 'Europe/Belgrade',
  durationMinutes: null,
  eventKey: 'stefan-webinar',
  aevent: {
    // Account number from the AEvent domain: https://<tenant>.aevent.online
    tenant: '44134018',
    // Campaign ID from the AEvent registration link. Copy-paste it (l vs I).
    wtl: 'IPi0sYxOmyopj9P',
    // Fallback Zoom WEBINAR ID. The page first uses the ID AEvent reports for the
    // scheduled event (/getdata upcomingWebinars[0].webinarID) and uses this only if that is missing.
    webinarId: '84413879000',
    // Country code added to local numbers typed with a leading 0 (060... -> 38160...).
    defaultCountryCode: '381'
  },
  redirectUrl: 'thank-you/',
  privacyPolicyUrl: '',
  metaPixelId: '',
  // Enable only after the relevant consent setup is in place.
  trackingEnabled: false
});
