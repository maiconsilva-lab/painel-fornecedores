import './globals.css';

export const metadata = {
  title: 'Premix — Núcleo Fiscal',
  description: 'Painel de Fornecedores e Kanban — Núcleo Fiscal Premix',
};

export default function RootLayout({ children }) {
  return (
    <html lang="pt-BR">
      <head>
        <link href="https://fonts.googleapis.com/css2?family=Montserrat:wght@300;400;500;600;700;800;900&family=Open+Sans:wght@400;500;600;700&display=swap" rel="stylesheet" />
        <link rel="icon" href="https://premix.com.br/wp-content/uploads/2023/05/icon_premix-300x300-1.png" />
      </head>
      <body>{children}</body>
    </html>
  );
}
