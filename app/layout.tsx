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

              .white-placeholder::placeholder {
                color: #ffffff !important;
                opacity: 1 !important;
              }
        `}</style>
      </head>
      <body style={{ 
        margin: 0, 
        fontFamily: 'system-ui, sans-serif', 
        backgroundColor: '#000000', 
        color: '#ffffff',
        minHeight: '100vh',
        position: 'relative'
      }}>
        {children}
      </body>
    </html>
  );
}
