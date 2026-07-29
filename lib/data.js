// Todas estas funciones corren en el servidor (Vercel), nunca en el navegador,
// así que tus API keys nunca quedan expuestas al público.

const REAL_MADRID_TEAM_ID = 541; // ID fijo de API-Football para el Real Madrid
const LEAGUE_LALIGA_ID = 140;

const FOOTBALL_API_BASE = "https://v3.football.api-sports.io";

function footballHeaders() {
  return {
    "x-apisports-key": process.env.API_FOOTBALL_KEY || "",
  };
}

// El plan Free de API-Football no permite los parámetros "last" ni "next",
// así que en vez de eso pedimos un rango de fechas (sí disponible en Free)
// y separamos nosotros mismos los partidos ya jugados de los que faltan.

function dateRange(daysBack, daysForward) {
  const today = new Date();
  const from = new Date(today);
  from.setDate(today.getDate() - daysBack);
  const to = new Date(today);
  to.setDate(today.getDate() + daysForward);
  const fmt = (d) => d.toISOString().split("T")[0];
  return { from: fmt(from), to: fmt(to) };
}

function currentSeasonYear() {
  // La temporada europea empieza en julio/agosto y toma el año de inicio
  // (ej. la temporada 2026/27 se llama "2026" en API-Football).
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1; // 1-12
  return month >= 7 ? year : year - 1;
}

async function fetchFixturesForSeason(from, to, season) {
  const res = await fetch(
    `${FOOTBALL_API_BASE}/fixtures?team=${REAL_MADRID_TEAM_ID}&from=${from}&to=${to}&season=${season}`,
    { headers: footballHeaders(), cache: "no-store" }
  );
  const json = await res.json();
  if (json.errors && Object.keys(json.errors).length > 0) return null;
  return json.response || [];
}

async function getFixturesInRange(daysBack, daysForward) {
  if (!process.env.API_FOOTBALL_KEY) {
    return { ok: false, reason: "missing_key", data: [] };
  }
  try {
    const { from, to } = dateRange(daysBack, daysForward);
    const season = currentSeasonYear();

    // Consultamos la temporada actual y la anterior en paralelo: en julio/agosto
    // hay amistosos que a veces quedan clasificados en una u otra, así cubrimos ambas.
    const [current, previous] = await Promise.all([
      fetchFixturesForSeason(from, to, season),
      fetchFixturesForSeason(from, to, season - 1),
    ]);

    if (current === null && previous === null) {
      return { ok: false, reason: "api_error", data: [] };
    }

    const combined = [...(current || []), ...(previous || [])];
    const seen = new Set();
    const unique = combined.filter((f) => {
      if (seen.has(f.fixture.id)) return false;
      seen.add(f.fixture.id);
      return true;
    });

    const data = unique.map(formatFixture).sort(
      (a, b) => new Date(a.rawDate) - new Date(b.rawDate)
    );
    return { ok: true, data };
  } catch (e) {
    return { ok: false, reason: "fetch_error", data: [] };
  }
}

export async function getRecentResults() {
  const result = await getFixturesInRange(30, 0);
  if (!result.ok) return result;
  const finished = result.data.filter((m) => m.isFinished).slice(-5).reverse();
  return { ok: true, data: finished };
}

export async function getUpcomingFixtures() {
  const result = await getFixturesInRange(0, 60);
  if (!result.ok) return result;
  const upcoming = result.data.filter((m) => !m.isFinished).slice(0, 8);
  return { ok: true, data: upcoming };
}

function formatFixture(fixture) {
  const home = fixture.teams.home.name;
  const away = fixture.teams.away.name;
  const goalsHome = fixture.goals.home;
  const goalsAway = fixture.goals.away;
  const status = fixture.fixture.status.short; // e.g. "NS", "1H", "FT", "LIVE"
  const isLive = ["1H", "2H", "HT", "ET", "P", "LIVE"].includes(status);
  const isFinished = status === "FT" || status === "AET" || status === "PEN";
  const date = new Date(fixture.fixture.date);

  return {
    id: fixture.fixture.id,
    home,
    away,
    date: date.toLocaleDateString("es-MX", { day: "2-digit", month: "short" }),
    time: date.toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit" }),
    rawDate: fixture.fixture.date,
    score: isFinished || isLive ? `${goalsHome ?? 0}–${goalsAway ?? 0}` : "—",
    isLive,
    isFinished,
    competition: fixture.league?.name || "",
  };
}

// ---------- YouTube ----------

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
