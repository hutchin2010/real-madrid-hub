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

export async function getRecentResults() {
  if (!process.env.API_FOOTBALL_KEY) {
    return { ok: false, reason: "missing_key", data: [] };
  }
  try {
    const res = await fetch(
      `${FOOTBALL_API_BASE}/fixtures?team=${REAL_MADRID_TEAM_ID}&last=5`,
      { headers: footballHeaders(), cache: "no-store" }
    );
    const json = await res.json();
    if (!json.response) return { ok: false, reason: "no_data", data: [] };
    const data = json.response.map(formatFixture);
    return { ok: true, data };
  } catch (e) {
    return { ok: false, reason: "fetch_error", data: [] };
  }
}

export async function getUpcomingFixtures() {
  if (!process.env.API_FOOTBALL_KEY) {
    return { ok: false, reason: "missing_key", data: [] };
  }
  try {
    const res = await fetch(
      `${FOOTBALL_API_BASE}/fixtures?team=${REAL_MADRID_TEAM_ID}&next=8`,
      { headers: footballHeaders(), cache: "no-store" }
    );
    const json = await res.json();
    if (!json.response) return { ok: false, reason: "no_data", data: [] };
    const data = json.response.map(formatFixture);
    return { ok: true, data };
  } catch (e) {
    return { ok: false, reason: "fetch_error", data: [] };
  }
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
