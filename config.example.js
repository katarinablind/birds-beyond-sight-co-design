// ─────────────────────────────────────────────────────────────
//  API keys — TEMPLATE
//  Copy this file to `config.local.js` and fill in real keys there.
//  config.local.js is gitignored, so keys never get committed.
//
//    cp config.example.js config.local.js
//
//  Then in a page, load it before your app code:
//    <script src="config.local.js"></script>
//  and read from window.JJ_CONFIG. Everything is mock-first — leave a
//  key blank and the app should fall back to local fixtures.
// ─────────────────────────────────────────────────────────────
window.JJ_CONFIG = {
  ebird:     '',   // ebird.org/api/keygen  (free, needs an eBird account)
  maptiler:  '',   // cloud.maptiler.com    (free tile key for MapLibre GL)
  xenocanto: '',   // xeno-canto.org        (free account; v3 API needs a key)
  // birdnet / macaulay: no self-serve key — see the APIs tab in the playground
};
