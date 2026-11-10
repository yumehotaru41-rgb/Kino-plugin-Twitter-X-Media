// Twitter/X Media — los videos de tus «Elementos guardados» de X (Twitter) dentro de Kino.
// Estructura de ítems igual al plugin de xHamster: kind "movie" con adult: true, así Kino no
// guarda nada en «Mi biblioteca» ni en «Continuar viendo» (privacidad: sin historial).
//
// apiVersion 14 (Kino 0.9.74). La sesión se inicia dentro de Kino con una ventana de navegador
// visible (enhancements["20"].visualBrowser, Kino 0.9.81) o pegando las cookies a mano.
//
// Cómo funciona: con la sesión de la persona el plugin pide la lista de Elementos guardados con la
// misma consulta GraphQL que usa la web de X, se queda con las entradas que traen video y las
// convierte en títulos de Kino. La URL de cada video queda en la caché del plugin, así reproducir
// no cuesta otra petición.
//
// Nota honesta: la consulta interna de X no es una API pública, y X cambia su identificador de vez
// en cuando. Si eso pasa, el plugin intenta descubrir el nuevo leyendo los archivos de la propia
// web de X, y el campo «Identificador de la API» de los ajustes permite fijarlo a mano.
//
// Además de las filas del Inicio, el plugin trae su propia pantalla «Buscar en X» (capability
// "screen"): un buscador de tópicos, personas, @usuarios y #etiquetas que consulta a X primero
// (recientes y populares) y suma después los guardados que coincidan.

const X = "https://x.com";
const SYNDICATION = "https://cdn.syndication.twimg.com";

// El token público del cliente web de X (viaja en el JavaScript de x.com; no es de nadie).
const BEARER =
  "AAAAAAAAAAAAAAAAAAAAANRILgAAAAAAnNwIzUejRCOuH5E6I8xnZz4puTs%3D1Zv7ttfk8LF81IUq16cHjhLTvJu4FA33AGWWjCpTnA";

// Semilla conocida de la consulta Bookmarks; si X la rota, discover() trae la buena.
const SEED_BOOKMARKS = "fjf5b5Lu82lYMSBRhppK2g";

// Semilla conocida de la consulta del Inicio (HomeTimeline); si X la rota, discover() trae la buena.
const SEED_HOME = "c-CzHF1LboFilMpsx4ZCrQ";

// La búsqueda de X (SearchTimeline) no tiene semilla fiable: discover() la encuentra en la web de X.
const SEED_SEARCH = "vLHjqbDv7TPFMBkIIO1nOA";

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
  if (/^[A-Za-z0-9_-]{10,60}$/.test(override)) return { Bookmarks: override };
  return savedOps() || { Bookmarks: SEED_BOOKMARKS };
}

function homeId() {
  var ops = savedOps();
  if (ops && typeof ops.HomeTimeline === "string" && ops.HomeTimeline) return ops.HomeTimeline;
  return SEED_HOME;
}

function searchId() {
  var ops = savedOps();
  if (ops && typeof ops.Search === "string" && ops.Search) return ops.Search;
  return SEED_SEARCH;
}

function scanForOperation(body, name) {
  // El nombre de la operación va pegado a su queryId en la tabla de la web de X.
  var markers = ['operationName:"' + name + '"', 'operationName": "' + name + '"'];
  for (var i = 0; i < markers.length; i++) {
    var at = body.indexOf(markers[i]);
    while (at >= 0) {
      var around = body.slice(Math.max(0, at - 320), at + 360);
      var match = /queryId"\s*:\s*"([A-Za-z0-9_-]{10,60})"/.exec(around);
      if (match) return match[1];
      at = body.indexOf(markers[i], at + 1);
    }
  }
  return "";
}

// X no publica su identificador de consulta: se lee de los archivos de su propia web. Es de mejor
// esfuerzo — si falla, queda la semilla y el campo avanzado de los ajustes.
async function discover() {
  var found = { Bookmarks: "", HomeTimeline: "", Search: "" };
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
  //    la dirección del paquete.
  var lazy = [
    "shared~bundle.BookmarkFolders~bundle.Bookmarks",
    "shared~bundle.Compose~bundle.HomeTimeline~bundle.LoggedInMain",
    "bundle.HomeTimeline",
    "bundle.SearchTimeline"
  ];
  if (!found.Bookmarks || !found.HomeTimeline) {
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
      kino.storage.set(OPS_KEY, JSON.stringify({ Bookmarks: prev.Bookmarks, HomeTimeline: prev.HomeTimeline, Search: prev.Search, at: Date.now() }), {
        ttlMs: 7 * 24 * 60 * 60 * 1000
      });
    } catch (e) {
      /* sin caché igual sirve para esta llamada */
    }
  }
  kino.log("discover:", found.Bookmarks || found.HomeTimeline || found.Search ? "encontrado" : "sin resultado");
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
  return { items: items, next: next };
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
// Búsqueda en X: @usuario y #etiqueta traen videos directamente de X
// ---------------------------------------------------------------------------

const OP_USER_BY_SCREEN_NAME = "AMIBMjtxEEATh4z8V9GtRg";
const OP_USER_MEDIA = "iTSlWbsmD00dAE7Sk9xvIw";

// Los operadores de búsqueda de X (from:, since:, min_faves:, lang:…) se pasan tal cual.
function hasOperators(text) {
  return /(^|\s)(from|to|since|until|min_faves|min_retweets|min_replies|lang|filter|url|exclude|include|geocode):/i.test(text);
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

async function searchRaw(cursor, rawQuery, product, timeoutMs) {
  var id = searchId();
  var variables = {
    rawQuery: rawQuery,
    count: 20,
    querySource: "typed_query",
    product: product || "Latest"
  };
  if (cursor) variables.cursor = cursor;
  var query =
    "?variables=" +
    encodeURIComponent(JSON.stringify(variables)) +
    "&features=" +
    encodeURIComponent(JSON.stringify(SEARCH_FEATURES)) +
    "&fieldToggles=" +
    encodeURIComponent(JSON.stringify({ withArticleRichContentState: false }));
  var r = await xget(X + "/i/api/graphql/" + id + "/SearchTimeline" + query, { timeoutMs: timeoutMs || 14000 });
  if (r.status === 400 || r.status === 404 || r.status === 422) {
    var next = await discover();
    if (next.Search && next.Search !== id) {
      id = next.Search;
      r = await xget(X + "/i/api/graphql/" + id + "/SearchTimeline" + query, { timeoutMs: timeoutMs || 14000 });
    }
  }
  if (!r.ok) {
    throw kino.error("unavailable", "search " + r.status, {
      userMessage: "X no respondió a la búsqueda (código " + r.status + "). Inténtalo más tarde."
    });
  }
  var json;
  try {
    json = r.json();
  } catch (e) {
    throw kino.error("unavailable", "search json", {
      userMessage: "La búsqueda de X devolvió algo que no se entiende. Inténtalo más tarde."
    });
  }
  return parsePage(json);
}

async function xSearch(rawQuery, product, rounds, options) {
  var opts = options || {};
  var deadline = opts.budgetMs ? Date.now() + opts.budgetMs : 0;
  var items = [];
  var seen = {};
  var cursor = null;
  var maxRounds = rounds || 5;
  for (var round = 0; round < maxRounds; round++) {
    if (deadline && Date.now() > deadline - 2500) break;
    var timeout = opts.timeoutMs || 14000;
    if (deadline) timeout = Math.min(timeout, Math.max(2500, deadline - Date.now()));
    var page;
    try {
      page = await searchRaw(cursor, rawQuery, product, timeout);
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
  var hay = (item.title + " " + (item.overview || "")).toLowerCase();
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

// Une dos listas de títulos quitando repetidos.
function mergeItems(first, second, cap) {
  var out = first.slice();
  var ids = {};
  for (var i = 0; i < first.length; i++) ids[first[i].id] = true;
  for (var j = 0; j < second.length; j++) {
    if (!ids[second[j].id]) {
      ids[second[j].id] = true;
      out.push(second[j]);
    }
    if (out.length >= cap) break;
  }
  return out.slice(0, cap);
}

// La misma búsqueda que hace search() para palabras y #etiquetas, con un
// presupuesto repartido: primero X (recientes y populares), después los
// guardados que coincidan. La usan search() y la pantalla propia.
async function searchEverywhere(text, budgetMs) {
  var raw = rawQueryOf(text);
  var fromX = [];
  var xError = null;
  var maxRounds = 3;
  if (budgetMs < 12000) maxRounds = 2;
  try {
    var latest = await xSearch(raw, "Latest", maxRounds, {
      timeoutMs: 11000,
      budgetMs: Math.round(budgetMs * 0.45)
    });
    var popular = await xSearch(raw, "Top", 2, {
      timeoutMs: 11000,
      budgetMs: Math.round(budgetMs * 0.35)
    });
    fromX = mergeItems(latest, popular, 100);
  } catch (e) {
    xError = e;
    kino.log("search x:", e && e.code);
  }
  var found = fromX;
  if (found.length < 60) {
    try {
      var saved = await filterList(text, bookmarksPage, 40, Math.round(budgetMs * 0.2));
      found = mergeItems(found, saved, 100);
    } catch (e) {
      // Si los guardados fallan, no se pierde lo que X ya trajo.
      kino.log("saved scan:", e && e.code);
    }
  }
  if (!found.length && xError) throw xError;
  return found;
}

// ---------------------------------------------------------------------------
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
  // propia lo usa para el «Ver más» de sus filas), paginado con el cursor de X.
  var xRef = /^x:(.+)$/.exec(String(ref || ""));
  if (xRef) {
    var raw = xRef[1];
    try {
      raw = decodeURIComponent(raw);
    } catch (e) {
      /* queda tal cual si no estaba codificado */
    }
    var xPage = await searchRaw(cursor || null, raw, "Top", 14000);
    var xAnswer = { items: xPage.items };
    if (xPage.next) xAnswer.next = xPage.next;
    return xAnswer;
  }
  var isHome = ref === "tl" || ref === "inicio";
  if (!isHome && ref !== "bm" && ref !== "guardados") {
    throw kino.error("not_found", "ref " + String(ref).slice(0, 40));
  }
  var page = isHome
    ? await timelinePage(cursor || null, { count: 20, timeoutMs: 14000 })
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

  // Los operadores de X (from:, min_faves:, lang:…) se pasan tal cual.
  if (hasOperators(text)) return xSearch(text, null, 4, { timeoutMs: 12000 });

  // @persona: todos los videos del perfil (pestaña Multimedia), no solo los
  // que suelten las búsquedas.
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
    return xSearch(rawQueryOf(text), null, 4, { timeoutMs: 12000 });
  }

  // #etiqueta y palabras sueltas («Hinata Hyuga»): PRIMERO X —recientes y
  // populares, varias páginas— y después los guardados que coincidan. Así
  // aparecen todos los videos relacionados, no solo el guardado propio.
  return searchEverywhere(text, 13000);
}

export async function resolve(ref) {
  requireSession();
  var match = /^t:(\d{1,25}):(\d{1,2})$/.exec(String(ref || ""));
  if (!match) throw kino.error("not_found", "ref " + String(ref).slice(0, 40));
  var tweetId = match[1];
  var index = Number(match[2]);

  var record = readMediaCache()[tweetId + ":" + index];
  if (!record) record = await lookupVideo(tweetId, index);
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
    return { message: "Sesión de X cerrada en este plugin.", clearSettings: ["cookies"] };
  }

  if (key === "limpiar") {
    kino.storage.remove(MEDIA_KEY);
    return { message: "Caché de videos vaciada: se vuelve a leer de X." };
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
// Pantalla propia «Buscar en X» (capability "screen"): buscar cualquier tópico
// o persona directamente en X, dentro de Kino. Nada de esto toca tus guardados
// ni deja historial: los títulos siguen siendo 18+ como el resto del plugin.
// ---------------------------------------------------------------------------

var TOPIC_CHIPS = ["#anime", "cosplay", "#gaming", "música", "deportes", "#cine", "tráiler", "noticias"];

// Cuántos resultados guarda la pantalla en su estado (el parche de estado
// admite hasta 64 KB; sin sinopsis, 30 títulos van sobrados).
var MAX_SCREEN_ITEMS = 30;

// Copia ligera de un título para el estado de la pantalla: sin la sinopsis,
// que es lo que más pesa. La ficha del título sale del ref, como siempre.
function lightItem(item) {
  var copy = {
    id: item.id,
    ref: item.ref,
    title: item.title,
    kind: "movie",
    adult: true,
    badges: ["X"]
  };
  if (item.poster) copy.poster = item.poster;
  if (item.backdrop) copy.backdrop = item.backdrop;
  if (item.year) copy.year = item.year;
  if (item.quality) copy.quality = item.quality;
  return copy;
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
    },
    {
      type: "Text",
      style: "caption",
      text: "Sugerencias",
      textEn: "Suggestions"
    },
    {
      type: "Chips",
      key: "temas",
      options: TOPIC_CHIPS.map(function (t) {
        return { value: t, label: t };
      }),
      value: typeof inputs.temas === "string" ? inputs.temas : null,
      onChanged: "tema"
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
  } else if (results && !results.items.length) {
    children.push({
      type: "emptyState",
      icon: "search",
      title: "Sin videos para «" + results.q + "»",
      titleEn: 'No videos for "' + results.q + '"',
      text: "Ningún video público de X coincide. Prueba otras palabras o quita algún término.",
      textEn: "No public X video matches. Try other words or fewer terms."
    });
  } else if (results) {
    children.push({
      type: "Text",
      style: "caption",
      text: results.items.length + " videos de X · «" + results.q + "»",
      textEn: results.items.length + ' X videos · "' + results.q + '"'
    });
    children.push({
      type: "titleRail",
      title: "Resultados de X",
      titleEn: "X results",
      items: results.items,
      ref: "x:" + encodeURIComponent(results.raw),
      size: "medium"
    });
  } else {
    children.push({
      type: "emptyState",
      icon: "movie",
      title: "Busca cualquier video de X",
      titleEn: "Search any X video",
      text: "Escribe un tópico o una persona («Hinata Hyuga») y verás todos los videos públicos relacionados, no solo tus guardados. También @usuario y #etiqueta.",
      textEn: "Type a topic or a person to see every related public video, not just your bookmarks. Also @user and #hashtag."
    });
  }

  return { type: "Column", padding: 16, gap: 12, children: children };
}

export async function screenEvent(event) {
  var name = event && typeof event.name === "string" ? event.name : "";
  if (name !== "buscar" && name !== "tema") return null;

  var state = (event && event.state) || {};
  var inputs = state.inputs || {};
  var q = "";
  var value = event.value;
  if (typeof value === "string") {
    q = value.trim();
  } else if (value && typeof value === "object" && typeof value.q === "string") {
    q = value.q.trim();
  }
  if (!q && typeof inputs.q === "string") q = inputs.q.trim();
  if (!q) {
    return { toast: { text: "Escribe qué buscar", textEn: "Type something to search" } };
  }
  if (!signedIn()) {
    return { toast: { text: "Falta la sesión de X: inicia sesión en Ajustes", textEn: "No X session: sign in first" } };
  }

  var results;
  try {
    var items = await searchEverywhere(q, 25000);
    results = { q: q, raw: rawQueryOf(q), items: items.slice(0, MAX_SCREEN_ITEMS).map(lightItem) };
  } catch (e) {
    var msg = e && e.userMessage ? e.userMessage : "X no respondió ahora. Inténtalo más tarde.";
    results = { q: q, raw: rawQueryOf(q), error: msg };
    kino.log("screen search:", e && e.code);
  }
  var patch = { results: results, inputs: { q: q } };
  if (name === "tema") {
    patch.inputs.temas = q;
  } else if (typeof inputs.temas === "string") {
    patch.inputs.temas = inputs.temas;
  }
  return { state: patch };
}


