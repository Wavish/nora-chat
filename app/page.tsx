'use client';

import { useState, useRef, useEffect } from 'react';

type Message = {
  role: 'user' | 'assistant';
  content: string;
};

export default function Home() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [sessionComplete, setSessionComplete] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    // Check if we've reached 16 interactions (8 exchanges) and the last message is from the assistant
    if (messages.length >= 16 && !sessionComplete && messages[messages.length - 1]?.role === 'assistant') {
      console.log('Session complete triggered! Messages:', messages.length);
      setSessionComplete(true);
    }
  }, [messages.length, sessionComplete]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage: Message = { role: 'user', content: input };
    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setInput('');
    setIsLoading(true);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ messages: newMessages }),
      });

      if (!response.ok) {
        throw new Error(`Failed to get response: ${response.statusText}`);
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('Failed to get reader from response body');
      }

      let assistantResponse = '';
      while (true) {
        const { done, value } = await reader.read();
        if (done) {
          break;
        }
        const chunk = new TextDecoder().decode(value);
        const lines = chunk.split('\n');
        
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            if (data === '[DONE]') {
              break;
            }
            try {
              const parsed = JSON.parse(data);
              if (parsed.text) {
                assistantResponse += parsed.text;
                setMessages(prev => {
                  const lastMessage = prev[prev.length - 1];
                  if (lastMessage && lastMessage.role === 'assistant') {
                    return prev.map((msg, index) =>
                      index === prev.length - 1 ? { ...msg, content: assistantResponse } : msg
                    );
                  } else {
                    return [...prev, { role: 'assistant', content: assistantResponse }];
                  }
                });
              }
            } catch (e) {
              // Skip invalid JSON lines
            }
          }
        }
      }
    } catch (error) {
      console.error('Error:', error);
      setMessages(prev => [...prev, { role: 'assistant', content: 'Oops! Something went wrong. Please try again.' }]);
    } finally {
      setIsLoading(false);
    }
  };

  const downloadTranscript = () => {
    const transcript = messages.map((msg, index) => {
      const timestamp = new Date().toLocaleString();
      return `${msg.role === 'user' ? 'You' : 'Psychic'}: ${msg.content}`;
    }).join('\n\n');

    const fullTranscript = `Psychic Reading Transcript\n${'='.repeat(50)}\n\n${transcript}\n\n\nGenerated on: ${new Date().toLocaleString()}`;

    const blob = new Blob([fullTranscript], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `psychic-reading-${new Date().toISOString().split('T')[0]}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <>
      {/* Video Background - Completely separate */}
      <video
        autoPlay
        loop
        muted
        playsInline
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100vw',
          height: '100vh',
          objectFit: 'cover',
          zIndex: -2
        }}
      >
        <source src="/nora.mp4" type="video/mp4" />
      </video>

      {/* Logo Overlay */}
      <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        zIndex: -1, // Below content, above video
        width: '100vw',
        height: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        <img
          src="/nora.png"
          alt="Nora Logo"
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'contain',
            opacity: 0.9
          }}
        />
      </div>

      {/* Main Content Container */}
      <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        height: '100vh',
        width: '100vw',
        overflow: 'hidden'
      }}>

        {/* Main Content */}
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          height: '100vh',
          maxWidth: '800px',
          margin: '0 auto',
          padding: '20px',
          color: '#ffffff',
          fontFamily: 'Helvetica, Arial, sans-serif',
          fontSize: '18px',
          fontWeight: 'bold',
          position: 'relative',
          zIndex: 1
        }}>
          <div style={{
            flex: 1,
            overflowY: 'auto',
            marginBottom: messages.length === 0 ? '0px' : '20px',
            marginTop: messages.length === 0 ? '0px' : '40px',
            transition: 'margin 0.5s ease'
          }}>
            {messages.length === 0 && (
              <div style={{
                display: 'flex',
                justifyContent: 'flex-start',
                alignItems: 'flex-end',
                height: '90vh',
                fontSize: '48px',
                fontWeight: 'bold',
                fontFamily: 'Helvetica, Arial, sans-serif',
                color: '#ffffff',
                textAlign: 'left',
                paddingBottom: '20px',
                paddingLeft: '20px'
              }}>
                You've reached the desk of Nora, the psychic office oracle.<br />What are we chatting<br />about today?
              </div>
            )}
            {messages.map((message, index) => (
              <div
                key={index}
                style={{
                  marginBottom: '16px',
                  textAlign: message.role === 'user' ? 'right' : 'left'
                }}
              >
                <div
                  style={{
                    display: 'inline-block',
                    padding: message.role === 'user' ? '12px 16px' : '12px 0px',
                    borderRadius: message.role === 'user' ? '8px' : '0px',
                    backgroundColor: message.role === 'user' ? 'transparent' : 'transparent',
                    border: message.role === 'user' ? '1px solid #ffffff' : 'none',
                    color: '#ffffff',
                    maxWidth: '70%',
                    textAlign: 'left',
                    fontSize: message.role === 'user' ? '18px' : '36px',
                    fontWeight: 'bold',
                    animation: message.role === 'user' ? 'floatUp 0.6s ease-out' : 'blurIn 0.8s ease-out',
                    opacity: message.role === 'assistant' ? 0 : 1,
                    animationFillMode: 'forwards'
                  }}
                >
                  {message.role === 'assistant' ? (
                    message.content.split('\n\n').map((paragraph, index) => (
                      <div key={index} style={{ marginBottom: index < message.content.split('\n\n').length - 1 ? '20px' : '0' }}>
                        {paragraph}
                      </div>
                    ))
                  ) : (
                    message.content
                  )}
                </div>
              </div>
            ))}
            {isLoading && messages[messages.length - 1]?.role === 'user' && (
              <div style={{ textAlign: 'left', color: '#ffffff' }}>
                <div style={{
                  display: 'inline-block',
                  padding: '12px 0px',
                  fontSize: '36px',
                  fontWeight: 'bold',
                  animation: 'blurIn 0.8s ease-out',
                  opacity: 0,
                  animationFillMode: 'forwards'
                }}>
                  ...
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {!sessionComplete ? (
            <form onSubmit={handleSubmit} style={{
              display: 'flex',
              gap: '8px',
              marginTop: messages.length === 0 ? '-200px' : '20px',
              transition: 'margin-top 0.5s ease'
            }}>
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={messages.length === 0 ? "reply to Nora... try 'feelings', 'the future', 'my place in the universe', 'cats'" : "reply to Nora..."}
                disabled={isLoading}
                style={{
                  flex: 1,
                  padding: '12px',
                  border: '1px solid #ffffff',
                  borderRadius: '8px',
                  fontSize: '18px',
                  fontWeight: 'bold',
                  backgroundColor: '#FF007B',
                  color: '#ffffff',
                  fontFamily: 'Helvetica, Arial, sans-serif'
                }}
                className="white-placeholder"
              />
              <button
                type="submit"
                disabled={isLoading || !input.trim()}
                style={{
                  padding: '12px',
                  backgroundColor: '#FF007B',
                  color: '#ffffff',
                  border: '1px solid #ffffff',
                  borderRadius: '8px',
                  cursor: isLoading ? 'not-allowed' : 'pointer',
                  fontSize: '18px',
                  fontWeight: 'bold',
                  fontFamily: 'Helvetica, Arial, sans-serif',
                  opacity: 1,
                  width: '48px',
                  height: '48px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                ↑
              </button>
            </form>
          ) : (
            <div style={{ marginTop: '20px', textAlign: 'center' }}>
              <button
                onClick={downloadTranscript}
                style={{
                  padding: '12px',
                  backgroundColor: '#FF007B',
                  color: '#ffffff',
                  border: '1px solid #ffffff',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontSize: '18px',
                  fontWeight: 'bold',
                  fontFamily: 'Helvetica, Arial, sans-serif',
                  transition: 'all 0.3s ease'
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.backgroundColor = '#E6006B';
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.backgroundColor = '#FF007B';
                }}
              >
                📄 download our convo
              </button>
            </div>
          )}
        </div>
      </div>
    </>
  );
}