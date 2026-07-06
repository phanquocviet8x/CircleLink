import React, { useState, useEffect, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { eventService } from '../services/eventService';
import confetti from 'canvas-confetti';
import Logo from '../components/Logo';
import { getTranslations, getLanguage, setLanguage } from '../services/translations';

const avatarPresets = {
  'avatar-1': { icon: 'fa-user-astronaut', style: 'linear-gradient(135deg, #FF6B6B, #FF8E53)' },
  'avatar-2': { icon: 'fa-user-ninja', style: 'linear-gradient(135deg, #4E65FF, #92EFFD)' },
  'avatar-3': { icon: 'fa-user-tie', style: 'linear-gradient(135deg, #7F00FF, #E100FF)' },
  'avatar-4': { icon: 'fa-user-secret', style: 'linear-gradient(135deg, #11998e, #38ef7d)' },
  'avatar-5': { icon: 'fa-user-graduate', style: 'linear-gradient(135deg, #F9D423, #FF4E50)' },
  'avatar-6': { icon: 'fa-robot', style: 'linear-gradient(135deg, #8A2387, #E94057)' }
};

function LiveBoard() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const [eventData, setEventData] = useState(null);
  const [attendeesList, setAttendeesList] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Multilingual state
  const [lang, setLang] = useState(getLanguage());
  
  const attendeesRef = useRef([]);

  useEffect(() => {
    attendeesRef.current = attendeesList;
  }, [attendeesList]);

  const t = getTranslations(lang);

  const handleLangToggle = () => {
    const newLang = lang === 'vi' ? 'en' : 'vi';
    setLanguage(newLang);
    setLang(newLang);
  };

  useEffect(() => {
    async function loadEventAndAttendees() {
      setLoading(true);
      const { data: event, error: eventErr } = await eventService.getEvent(slug);
      if (eventErr || !event) {
        alert(lang === 'vi' ? "Sự kiện không tồn tại!" : "Event not found!");
        navigate('/');
        return;
      }
      setEventData(event);

      const { data: list, error: listErr } = await eventService.getAttendees(event.id);
      if (!listErr && list) {
        setAttendeesList(list);
      }
      setLoading(false);
    }
    loadEventAndAttendees();
  }, [slug, navigate, lang]);

  // Subscribe to real-time checkins
  useEffect(() => {
    if (!eventData) return;

    const unsubscribe = eventService.subscribeToAttendees(
      eventData.id,
      (newAttendee) => {
        // Trigger high-quality confetti explosion!
        confetti({
          particleCount: 80,
          spread: 60,
          origin: { y: 0.6 },
          colors: ['#7c3aed', '#06b6d4', '#10b981', '#ec4899', '#f59e0b']
        });
        
        setAttendeesList(prev => {
          // Prevent duplicates in real-time callbacks
          if (prev.some(a => a.id === newAttendee.id)) return prev;
          return [newAttendee, ...prev];
        });
      },
      (deletedId) => {
        setAttendeesList(prev => prev.filter(a => a.id !== deletedId));
      },
      () => {
        setAttendeesList([]);
      },
      (updatedEvent) => {
        setEventData(updatedEvent);
      },
      (updatedAttendee) => {
        setAttendeesList(prev => prev.map(a => a.id === updatedAttendee.id ? updatedAttendee : a));
      }
    );

    return () => {
      unsubscribe();
    };
  }, [eventData]);



  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', color: 'var(--text-secondary)' }}>
        <h3><i className="fa-solid fa-spinner fa-spin" style={{ marginRight: '10px' }}></i> {lang === 'vi' ? 'Đang tải dữ liệu sự kiện...' : 'Loading event data...'}</h3>
      </div>
    );
  }

  // Calculate stats
  let founders = 0;
  let developers = 0;
  let designers = 0;
  let others = 0;

  attendeesList.forEach(a => {
    switch (a.role) {
      case 'Founder': founders++; break;
      case 'Developer': developers++; break;
      case 'Designer': designers++; break;
      default: others++; break;
    }
  });

  const checkinUrl = `${window.location.origin}${window.location.pathname}#/checkin/${slug}`;
  const qrCodeApiUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(checkinUrl)}&color=3b2a1e&bgcolor=fffdf9`;

  return (
    <div className="warm-theme">
      {/* Background blobs */}
      <div className="bg-blob blob-1"></div>
      <div className="bg-blob blob-2"></div>
      <div className="bg-blob blob-3"></div>

      <header className="app-header">
        <div className="header-container">
          <Link to="/" style={{ textDecoration: 'none', color: 'inherit' }}>
            <Logo variant={1} showText={true} size={30} />
          </Link>

          <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
            {/* Language Switcher pill */}
            <button className="lang-toggle-btn" onClick={handleLangToggle}>
              <i className="fa-solid fa-globe" style={{ marginRight: '4px' }}></i>
              {lang === 'vi' ? 'EN' : 'VI'}
            </button>

            <nav className="nav-tabs" style={{ background: 'transparent', border: 'none', padding: 0 }}>
              <button className="nav-tab active">
                <i className="fa-solid fa-desktop"></i>
                <span>{t.liveBoard}</span>
              </button>
              <button className="nav-tab" onClick={() => navigate(`/event/${slug}/admin`)}>
                <i className="fa-solid fa-sliders"></i>
                <span>{t.hostAdmin}</span>
              </button>
            </nav>
          </div>
        </div>
      </header>

      <main className="app-container">
        <div className="host-grid">
          
          {/* Left: Event QR Info & Simulation */}
          <div className="host-card qr-section glass">
            <div className="event-details">
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '8px' }}>
                <div className="event-title-badge">{t.eventLiveBadge}</div>
                <div className="event-title-badge" style={{ background: 'var(--bg-dark)', borderColor: 'var(--border-color)', color: 'var(--text-secondary)' }}>
                  {eventData.event_type === 'online' ? (
                    <span><i className="fa-solid fa-video" style={{ color: '#06b6d4', marginRight: '4px' }}></i>ONLINE</span>
                  ) : eventData.event_type === 'hybrid' ? (
                    <span><i className="fa-solid fa-circle-nodes" style={{ color: '#ec4899', marginRight: '4px' }}></i>HYBRID</span>
                  ) : (
                    <span><i className="fa-solid fa-people-group" style={{ color: '#10b981', marginRight: '4px' }}></i>OFFLINE</span>
                  )}
                </div>
              </div>
              <h1>{eventData.title}</h1>
              <p>{eventData.description}</p>
              
              {eventData.event_type !== 'offline' && eventData.meeting_link && (
                <div style={{ 
                  marginTop: '12px', 
                  padding: '10px 14px', 
                  background: 'rgba(255, 255, 255, 0.02)', 
                  border: '1px solid var(--border-color)', 
                  borderRadius: '10px',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  fontSize: '13px',
                  color: 'var(--text-secondary)'
                }}>
                  <i className="fa-solid fa-globe" style={{ color: '#06b6d4' }}></i>
                  <span>{lang === 'vi' ? 'Link phòng họp:' : 'Meeting Link:'}</span>
                  <a href={eventData.meeting_link} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--accent-pink)', textDecoration: 'none', fontWeight: 'bold' }}>
                    {eventData.meeting_link} <i className="fa-solid fa-up-right-from-square" style={{ fontSize: '10px', marginLeft: '2px' }}></i>
                  </a>
                </div>
              )}
            </div>

            <div className="qr-code-wrapper">
              <div className="qr-container">
                <img src={qrCodeApiUrl} alt="QR Check-in" />
                <div className="qr-overlay" style={{ background: 'var(--bg-darker)', borderRadius: '50%', padding: '4px' }}>
                  <Logo variant={1} size={24} animated={false} />
                </div>
              </div>
              <div className="qr-instruction">
                <i className="fa-solid fa-qrcode"></i>
                <span>{t.qrInstruction}</span>
              </div>
            </div>
          </div>

          {/* Right: Live List Feed */}
          <div className="host-card live-stream-section glass">
            <div className="section-title-bar">
              <h2>
                <span className="live-indicator"></span>
                <span>{lang === 'vi' ? 'Khách vừa Check-in' : 'Recent Check-ins'}</span>
              </h2>
              <div className="stat-badge">
                <span>{attendeesList.length}</span> {lang === 'vi' ? 'đã tham gia' : 'joined'}
              </div>
            </div>

            <div className="live-stats-row">
              <div className="stat-mini-card">
                <span className="stat-val">{founders}</span>
                <span className="stat-label">Founder</span>
              </div>
              <div className="stat-mini-card">
                <span className="stat-val">{developers}</span>
                <span className="stat-label">Developer</span>
              </div>
              <div className="stat-mini-card">
                <span className="stat-val">{designers}</span>
                <span className="stat-label">Designer</span>
              </div>
              <div className="stat-mini-card">
                <span className="stat-val">{others}</span>
                <span className="stat-label">{t.roleOther}</span>
              </div>
            </div>

            <div className="live-stream-list">
              {attendeesList.length > 0 ? (
                attendeesList.map((guest) => {
                  const av = avatarPresets[guest.avatar] || avatarPresets['avatar-1'];
                  const checkinTime = guest.created_at 
                    ? new Date(guest.created_at).toLocaleTimeString(lang === 'vi' ? 'vi-VN' : 'en-US', { hour: '2-digit', minute: '2-digit' })
                    : '14:00';
                  return (
                    <div key={guest.id} className="live-guest-item">
                       <div className="guest-item-avatar" style={{ background: av.style }}>
                        <i className={`fa-solid ${av.icon}`}></i>
                      </div>
                      <div className="guest-item-info">
                        <div className="guest-item-name-row">
                          <span className="guest-item-name">{guest.name}</span>
                          <span className={`role-badge ${guest.role.toLowerCase()}`}>{guest.role}</span>
                        </div>
                        <div className="guest-item-bio">{guest.bio}</div>
                        {(guest.looking || guest.help) && (
                          <div className="guest-item-icebreakers">
                            {guest.looking && guest.looking !== 'Không chia sẻ cụ thể.' && guest.looking !== 'Not specified.' && (
                              <span className="icebreaker-tag looking">
                                <i className="fa-solid fa-magnifying-glass"></i> {lang === 'vi' ? 'Tìm: ' : 'Seek: '}{guest.looking}
                              </span>
                            )}
                            {guest.help && guest.help !== 'Không chia sẻ cụ thể.' && guest.help !== 'Not specified.' && (
                              <span className="icebreaker-tag help">
                                <i className="fa-solid fa-handshake-angle"></i> {lang === 'vi' ? 'Giúp: ' : 'Help: '}{guest.help}
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                      <div className="guest-item-time">{checkinTime}</div>
                    </div>
                  );
                })
              ) : (
                <div className="empty-stream">
                  <i className="fa-solid fa-ghost"></i>
                  <p>{t.waitingFirstGuest}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer style={{ textAlign: 'center', padding: '16px 0 24px 0', borderTop: '1px solid var(--border-color)', marginTop: '20px', width: '100%', zIndex: 10 }}>
        <div style={{ display: 'flex', justifyContent: 'center', gap: '20px', marginBottom: '8px', fontSize: '13px' }}>
          <Link to="/terms" target="_blank" style={{ color: 'var(--text-secondary)', textDecoration: 'none' }}>
            {t.legalTerms}
          </Link>
          <span style={{ color: 'var(--border-color)' }}>|</span>
          <Link to="/privacy" target="_blank" style={{ color: 'var(--text-secondary)', textDecoration: 'none' }}>
            {t.legalPrivacy}
          </Link>
        </div>
        <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
          © {new Date().getFullYear()} CircleLink. All rights reserved. Powered by Supabase.
        </p>
      </footer>
    </div>
  );
}

export default LiveBoard;
