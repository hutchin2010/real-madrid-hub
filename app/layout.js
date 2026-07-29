import "./globals.css";

export const metadata = {
  title: "Hala Madrid — Centro del Madridista",
  description: "Noticias, marcadores y videos del Real Madrid, todo en un solo lugar.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="es">
      <head>
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Oswald:wght@400;500;600;700&family=Inter:wght@400;500;600;700&family=Roboto+Mono:wght@500&display=swap"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
