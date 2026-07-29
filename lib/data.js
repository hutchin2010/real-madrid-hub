// Todas estas funciones corren en el servidor (Vercel), nunca en el navegador,
// así que tu API token nunca queda expuesto al público.

const REAL_MADRID_TEAM_ID = 86; // ID de football-data.org para el Real Madrid
const FOOTBALL_API_BASE = "https://api.football-data.org/v4";

function footballHeaders() {
  return {
    "X-Auth-Token": process.env.FOOTBALL_DATA_TOKEN || "",
  };
}

// football-data.org devuelve automáticamente solo las competencias que
// cubre tu plan (en el plan gratis: LaLiga y Champions League para el
// Real Madrid). Copa del Rey y Supercopa NO aparecerán, no es un error,
// es la limitación del plan gratuito que ya identificamos antes.

async function fetchTeamMatches(status, limit) {
  const res = await fetch(
    `${FOOTBALL_API_BASE}/teams/${REAL_MADRID_TEAM_ID}/matches?status=${status}&limit=${limit}`,
    { headers: footballHeaders(), cache: "no-store" }
  );
  if (!res.ok) {
    const errorBody = await res.text();
    console.error(`FALLO en status=${status} — código HTTP: ${res.status} — respuesta: ${errorBody}`);
    return null;
  }
  const json = await res.json();
  return json.matches || null;
}
export async function getRecentResults() {
  if (!process.env.FOOTBALL_DATA_TOKEN) {
    return { ok: false, reason: "missing_key", data: [] };
  }
  try {
    const matches = await fetchTeamMatches("FINISHED", 5);
    if (!matches) return { ok: false, reason: "api_error", data: [] };
    const data = matches.map(formatMatch).reverse();
    return { ok: true, data };
  } catch (e) {
    return { ok: false, reason: "fetch_error", data: [] };
  }
}

export async function getUpcomingFixtures() {
  if (!process.env.FOOTBALL_DATA_TOKEN) {
    return { ok: false, reason: "missing_key", data: [] };
  }
  try {
    const matches = await fetchTeamMatches("SCHEDULED", 8);
    if (!matches) return { ok: false, reason: "api_error", data: [] };
    const data = matches.map(formatMatch);
    return { ok: true, data };
  } catch (e) {
    return { ok: false, reason: "fetch_error", data: [] };
  }
}

function formatMatch(match) {
  const home = match.homeTeam.name;
  const away = match.awayTeam.name;
  const goalsHome = match.score.fullTime.home;
  const goalsAway = match.score.fullTime.away;
  const status = match.status; // SCHEDULED, LIVE, IN_PLAY, PAUSED, FINISHED
  const isLive = ["LIVE", "IN_PLAY", "PAUSED"].includes(status);
  const isFinished = status === "FINISHED";
  const date = new Date(match.utcDate);

  return {
    id: match.id,
    home,
    away,
    date: date.toLocaleDateString("es-MX", { day: "2-digit", month: "short" }),
    time: date.toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit" }),
    rawDate: match.utcDate,
    score: isFinished || isLive ? `${goalsHome ?? 0}–${goalsAway ?? 0}` : "—",
    isLive,
    isFinished,
    competition: match.competition?.name || "",
  };
}

// ---------- YouTube (esto no se toca, sigue igual) ----------

const YT_BASE = "https://www.googleapis.com/youtube/v3";

async function getChannelIdFromHandle(handle) {
  const res = await fetch(
    `${YT_BASE}/channels?part=id&forHandle=${handle}&key=${process.env.YOUTUBE_API_KEY}`,
    { cache: "no-store" }
  );
  const json = await res.json();
  return json.items?.[0]?.id || null;
}

export async function getLatestVideos(handle, maxResults = 2) {
  if (!process.env.YOUTUBE_API_KEY) {
    return { ok: false, reason: "missing_key", data: [] };
  }
  try {
    const channelId = await getChannelIdFromHandle(handle);
    if (!channelId) return { ok: false, reason: "channel_not_found", data: [] };

    const res = await fetch(
      `${YT_BASE}/search?part=snippet&channelId=${channelId}&order=date&maxResults=${maxResults}&type=video&key=${process.env.YOUTUBE_API_KEY}`,
      { cache: "no-store" }
    );
    const json = await res.json();
    if (!json.items) return { ok: false, reason: "no_data", data: [] };

    const data = json.items.map((item) => ({
      title: item.snippet.title,
      thumbnail: item.snippet.thumbnails?.medium?.url,
      publishedAt: new Date(item.snippet.publishedAt).toLocaleDateString("es-MX", {
        day: "2-digit",
        month: "short",
      }),
      videoId: item.id.videoId,
    }));
    return { ok: true, data };
  } catch (e) {
    return { ok: false, reason: "fetch_error", data: [] };
  }
}
// ---------- Noticias (Marca RSS) ----------

const NEWS_SOURCES = {
  realMadrid: "https://e00-marca.uecdn.es/rss/futbol/real-madrid.xml",
  futbolGeneral: "https://e00-marca.uecdn.es/rss/futbol/mas-futbol.xml",
};

function extractTag(itemXml, tagName) {
  const regex = new RegExp(`<${tagName}[^>]*>(?:<!\\[CDATA\\[)?([\\s\\S]*?)(?:\\]\\]>)?<\\/${tagName}>`, "i");
  const match = itemXml.match(regex);
  return match ? match[1].trim() : "";
}

function extractThumbnail(itemXml) {
  const match = itemXml.match(/<media:thumbnail[^>]*url="([^"]+)"/i);
  return match ? match[1] : null;
}

async function fetchNewsFrom(url, maxItems) {
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) return { ok: false, reason: "fetch_error", data: [] };
  const xml = await res.text();
  const itemBlocks = xml.match(/<item>[\s\S]*?<\/item>/g) || [];

  const data = itemBlocks.slice(0, maxItems).map((itemXml) => {
    const rawTitle = extractTag(itemXml, "title");
    const link = extractTag(itemXml, "link");
    const pubDateRaw = extractTag(itemXml, "pubDate");
    const thumbnail = extractThumbnail(itemXml);
    const date = pubDateRaw ? new Date(pubDateRaw) : null;

    return {
      title: rawTitle,
      link,
      thumbnail,
      publishedAt: date
        ? date.toLocaleDateString("es-MX", { day: "2-digit", month: "short" })
        : "",
    };
  });

  return { ok: true, data };
}

export async function getRealMadridNews(maxItems = 6) {
  try {
    return await fetchNewsFrom(NEWS_SOURCES.realMadrid, maxItems);
  } catch (e) {
    return { ok: false, reason: "fetch_error", data: [] };
  }
}

export async function getGeneralFootballNews(maxItems = 6) {
  try {
    return await fetchNewsFrom(NEWS_SOURCES.futbolGeneral, maxItems);
  } catch (e) {
    return { ok: false, reason: "fetch_error", data: [] };
  }
}
