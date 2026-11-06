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

const X = "https://x.com";
const SYNDICATION = "https://cdn.syndication.twimg.com";

// El token público del cliente web de X (viaja en el JavaScript de x.com; no es de nadie).
const BEARER =
  "AAAAAAAAAAAAAAAAAAAAANRILgAAAAAAnNwIzUejRCOuH5E6I8xnZz4puTs%3D1Zv7ttfk8LF81IUq16cHjhLTvJu4FA33AGWWjCpTnA";

// Semilla conocida de la consulta Bookmarks; si X la rota, discover() trae la buena.
const SEED_BOOKMARKS = "Glt3WAwBvNSPD-n_sqmX_A";

// Semilla conocida de la consulta del Inicio (HomeTimeline); si X la rota, discover() trae la buena.
const SEED_HOME = "c-CzHF1LboFilMpsx4ZCrQ";

// La búsqueda de X (SearchTimeline) no tiene semilla fiable: discover() la encuentra en la web de X.
const SEED_SEARCH = "";

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

function rawQueryOf(text) {
  if (text.charAt(0) === "@") {
    return "from:" + text.slice(1).replace(/[^A-Za-z0-9_]/g, "") + " filter:native_video";
  }
  var match = /^#([A-Za-z0-9_]+)/.exec(text);
  return "#" + (match ? match[1] : text.replace(/[^A-Za-z0-9_]/g, "")) + " filter:native_video";
}

async function searchRaw(cursor, text) {
  var id = searchId();
  if (!id) {
    var found = await discover();
    if (found.Search) id = found.Search;
  }
  if (!id) {
    throw kino.error("unavailable", "search sin id", {
      userMessage: "X no dejó buscar ahora. Abre el Inicio una vez y vuelve a intentar."
    });
  }
  var variables = {
    rawQuery: rawQueryOf(text),
    count: 20,
    querySource: "typed_query",
    product: "Media"
  };
  if (cursor) variables.cursor = cursor;
  var query =
    "?variables=" +
    encodeURIComponent(JSON.stringify(variables)) +
    "&features=" +
    encodeURIComponent(JSON.stringify(FEATURES));
  var r = await xget(X + "/i/api/graphql/" + id + "/SearchTimeline" + query, { timeoutMs: 14000 });
  if (r.status === 400 || r.status === 404 || r.status === 422) {
    var next = await discover();
    if (next.Search && next.Search !== id) {
      id = next.Search;
      r = await xget(X + "/i/api/graphql/" + id + "/SearchTimeline" + query, { timeoutMs: 14000 });
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

async function xSearch(text) {
  var items = [];
  var seen = {};
  var cursor = null;
  for (var round = 0; round < 3; round++) {
    var page;
    try {
      page = await searchRaw(cursor, text);
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
    if (items.length >= 60 || !page.next) break;
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
  if (text.charAt(0) === "@" || text.charAt(0) === "#") {
    return xSearch(text);
  }
  var words = text.toLowerCase().split(/\s+/);
  var wanted = [];
  for (var i = 0; i < words.length; i++) {
    if (words[i].length > 1) wanted.push(words[i]);
  }
  if (!wanted.length) wanted.push(text.toLowerCase());

  var started = Date.now();
  var cursor = null;
  var found = [];
  var seen = {};
  for (var round = 0; round < 3; round++) {
    var remaining = 12000 - (Date.now() - started);
    if (remaining < 3000) break;
    var page = await bookmarksPage(cursor, {
      count: 40,
      timeoutMs: Math.min(8000, remaining)
    });
    for (var j = 0; j < page.items.length; j++) {
      var item = page.items[j];
      var hay = (item.title + " " + (item.overview || "")).toLowerCase();
      var hit = true;
      for (var k = 0; k < wanted.length; k++) {
        if (hay.indexOf(wanted[k]) < 0) {
          hit = false;
          break;
        }
      }
      if (hit && !seen[item.id]) {
        seen[item.id] = true;
        found.push(item);
      }
    }
    if (found.length >= 30 || !page.next) break;
    cursor = page.next;
  }
  return found.slice(0, 100);
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


