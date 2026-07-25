import React, { useState, useEffect } from 'react';

export interface AlertAnnouncement {
  id: string;
  title: string;
  body: string;
  priority: 'urgent' | 'important' | 'normal';
  is_pinned: boolean;
  author_name?: string;
  created_at: string;
}

export interface HeroAlertBannerProps {
  announcements: AlertAnnouncement[];
}

export function HeroAlertBanner({ announcements }: HeroAlertBannerProps) {
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    if (announcements.length <= 1) return;
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % announcements.length);
    }, 5000);
    return () => clearInterval(interval);
  }, [announcements.length]);

  if (announcements.length === 0) return null;

  const currentAlert = announcements[currentIndex];
  
  const getGradient = (priority: string) => {
    if (priority === 'urgent') return 'linear-gradient(135deg, #dc2626, #f59e0b)';
    if (priority === 'important') return 'linear-gradient(135deg, #2563eb, #7c3aed)';
    return 'linear-gradient(135deg, #475569, #94a3b8)'; // Default fallback
  };

  return (
    <div
      style={{
        width: '100%',
        margin: '1rem 0',
        borderRadius: '1rem',
        padding: '1.5rem',
        background: getGradient(currentAlert.priority),
        color: '#fff',
        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
        position: 'relative',
        overflow: 'hidden',
        transition: 'all 0.5s ease',
      }}
    >
      <div style={{ position: 'relative', zIndex: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
          <span style={{ fontSize: '1.25rem' }}>⚠️</span>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 'bold', margin: 0 }}>
            {currentAlert.title}
          </h2>
        </div>
        
        <p
          style={{
            margin: '0 0 1rem 0',
            opacity: 0.9,
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
          }}
        >
          {currentAlert.body}
        </p>
        
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <a
            href={`/announcements/${currentAlert.id}`}
            style={{
              color: '#fff',
              textDecoration: 'underline',
              fontWeight: '500',
              cursor: 'pointer',
            }}
          >
            View Details
          </a>
          
          {announcements.length > 1 && (
            <div style={{ display: 'flex', gap: '0.25rem' }}>
              {announcements.map((_, idx) => (
                <div
                  key={idx}
                  onClick={() => setCurrentIndex(idx)}
                  style={{
                    width: '0.5rem',
                    height: '0.5rem',
                    borderRadius: '50%',
                    background: currentIndex === idx ? '#fff' : 'rgba(255,255,255,0.5)',
                    cursor: 'pointer',
                    transition: 'background 0.3s ease',
                  }}
                />
              ))}
            </div>
          )}
        </div>
      </div>
      
      {/* Glassmorphism overlay */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(255, 255, 255, 0.1)',
          backdropFilter: 'blur(4px)',
          zIndex: 1,
          pointerEvents: 'none',
        }}
      />
    </div>
  );
}
