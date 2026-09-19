/* ──────────────────────────────────────────────────────────────
   Samantha Breathwork — réservation Calendly
   - Ouvre Calendly en popup (la visiteuse ne quitte plus le site)
   - Ajoute des UTM par page pour savoir quelle page génère l'appel
   - Repli : si le script Calendly ne charge pas, le lien normal fonctionne
   ────────────────────────────────────────────────────────────── */
(function () {
  'use strict';

  var CALENDLY_URL = 'https://calendly.com/samanthabreathwork-fyum/30min';

  /* Identifiant de page lisible dans Calendly et dans GA4 */
  function pageSource() {
    var path = window.location.pathname.replace(/^\//, '').replace(/\.html$/, '');
    return path === '' || path === 'index' ? 'accueil' : path;
  }

  /* Construit l'URL Calendly avec les UTM + masque les champs déjà connus */
  function bookingUrl(placement) {
    var p = new URLSearchParams({
      utm_source: 'site',
      utm_medium: 'organique',
      utm_campaign: pageSource(),
      utm_content: placement || 'cta',
      hide_gdpr_banner: '1'
    });
    return CALENDLY_URL + '?' + p.toString();
  }

  /* Envoie l'évènement de conversion si un outil de mesure est présent */
  function trackBooking(placement) {
    var label = pageSource() + '/' + (placement || 'cta');
    if (typeof window.gtag === 'function') {
      window.gtag('event', 'reservation_appel', {
        event_category: 'conversion',
        event_label: label
      });
    }
    if (typeof window.fbq === 'function') {
      window.fbq('track', 'Schedule', { content_name: label });
    }
    if (window.plausible) {
      window.plausible('Reservation appel', { props: { source: label } });
    }
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

    var placement = link.getAttribute('data-booking-placement') || 'cta';
    trackBooking(placement);

    /* Si Calendly est prêt, on ouvre la popup et on reste sur le site.
       Sinon on laisse le lien s'ouvrir normalement — aucune réservation perdue. */
    if (window.Calendly && typeof window.Calendly.initPopupWidget === 'function') {
      e.preventDefault();
      window.Calendly.initPopupWidget({ url: bookingUrl(placement) });
    }
  });

  /* Les liens gardent une URL tracée même sans JS actif côté popup */
  document.addEventListener('DOMContentLoaded', function () {
    document.querySelectorAll('a[href*="calendly.com"]').forEach(function (link) {
      var placement = link.getAttribute('data-booking-placement') || 'cta';
      link.href = bookingUrl(placement);
    });
  });
})();
