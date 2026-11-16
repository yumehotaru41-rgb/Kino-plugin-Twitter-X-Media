// Twitter/X Media — los videos de tus «Elementos guardados» de X (Twitter) dentro de Kino.
// Estructura de ítems igual al plugin de xHamster: kind "movie" con adult: true, así Kino no
// guarda nada en «Mi biblioteca» ni en «Continuar viendo» (privacidad: sin historial).
//
// apiVersion 14 (Kino 0.9.74). La sesión se inicia dentro de Kino con una ventana de navegador
// visible (enhancements["20"].visualBrowser, Kino 0.9.81) o pegando las cookies a mano.
//
// Cómo funciona: con la sesión de la persona el plugin pide la lista de Elementos guardados con la
// misma consulta GraphQL que usa la web de X, se queda con las entradas que traen video y las
// convierte en títulos de Kino. La URL de cada video NO se guarda para reutilizarla: X renueva los
// enlaces en cada recarga de página y una URL guardada caduca en minutos, así que al reproducir
// siempre se pide una URL fresca (la caché queda solo como último recurso).
//
// Nota honesta: la consulta interna de X no es una API pública. X cambia su
// identificador de vez en cuando (el plugin intenta descubrir el nuevo leyendo
// los archivos de la propia web de X, y el campo «Identificador de la API» de
// los ajustes permite fijarlo a mano) y además cierra su API de búsqueda para
// clientes que no son su web: la rechaza aunque la petición lleve el sello
// anti-bot que su web calcula. Por eso la búsqueda del plugin recorre lo que
// SÍ se puede cargar con tu sesión — el Inicio y tus guardados — en vez de la
// búsqueda pública de X.
//
// Además de las filas del Inicio, el plugin trae su propia pantalla «Buscar en X» (capability
// "screen"): al abrirse muestra el feed con lo último que cargó del Inicio, de los guardados y de
// los Me gusta (catálogo en kino.storage, capability "storageLarge"), y el buscador de tópicos,
// personas, @usuarios y #etiquetas filtra ese material y suma lo que cargue de X en el momento. El
// job de segundo plano (capability "schedule", manifest jobs) refresca esas tres listas para que
// el catálogo no envejezca.

const X = "https://x.com";
const SYNDICATION = "https://cdn.syndication.twimg.com";

// El token público del cliente web de X (viaja en el JavaScript de x.com; no es de nadie).
const BEARER =
  "AAAAAAAAAAAAAAAAAAAAANRILgAAAAAAnNwIzUejRCOuH5E6I8xnZz4puTs%3D1Zv7ttfk8LF81IUq16cHjhLTvJu4FA33AGWWjCpTnA";

// Semilla conocida de la consulta Bookmarks; si X la rota, discover() trae la buena.
const SEED_BOOKMARKS = "fjf5b5Lu82lYMSBRhppK2g";

// Semilla conocida de la consulta del Inicio (HomeTimeline); si X la rota, discover() trae la buena.
const SEED_HOME = "c-CzHF1LboFilMpsx4ZCrQ";


const OPS_KEY = "ops:v1";
const MEDIA_KEY = "media:v1";
const ACCOUNT_KEY = "account:v1";
const MEDIA_MAX = 150;
const MEDIA_MAX_CHARS = 110000;

// Lo que la web de X manda con la consulta: banderas de funciones y de campos.
const FEATURES = {
  graphql_timeline_v2_bookmark_timeline: true,
  rweb_tipjar_consumption_enabled: true,
  responsive_web_graphql_exclude_directive_enabled: true,
  verified_phone_label_enabled: false,
  creator_subscriptions_tweet_preview_api_enabled: true,
  responsive_web_graphql_timeline_navigation_enabled: true,
  responsive_web_graphql_skip_user_profile_image_extensions_enabled: false,
  communities_web_enable_tweet_community_results_fetch: true,
  c9s_tweet_anatomy_moderator_badge_enabled: true,
  articles_preview_enabled: true,
  responsive_web_edit_tweet_api_enabled: true,
  graphql_is_translatable_rweb_tweet_is_translatable_enabled: true,
  view_counts_everywhere_api_enabled: true,
  longform_notetweets_consumption_enabled: true,
  responsive_web_twitter_article_tweet_consumption_enabled: true,
  tweet_awards_web_tipping_enabled: false,
  creator_subscriptions_quote_tweet_preview_enabled: false,
  freedom_of_speech_not_reach_fetch_enabled: true,
  standardized_nudges_misinfo: true,
  tweet_with_visibility_results_prefer_gql_limited_actions_policy_enabled: true,
  rweb_video_timestamps_enabled: true,
  longform_notetweets_rich_text_read_enabled: true,
  longform_notetweets_inline_media_enabled: true,
  responsive_web_enhance_cards_enabled: false,
  tweetypie_unmention_optimization_enabled: true,
  responsive_web_media_download_video_enabled: true,
  hidden_profile_subscriptions_enabled: true,
  subscriptions_verification_info_enabled: true
};

const FIELD_TOGGLES = {
  withArticleRichContentState: false,
  withArticlePlainText: false,
  withGrokAnalyze: false,
  withDisallowedReplyControls: false
};
// El juego completo de banderas que la búsqueda de X (SearchTimeline) pide hoy.
const SEARCH_FEATURES = {
  articles_preview_enabled: true,
  c9s_tweet_anatomy_moderator_badge_enabled: true,
  communities_web_enable_tweet_community_results_fetch: true,
  creator_subscriptions_quote_tweet_preview_enabled: false,
  creator_subscriptions_tweet_preview_api_enabled: true,
  freedom_of_speech_not_reach_fetch_enabled: true,
  graphql_is_translatable_rweb_tweet_is_translatable_enabled: true,
  longform_notetweets_consumption_enabled: true,
  longform_notetweets_inline_media_enabled: true,
  longform_notetweets_rich_text_read_enabled: true,
  responsive_web_edit_tweet_api_enabled: true,
  responsive_web_enhance_cards_enabled: false,
  responsive_web_graphql_exclude_directive_enabled: true,
  responsive_web_graphql_skip_user_profile_image_extensions_enabled: false,
  responsive_web_grok_community_note_auto_translation_is_enabled: false,
  responsive_web_graphql_timeline_navigation_enabled: true,
  responsive_web_grok_imagine_annotation_enabled: false,
  responsive_web_media_download_video_enabled: false,
  responsive_web_profile_redirect_enabled: true,
  responsive_web_twitter_article_tweet_consumption_enabled: true,
  rweb_tipjar_consumption_enabled: true,
  rweb_video_timestamps_enabled: true,
  standardized_nudges_misinfo: true,
  tweet_awards_web_tipping_enabled: false,
  tweet_with_visibility_results_prefer_gql_limited_actions_policy_enabled: true,
  tweet_with_visibility_results_prefer_gql_media_interstitial_enabled: false,
  tweetypie_unmention_optimization_enabled: true,
  verified_phone_label_enabled: false,
  view_counts_everywhere_api_enabled: true,
  responsive_web_grok_analyze_button_fetch_trends_enabled: false,
  premium_content_api_read_enabled: false,
  profile_label_improvements_pcf_label_in_post_enabled: false,
  responsive_web_grok_share_attachment_enabled: false,
  responsive_web_grok_analyze_post_followups_enabled: false,
  responsive_web_grok_image_annotation_enabled: false,
  responsive_web_grok_analysis_button_from_backend: false,
  responsive_web_jetfuel_frame: false,
  rweb_video_screen_enabled: true,
  responsive_web_grok_show_grok_translated_post: true
};

// ---------------------------------------------------------------------------
// Ajustes y sesión
// ---------------------------------------------------------------------------

function setting(key) {
  var value = kino.config.get(key);
  return typeof value === "string" ? value.trim() : "";
}

// La persona puede pegar «auth_token=…; ct0=…» o el header completo copiado de las herramientas.
function cookieString() {
  return setting("cookies")
    .replace(/^cookie\s*:\s*/i, "")
    .replace(/[\r\n\t]+/g, " ")
    .trim();
}

function cookieValue(name) {
  var parts = cookieString().split(";");
  for (var i = 0; i < parts.length; i++) {
    var pair = parts[i].trim();
    var eq = pair.indexOf("=");
    if (eq > 0 && pair.slice(0, eq).trim() === name) return pair.slice(eq + 1).trim();
  }
  return "";
}

function signedIn() {
  return cookieValue("auth_token") !== "" && cookieValue("ct0") !== "";
}

function clientLang() {
  var lang = typeof kino.lang === "string" ? kino.lang : "es-CO";
  return lang.split("-")[0] || "es";
}

function jsonHeaders(cookieOverride) {
  var headers = {
    accept: "application/json",
    authorization: "Bearer " + BEARER,
    "x-csrf-token": cookieValue("ct0"),
    "x-twitter-auth-type": "OAuth2Session",
    "x-twitter-active-user": "yes",
    "x-twitter-client-language": clientLang()
  };
  var raw = typeof cookieOverride === "string" ? cookieOverride.trim() : cookieString();
  if (raw) headers.cookie = raw;
  return headers;
}

function failStatus(status, what) {
  var detail = what + " " + status;
  if (status === 401 || status === 403) {
    throw kino.error("auth_required", detail, {
      userMessage: "La sesión de X venció. Inicia sesión otra vez en Ajustes ▸ Twitter/X Media."
    });
  }
  if (status === 429) {
    throw kino.error("rate_limited", detail, {
      userMessage: "X está limitando las peticiones. Espera un minuto y vuelve a intentar."
    });
  }
  throw kino.error("unavailable", detail, {
    userMessage: "X no respondió bien. Inténtalo de nuevo en un momento."
  });
}

async function xget(url, options) {
  var opts = options || {};
  var headers = jsonHeaders(opts.cookies);
  if (opts.accept) headers.accept = opts.accept;
  var timeoutMs = opts.timeoutMs || 15000;
  var r;
  try {
    var init = { headers: headers, timeoutMs: timeoutMs, cookies: false, redirect: "follow" };
    if (opts.maxBytes) init.maxBytes = opts.maxBytes;
    r = await kino.fetch(url, init);
  } catch (e) {
    var code = e && e.code ? e.code : "network";
    if (code === "timeout" || code === "network") {
      throw kino.error("unavailable", "x " + code, {
        userMessage: "No se pudo llegar a X. Revisa la conexión de este aparato."
      });
    }
    throw e;
  }
  return r;
}

function requireSession() {
  if (!signedIn()) {
    throw kino.error("auth_required", "sin sesión", {
      userMessage: "Inicia sesión con tu cuenta de X: Ajustes ▸ Twitter/X Media."
    });
  }
}

// ---------------------------------------------------------------------------
// Quién es la persona (línea de estado)
// ---------------------------------------------------------------------------

function cachedAccount() {
  var raw = kino.storage.get(ACCOUNT_KEY);
  if (!raw) return null;
  try {
    var parsed = JSON.parse(raw);
    if (parsed && typeof parsed.handle === "string") return parsed.handle || null;
  } catch (e) {
    /* caché vieja o rota: se vuelve a preguntar */
  }
  return null;
}

function rememberAccount(handle) {
  if (!handle) return;
  try {
    kino.storage.set(ACCOUNT_KEY, JSON.stringify({ handle: handle, at: Date.now() }), {
      ttlMs: 24 * 60 * 60 * 1000
    });
  } catch (e) {
    /* la caché es opcional */
  }
}

function handleOf(tweet) {
  var core = tweet && tweet.core;
  var userResult = core && core.user_results && core.user_results.result;
  if (userResult) {
    var inner = userResult.core;
    if (inner && typeof inner.screen_name === "string") return inner.screen_name;
    var legacyUser = userResult.legacy;
    if (legacyUser && typeof legacyUser.screen_name === "string") return legacyUser.screen_name;
  }
  return "";
}

async function whoAmI(cookieOverride, timeoutMs) {
  var r = await xget(
    X + "/i/api/1.1/account/verify_credentials.json?skip_status=true&include_entities=false",
    { cookies: cookieOverride, timeoutMs: timeoutMs || 8000 }
  );
  if (r.status === 401 || r.status === 403) failStatus(r.status, "verify");
  if (!r.ok) return "";
  var body;
  try {
    body = r.json();
  } catch (e) {
    return "";
  }
  var handle = body && typeof body.screen_name === "string" ? body.screen_name : "";
  rememberAccount(handle);
  return handle;
}

// ---------------------------------------------------------------------------
// La consulta de Elementos guardados
// ---------------------------------------------------------------------------

function savedOps() {
  var raw = kino.storage.get(OPS_KEY);
  if (!raw) return null;
  try {
    var parsed = JSON.parse(raw);
    if (parsed && typeof parsed.Bookmarks === "string" && parsed.Bookmarks) return parsed;
  } catch (e) {
    /* se vuelve a descubrir */
  }
  return null;
}

function queryId() {
  var override = setting("queryId");
  // Formas: «XXXX» (solo guardados, como siempre), «bookmarks:XXXX» o «likes:XXXX».
  var manual = /^(bookmarks|likes)[:=]\s*([A-Za-z0-9_-]{10,60})$/i.exec(String(override || ""));
  if (manual) {
    var out = {};
    out[manual[1].toLowerCase() === "likes" ? "Likes" : "Bookmarks"] = manual[2];
    return out;
  }
  if (/^[A-Za-z0-9_-]{10,60}$/.test(override)) return { Bookmarks: override };
  var ops = savedOps() || {};
  return { Bookmarks: ops.Bookmarks || SEED_BOOKMARKS, Likes: ops.Likes || "" };
}

function homeId() {
  var ops = savedOps();
  if (ops && typeof ops.HomeTimeline === "string" && ops.HomeTimeline) return ops.HomeTimeline;
  return SEED_HOME;
}


function scanForOperation(body, name) {
  // El nombre de la operación va pegado a su queryId en la tabla de la web de X.
  // Puede ir en cualquier orden dentro del objeto, así que se elige el queryId
  // más cercano al nombre y no el primero de la ventana.
  var markers = [
    'operationName:"' + name + '"',
    'operationName": "' + name + '"',
    '"operationName":"' + name + '"',
    '"operationName": "' + name + '"'
  ];
  var re = /queryId"\s*:\s*"([A-Za-z0-9_-]{10,60})"/g;
  var best = "";
  var bestDist = 1e9;
  for (var i = 0; i < markers.length; i++) {
    var at = body.indexOf(markers[i]);
    while (at >= 0) {
      var from = Math.max(0, at - 320);
      var around = body.slice(from, at + 360);
      re.lastIndex = 0;
      var m;
      while ((m = re.exec(around)) !== null) {
        var dist = Math.abs(from + m.index - at);
        if (dist < bestDist) {
          bestDist = dist;
          best = m[1];
        }
      }
      at = body.indexOf(markers[i], at + 1);
    }
  }
  return best;
}

// X no publica su identificador de consulta: se lee de los archivos de su propia web. Es de mejor
// esfuerzo — si falla, queda la semilla y el campo avanzado de los ajustes.
var lastDiscover = { at: 0, found: null };

async function discover() {
  // Enfriamiento: una búsqueda con el identificador viejo puede fallar en
  // varias peticiones seguidas; releer la web de X en cada una no ayuda.
  if (lastDiscover.found && Date.now() - lastDiscover.at < 90000) return lastDiscover.found;
  var found = { Bookmarks: "", HomeTimeline: "", Search: "", Likes: "" };
  var started = Date.now();
  var html = "";
  try {
    var page = await xget(X + "/i/bookmarks", {
      accept: "text/html",
      timeoutMs: 9000,
      maxBytes: 400000
    });
    if (page.ok) html = page.text();
  } catch (e) {
    kino.log("discover: html", e && e.code);
  }

  function scan(text) {
    var idB = scanForOperation(text, "Bookmarks");
    if (idB) found.Bookmarks = idB;
    var idH = scanForOperation(text, "HomeTimeline");
    if (idH) found.HomeTimeline = idH;
    var idS = scanForOperation(text, "SearchTimeline");
    if (idS) found.Search = idS;
    var idL = scanForOperation(text, "Likes");
    if (idL) found.Likes = idL;
  }

  // 1) Los .js que la propia página enlaza (main y los demás).
  var urls = [];
  var re = /https:\/\/abs\.twimg\.com\/[A-Za-z0-9._~\-\/]+\.js/g;
  var m;
  while ((m = re.exec(html)) !== null) {
    if (urls.indexOf(m[0]) < 0 && urls.length < 6) urls.push(m[0]);
  }

  var bodies = [];
  for (var i = 0; i < urls.length; i++) {
    if (Date.now() - started > 12000) break;
    var body = "";
    try {
      var r = await kino.fetch(urls[i], {
        headers: { accept: "*/*" },
        timeoutMs: 8000,
        cookies: false,
        maxBytes: 1500000
      });
      if (!r.ok) continue;
      body = r.text();
    } catch (e) {
      continue;
    }
    bodies.push(body);
    scan(body);
    if (found.Bookmarks && found.HomeTimeline && found.Search) break;
  }

  // 2) X sacó estas consultas de main: viven en paquetes que la página carga
  //    aparte. El runtime de webpack del propio main trae el nombre de cada
  //    paquete con su número y, en otra tabla, su hash; con los dos se arma
  //    la dirección del paquete. OJO: también hay que entrar cuando solo
  //    falta Search — la página de guardados no carga el paquete de búsqueda,
  //    así que su identificador casi siempre vive aquí.
  var lazy = [
    "shared~bundle.BookmarkFolders~bundle.Bookmarks",
    "shared~bundle.Compose~bundle.HomeTimeline~bundle.LoggedInMain",
    "bundle.HomeTimeline",
    "bundle.SearchTimeline",
    "bundle.ProfileLikes"
  ];
  if (!found.Bookmarks || !found.HomeTimeline || !found.Search || !found.Likes) {
    for (var n = 0; n < lazy.length && Date.now() - started < 24000; n++) {
      var escaped = lazy[n].replace(/[.~]/g, "\\$&");
      for (var b = 0; b < bodies.length; b++) {
        var nameMatch = new RegExp("(\\d+):\"" + escaped + "\"").exec(bodies[b]);
        if (!nameMatch) continue;
        var hashRe = new RegExp(nameMatch[1] + ':"([0-9a-f]{8,24})"');
        var hashMatch = hashRe.exec(bodies[b]);
        if (!hashMatch) continue;
        var bundle =
          "https://abs.twimg.com/responsive-web/client-web/" + lazy[n] + "." + hashMatch[1] + "a.js";
        try {
          var br = await kino.fetch(bundle, {
            headers: { accept: "*/*" },
            timeoutMs: 8000,
            cookies: false,
            maxBytes: 1500000
          });
          if (!br.ok) continue;
          scan(br.text());
        } catch (e) {
          continue;
        }
      }
      if (found.Bookmarks && found.HomeTimeline && found.Search) break;
    }
  }

  if (found.Bookmarks || found.HomeTimeline || found.Search) {
    try {
      var prev = savedOps() || {};
      if (found.Bookmarks) prev.Bookmarks = found.Bookmarks;
      if (found.HomeTimeline) prev.HomeTimeline = found.HomeTimeline;
      if (found.Search) prev.Search = found.Search;
      if (found.Likes) prev.Likes = found.Likes;
      kino.storage.set(OPS_KEY, JSON.stringify({ Bookmarks: prev.Bookmarks, HomeTimeline: prev.HomeTimeline, Search: prev.Search, Likes: prev.Likes, at: Date.now() }), {
        ttlMs: 7 * 24 * 60 * 60 * 1000
      });
    } catch (e) {
      /* sin caché igual sirve para esta llamada */
    }
  }
  kino.log("discover:", found.Bookmarks || found.HomeTimeline || found.Search ? "encontrado" : "sin resultado");
  lastDiscover = { at: Date.now(), found: found };
  return found;
}

async function bookmarksRaw(cursor, options) {
  var opts = options || {};
  var variables = { count: opts.count || 40, includePromotedContent: false };
  if (cursor) variables.cursor = cursor;
  var query =
    "?variables=" +
    encodeURIComponent(JSON.stringify(variables)) +
    "&features=" +
    encodeURIComponent(JSON.stringify(FEATURES)) +
    "&fieldToggles=" +
    encodeURIComponent(JSON.stringify(FIELD_TOGGLES));

  var id = queryId().Bookmarks;
  var r = await xget(X + "/i/api/graphql/" + id + "/Bookmarks" + query, {
    timeoutMs: opts.timeoutMs || 15000
  });

  // 404/400 con un identificador viejo: se busca el nuevo una vez y se repite.
  if (r.status === 400 || r.status === 404 || r.status === 422) {
    var next = await discover();
    if (next.Bookmarks && next.Bookmarks !== id) {
      id = next.Bookmarks;
      r = await xget(X + "/i/api/graphql/" + id + "/Bookmarks" + query, {
        timeoutMs: opts.timeoutMs || 15000
      });
    }
  }

  if (!r.ok) {
    if (r.status === 400 || r.status === 404 || r.status === 422) {
      throw kino.error("unavailable", "bookmarks " + r.status + " id viejo", {
        userMessage:
          "X rechazó la consulta de guardados: cambió el identificador de su API. " +
          "En tu computador abre x.com/i/bookmarks con F12 ▸ Red, busca la petición «Bookmarks» y copia " +
          "el identificador que va en la dirección /i/api/graphql/…/Bookmarks; pégalo en " +
          "Ajustes ▸ Twitter/X Media ▸ Identificador de la API."
      });
    }
    failStatus(r.status, "bookmarks");
  }

  var json;
  try {
    json = r.json();
  } catch (e) {
    throw kino.error("unavailable", "bookmarks json", {
      userMessage: "X devolvió una respuesta que no se entiende. Inténtalo más tarde."
    });
  }
  return json;
}

// ---------------------------------------------------------------------------
// Lectura de la respuesta (tolera las dos formas que usa X)
// ---------------------------------------------------------------------------

function timelineOf(json) {
  var stack = [json && json.data];
  var seen = 0;
  while (stack.length && seen < 400) {
    seen++;
    var node = stack.pop();
    if (!node || typeof node !== "object") continue;
    // Vale para los guardados (…timeline.instructions) y para el Inicio
    // (…home.home_timeline_urt.instructions): cualquier nodo con «instructions».
    if (node.instructions && typeof node.instructions.length === "number") {
      return node;
    }
    for (var key in node) {
      var value = node[key];
      if (value && typeof value === "object") stack.push(value);
    }
  }
  return null;
}

function entriesOf(timeline) {
  var out = [];
  var instructions = (timeline && timeline.instructions) || [];
  for (var i = 0; i < instructions.length; i++) {
    var instruction = instructions[i];
    if (!instruction) continue;
    if (instruction.entries && typeof instruction.entries.length === "number") {
      for (var j = 0; j < instruction.entries.length; j++) out.push(instruction.entries[j]);
    } else if (instruction.entry) {
      out.push(instruction.entry);
    }
  }
  return out;
}

function resultOf(content) {
  if (!content || !content.itemContent) return null;
  var results = content.itemContent.tweet_results;
  return results && results.result ? results.result : null;
}

function tweetsInEntry(entry) {
  var out = [];
  var content = entry && entry.content;
  if (!content) return out;
  var direct = resultOf(content);
  if (direct) out.push(direct);
  if (content.items && typeof content.items.length === "number") {
    for (var i = 0; i < content.items.length; i++) {
      var item = content.items[i];
      var inner = resultOf(item && item.item ? item.item : item);
      if (inner) out.push(inner);
    }
  }
  return out;
}

function unwrapTweet(result) {
  if (!result) return null;
  if (result.__typename === "TweetWithVisibilityResults" && result.tweet) return result.tweet;
  if (!result.rest_id && result.tweet) return result.tweet;
  return result;
}

function mediaOf(tweet) {
  var legacy = tweet && tweet.legacy;
  var pools = [
    legacy && legacy.extended_entities && legacy.extended_entities.media,
    legacy && legacy.entities && legacy.entities.media,
    tweet && tweet.extended_entities && tweet.extended_entities.media,
    tweet && tweet.media
  ];
  for (var i = 0; i < pools.length; i++) {
    var pool = pools[i];
    if (pool && typeof pool.length === "number" && pool.length) return pool;
  }
  return [];
}

// Un objeto media de video → { v: [[bitrate, url, height]], h: m3u8, d: duración }
function videoRecord(media) {
  var info = media && (media.video_info || media.videoInfo);
  if (!info) return null;
  var variants = info.variants && typeof info.variants.length === "number" ? info.variants : [];
  var mp4 = [];
  var hls = "";
  for (var i = 0; i < variants.length; i++) {
    var variant = variants[i];
    if (!variant || typeof variant.url !== "string") continue;
    var type = typeof variant.content_type === "string" ? variant.content_type : "";
    if (/mpegurl/i.test(type) || /\.m3u8(\?|$)/i.test(variant.url)) {
      if (!hls) hls = variant.url;
      continue;
    }
    if (type && !/video\/mp4/i.test(type)) continue;
    var bitrate = typeof variant.bit_rate === "number" ? variant.bit_rate : 0;
    var size = /(\d{2,4})x(\d{2,4})/.exec(variant.url);
    mp4.push([bitrate, variant.url, size ? Number(size[2]) : 0]);
  }
  if (!mp4.length && !hls) return null;
  mp4.sort(function (a, b) {
    return a[0] - b[0];
  });
  var record = { h: hls };
  if (mp4.length) record.v = mp4;
  var duration = Number(info.duration_millis || info.durationMs || 0);
  if (duration > 0) record.d = Math.round(duration);
  return record;
}

// ---------------------------------------------------------------------------
// Caché de URLs (kino.storage)
// ---------------------------------------------------------------------------

function readMediaCache() {
  var raw = kino.storage.get(MEDIA_KEY);
  if (!raw) return {};
  try {
    var parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch (e) {
    return {};
  }
}

function writeMediaCache(cache) {
  try {
    var keys = Object.keys(cache);
    if (keys.length > MEDIA_MAX) {
      for (var i = 0; i < keys.length - MEDIA_MAX; i++) delete cache[keys[i]];
    }
    var text = JSON.stringify(cache);
    if (text.length > MEDIA_MAX_CHARS) {
      var ordered = Object.keys(cache);
      for (var j = 0; j < Math.ceil(ordered.length / 2); j++) delete cache[ordered[j]];
      text = JSON.stringify(cache);
    }
    kino.storage.set(MEDIA_KEY, text);
  } catch (e) {
    kino.log("cache:", e && e.message);
  }
}

function cachePut(key, record) {
  var cache = readMediaCache();
  cache[key] = record;
  writeMediaCache(cache);
}

// ---------------------------------------------------------------------------
// Catálogo de lo cargado (kino.storage, capability "storageLarge": 16 MiB).
// Aquí queda lo que el plugin ya vio del Inicio y de los guardados — videos y
// fotos, sin URLs de video (esas caducan: X las renueva en cada recarga) —
// para que la pantalla «Buscar en X» muestre un feed al abrirse y la búsqueda
// local tenga con qué responder aunque X no conteste. El job de segundo plano
// lo mantiene al día.
// ---------------------------------------------------------------------------

const CATALOG_KEY = "catalog:v1";
const CATALOG_MAX_VIDEOS = 300;
const CATALOG_MAX_PHOTOS = 300;
const CATALOG_MAX_CHARS = 150000;

function readCatalog() {
  var raw = kino.storage.get(CATALOG_KEY);
  if (!raw) return { v: [], p: [] };
  try {
    var parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return { v: [], p: [] };
    return {
      v: Array.isArray(parsed.v) ? parsed.v : [],
      p: Array.isArray(parsed.p) ? parsed.p : []
    };
  } catch (e) {
    return { v: [], p: [] };
  }
}

// Versión delgada de un título de Kino para el catálogo: lo justo para la
// tarjeta del feed y para filtrar por palabras. Sin overview larga (200).
function slimVideo(item) {
  var slim = {
    id: item.id,
    ref: item.ref,
    title: item.title,
    kind: "movie",
    adult: true,
    badges: ["X"]
  };
  if (item.poster) slim.poster = item.poster;
  if (item.backdrop) slim.backdrop = item.backdrop;
  if (item.handle) slim.handle = item.handle;
  if (item.posted) slim.posted = item.posted;
  if (item.fav) slim.fav = item.fav;
  if (item.views) slim.views = item.views;
  if (item.quality) slim.quality = item.quality;
  if (typeof item.overview === "string" && item.overview) {
    slim.overview = item.overview.slice(0, 200);
  }
  return slim;
}

// Suma videos y fotos al catálogo: lo nuevo queda primero, sin duplicados,
// con tope de entradas y de caracteres (el job solo puede escribir 256 KB).
function catalogRemember(videos, photos) {
  try {
    var cat = readCatalog();
    var seenV = {};
    var seenP = {};
    var i;
    for (i = 0; i < cat.v.length; i++) seenV[cat.v[i].id] = true;
    for (i = 0; i < cat.p.length; i++) seenP[cat.p[i].id] = true;
    var added = false;
    for (i = 0; i < videos.length; i++) {
      var v = videos[i];
      if (!v || !v.id || seenV[v.id]) continue;
      seenV[v.id] = true;
      cat.v.unshift(slimVideo(v));
      added = true;
    }
    for (i = 0; i < photos.length; i++) {
      var p = photos[i];
      if (!p || !p.id || seenP[p.id]) continue;
      seenP[p.id] = true;
      cat.p.unshift(p);
      added = true;
    }
    if (!added) return;
    if (cat.v.length > CATALOG_MAX_VIDEOS) cat.v = cat.v.slice(0, CATALOG_MAX_VIDEOS);
    if (cat.p.length > CATALOG_MAX_PHOTOS) cat.p = cat.p.slice(0, CATALOG_MAX_PHOTOS);
    var text = JSON.stringify(cat);
    while (text.length > CATALOG_MAX_CHARS && (cat.v.length > 20 || cat.p.length > 20)) {
      // Se recorta por la mitad del lado más largo, hasta caber.
      if (cat.v.length >= cat.p.length && cat.v.length > 20) {
        cat.v = cat.v.slice(0, Math.floor(cat.v.length / 2));
      } else if (cat.p.length > 20) {
        cat.p = cat.p.slice(0, Math.floor(cat.p.length / 2));
      } else {
        cat.v = cat.v.slice(0, Math.floor(cat.v.length / 2));
      }
      text = JSON.stringify(cat);
    }
    kino.storage.set(CATALOG_KEY, text);
  } catch (e) {
    kino.log("catalog:", e && e.message);
  }
}

// El feed de arranque de la pantalla: lo último del catálogo, videos y fotos
// mezclados y ordenados como la cronología de X (lo más nuevo arriba).
function catalogFeed() {
  var cat = readCatalog();
  var posts = [];
  var i;
  for (i = 0; i < cat.v.length; i++) posts.push(feedPost(cat.v[i]));
  for (i = 0; i < cat.p.length; i++) posts.push(cat.p[i]);
  posts.sort(function (a, b) {
    return (b.at || 0) - (a.at || 0);
  });
  return posts.slice(0, MAX_FEED_ITEMS);
}

// Lo del catálogo que coincide con las palabras buscadas.
function catalogMatches(wanted) {
  var cat = readCatalog();
  var items = [];
  var photos = [];
  var i;
  for (i = 0; i < cat.v.length; i++) {
    if (matchesWords(cat.v[i], wanted)) items.push(cat.v[i]);
  }
  for (i = 0; i < cat.p.length; i++) {
    var pic = cat.p[i];
    var hay = ((pic.title || "") + " " + (pic.text || "") + " " + (pic.by || "")).toLowerCase();
    var ok = true;
    for (var w = 0; w < wanted.length; w++) {
      if (hay.indexOf(wanted[w]) < 0) {
        ok = false;
        break;
      }
    }
    if (ok) photos.push(pic);
  }
  return { items: items, photos: photos };
}

// ---------------------------------------------------------------------------
// Títulos de Kino
// ---------------------------------------------------------------------------

function tweetText(tweet) {
  var note = tweet && tweet.note_tweet && tweet.note_tweet.note_tweet_results;
  var noteResult = note && note.result;
  if (noteResult && typeof noteResult.text === "string" && noteResult.text) {
    return noteResult.text.replace(/https:\/\/t\.co\/\S+/g, "").trim();
  }
  var legacy = tweet && tweet.legacy;
  var text = legacy && typeof legacy.full_text === "string" ? legacy.full_text : "";
  return text.replace(/https:\/\/t\.co\/\S+/g, "").trim();
}

function yearOf(tweet) {
  var legacy = tweet && tweet.legacy;
  var created = legacy && typeof legacy.created_at === "string" ? legacy.created_at : "";
  var match = /(\d{4})\s*$/.exec(created);
  return match ? match[1] : "";
}

function itemOf(tweet, media, index, tweetId, handle) {
  var record = videoRecord(media);
  if (!record) return null;
  var text = tweetText(tweet);
  var firstLine = text.split("\n")[0].trim();
  var title = firstLine || (handle ? "Video de @" + handle : "Video guardado");
  if (title.length > 200) title = title.slice(0, 200);

  var poster = typeof media.media_url_https === "string" ? media.media_url_https : "";
  var height = record.v && record.v.length ? record.v[record.v.length - 1][2] : 0;
  var quality = height >= 2000 ? "4K" : height >= 1000 ? "1080p" : height >= 700 ? "720p" : "";

  var item = {
    id: index === 0 ? tweetId : tweetId + "-" + index,
    ref: "t:" + tweetId + ":" + index,
    title: title,
    kind: "movie",
    adult: true, // 18+ como el plugin de xHamster: Kino no lo guarda en «Mi biblioteca» ni en «Continuar viendo»
    badges: ["X"]
  };
  if (poster) {
    item.poster = poster + "?name=small";
    item.backdrop = poster + "?name=medium";
  }
  if (text.length > firstLine.length) item.overview = text.slice(0, 2000);
  var year = yearOf(tweet);
  if (year) item.year = year;
  var lang = tweet && tweet.legacy && tweet.legacy.lang;
  if (typeof lang === "string" && lang) item.lang = lang.slice(0, 20);
  if (quality) item.quality = quality;

  // Extras para la pantalla propia (el feed con imágenes): autor, fecha,
  // ❤ y vistas. Solo los lee la pantalla al armar sus tarjetas; Kino
  // ignora los campos que no conoce.
  if (handle) item.handle = handle;
  var createdAt = tweet && tweet.legacy && typeof tweet.legacy.created_at === "string" ? tweet.legacy.created_at : "";
  var when = createdAt ? Date.parse(createdAt) : NaN;
  if (!isNaN(when)) item.posted = when;
  var fav = tweet && tweet.legacy && typeof tweet.legacy.favorite_count === "number" ? tweet.legacy.favorite_count : 0;
  if (fav) item.fav = fav;
  var seen = tweet && tweet.views && typeof tweet.views.count === "number" ? tweet.views.count : 0;
  if (seen) item.views = seen;
  return item;
}

// ---------------------------------------------------------------------------
// Una página de guardados → títulos + cursor
// ---------------------------------------------------------------------------

// El último @usuario que apareció en una lista; sirve de respaldo para la línea de estado.
var lastSeenHandle = "";

function parsePage(json) {
  var timeline = timelineOf(json);
  if (!timeline) {
    var detail = json && json.errors ? JSON.stringify(json.errors).slice(0, 150) : "sin timeline";
    throw kino.error("unavailable", "lista " + detail, {
      userMessage:
        "X no devolvió la lista (" + detail + "). " +
        "Si acabas de entrar, vuelve a iniciar sesión. Si el aviso habla de «features» o «queryId», " +
        "copia el identificador nuevo de la petición «Bookmarks» de x.com y pégalo en " +
        "Ajustes ▸ Twitter/X Media ▸ Identificador de la API."
    });
  }

  var entries = entriesOf(timeline);
  var items = [];
  var seen = {};
  var next = "";
  var cache = readMediaCache();
  var dirty = false;

  for (var i = 0; i < entries.length; i++) {
    var entry = entries[i];
    var content = entry && entry.content;
    if (content && content.cursorType === "Bottom" && typeof content.value === "string") {
      next = content.value;
    }
    var tweets = tweetsInEntry(entry);
    for (var t = 0; t < tweets.length; t++) {
      var tweet = unwrapTweet(tweets[t]);
      if (!tweet) continue;
      var legacy = tweet.legacy;
      var tweetId = String(tweet.rest_id || (legacy && (legacy.id_str || legacy.id)) || "");
      if (!/^\d{1,25}$/.test(tweetId)) continue;
      var handle = handleOf(tweet);
      if (handle && !lastSeenHandle) lastSeenHandle = handle;
      var media = mediaOf(tweet);
      var index = 0;
      for (var mm = 0; mm < media.length; mm++) {
        var record = videoRecord(media[mm]);
        if (!record) continue;
        var key = tweetId + ":" + index;
        delete cache[key];
        cache[key] = record; // reinsertar: lo que se muestra queda como lo más reciente en la caché
        dirty = true;
        var item = itemOf(tweet, media[mm], index, tweetId, handle);
        if (item && !seen[item.id]) {
          seen[item.id] = true;
          items.push(item);
        }
        index++;
      }
    }
  }

  if (dirty) writeMediaCache(cache);
  if (items.length > 100) items = items.slice(0, 100);
  // Todo lo cargado queda en el catálogo (sin URLs de video, que caducan):
  // la pantalla «Buscar en X» y la búsqueda local lo aprovechan después.
  if (items.length) catalogRemember(items, []);
  return { items: items, next: next };
}

// ---------------------------------------------------------------------------
// Publicaciones que son FOTOS (no video): la pantalla propia las mezcla en
// su feed, como la cronología de X. Nunca se convierten en títulos de Kino:
// no hay video que reproducir; solo se ven en la pantalla y se abren en x.com.
// ---------------------------------------------------------------------------

// ¿Es una foto? Los GIF animados traen video_info y cuentan como video.
function isPhoto(media) {
  if (!media || typeof media.media_url_https !== "string" || !media.media_url_https) return false;
  if (media.video_info || media.videoInfo) return false;
  if (typeof media.type === "string" && media.type) return media.type === "photo";
  return media.__typename === "MediaPhoto";
}

// Las fotos de una página de búsqueda, como publicaciones para el feed.
function photoPostsOf(json, cap) {
  var timeline = timelineOf(json);
  if (!timeline) return [];
  var entries = entriesOf(timeline);
  var posts = [];
  var seen = {};
  var limit = cap || 20;
  for (var i = 0; i < entries.length && posts.length < limit; i++) {
    var tweets = tweetsInEntry(entries[i]);
    for (var t = 0; t < tweets.length && posts.length < limit; t++) {
      var tweet = unwrapTweet(tweets[t]);
      if (!tweet) continue;
      var legacy = tweet.legacy;
      var tweetId = String(tweet.rest_id || (legacy && (legacy.id_str || legacy.id)) || "");
      if (!/^\d{1,25}$/.test(tweetId) || seen[tweetId]) continue;
      var media = mediaOf(tweet);
      var image = "";
      var photoCount = 0;
      var width = 0;
      var height = 0;
      for (var mm = 0; mm < media.length; mm++) {
        if (!isPhoto(media[mm])) continue;
        photoCount++;
        if (!image) {
          image = media[mm].media_url_https;
          var size = media[mm].original_info || {};
          if (typeof size.width === "number" && size.width > 9 && size.width < 10000) width = Math.round(size.width);
          if (typeof size.height === "number" && size.height > 9 && size.height < 10000) height = Math.round(size.height);
        }
      }
      if (!image) continue;
      seen[tweetId] = true;
      var handle = handleOf(tweet);
      var text = tweetText(tweet);
      var firstLine = text.split("\n")[0].trim();
      var title = firstLine || (handle ? "Foto de @" + handle : "Foto de X");
      if (title.length > 200) title = title.slice(0, 200);
      var post = {
        kind: "foto",
        id: "f" + tweetId,
        ref: "f:" + tweetId,
        title: title,
        image: image + "?name=medium"
      };
      if (width && height) {
        post.w = width;
        post.h = height;
      }
      if (handle) {
        post.by = "@" + handle;
        post.web = X + "/" + handle + "/status/" + tweetId;
      } else {
        post.web = X + "/i/status/" + tweetId;
      }
      if (text.length > 280) text = text.slice(0, 277) + "…";
      if (text) post.text = text;
      var createdAt = legacy && typeof legacy.created_at === "string" ? legacy.created_at : "";
      var when = createdAt ? Date.parse(createdAt) : NaN;
      if (!isNaN(when)) post.at = when;
      var parts = [];
      if (photoCount > 1) parts.push(photoCount + " fotos");
      var fav = legacy && typeof legacy.favorite_count === "number" ? legacy.favorite_count : 0;
      if (fav) parts.push("♥ " + prettyCount(fav));
      if (parts.length) post.stats = parts.join(" · ");
      posts.push(post);
    }
  }
  return posts;
}

async function bookmarksPage(cursor, options) {
  var json = await bookmarksRaw(cursor, options);
  return parsePage(json);
}

// ---------------------------------------------------------------------------
// El Inicio de X («Para ti»): la misma consulta que la web, solo con videos
// ---------------------------------------------------------------------------

async function timelineRaw(cursor, options) {
  var opts = options || {};
  var id = homeId();
  var variables = { count: opts.count || 20, includePromotedContent: true };
  if (cursor) variables.cursor = cursor;
  var query =
    "?variables=" +
    encodeURIComponent(JSON.stringify(variables)) +
    "&features=" +
    encodeURIComponent(JSON.stringify(FEATURES));

  var r = await xget(X + "/i/api/graphql/" + id + "/HomeTimeline" + query, {
    timeoutMs: opts.timeoutMs || 15000
  });

  // Identificador viejo: se descubre el nuevo y se repite.
  if (r.status === 400 || r.status === 404 || r.status === 422) {
    var next = await discover();
    if (next.HomeTimeline && next.HomeTimeline !== id) {
      id = next.HomeTimeline;
      r = await xget(X + "/i/api/graphql/" + id + "/HomeTimeline" + query, {
        timeoutMs: opts.timeoutMs || 15000
      });
    }
  }

  // La web de X manda el Inicio por POST con un cuerpo JSON: si el GET no
  // sirve, se prueba por POST antes de rendirse.
  if (!r.ok && (r.status === 400 || r.status === 405 || r.status === 422)) {
    try {
      var body = {
        queryId: id,
        operationName: "HomeTimeline",
        variables: variables,
        features: FEATURES
      };
      r = await kino.fetch(X + "/i/api/graphql/" + id + "/HomeTimeline", {
        method: "POST",
        body: { json: body },
        headers: jsonHeaders(),
        timeoutMs: opts.timeoutMs || 15000,
        cookies: false,
        redirect: "follow"
      });
    } catch (e) {
      kino.log("timeline post:", e && e.code);
    }
  }

  if (!r.ok) {
    throw kino.error("unavailable", "timeline " + r.status, {
      userMessage:
        "X no dio el Inicio ahora (código " + r.status + "). Tus guardados siguen funcionando."
    });
  }

  var json;
  try {
    json = r.json();
  } catch (e) {
    throw kino.error("unavailable", "timeline json", {
      userMessage: "El Inicio de X devolvió algo que no se entiende. Inténtalo más tarde."
    });
  }
  return json;
}

async function timelinePage(cursor, options) {
  var json = await timelineRaw(cursor, options);
  return parsePage(json);
}

// ---------------------------------------------------------------------------
// Los Me gusta de la cuenta (pestaña «Me gusta» del perfil): la misma consulta
// «Likes» que la web usa en x.com/<usuario>/likes. Su identificador no tiene
// semilla conocida: lo descubre el plugin en los archivos de la web de X y, si
// no aparece, se puede pegar a mano con «likes:código» en Identificador de la
// API. Si no se consigue, la fila simplemente no sale; nada más se rompe.
// ---------------------------------------------------------------------------

const LIKES_USER_KEY = "likesuser:v1";

// El id numérico de la cuenta, con caché de una semana (una petición menos).
async function likesUserId() {
  var handle = cachedAccount();
  var raw = kino.storage.get(LIKES_USER_KEY);
  if (raw) {
    try {
      var saved = JSON.parse(raw);
      if (saved && saved.id && saved.handle === handle) return saved.id;
    } catch (e) {
      /* se vuelve a consultar */
    }
  }
  if (!handle) {
    try {
      handle = await whoAmI(null, 8000);
    } catch (e) {
      kino.log("likes whoami:", e && e.code);
      return "";
    }
  }
  if (!handle) return "";
  var uid = await userIdOf(handle);
  try {
    kino.storage.set(LIKES_USER_KEY, JSON.stringify({ handle: handle, id: uid }), {
      ttlMs: 7 * 24 * 60 * 60 * 1000
    });
  } catch (e2) {
    /* sin caché igual funciona */
  }
  return uid;
}

async function likesRaw(cursor, options) {
  var opts = options || {};
  var uid = await likesUserId();
  if (!uid) {
    throw kino.error("unavailable", "likes sin usuario", {
      userMessage: "No se pudo confirmar tu cuenta para leer tus Me gusta."
    });
  }
  var id = queryId().Likes;
  if (!id) {
    var d0 = await discover();
    id = d0.Likes || "";
  }
  if (!id) {
    throw kino.error("unavailable", "likes sin id", {
      userMessage:
        "X no publicó el identificador de «Me gusta» en esta sesión. En tu computador abre " +
        "x.com con tu cuenta, entra a tu perfil ▸ Me gusta, y con F12 ▸ Red copia el identificador " +
        "de la petición «Likes» (/i/api/graphql/…/Likes); pégalo en Ajustes ▸ Twitter/X Media ▸ " +
        "Identificador de la API así: likes:código"
    });
  }
  var variables = { userId: uid, count: opts.count || 20, includePromotedContent: false };
  if (cursor) variables.cursor = cursor;
  var query =
    "?variables=" +
    encodeURIComponent(JSON.stringify(variables)) +
    "&features=" +
    encodeURIComponent(JSON.stringify(FEATURES));

  var r = await xget(X + "/i/api/graphql/" + id + "/Likes" + query, {
    timeoutMs: opts.timeoutMs || 14000
  });

  // Identificador viejo: se descubre el nuevo y se repite una vez.
  if (r.status === 400 || r.status === 404 || r.status === 422) {
    var next = await discover();
    if (next.Likes && next.Likes !== id) {
      id = next.Likes;
      r = await xget(X + "/i/api/graphql/" + id + "/Likes" + query, {
        timeoutMs: opts.timeoutMs || 14000
      });
    }
  }

  if (!r.ok) {
    throw kino.error("unavailable", "likes " + r.status, {
      userMessage: "X no dio tus Me gusta ahora (código " + r.status + ")."
    });
  }
  try {
    return r.json();
  } catch (e) {
    throw kino.error("unavailable", "likes json", {
      userMessage: "Tus Me gusta devolvieron algo que no se entiende. Inténtalo más tarde."
    });
  }
}

async function likesPage(cursor, options) {
  return parsePage(await likesRaw(cursor, options));
}

// ---------------------------------------------------------------------------
// Búsqueda en X: @usuario y #etiqueta traen videos directamente de X
// ---------------------------------------------------------------------------

const OP_USER_BY_SCREEN_NAME = "AMIBMjtxEEATh4z8V9GtRg";
const OP_USER_MEDIA = "iTSlWbsmD00dAE7Sk9xvIw";

// Los operadores de búsqueda de X (from:, since:, min_faves:, lang:…) se pasan tal cual.
function hasOperators(text) {
  return /(^|\s)(from|to|since|until|min_faves|min_retweets|min_replies|lang|filter|url|exclude|include|geocode):/i.test(text);
}

// Quita los operadores (filter:, from:…) de una consulta cruda: deja solo
// las palabras, para buscar coincidencias en los guardados.
function stripOperators(raw) {
  var parts = String(raw || "").split(/\s+/);
  var keep = [];
  for (var i = 0; i < parts.length; i++) {
    if (parts[i] && !/^[A-Za-z_]+:/.test(parts[i])) keep.push(parts[i]);
  }
  return keep.join(" ").trim();
}

function rawQueryOf(text) {
  if (hasOperators(text)) return text;
  if (text.charAt(0) === "@") {
    return "from:" + text.slice(1).replace(/[^A-Za-z0-9_]/g, "") + " filter:native_video";
  }
  var match = /^#([A-Za-z0-9_]+)/.exec(text);
  if (match) return "#" + match[1] + " filter:native_video";
  return text + " filter:native_video";
}

// ---------------------------------------------------------------------------
// Palabras y filtros: lo común de la búsqueda de guardados y de la pantalla
// ---------------------------------------------------------------------------

function wordsOf(text) {
  var lowered = text.toLowerCase();
  var parts = lowered.split(/[\s,;]+/);
  var wanted = [];
  for (var i = 0; i < parts.length; i++) {
    if (parts[i].length > 1 && wanted.indexOf(parts[i]) < 0) wanted.push(parts[i]);
  }
  if (!wanted.length && lowered.trim()) wanted.push(lowered.trim());
  return wanted;
}

function matchesWords(item, wanted) {
  var hay = item.title + " " + (item.overview || "");
  if (item.handle) hay += " @" + item.handle;
  hay = hay.toLowerCase();
  for (var i = 0; i < wanted.length; i++) {
    if (hay.indexOf(wanted[i]) < 0) return false;
  }
  return true;
}

// Filtra una lista local (guardados o Inicio) por palabras, con presupuesto de tiempo.
async function filterList(text, run, count, budgetMs) {
  var wanted = wordsOf(text);
  var found = [];
  var seen = {};
  var cursor = null;
  var started = Date.now();
  for (var round = 0; round < 3; round++) {
    var remaining = budgetMs - (Date.now() - started);
    if (remaining < 2500) break;
    var page;
    try {
      page = await run(cursor, {
        count: count,
        timeoutMs: Math.min(9000, remaining)
      });
    } catch (e) {
      if (round === 0) throw e;
      break;
    }
    for (var i = 0; i < page.items.length; i++) {
      var item = page.items[i];
      if (matchesWords(item, wanted) && !seen[item.id]) {
        seen[item.id] = true;
        found.push(item);
      }
    }
    if (found.length >= 60 || !page.next) break;
    cursor = page.next;
  }
  return found;
}

// La búsqueda de la pantalla y de search(): recorre lo que el plugin SÍ puede
// cargar de X — el Inicio y los guardados, que no piden sello anti-bot — y se
// queda con los videos y fotos cuyas palabras coinciden con la consulta. La
// API pública de búsqueda de X (SearchTimeline) sigue cerrada para clientes
// que no son la web de X: la rechaza aunque la petición lleve el sello que su
// web calcula, así que el plugin dejó de intentarlo.
async function loadedSearch(text, budgetMs) {
  var wanted = wordsOf(stripOperators(text));
  var items = [];
  var photos = [];
  var seenItems = {};
  var seenPhotos = {};
  var started = Date.now();

  // Primero el catálogo (kino.storage): lo que el plugin ya cargó antes del
  // Inicio y los guardados responde al instante, sin red. Después la red
  // suma lo nuevo que coincida.
  var fromCatalog = catalogMatches(wanted);
  for (var c = 0; c < fromCatalog.items.length; c++) {
    if (!seenItems[fromCatalog.items[c].id]) {
      seenItems[fromCatalog.items[c].id] = true;
      items.push(fromCatalog.items[c]);
    }
  }
  for (var cp = 0; cp < fromCatalog.photos.length; cp++) {
    if (!seenPhotos[fromCatalog.photos[cp].id]) {
      seenPhotos[fromCatalog.photos[cp].id] = true;
      photos.push(fromCatalog.photos[cp]);
    }
  }

  // Una página de cualquier lista: suma los videos y las fotos que coincidan.
  function take(json) {
    var page = { items: [], next: "" };
    try {
      page = parsePage(json);
    } catch (e) {
      /* página inservible: se sigue con la siguiente */
    }
    // Lo que se carga queda en el catálogo para la próxima búsqueda.
    var pics = [];
    try {
      pics = photoPostsOf(json, 40);
    } catch (e) {
      /* sin fotos en esta página */
    }
    if (page.items.length || pics.length) catalogRemember(page.items, pics);
    for (var i = 0; i < page.items.length; i++) {
      var item = page.items[i];
      if (!seenItems[item.id] && matchesWords(item, wanted)) {
        seenItems[item.id] = true;
        items.push(item);
      }
    }
    for (var p = 0; p < pics.length; p++) {
      var pic = pics[p];
      if (seenPhotos[pic.id]) continue;
      var hay = ((pic.title || "") + " " + (pic.text || "") + " " + (pic.by || "")).toLowerCase();
      var ok = true;
      for (var w = 0; w < wanted.length; w++) {
        if (hay.indexOf(wanted[w]) < 0) {
          ok = false;
          break;
        }
      }
      if (ok) {
        seenPhotos[pic.id] = true;
        photos.push(pic);
      }
    }
    return page.next || "";
  }

  // El Inicio («Para ti»): hasta cuatro páginas, dentro del presupuesto.
  var homeNext = null;
  for (var round = 0; round < 4; round++) {
    var remaining = budgetMs - (Date.now() - started);
    if (remaining < 2500) break;
    var json;
    try {
      json = await timelineRaw(homeNext, { count: 40, timeoutMs: Math.min(9000, remaining) });
    } catch (e) {
      kino.log("home scan:", e && e.code);
      break;
    }
    homeNext = take(json);
    if (!homeNext || items.length >= 80) break;
  }

  // Los guardados: hasta tres páginas con lo que quede de presupuesto.
  var savedNext = null;
  for (var round2 = 0; round2 < 3; round2++) {
    var remaining2 = budgetMs - (Date.now() - started);
    if (remaining2 < 2500) break;
    var json2;
    try {
      json2 = await bookmarksRaw(savedNext, { count: 40, timeoutMs: Math.min(9000, remaining2) });
    } catch (e) {
      kino.log("saved scan:", e && e.code);
      break;
    }
    savedNext = take(json2);
    if (!savedNext || items.length >= 80) break;
  }

  // Los Me gusta: hasta dos páginas con lo que quede de presupuesto.
  var likesNext = null;
  for (var round3 = 0; round3 < 2; round3++) {
    var remaining3 = budgetMs - (Date.now() - started);
    if (remaining3 < 2500) break;
    var json3;
    try {
      json3 = await likesRaw(likesNext, { count: 40, timeoutMs: Math.min(9000, remaining3) });
    } catch (e3) {
      kino.log("likes scan:", e3 && e3.code);
      break;
    }
    likesNext = take(json3);
    if (!likesNext || items.length >= 80) break;
  }

  return { items: items, photos: photos };
}

// Para search() de Kino: solo los videos (los títulos que Kino pagina).
async function searchEverywhere(text, budgetMs) {
  var found = await loadedSearch(text, budgetMs);
  return found.items;
}

// @persona: todos los videos del perfil, por la pestaña Multimedia de X
// ---------------------------------------------------------------------------

async function userIdOf(handle) {
  var variables = { screen_name: handle };
  var query =
    "?variables=" +
    encodeURIComponent(JSON.stringify(variables)) +
    "&features=" +
    encodeURIComponent(JSON.stringify(SEARCH_FEATURES)) +
    "&fieldToggles=" +
    encodeURIComponent(JSON.stringify({ withArticleRichContentState: false }));
  var r = await xget(X + "/i/api/graphql/" + OP_USER_BY_SCREEN_NAME + "/UserByScreenName" + query, { timeoutMs: 12000 });
  if (!r.ok) {
    throw kino.error("unavailable", "user " + r.status, {
      userMessage: "X no respondió al buscar esa cuenta. Inténtalo más tarde."
    });
  }
  var json;
  try {
    json = r.json();
  } catch (e) {
    throw kino.error("unavailable", "user json", { userMessage: "X devolvió algo que no se entiende." });
  }
  var userId = "";
  (function walk(o) {
    if (!o || typeof o !== "object" || userId) return;
    if (o.__typename === "User" && typeof o.rest_id === "string" && o.rest_id) {
      userId = o.rest_id;
      return;
    }
    for (var k in o) walk(o[k]);
  })(json);
  if (!userId) {
    throw kino.error("not_found", "sin usuario " + handle, {
      userMessage: "No se encontró @" + handle + " en X. Revisa el nombre."
    });
  }
  return userId;
}

async function userMediaRaw(cursor, userId) {
  var variables = {
    userId: userId,
    count: 20,
    includePromotedContent: false,
    withClientEventToken: false,
    withBirdwatchNotes: false
  };
  if (cursor) variables.cursor = cursor;
  var query =
    "?variables=" +
    encodeURIComponent(JSON.stringify(variables)) +
    "&features=" +
    encodeURIComponent(JSON.stringify(SEARCH_FEATURES));
  var r = await xget(X + "/i/api/graphql/" + OP_USER_MEDIA + "/UserMedia" + query, { timeoutMs: 14000 });
  if (!r.ok) {
    throw kino.error("unavailable", "usermedia " + r.status, {
      userMessage: "X no respondió al pedir los videos de esa cuenta."
    });
  }
  var json;
  try {
    json = r.json();
  } catch (e) {
    throw kino.error("unavailable", "usermedia json", { userMessage: "X devolvió algo que no se entiende." });
  }
  return parsePage(json);
}

async function xUserMedia(handle) {
  var userId = await userIdOf(handle);
  var items = [];
  var seen = {};
  var cursor = null;
  for (var round = 0; round < 5; round++) {
    var page;
    try {
      page = await userMediaRaw(cursor, userId);
    } catch (e) {
      if (round === 0) throw e;
      break;
    }
    for (var i = 0; i < page.items.length; i++) {
      var item = page.items[i];
      if (!seen[item.id]) {
        seen[item.id] = true;
        items.push(item);
      }
    }
    if (items.length >= 100 || !page.next) break;
    cursor = page.next;
  }
  return items.slice(0, 100);
}

export async function home() {
  requireSession();
  var rows = [];

  var page = await bookmarksPage(null, { count: 20, timeoutMs: 12000 });
  if (page.items.length) {
    var handle = cachedAccount();
    rows.push({
      id: "guardados",
      title: handle
        ? "Twitter/X Media · Guardados de @" + handle
        : "Twitter/X Media · Tus videos guardados",
      ref: "bm",
      genre: "entretenimiento",
      items: page.items
    });

    // Segunda página de guardados como fila propia.
    if (page.next) {
      try {
        var bm2 = await bookmarksPage(page.next, { count: 20, timeoutMs: 10000 });
        if (bm2.items.length) {
          rows.push({
            id: "guardados-2",
            title: "Twitter/X Media · Más guardados",
            ref: "bm",
            genre: "entretenimiento",
            items: bm2.items
          });
        }
      } catch (e) {
        kino.log("guardados 2:", e && e.code);
      }
    }
  }

  // Los Me gusta son otro extra: si X los rechaza o falta el identificador,
  // no se pierden los guardados ni el Inicio.
  try {
    var lk = await likesPage(null, { count: 20, timeoutMs: 10000 });
    if (lk.items.length) {
      rows.push({
        id: "megusta",
        title: "Twitter/X Media · Tus Me gusta",
        ref: "likes",
        genre: "entretenimiento",
        items: lk.items
      });
    }
  } catch (e) {
    kino.log("me gusta:", e && e.code);
  }

  // Las filas del Inicio son un extra: si X las rechaza, no se pierden los guardados.
  var tl = null;
  try {
    tl = await timelinePage(null, { count: 20, timeoutMs: 10000 });
    if (tl.items.length) {
      rows.unshift({
        id: "inicio",
        title: "Twitter/X Media · Inicio (Para ti)",
        ref: "tl",
        genre: "entretenimiento",
        items: tl.items
      });
    }
  } catch (e) {
    kino.log("inicio:", e && e.code);
  }

  // Segunda página del Inicio como fila propia.
  if (tl && tl.next) {
    try {
      var tl2 = await timelinePage(tl.next, { count: 20, timeoutMs: 10000 });
      if (tl2.items.length) {
        rows.splice(1, 0, {
          id: "inicio-2",
          title: "Twitter/X Media · Más del Inicio",
          ref: "tl",
          genre: "entretenimiento",
          items: tl2.items
        });
      }
    } catch (e) {
      kino.log("inicio 2:", e && e.code);
    }
  }

  return rows;
}

export async function browse(ref, cursor) {
  requireSession();
  // Resultados de una búsqueda de X: ref "x:<consulta codificada>" (la pantalla
  // propia lo usa para el «Ver más» de sus filas). La lista pagina DOS caudales
  // de X a la vez — recientes y populares — y en la primera página suma los
  // guardados que coinciden, como el feed de la pantalla. Si un caudal falla
  // (X limita las peticiones con facilidad), se sigue con el otro; solo se
  // muestra error cuando no queda nada de nada.
  var xRef = /^x:(.+)$/.exec(String(ref || ""));
  if (xRef) {
    var raw = xRef[1];
    try {
      raw = decodeURIComponent(raw);
    } catch (e) {
      /* queda tal cual si no estaba codificado */
    }

    // La búsqueda pública de X sigue cerrada para clientes que no son su
    // web: la lista se llena con lo que el plugin SÍ puede cargar — el
    // Inicio y los guardados — filtrado por la consulta, en una sola tanda.
    var plain = stripOperators(raw);
    var found = { items: [] };
    try {
      found = await loadedSearch(plain || raw, 20000);
    } catch (e) {
      kino.log("browse x:", e && e.code);
      if (!cursor) throw e;
    }
    return { items: found.items.slice(0, 100) };
  }
  var isHome = ref === "tl" || ref === "inicio";
  var isLikes = ref === "likes" || ref === "megusta";
  if (!isHome && !isLikes && ref !== "bm" && ref !== "guardados") {
    throw kino.error("not_found", "ref " + String(ref).slice(0, 40));
  }
  var page = isHome
    ? await timelinePage(cursor || null, { count: 20, timeoutMs: 14000 })
    : isLikes
      ? await likesPage(cursor || null, { count: 20, timeoutMs: 14000 })
      : await bookmarksPage(cursor || null, { count: 40, timeoutMs: 14000 });
  var answer = { items: page.items };
  if (page.next) answer.next = page.next;
  return answer;
}

export async function search(query) {
  requireSession();
  var text = query && typeof query.q === "string" ? query.q.trim() : "";
  if (!text) return [];

  // «Buscar en» (búsqueda con ámbito): query.within es el ref de la fila
  // «Ver más» donde la persona busca, no un interruptor. Dentro de los
  // guardados o del Inicio se filtra esa misma lista; en cualquier otra
  // lista se devuelve null y Kino filtra lo cargado por su cuenta.
  var within = query && typeof query.within === "string" ? query.within : "";
  if (within) {
    if (within === "bm" || within === "guardados") {
      return filterList(text, bookmarksPage, 40, 11000);
    }
    if (within === "tl" || within === "inicio") {
      return filterList(text, timelinePage, 20, 11000);
    }
    return null;
  }

  // @persona: primero los videos del perfil (pestaña Multimedia), que no
  // piden sello anti-bot; si esa vía falla, la búsqueda local de siempre.
  if (text.charAt(0) === "@") {
    var handle = text.slice(1).replace(/[^A-Za-z0-9_]/g, "");
    if (handle) {
      try {
        var own = await xUserMedia(handle);
        if (own.length) return own;
      } catch (e) {
        kino.log("usermedia:", e && e.code);
      }
    }
  }

  // Operadores, #etiquetas y palabras sueltas: la búsqueda local (Inicio y
  // guardados filtrados por las palabras). La API pública de búsqueda de X
  // sigue cerrada para clientes que no son su web.
  return searchEverywhere(stripOperators(text) || text, 13000);
}

export async function resolve(ref) {
  requireSession();
  var match = /^t:(\d{1,25}):(\d{1,2})$/.exec(String(ref || ""));
  if (!match) throw kino.error("not_found", "ref " + String(ref).slice(0, 40));
  var tweetId = match[1];
  var index = Number(match[2]);

  // X renueva las URLs de sus videos en cada recarga de página: una URL
  // guardada caduca a los poco minutos. Por eso la URL SIEMPRE se pide
  // fresca (el servicio público de X para un tuit suelto, y si no, una
  // página de guardados/Inicio que la traiga de nuevo); la caché solo
  // sirve de último recurso si ninguna de las dos vías contesta.
  var record = null;
  try {
    record = await lookupVideo(tweetId, index);
  } catch (e) {
    kino.log("lookup:", e && e.code);
  }
  if (!record) record = readMediaCache()[tweetId + ":" + index];
  if (!record || (!record.v && !record.h)) {
    throw kino.error("not_found", "sin url para " + ref, {
      userMessage: "Ese video ya no está disponible en X. Actualiza el Inicio y vuelve a intentar."
    });
  }

  var saver = setting("calidad") === "bajo";
  var stream = null;
  if (record.v && record.v.length) {
    var chosen = saver ? record.v[0] : record.v[record.v.length - 1];
    stream = { url: chosen[1], mime: "video/mp4" };
  } else if (record.h) {
    // HLS: sin mime, Kino lo reconoce por la dirección.
    stream = { url: record.h };
  }
  if (!stream) throw kino.error("not_found", "sin copia reproducible");
  if (record.d) stream.durationMs = record.d;
  if (record.v && record.v.length > 1) {
    var alternatives = [];
    for (var i = record.v.length - 1; i >= 0; i--) {
      var candidate = record.v[i];
      if (candidate[1] === stream.url) continue;
      alternatives.push({
        url: candidate[1],
        mime: "video/mp4",
        label: candidate[2] ? candidate[2] + "p" : "Otra copia"
      });
      if (alternatives.length >= 4) break;
    }
    if (alternatives.length) stream.alternatives = alternatives;
  }
  return stream;
}

// Busca la URL de un video que no está en la caché: primero el servicio público de X para un
// tuit suelto y, si no, recorriendo los guardados.
async function lookupVideo(tweetId, index) {
  try {
    var token = syndicationToken(tweetId);
    var r = await kino.fetch(
      SYNDICATION + "/tweet-result?id=" + tweetId + "&lang=" + clientLang() + "&token=" + token,
      { headers: { accept: "application/json" }, timeoutMs: 8000, cookies: false }
    );
    if (r.ok) {
      var body = r.json();
      var list = body && body.mediaDetails && typeof body.mediaDetails.length === "number" ? body.mediaDetails : [];
      var media = list[index];
      if (!media) {
        for (var i = 0; i < list.length; i++) {
          if (videoRecord(list[i])) {
            media = list[i];
            break;
          }
        }
      }
      var record = videoRecord(media);
      if (record) {
        cachePut(tweetId + ":" + index, record);
        return record;
      }
    }
  } catch (e) {
    kino.log("syndication:", e && e.code);
  }

  var pools = [
    { pages: 3, run: function (c) { return bookmarksPage(c, { count: 40, timeoutMs: 10000 }); } },
    { pages: 3, run: function (c) { return timelinePage(c, { count: 20, timeoutMs: 10000 }); } }
  ];
  for (var p = 0; p < pools.length; p++) {
    var cursor = null;
    for (var round = 0; round < pools[p].pages; round++) {
      var page;
      try {
        page = await pools[p].run(cursor);
      } catch (e) {
        break;
      }
      var cached = readMediaCache()[tweetId + ":" + index];
      if (cached) return cached;
      if (!page.next) break;
      cursor = page.next;
    }
  }
  return null;
}

// El token que pide el servicio público de X para un tuit: sale de su propio JavaScript.
function syndicationToken(id) {
  var value = (Number(id) / 1e15) * Math.PI;
  return value.toString(36).replace(/(0+|\.)/g, "");
}

// ---------------------------------------------------------------------------
// Formulario de ajustes: estado, botones y revisión antes de guardar
// ---------------------------------------------------------------------------

export async function settingsStatus() {
  if (!cookieString()) {
    return { estado: "Sin sesión: toca «Iniciar sesión en X»", hide: ["logout"] };
  }
  if (!signedIn()) {
    return { estado: "Faltan cookies: hacen falta auth_token y ct0", hide: ["logout"] };
  }
  var handle = cachedAccount();
  if (handle) return { estado: "Conectado como @" + handle, hide: ["link", "ayuda"] };
  try {
    handle = await whoAmI(null, 6000);
  } catch (e) {
    if (e && e.code === "auth_required") {
      return { estado: "La sesión venció: vuelve a iniciar sesión", hide: ["logout"] };
    }
    return { estado: "No se pudo consultar X ahora" };
  }
  if (!handle) {
    // La consulta de guardados también dice quién eres: el autor del primer tuit.
    try {
      await bookmarksPage(null, { count: 20, timeoutMs: 6000 });
      handle = lastSeenHandle;
      if (handle) rememberAccount(handle);
    } catch (e) {
      if (e && e.code === "auth_required") {
        return { estado: "La sesión venció: vuelve a iniciar sesión", hide: ["logout"] };
      }
    }
  }
  return {
    estado: handle ? "Conectado como @" + handle : "Sesión guardada",
    hide: ["link", "ayuda"]
  };
}

export async function action(key) {
  if (key === "link") {
    var browser = kino.visualBrowser;
    if (!browser || browser.available !== true) {
      return {
        message:
          "Este Kino no puede abrir la ventana. Pega tus cookies en el campo de sesión (mira «Cómo iniciar sesión»)."
      };
    }
    var result;
    try {
      result = await browser.open({
        url: X + "/i/flow/login?redirect_after_login=%2Fi%2Fbookmarks",
        title: "Iniciar sesión en X",
        doneWhen: { cookies: ["auth_token", "ct0"] },
        collect: {
          cookies: ["auth_token", "ct0"],
          storeAs: { setting: "cookies", format: "header" }
        },
        userAgent: "browser",
        timeoutMs: 600000
      });
    } catch (e) {
      var code = e && e.code ? e.code : "";
      if (code === "busy") return { message: "Ya hay una ventana abierta. Ciérrala y vuelve a intentar." };
      if (code === "unavailable") {
        return { message: "Este aparato no puede abrir la ventana. Pega tus cookies a mano." };
      }
      return { message: "No se pudo abrir la ventana de X. Pega tus cookies a mano." };
    }
    if (result && result.status === "done" && result.stored) {
      try {
        kino.storage.remove(ACCOUNT_KEY);
        kino.storage.remove(OPS_KEY);
      } catch (e) {
        /* sin caché igual funciona */
      }
      return { message: "Sesión de X vinculada. Abre Inicio para ver tus guardados." };
    }
    if (result && result.status === "closed") return { message: "La ventana se cerró sin vincular la cuenta." };
    return { message: "No se vinculó la cuenta. Pega tus cookies a mano si el problema sigue." };
  }

  if (key === "logout") {
    kino.cookies.clear();
    kino.storage.remove(ACCOUNT_KEY);
    kino.storage.remove(MEDIA_KEY);
    kino.storage.remove(CATALOG_KEY);
    return { message: "Sesión de X cerrada en este plugin.", clearSettings: ["cookies"] };
  }

  if (key === "limpiar") {
    kino.storage.remove(MEDIA_KEY);
    kino.storage.remove(CATALOG_KEY);
    return { message: "Caché y catálogo vaciados: se vuelve a leer de X." };
  }

  return null;
}

export async function validateSettings(values) {
  var raw = values && typeof values.cookies === "string" ? values.cookies.trim() : "";
  if (!raw) return null;
  if (!/auth_token\s*=/.test(raw)) {
    return { cookies: "Faltan las cookies: pega auth_token=… y ct0=…" };
  }
  if (!/ct0\s*=/.test(raw)) {
    return { cookies: "Falta ct0: copia también esa cookie de x.com" };
  }
  try {
    await whoAmI(raw.replace(/^cookie\s*:\s*/i, "").replace(/[\r\n\t]+/g, " "), 8000);
  } catch (e) {
    if (e && e.code === "auth_required") {
      return { cookies: "X no aceptó esa sesión: inicia sesión otra vez" };
    }
    throw e;
  }
  return null;
}

// ---------------------------------------------------------------------------
// Trabajo en segundo plano (capability "schedule", manifest jobs): refresca el
// Inicio y los guardados y deja lo cargado en el catálogo, para que la pantalla
// «Buscar en X» tenga feed y la búsqueda local tenga material aunque X tarde.
// Límites del job: 20 s, 10 peticiones, 256 KB escritos — dos páginas de cada
// lista caben de sobra.
// ---------------------------------------------------------------------------

export async function job(ctx) {
  if (!cookieString() || !signedIn()) return;
  var videos = [];
  var photos = [];
  try {
    var home = await timelineRaw(null, { count: 40, timeoutMs: 9000 });
    var homePage = parsePage(home);
    videos = videos.concat(homePage.items);
    photos = photos.concat(photoPostsOf(home, 40));
  } catch (e) {
    kino.log("job inicio:", e && e.code);
  }
  try {
    var saved = await bookmarksRaw(null, { count: 40, timeoutMs: 9000 });
    var savedPage = parsePage(saved);
    videos = videos.concat(savedPage.items);
    photos = photos.concat(photoPostsOf(saved, 40));
  } catch (e) {
    kino.log("job guardados:", e && e.code);
  }
  try {
    var liked = await likesRaw(null, { count: 40, timeoutMs: 9000 });
    var likedPage = parsePage(liked);
    videos = videos.concat(likedPage.items);
    photos = photos.concat(photoPostsOf(liked, 40));
  } catch (e2) {
    kino.log("job me gusta:", e2 && e2.code);
  }
  if (videos.length || photos.length) catalogRemember(videos, photos);
}

// ---------------------------------------------------------------------------
// Pantalla propia «Buscar en X» (capability "screen"): buscar cualquier tópico
// o persona directamente en X, dentro de Kino. Nada de esto toca tus guardados
// ni deja historial: los títulos siguen siendo 18+ como el resto del plugin.
// ---------------------------------------------------------------------------

// Sin chips de sugerencias a propósito: la pantalla abre con el feed del
// catálogo, que ya muestra lo que hay; el buscador filtra ahí mismo.

// Cuántos resultados guarda la pantalla en su estado (el parche de estado
// admite hasta 64 KB; título, texto recortado e imagen caben de sobra).
var MAX_SCREEN_ITEMS = 30;

// Tope del feed completo: los videos de arriba más las fotos mezcladas,
// ordenadas como la cronología de X (lo más nuevo arriba).
var MAX_FEED_ITEMS = 40;

// «1,2 mil» / «3,4 M», al estilo de X.
function prettyCount(n) {
  if (!n || n < 1) return "";
  if (n >= 1000000) return String(Math.round(n / 100000) / 10).replace(".", ",") + " M";
  if (n >= 1000) return String(Math.round(n / 100) / 10).replace(".", ",") + " mil";
  return String(n);
}

// La línea de ❤ y vistas que sale bajo la imagen.
function statsLine(item) {
  var parts = [];
  if (item.fav) parts.push("♥ " + prettyCount(item.fav));
  if (item.views) parts.push(prettyCount(item.views) + " vistas");
  return parts.join(" · ");
}

// Una publicación para el estado de la pantalla: lo justo para dibujar su
// tarjeta (autor, fecha, texto, imagen y enlace a x.com) sin pasarse del
// parche de 64 KB.
function feedPost(item) {
  var match = /^t:(\d{1,25}):\d{1,2}$/.exec(String(item.ref || ""));
  var tweetId = match ? match[1] : "";
  var handle = typeof item.handle === "string" ? item.handle : "";
  var text = typeof item.overview === "string" ? item.overview : "";
  var post = {
    id: item.id,
    ref: item.ref,
    title: item.title,
    image: item.backdrop || item.poster || "",
    quality: item.quality || "",
    stats: statsLine(item)
  };
  if (handle) {
    post.by = "@" + handle;
    if (tweetId) post.web = X + "/" + handle + "/status/" + tweetId;
  } else if (tweetId) {
    post.web = X + "/i/status/" + tweetId;
  }
  if (text.length > 280) text = text.slice(0, 277) + "…";
  if (text) post.text = text;
  if (item.posted) post.at = item.posted;
  return post;
}

// Una tarjeta del feed, al estilo de X: quién y cuándo arriba, el texto,
// la imagen de la publicación y abajo los botones — «Ver» abre la ficha
// del video en Kino; «Abrir en X» enseña la hoja de Kino y lleva a la
// publicación en x.com (en el TV, su QR para escanearlo con el teléfono).
function feedCard(p) {
  var isPhoto = p.kind === "foto";
  var children = [];

  if (p.by || p.at) {
    var head = { type: "Row", gap: 6, crossAxisAlignment: "center", children: [] };
    if (p.by) {
      head.children.push({ type: "Icon", name: "person" });
      head.children.push({ type: "Text", text: p.by, bold: true, maxLines: 1 });
    }
    if (p.at) {
      if (p.by) head.children.push({ type: "Text", text: "·", style: "caption" });
      head.children.push({ type: "Text", time: p.at, timeFormat: "relative", style: "caption" });
    }
    children.push(head);
  }

  children.push({ type: "Text", text: p.title, bold: true, style: "p", maxLines: 2 });

  // El título es la primera línea del texto; el resto sale como cuerpo.
  var rest = "";
  if (p.text && p.text.length > p.title.length && p.text.indexOf(p.title) === 0) {
    rest = p.text.slice(p.title.length).replace(/^\s+/, "");
  } else if (p.text && p.text !== p.title) {
    rest = p.text;
  }
  if (rest) children.push({ type: "Text", text: rest, style: "p", maxLines: 3 });

  if (p.image) {
    // Las fotos se ven con su proporción real; los videos, en 16:9.
    var aspect = "16:9";
    if (isPhoto) aspect = p.w && p.h ? p.w + ":" + p.h : "1:1";
    children.push({
      type: "Image",
      url: p.image,
      aspect: aspect,
      fit: "cover",
      fill: true,
      alt: p.title,
      altEn: p.title
    });
  }

  var meta = [];
  if (isPhoto) {
    meta.push({ type: "Badge", text: "Foto", textEn: "Photo" });
  } else if (p.quality) {
    meta.push({ type: "Badge", text: p.quality });
  }
  if (p.stats) meta.push({ type: "Text", text: p.stats, style: "caption" });
  var actions = [];
  if (!isPhoto) {
    actions.push({
      type: "TextButton",
      icon: "play",
      labelText: "Ver",
      labelTextEn: "Watch",
      onPressed: { event: "ver", arg: p.id }
    });
  }
  if (p.web) {
    actions.push({
      type: "TextButton",
      icon: "open_in_new",
      labelText: "Abrir en X",
      labelTextEn: "Open on X",
      onPressed: { event: "xweb", arg: p.id }
    });
  }
  var bottom = { type: "Row", gap: 10, mainAxisAlignment: "spaceBetween", crossAxisAlignment: "center", children: [] };
  if (meta.length) bottom.children.push({ type: "Row", gap: 8, crossAxisAlignment: "center", children: meta });
  bottom.children.push({ type: "Row", gap: 4, crossAxisAlignment: "center", children: actions });
  children.push(bottom);

  return {
    type: "Card",
    variant: "outlined",
    padding: 12,
    gap: 8,
    // Una foto no se reproduce: tocar la tarjeta la abre en x.com.
    onTap: isPhoto ? { event: "xweb", arg: p.id } : { event: "ver", arg: p.id },
    children: children
  };
}

export async function screen(arg) {
  var state = (arg && arg.state) || {};
  var inputs = state.inputs || {};
  var q = typeof inputs.q === "string" ? inputs.q : "";

  // Sin sesión: la propia pantalla explica cómo entrar y trae el formulario
  // de ajustes del plugin (iniciar sesión, cookies, estado y la ayuda).
  if (!signedIn()) {
    return {
      type: "Column",
      padding: 16,
      gap: 12,
      children: [
        {
          type: "emptyState",
          icon: "lock",
          title: "Falta la sesión de X",
          titleEn: "No X session",
          text: "Entra con tu cuenta para buscar videos de X. Abajo puedes iniciar sesión o pegar las cookies.",
          textEn: "Sign in with your account to search X videos. Sign in or paste your cookies below."
        },
        { type: "settings", keys: ["link", "cookies", "estado", "ayuda"] }
      ]
    };
  }

  // Sin <Form> a propósito: el campo y el botón mandan el mismo evento
  // «buscar» cada uno por su lado, así el envío nunca se dispara dos veces.
  var children = [
    {
      type: "TextField",
      key: "q",
      kind: "search",
      fill: true,
      labelText: "Buscar videos en X",
      labelTextEn: "Search videos on X",
      hintText: "Un tópico, una persona, @usuario, #etiqueta…",
      hintTextEn: "A topic, a person, @user, #hashtag…",
      value: q,
      autofocus: true,
      onSubmitted: { event: "buscar", timeoutMs: 30000 }
    },
    {
      type: "ElevatedButton",
      icon: "search",
      labelText: "Buscar",
      labelTextEn: "Search",
      onPressed: { event: "buscar", timeoutMs: 30000 }
    }
  ];

  var results = state.results;
  if (results && results.error) {
    children.push({
      type: "errorState",
      title: "La búsqueda falló",
      titleEn: "Search failed",
      text: results.error
    });
    children.push({
      type: "TextButton",
      icon: "refresh",
      labelText: "Reintentar",
      labelTextEn: "Retry",
      onPressed: { event: "buscar", timeoutMs: 30000 }
    });
  } else if (results && (!results.posts || !results.posts.length)) {
    children.push({
      type: "emptyState",
      icon: "search",
      title: "Sin videos para «" + results.q + "»",
      titleEn: 'No videos for "' + results.q + '"',
      text: "La búsqueda recorre tu Inicio y tus guardados de X, y nada coincidió ahí. Prueba otras palabras, o publica/sigue el tema y espera a que aparezca en tu Inicio.",
      textEn: "Search goes through your X Home and bookmarks, and nothing matched there. Try other words, or post and follow the topic until it shows up in your Home."
    });
  } else if (results) {
    // El feed: una tarjeta por publicación, con su imagen, al estilo de la
    // cronología de X, desplazándose solo. Abajo, «Ver más» abre la lista
    // completa con páginas (la que trae browse con los ref «x:»).
    var posts = results.posts;
    var count = typeof results.total === "number" ? results.total : posts.length;
    var label = count + " videos";
    var labelEn = count + " videos";
    if (typeof results.photos === "number" && results.photos) {
      label += " · " + results.photos + " fotos";
      labelEn += " · " + results.photos + " photos";
    }
    children.push({
      type: "Text",
      style: "caption",
      text: results.q ? label + " de X · «" + results.q + "»" : label + " de tu Inicio y tus guardados",
      textEn: results.q ? labelEn + ' from X · "' + results.q + '"' : labelEn + " from your Home and bookmarks"
    });
    var cards = [];
    for (var i = 0; i < posts.length; i++) cards.push(feedCard(posts[i]));
    cards.push({
      type: "Row",
      padding: 12,
      mainAxisAlignment: "center",
      children: [
        {
          type: "TextButton",
          icon: "expand_more",
          labelText: "Ver más resultados",
          labelTextEn: "More results",
          onPressed: { event: "vermas" }
        }
      ]
    });
    children.push({ type: "ListView", flex: 1, gap: 10, items: cards });
  } else {
    // Al abrir la pantalla sin buscar nada: el feed con lo último que el
    // plugin cargó del Inicio («Para ti», las filas que X sugiere) y de los
    // guardados, sacado del catálogo — al instante, sin esperar a X.
    var feed = catalogFeed();
    if (feed.length) {
      children.push({
        type: "Text",
        style: "caption",
        text: "Lo último de tu Inicio, tus guardados y tus Me gusta · toca Buscar para filtrar",
        textEn: "Latest from your Home, bookmarks and Likes · tap Search to filter"
      });
      var feedCards = [];
      for (var f = 0; f < feed.length; f++) feedCards.push(feedCard(feed[f]));
      children.push({ type: "ListView", flex: 1, gap: 10, items: feedCards });
    } else {
      children.push({
        type: "emptyState",
        icon: "movie",
        title: "Aún no hay videos cargados",
        titleEn: "No videos loaded yet",
        text: "Toca «Cargar videos de X» para traer los del Inicio, tus guardados y tus Me gusta; quedan en el catálogo del plugin y desde ahí se buscan y se ven. También puedes activar el refresco en segundo plano en Ajustes ▸ Twitter/X Media.",
        textEn: "Tap \"Load videos from X\" to bring the ones from your Home, bookmarks and Likes; they stay in the plugin's catalog, where search and this feed read from. You can also turn on the background refresh in Settings."
      });
      children.push({
        type: "ElevatedButton",
        icon: "refresh",
        labelText: "Cargar videos de X",
        labelTextEn: "Load videos from X",
        onPressed: { event: "cargar", timeoutMs: 30000 }
      });
    }
  }

  // «fill»: el buscador queda arriba fijo y la ListView, con flex, se
  // desplaza sola como la cronología de X.
  return { type: "Column", padding: 16, gap: 12, children: children, layout: "fill" };
}

export async function screenEvent(event) {
  var name = event && typeof event.name === "string" ? event.name : "";
  var arg = event && typeof event.arg === "string" ? event.arg : "";
  var state = (event && event.state) || {};

  // Botones de las tarjetas del feed: «Ver» abre la ficha del video en Kino
  // (y se reproduce desde ahí, como siempre), «Abrir en X» enseña la hoja
  // «Abrir un enlace» de Kino y lleva a la publicación en x.com (en el TV,
  // un QR para escanearlo con el teléfono), y «Ver más resultados» abre la
  // lista completa paginada.
  if (name === "ver" || name === "xweb" || name === "vermas") {
    var results = state.results;
    if (name === "vermas") {
      if (!results || typeof results.raw !== "string" || !results.raw) return null;
      return {
        go: {
          browse: {
            ref: "x:" + encodeURIComponent(results.raw),
            title: "Resultados de X",
            titleEn: "X results"
          }
        }
      };
    }
    var posts = (results && results.posts) || [];
    var post = null;
    for (var i = 0; i < posts.length; i++) {
      if (posts[i].id === arg) {
        post = posts[i];
        break;
      }
    }
    if (!post) {
      // El feed de arranque sale del catálogo y no vive en el estado de la
      // pantalla: la publicación se busca también allí.
      var feed = catalogFeed();
      for (var j = 0; j < feed.length; j++) {
        if (feed[j].id === arg) {
          post = feed[j];
          break;
        }
      }
    }
    if (!post) {
      return {
        toast: {
          text: "Ese video ya no está en la lista; busca otra vez",
          textEn: "That video is gone from the list; search again"
        }
      };
    }
    if (name === "xweb") {
      if (!post.web) {
        return {
          toast: {
            text: "Esta publicación no tiene enlace a la web",
            textEn: "This post has no web link"
          }
        };
      }
      // Kino enseña su hoja «Abrir un enlace» y abre x.com en el navegador
      // (en el TV, un QR para escanearlo con el teléfono).
      return { go: { url: { href: post.web, title: post.title.slice(0, 60) } } };
    }
    if (!/^t:\d{1,25}:\d{1,2}$/.test(String(post.ref || ""))) {
      return {
        toast: {
          text: "Esta publicación es una foto: ábrela en X",
          textEn: "This post is a photo: open it on X"
        }
      };
    }
    return { go: { title: { ref: post.ref, kind: "movie", id: post.id, title: post.title, adult: true } } };
  }

  if (name !== "buscar" && name !== "cargar") return null;

  var inputs = state.inputs || {};
  var q = "";
  var value = event.value;
  if (typeof value === "string") {
    q = value.trim();
  } else if (value && typeof value === "object" && typeof value.q === "string") {
    q = value.q.trim();
  }
  if (!q && typeof inputs.q === "string") q = inputs.q.trim();
  // «cargar» no necesita palabras: trae todo lo que haya en Inicio y guardados.
  if (!q && name !== "cargar") {
    return { toast: { text: "Escribe qué buscar", textEn: "Type something to search" } };
  }
  if (!signedIn()) {
    return { toast: { text: "Falta la sesión de X: inicia sesión en Ajustes", textEn: "No X session: sign in first" } };
  }

  var results;
  var searchError = null;
  // La búsqueda recorre lo que el plugin SÍ puede cargar de X — el Inicio y
  // los guardados — y se queda con los videos y fotos que coincidan con las
  // palabras. La API pública de búsqueda de X sigue cerrada para clientes
  // que no son su web; el plugin ya no la usa.
  var found = { items: [], photos: [] };
  try {
    found = await loadedSearch(q, 25000);
  } catch (e) {
    searchError = e;
    kino.log("screen search:", e && e.code);
  }
  var items = found.items;
  var photos = found.photos;

  // Un tuit con video ya está como video: su foto no se repite en el feed.
  var videoTweets = {};
  for (var v = 0; v < items.length; v++) {
    var videoMatch = /^t:(\d{1,25}):/.exec(String(items[v].ref || ""));
    if (videoMatch) videoTweets[videoMatch[1]] = true;
  }
  var posts = items.slice(0, MAX_SCREEN_ITEMS).map(feedPost);
  for (var p = 0; p < photos.length; p++) {
    var photo = photos[p];
    var photoMatch = /^f(\d{1,25})$/.exec(String(photo.id || ""));
    if (photoMatch && videoTweets[photoMatch[1]]) continue;
    posts.push(photo);
  }
  // El feed ordenado como la cronología de X: lo más nuevo arriba.
  posts.sort(function (a, b) {
    return (b.at || 0) - (a.at || 0);
  });
  if (posts.length > MAX_FEED_ITEMS) posts = posts.slice(0, MAX_FEED_ITEMS);

  if (!posts.length && searchError) {
    var errMsg = searchError && searchError.userMessage ? searchError.userMessage : "X no respondió ahora. Inténtalo más tarde.";
    results = { q: q, raw: rawQueryOf(q), error: errMsg };
  } else {
    results = {
      q: q,
      raw: rawQueryOf(q),
      total: items.length,
      photos: photos.length,
      posts: posts
    };
  }
  var patch = { results: results, inputs: { q: q } };
  return { state: patch };
}



