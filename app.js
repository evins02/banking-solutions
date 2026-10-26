(function () {
  var ICONS = {
    folder: '<path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>',
    building: '<path d="M4 21V5a1 1 0 0 1 1-1h9a1 1 0 0 1 1 1v16"/><path d="M15 10h4a1 1 0 0 1 1 1v10"/><path d="M8 8h3M8 12h3M8 16h3M3 21h18"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    chart: '<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>',
    academy: '<path d="M2 9l10-5 10 5-10 5z"/><path d="M6 11v5c0 1.5 2.7 3 6 3s6-1.5 6-3v-5"/><path d="M22 9v6"/>',
  };

  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function card(s) {
    var live = s.status === 'live' && s.url;
    var tag = live ? 'a' : 'div';
    var href = s.page ? s.page + '.html' : s.url;
    var attrs = live ? ' href="' + esc(href) + '"' + (s.page ? '' : ' target="_blank" rel="noopener"') : ' aria-disabled="true"';
    var feats = (s.features || []).map(function (f) { return '<li>' + esc(f) + '</li>'; }).join('');
    return (
      '<' + tag + ' class="card ' + (live ? 'live' : 'planned') + '" style="--accent:' + esc(s.accent || '#1546d6') + '"' + attrs + '>' +
        '<div class="card-top">' +
          '<span class="card-icon"><svg viewBox="0 0 24 24">' + (ICONS[s.icon] || ICONS.chart) + '</svg></span>' +
          '<span class="status ' + (live ? 's-live' : 's-planned') + '">' + (live ? 'Live-Demo' : 'In Planung') + '</span>' +
        '</div>' +
        '<h3>' + esc(s.name) + '</h3>' +
        '<p class="tagline">' + esc(s.tagline) + '</p>' +
        '<p class="desc">' + esc(s.description) + '</p>' +
        (feats ? '<ul class="feats">' + feats + '</ul>' : '') +
        (live
          ? s.page
            ? '<span class="open page">Mehr über ' + esc(s.name) + ' <svg viewBox="0 0 24 24"><path d="M5 12h14M13 6l6 6-6 6"/></svg></span>'
            : '<span class="open">' + esc(s.name) + ' öffnen <svg viewBox="0 0 24 24"><path d="M7 17L17 7M8 7h9v9"/></svg></span>'
          : '') +
      '</' + tag + '>'
    );
  }

  document.getElementById('solutions').innerHTML = (window.SOLUTIONS || []).map(card).join('');
})();
