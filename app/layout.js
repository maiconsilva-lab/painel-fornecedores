import './globals.css';

export const metadata = {
  title: 'Premix — Núcleo Fiscal',
  description: 'Painel de Fornecedores e Gestão de Tarefas — Núcleo Fiscal Premix',
  robots: 'noindex, nofollow',
};

export default function RootLayout({ children }) {
  return (
    <html lang="pt-BR">
      <head>
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
        <link rel="icon" href="https://premix.com.br/wp-content/uploads/2023/05/icon_premix-300x300-1.png" />
        <meta name="referrer" content="strict-origin-when-cross-origin" />
      </head>
      <body>{children}</body>
    </html>
  );
}
