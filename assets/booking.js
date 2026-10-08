/* ──────────────────────────────────────────────────────────────
   Samantha Breathwork — réservation Calendly
   - Ouvre Calendly en popup (la visiteuse ne quitte plus le site)
   - Transmet à Calendly l'origine de la visite et la page du bouton
   - Chargé après tracking.js, qui compte les clics et les rendez-vous
   - Repli : si le script Calendly ne charge pas, le lien normal fonctionne
   ────────────────────────────────────────────────────────────── */
(function () {
  'use strict';

  var CALENDLY_URL = 'https://calendly.com/samanthabreathwork-fyum/30min';

  /* Identifiant de page lisible dans Calendly et dans GA4 */
  function pageSource() {
    var path = window.location.pathname.replace(/^\/|\/$/g, '').replace(/\.html$/, '');
    return path === '' || path === 'index' ? 'accueil' : path;
  }

  /* Origine Calendly : celle de la visite (pub, newsletter…) si elle est connue,
     sinon « site / organique ». La page et le bouton restent toujours visibles. */
  function bookingUrl(placement) {
    var origin = (window.SBTracking && window.SBTracking.attribution()) || {};
    var p = new URLSearchParams({
      utm_source: origin.utm_source || 'site',
      utm_medium: origin.utm_medium || 'organique',
      utm_campaign: origin.utm_campaign || pageSource(),
      utm_content: pageSource() + '/' + (placement || 'cta'),
      hide_gdpr_banner: '1'
    });
    if (origin.utm_term) p.set('utm_term', origin.utm_term);
    return CALENDLY_URL + '?' + p.toString();
  }

  /* Clic sur un bouton : envoyé à tracking.js (la conversion, elle, part
     quand Calendly confirme le rendez-vous). */
  function trackBooking(placement) {
    if (window.SBTracking) window.SBTracking.bookingClick(pageSource() + '/' + (placement || 'cta'));
  }

  function placementOf(link) {
    return link.getAttribute('data-booking-placement') || link.getAttribute('data-book') || 'cta';
  }

  /* Charge le widget Calendly à la demande, au premier survol ou clic */
  var assetsRequested = false;
  function loadCalendlyAssets() {
    if (assetsRequested) return;
    assetsRequested = true;

    var css = document.createElement('link');
    css.rel = 'stylesheet';
    css.href = 'https://assets.calendly.com/assets/external/widget.css';
    document.head.appendChild(css);

    var js = document.createElement('script');
    js.src = 'https://assets.calendly.com/assets/external/widget.js';
    js.async = true;
    document.head.appendChild(js);
  }

  var CALENDLY_WAIT_MS = 2500;
  var CALENDLY_POLL_MS = 100;

  function calendlyReady() {
    return !!(window.Calendly && typeof window.Calendly.initPopupWidget === 'function');
  }

  function whenCalendlyReady(callback) {
    if (calendlyReady()) return callback(true);
    var waited = 0;
    var timer = setInterval(function () {
      waited += CALENDLY_POLL_MS;
      if (calendlyReady() || waited >= CALENDLY_WAIT_MS) {
        clearInterval(timer);
        callback(calendlyReady());
      }
    }, CALENDLY_POLL_MS);
  }

  function isBookingLink(el) {
    return el && el.tagName === 'A' && el.href && el.href.indexOf('calendly.com') !== -1;
  }

  /* Pré-charge dès que la visiteuse approche d'un bouton : popup instantanée */
  ['mouseover', 'touchstart', 'focusin'].forEach(function (evt) {
    document.addEventListener(evt, function (e) {
      if (isBookingLink(e.target.closest && e.target.closest('a'))) loadCalendlyAssets();
    }, { passive: true, capture: true });
  });

  document.addEventListener('click', function (e) {
    var link = e.target.closest && e.target.closest('a');
    if (!isBookingLink(link)) return;

    var placement = placementOf(link);
    trackBooking(placement);

    /* La réservation n'est comptée que dans la popup Calendly : on l'attend
       un court instant si elle n'est pas encore chargée (tap rapide sur mobile).
       Si elle ne vient pas, on ouvre Calendly dans la page : aucune réservation perdue. */
    e.preventDefault();
    var url = bookingUrl(placement);
    loadCalendlyAssets();
    whenCalendlyReady(function (ready) {
      if (ready) window.Calendly.initPopupWidget({ url: url });
      else window.location.href = url;
    });
  });

  /* Les liens gardent une URL tracée même sans JS actif côté popup */
  document.addEventListener('DOMContentLoaded', function () {
    document.querySelectorAll('a[href*="calendly.com"]').forEach(function (link) {
      link.href = bookingUrl(placementOf(link));
    });
  });
})();
