import { ScrollViewStyleReset } from "expo-router/html";
import type { PropsWithChildren } from "react";

/**
 * Esqueleto HTML das páginas na web (só roda no build estático).
 * - lang="pt-BR": sem isso o Chrome oferecia "traduzir do inglês" e o leitor de tela lia com sotaque inglês.
 * - título, descrição e Open Graph: prévia do link quando alguém compartilha no WhatsApp.
 */
const SITE = process.env.EXPO_PUBLIC_SITE_URL || "https://lab-do-meu-negocio.onrender.com";
const TITULO = "Vinga: vale a pena abrir o seu negócio?";
const DESCRICAO = "Descubra em 2 minutos o que os dados públicos dizem sobre o seu negócio na sua cidade: concorrência, quantos seguem abertos e quanto você precisa vender.";

export default function Root({ children }: PropsWithChildren) {
  return (
    <html lang="pt-BR">
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no" />
        <title>Vinga</title>
        <meta name="description" content={DESCRICAO} />
        <meta name="theme-color" content="#FF6B2C" />
        <meta property="og:type" content="website" />
        <meta property="og:locale" content="pt_BR" />
        <meta property="og:site_name" content="Vinga" />
        <meta property="og:title" content={TITULO} />
        <meta property="og:description" content={DESCRICAO} />
        <meta property="og:url" content={SITE} />
        <meta property="og:image" content={`${SITE}/og.png`} />
        <meta property="og:image:width" content="1024" />
        <meta property="og:image:height" content="1024" />
        <meta name="twitter:card" content="summary" />
        <ScrollViewStyleReset />
      </head>
      <body>{children}</body>
    </html>
  );
}
