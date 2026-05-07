import './globals.css';

export const metadata = {
  title: 'Premix — Painel de Fornecedores',
  description: 'Gerenciamento de cadastros de fornecedores',
};

export default function RootLayout({ children }) {
  return (
    <html lang="pt-BR">
      <head>
        <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800&display=swap" rel="stylesheet" />
      </head>
      <body>{children}</body>
    </html>
  );
}
