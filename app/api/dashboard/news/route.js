import { NextResponse } from 'next/server';
import { verifySession } from '../../../../lib/authServer';

export const dynamic = 'force-dynamic';

/* Fontes de RSS público, sem chave de API:
   - G1 (Brasil, editoria Economia — mais relevante pro contexto da Premix que
     notícias gerais/política)
   - BBC News World (cenário internacional) */
const FEEDS = {
  brasil: 'https://g1.globo.com/rss/g1/economia/',
  mundo: 'https://feeds.bbci.co.uk/news/world/rss.xml',
};

/* Parser de RSS minimalista via regex — evita adicionar uma dependência
   de XML só pra isso. RSS 2.0 é estrutura simples o bastante pra isso
   ser confiável (título, link e data de cada <item>). */
function parseRss(xml, max = 6) {
  if (!xml) return [];
  const items = [];
  const itemBlocks = xml.match(/<item[\s\S]*?<\/item>/gi) || [];
  for (const block of itemBlocks.slice(0, max)) {
    const grab = (tag) => {
      const m = block.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'i'));
      if (!m) return '';
      return m[1]
        .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/gi, '$1')
        .replace(/<[^>]+>/g, '')
        .trim();
    };
    const title = grab('title');
    const link = grab('link');
    const pubDate = grab('pubDate');
    if (title && link) items.push({ title, link, pubDate });
  }
  return items;
}

async function fetchFeed(url, max) {
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; PremixPainel/1.0)' },
      next: { revalidate: 1800 }, // cache de 30 min
    });
    if (!res.ok) return [];
    const xml = await res.text();
    return parseRss(xml, max);
  } catch {
    return [];
  }
}

export async function GET(req) {
  const user = await verifySession(req);
  if (!user) return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 });

  const [brasil, mundo] = await Promise.all([
    fetchFeed(FEEDS.brasil, 6),
    fetchFeed(FEEDS.mundo, 6),
  ]);

  return NextResponse.json({ brasil, mundo, atualizadoEm: new Date().toISOString() });
}
