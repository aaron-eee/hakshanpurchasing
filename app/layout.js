export const metadata = {
  title: "HAKSHAN Supply Portal",
  description: "Sourcing → Purchase → Warehouse",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,500;0,600;0,700;1,500&family=Inter:wght@400;500;600&display=swap"
          rel="stylesheet"
        />
        <style>{`
          *{box-sizing:border-box;margin:0;padding:0}
          html,body{background:#f5f1ea}
          input:focus,select:focus,textarea:focus{outline:none;border-color:#a8834f!important}
          .navitem:hover{background:rgba(168,131,79,.12)!important}
          .srow:hover{background:#faf7f1}
          .spin{animation:sp 1s linear infinite}@keyframes sp{to{transform:rotate(360deg)}}
          ::-webkit-scrollbar{width:9px}::-webkit-scrollbar-thumb{background:#d8cebd;border-radius:9px}
          button{font-family:inherit}
        `}</style>
      </head>
      <body>{children}</body>
    </html>
  );
}
