import React, { useState } from 'react';

export interface FeedItem {
  id: string;
  type: 'announcement' | 'event';
  title: string;
  body: string;
  author_id: string;
  author_name: string;
  author_avatar?: string;
  author_role: 'admin' | 'teacher' | 'student_council' | 'student';
  department?: string;
  category?: string;
  created_at: string;
  // Event-specific fields
  start_time?: string;
  end_time?: string;
  location?: string;
  capacity?: number;
  registered_count?: number;
  registration_deadline?: string;
  is_team_event?: boolean;
  banner_url?: string;
  tags?: string[];
}

export interface SocialFeedCardProps {
  item: FeedItem;
}

const getRelativeTime = (dateString: string) => {
  const date = new Date(dateString);
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
  
  if (diffInSeconds < 60) return `${diffInSeconds}s ago`;
  const diffInMinutes = Math.floor(diffInSeconds / 60);
  if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) return `${diffInHours}h ago`;
  const diffInDays = Math.floor(diffInHours / 24);
  return `${diffInDays}d ago`;
};

const getRoleColor = (role: string) => {
  switch (role) {
    case 'admin': return '#7c3aed';
    case 'teacher': return '#2563eb';
    case 'student_council': return '#d97706';
    case 'student': return '#059669';
    default: return '#6b7280';
  }
};

const getRoleName = (role: string) => {
  switch (role) {
    case 'admin': return 'Admin';
    case 'teacher': return 'Teacher';
    case 'student_council': return 'Student Council';
    case 'student': return 'Student';
    default: return role;
  }
};

export function SocialFeedCard({ item }: SocialFeedCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
  };

  const capacityPercentage = item.capacity && item.registered_count !== undefined
    ? Math.min(100, Math.round((item.registered_count / item.capacity) * 100))
    : 0;
    
  const getCapacityColor = (percentage: number) => {
    if (percentage < 50) return '#059669';
    if (percentage < 80) return '#d97706';
    return '#dc2626';
  };

  return (
    <div
      style={{
        background: '#ffffff',
        borderRadius: '0.75rem',
        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
        marginBottom: '1.5rem',
        overflow: 'hidden',
        border: '1px solid #f3f4f6',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* Header */}
      <div style={{ padding: '1rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
        {item.author_avatar ? (
          <img 
            src={item.author_avatar} 
            alt={item.author_name} 
            style={{ width: '2.5rem', height: '2.5rem', borderRadius: '50%', objectFit: 'cover' }} 
          />
        ) : (
          <div style={{
            width: '2.5rem', height: '2.5rem', borderRadius: '50%', background: '#e5e7eb',
            display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', color: '#4b5563'
          }}>
            {getInitials(item.author_name)}
          </div>
        )}
        
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
            <span style={{ fontWeight: '600', color: '#111827' }}>{item.author_name}</span>
            <span style={{
              fontSize: '0.75rem', padding: '0.125rem 0.5rem', borderRadius: '9999px',
              color: '#fff', background: getRoleColor(item.author_role), fontWeight: '500'
            }}>
              {getRoleName(item.author_role)}
            </span>
            {item.department && (
              <span style={{ fontSize: '0.75rem', color: '#6b7280' }}>
                • {item.department}
              </span>
            )}
          </div>
          <div style={{ fontSize: '0.75rem', color: '#9ca3af', marginTop: '0.125rem' }}>
            {getRelativeTime(item.created_at)} • {item.type === 'event' ? '🗓️ Event' : '📢 Announcement'}
          </div>
        </div>
      </div>

      {/* Body */}
      <div style={{ padding: '0 1rem 1rem 1rem' }}>
        <h3 style={{ fontSize: '1.125rem', fontWeight: 'bold', color: '#111827', margin: '0 0 0.5rem 0' }}>
          {item.title}
        </h3>
        
        <div>
          <p style={{
            color: '#374151', margin: 0, lineHeight: '1.5',
            display: expanded ? 'block' : '-webkit-box',
            WebkitLineClamp: 3,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
            transition: 'all 0.3s ease'
          }}>
            {item.body}
          </p>
          {item.body.length > 150 && (
            <button
              onClick={() => setExpanded(!expanded)}
              style={{
                background: 'none', border: 'none', padding: 0,
                color: '#3b82f6', fontWeight: '500', cursor: 'pointer',
                marginTop: '0.25rem', fontSize: '0.875rem'
              }}
            >
              {expanded ? 'Show less' : 'Read more'}
            </button>
          )}
        </div>

        {item.tags && item.tags.length > 0 && (
          <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.75rem', flexWrap: 'wrap' }}>
            {item.tags.map(tag => (
              <span key={tag} style={{ color: '#3b82f6', fontSize: '0.875rem' }}>
                #{tag}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Media */}
      {item.banner_url && (
        <div 
          style={{ width: '100%', height: '16rem', overflow: 'hidden' }}
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
        >
          <img 
            src={item.banner_url} 
            alt={item.title} 
            style={{
              width: '100%', height: '100%', objectFit: 'cover',
              transform: isHovered ? 'scale(1.05)' : 'scale(1)',
              transition: 'transform 0.5s ease'
            }} 
          />
        </div>
      )}

      {/* Event Meta Widget */}
      {item.type === 'event' && (
        <div style={{ padding: '1rem', background: '#f9fafb', borderTop: '1px solid #f3f4f6', borderBottom: '1px solid #f3f4f6' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
            <div>
              <div style={{ fontSize: '0.75rem', color: '#6b7280', fontWeight: '500', marginBottom: '0.25rem' }}>DATE & TIME</div>
              <div style={{ fontSize: '0.875rem', color: '#111827' }}>
                {item.start_time ? new Date(item.start_time).toLocaleString() : 'TBA'}
              </div>
            </div>
            {item.location && (
              <div>
                <div style={{ fontSize: '0.75rem', color: '#6b7280', fontWeight: '500', marginBottom: '0.25rem' }}>LOCATION</div>
                <div style={{ fontSize: '0.875rem', color: '#111827' }}>📍 {item.location}</div>
              </div>
            )}
          </div>
          
          {item.capacity && item.registered_count !== undefined && (
            <div style={{ marginTop: '1rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', marginBottom: '0.25rem' }}>
                <span style={{ color: '#6b7280', fontWeight: '500' }}>CAPACITY</span>
                <span style={{ color: '#111827', fontWeight: '600' }}>{item.registered_count} / {item.capacity}</span>
              </div>
              <div style={{ width: '100%', height: '0.5rem', background: '#e5e7eb', borderRadius: '9999px', overflow: 'hidden' }}>
                <div style={{
                  height: '100%',
                  width: \`\${capacityPercentage}%\`,
                  background: getCapacityColor(capacityPercentage),
                  transition: 'width 1s ease-in-out'
                }} />
              </div>
            </div>
          )}
          
          {item.registration_deadline && (
            <div style={{ marginTop: '0.75rem', fontSize: '0.75rem', color: '#ef4444', fontWeight: '500' }}>
              ⏰ Deadline: {new Date(item.registration_deadline).toLocaleString()}
            </div>
          )}
        </div>
      )}

      {/* Action Bar */}
      <div style={{ padding: '0.75rem 1rem', display: 'flex', gap: '0.5rem', borderTop: item.type !== 'event' ? '1px solid #f3f4f6' : 'none' }}>
        {item.type === 'event' && (
          <button style={{
            flex: 1, padding: '0.5rem', background: '#3b82f6', color: '#fff', borderRadius: '0.375rem',
            border: 'none', fontWeight: '500', cursor: 'pointer', transition: 'background 0.2s ease'
          }}
          onMouseEnter={(e) => e.currentTarget.style.background = '#2563eb'}
          onMouseLeave={(e) => e.currentTarget.style.background = '#3b82f6'}
          >
            Register Now
          </button>
        )}
        <button style={{
          flex: 1, padding: '0.5rem', background: '#f3f4f6', color: '#374151', borderRadius: '0.375rem',
          border: 'none', fontWeight: '500', cursor: 'pointer', transition: 'background 0.2s ease'
        }}
        onMouseEnter={(e) => e.currentTarget.style.background = '#e5e7eb'}
        onMouseLeave={(e) => e.currentTarget.style.background = '#f3f4f6'}
        onClick={() => {
          navigator.clipboard.writeText(window.location.href);
          alert('Link copied to clipboard!');
        }}
        >
          Share
        </button>
        {item.type === 'event' && (
          <button style={{
            flex: 1, padding: '0.5rem', background: '#f3f4f6', color: '#374151', borderRadius: '0.375rem',
            border: 'none', fontWeight: '500', cursor: 'pointer', transition: 'background 0.2s ease'
          }}
          onMouseEnter={(e) => e.currentTarget.style.background = '#e5e7eb'}
          onMouseLeave={(e) => e.currentTarget.style.background = '#f3f4f6'}
          >
            Add to Calendar
          </button>
        )}
      </div>
    </div>
  );
}
