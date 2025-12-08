import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Chat',
  description: 'Psychic medium chat interface',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Montagu+Slab:wght@400&display=swap" rel="stylesheet" />
        <style>{`
          @keyframes floatUp {
            0% {
              transform: translateY(20px);
              opacity: 0;
            }
            100% {
              transform: translateY(0);
              opacity: 1;
            }
          }
          
              @keyframes blurIn {
                0% {
                  filter: blur(10px);
                  opacity: 0;
                }
                100% {
                  filter: blur(0px);
                  opacity: 1;
                }
              }

              @keyframes fadeIn {
                0% {
                  opacity: 0;
                }
                100% {
                  opacity: 1;
                }
              }

              .white-placeholder::placeholder {
                color: #ccff00 !important;
                opacity: 1 !important;
              }
        `}</style>
      </head>
      <body style={{ 
        margin: 0, 
        fontFamily: '"Montagu Slab", serif', 
        backgroundColor: '#000000', 
        color: '#ccff00',
        minHeight: '100vh',
        position: 'relative'
      }}>
        {children}
      </body>
    </html>
  );
}
