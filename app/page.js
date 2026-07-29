import { getRecentResults, getUpcomingFixtures, getLatestVideos, getRealMadridNews, getGeneralFootballNews } from "../lib/data";

export const dynamic = "force-dynamic"; // nunca cachear: siempre datos frescos al abrir la página

export default async function Home() {
  const [recent, upcoming, videosDiego, videosRamon, realMadridNews, generalNews] = await Promise.all([
    getRecentResults(),
    getUpcomingFixtures(),
    getLatestVideos("ByDiegoX10"),
    getLatestVideos("RamonAlvarezdeMon"),
    getRealMadridNews(),
    getGeneralFootballNews(),
  ]);
  const nextMatch = upcoming.ok && upcoming.data.length > 0 ? upcoming.data[0] : null;

  return (
    <>
      <header className="scoreboard">
        <div className="crest-row">
          <Crest />
          <div>
            <div className="club-name">Real Madrid C.F.</div>
            <div className="club-sub">Centro del madridista · datos en vivo</div>
          </div>
        </div>
        <div className="hero">
          <h1>Hala <span>Madrid</span></h1>
          <p className="tagline">
            Todo lo tuyo del Madrid en un solo lugar — se actualiza solo cada vez que entras.
          </p>

          {nextMatch ? (
            <div className="ticket">
              <div>
                <div className="ticket-label">
                  Próximo partido {nextMatch.isLive && <span className="live-badge">En vivo</span>}
                </div>
                <div className="ticket-match">{nextMatch.home} vs {nextMatch.away}</div>
                <div className="ticket-meta">{nextMatch.competition} · {nextMatch.date}, {nextMatch.time}</div>
              </div>
              {nextMatch.isLive && (
                <div className="ticket-count">
                  <div className="n">{nextMatch.score}</div>
                  <div className="lbl">Marcador</div>
                </div>
              )}
            </div>
          ) : (
            <div className="ticket">
              <div className="ticket-label">Próximo partido</div>
              <p style={{ fontSize: "13px", color: "var(--ink-dim)", marginTop: "6px" }}>
                {upcoming.reason === "missing_key"
                  ? "Falta configurar tu API key de API-Football (ver README)."
                  : "No se pudo cargar el calendario en este momento."}
              </p>
            </div>
          )}
        </div>
      </header>

      <main>
        <section className="section-block">
          <div className="section-head">
            <h2>Marcadores</h2>
            <div className="updated">En vivo cada visita</div>
          </div>

          <h3 style={{ fontFamily: "var(--font-display)", textTransform: "uppercase", fontSize: "13px", letterSpacing: "0.06em", color: "var(--gold-2)", marginBottom: "10px" }}>
            Últimos enfrentamientos
          </h3>
          {recent.ok && recent.data.length > 0 ? (
            recent.data.map((m) => (
              <div className="match-row" key={m.id}>
                <span className="date">{m.date}</span>
                <span className="teams">{m.home} vs {m.away}</span>
                <span className="score">{m.score}</span>
              </div>
            ))
          ) : (
            <ApiNote reason={recent.reason} what="los últimos resultados" envVar="API_FOOTBALL_KEY" />
          )}

          <h3 style={{ fontFamily: "var(--font-display)", textTransform: "uppercase", fontSize: "13px", letterSpacing: "0.06em", color: "var(--gold-2)", margin: "24px 0 10px" }}>
            Próximos partidos
          </h3>
          {upcoming.ok && upcoming.data.length > 0 ? (
            upcoming.data.map((m) => (
              <div className="match-row" key={m.id}>
                <span className="date">{m.date}</span>
                <span className="teams">{m.home} vs {m.away}</span>
                <span className="score">{m.isLive ? m.score : "—"}</span>
              </div>
            ))
          ) : (
            <ApiNote reason={upcoming.reason} what="el calendario" envVar="API_FOOTBALL_KEY" />
          )}
        </section>

        <section className="section-block">
          <div className="section-head">
            <h2>Videos</h2>
            <div className="updated">Últimos videos, cada visita</div>
          </div>

          <VideoChannel
            name="ByDiegoX10"
            channelUrl="https://www.youtube.com/@ByDiegoX10"
            result={videosDiego}
          />
          <VideoChannel
            name="Ramón Álvarez de Mon"
            channelUrl="https://www.youtube.com/@RamonAlvarezdeMon"
            result={videosRamon}
          />
        </section>
            
        <section className="section-block">
          <div className="section-head">
            <h2>Noticias del Real Madrid</h2>
            <div className="updated">Vía Marca · cada visita</div>
          </div>
          <NewsList result={realMadridNews} />
        </section>

        <section className="section-block">
          <div className="section-head">
            <h2>Fútbol en general</h2>
            <div className="updated">Vía Marca · cada visita</div>
          </div>
          <NewsList result={generalNews} />
        </section>
      </main>

      <footer>
        Tu centro del madridista · datos jalados en vivo desde API-Football y YouTube Data API
      <footer>
    </>
  );
}

function VideoChannel({ name, channelUrl, result }) {
  return (
    <div style={{ marginBottom: "28px" }}>
      <h3 style={{ fontSize: "15px", color: "var(--paper)", marginBottom: "10px" }}>{name}</h3>
      {result.ok && result.data.length > 0 ? (
        result.data.map((v) => (
          <a
            href={`https://www.youtube.com/watch?v=${v.videoId}`}
            target="_blank"
            rel="noopener noreferrer"
            className="video-card"
            key={v.videoId}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={v.thumbnail} alt={v.title} className="video-thumb" />
            <div className="video-info">
              <h3>{v.title}</h3>
              <p>{v.publishedAt}</p>
            </div>
          </a>
        ))
      ) : (
        <ApiNote reason={result.reason} what={`los videos de ${name}`} envVar="YOUTUBE_API_KEY" />
      )}
      <a href={channelUrl} target="_blank" rel="noopener noreferrer" className="channel-link">
        Ver canal completo →
      </a>
    </div>
  );
}
function NewsList({ result }) {
  if (!(result.ok && result.data.length > 0)) {
    return <ApiNote reason={result.reason} what="las noticias" envVar="" />;
  }
  return (
    <div>
      {result.data.map((n, i) => (
        
         <a href={n.link}
          target="_blank"
          rel="noopener noreferrer"
          className="video-card"
          key={n.link || i}
        >
          {n.thumbnail && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={n.thumbnail} alt={n.title} className="video-thumb" />
          )}
          <div className="video-info">
            <h3>{n.title}</h3>
            <p>{n.publishedAt}</p>
          </div>
        </a>
      ))}
    </div>
  );
}
function ApiNote({ reason, what, envVar }) {
  const message =
    reason === "missing_key"
      ? `Falta tu ${envVar} para cargar ${what}. Revisa el README para configurarla en Vercel.`
      : `No se pudo cargar ${what} en este momento. Intenta de nuevo más tarde.`;
  return <div className="error-note">{message}</div>;
}

function Crest() {
  return (
    <svg width="40" height="48" viewBox="0 0 40 48" fill="none" style={{ flexShrink: 0 }}>
      <path
        d="M20 2 L36 9 V24 C36 36 28 44 20 46 C12 44 4 36 4 24 V9 Z"
        stroke="#e6c877"
        strokeWidth="2"
        fill="rgba(201,162,75,0.08)"
      />
      <text x="20" y="28" fontFamily="Oswald" fontSize="14" fontWeight="700" fill="#e6c877" textAnchor="middle">
        RM
      </text>
    </svg>
  );
}
