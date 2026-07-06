import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { eventService } from '../services/eventService';
import Logo from '../components/Logo';
import { getTranslations, getLanguage, setLanguage } from '../services/translations';
import { supabase, isDemoMode } from '../supabaseClient';

function Home() {
  const [title, setTitle] = useState('');
  const [desc, setDesc] = useState('');
  const [slug, setSlug] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [eventType, setEventType] = useState('offline');
  const [meetingLink, setMeetingLink] = useState('');
  
  // Multilingual State ('vi' or 'en')
  const [lang, setLang] = useState(getLanguage());
  
  // Accordion FAQ State
  const [openFaq, setOpenFaq] = useState(null);
  
  // Host Authentication States
  const [isLoggedIn, setIsLoggedIn] = useState(!!localStorage.getItem('circlelink_host_email'));
  const [hostEmail, setHostEmail] = useState(localStorage.getItem('circlelink_host_email') || '');
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [loginError, setLoginError] = useState('');

  // Ref hooks for smooth scrolling
  const formRef = useRef(null);
  const faqRef = useRef(null);

  const navigate = useNavigate();
  const t = getTranslations(lang);

  // Listen for Supabase Auth state changes (Google Login)
  useEffect(() => {
    if (isDemoMode || !supabase) return;

    // Get current session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session && session.user) {
        setIsLoggedIn(true);
        setHostEmail(session.user.email);
        localStorage.setItem('circlelink_host_email', session.user.email);
      }
    });

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session && session.user) {
        setIsLoggedIn(true);
        setHostEmail(session.user.email);
        localStorage.setItem('circlelink_host_email', session.user.email);
      } else if (event === 'SIGNED_OUT') {
        setIsLoggedIn(false);
        setHostEmail('');
        localStorage.removeItem('circlelink_host_email');
      }
    });

    return () => {
      if (subscription) subscription.unsubscribe();
    };
  }, []);

  // Auto-create event if host logs in and there is a pending event saved in localStorage
  useEffect(() => {
    if (!isLoggedIn || !hostEmail) return;

    const pendingEventStr = localStorage.getItem('circlelink_pending_event');
    if (pendingEventStr) {
      try {
        const pendingEvent = JSON.parse(pendingEventStr);
        localStorage.removeItem('circlelink_pending_event'); // Clear it to prevent multiple submissions

        // Pre-populate form state so it is visible and not lost in case of error (e.g. slug already exists)
        setTitle(pendingEvent.title || '');
        setDesc(pendingEvent.desc || '');
        setSlug(pendingEvent.slug || '');
        setEventType(pendingEvent.eventType || 'offline');
        setMeetingLink(pendingEvent.meetingLink || '');

        const autoCreate = async () => {
          setLoading(true);
          setError('');

          const { data, error: serviceError } = await eventService.createEvent(
            pendingEvent.slug,
            pendingEvent.title,
            pendingEvent.desc,
            hostEmail,
            pendingEvent.eventType,
            pendingEvent.meetingLink
          );

          setLoading(false);

          if (serviceError) {
            setError(serviceError.message || (lang === 'vi' ? 'Đã có lỗi xảy ra khi tự động tạo sự kiện.' : 'An error occurred while automatically creating the event.'));
          } else if (data) {
            if (data.admin_token) {
              localStorage.setItem(`circlelink_admin_token_${data.slug}`, data.admin_token);
            }
            // Event created successfully! Route directly to Host Admin Dashboard
            navigate(`/event/${data.slug}/admin`);
          }
        };

        autoCreate();
      } catch (e) {
        console.error("Failed to parse pending event", e);
        localStorage.removeItem('circlelink_pending_event');
      }
    }
  }, [isLoggedIn, hostEmail, navigate, lang]);

  const handleLangToggle = () => {
    const newLang = lang === 'vi' ? 'en' : 'vi';
    setLanguage(newLang);
    setLang(newLang);
  };

  // Helper to dynamically slugify title while typing if slug is empty
  const handleTitleChange = (e) => {
    const val = e.target.value;
    setTitle(val);
    
    // Auto slugify if slug hasn't been manually edited or is empty
    const slugified = val
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // remove tone marks (Vietnamese)
      .replace(/[đĐ]/g, 'd')
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-');
    setSlug(slugified);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title || !slug) return;

    // Auth gate check: require login to create/host an event!
    if (!isLoggedIn) {
      // Save form data to localStorage so we can auto-create the event after successful login
      localStorage.setItem('circlelink_pending_event', JSON.stringify({
        title: title.trim(),
        desc: desc.trim(),
        slug: slug.trim().toLowerCase(),
        eventType,
        meetingLink: eventType !== 'offline' ? meetingLink.trim() : ''
      }));
      setLoginError('');
      setShowLoginModal(true);
      return;
    }

    // Basic meeting link check
    if (eventType !== 'offline' && !meetingLink.trim()) {
      setError(lang === 'vi' ? 'Vui lòng nhập liên kết cuộc họp trực tuyến.' : 'Please enter the online meeting link.');
      return;
    }

    setLoading(true);
    setError('');

    const cleanSlug = slug.trim().toLowerCase();
    const { data, error: serviceError } = await eventService.createEvent(
      cleanSlug, 
      title.trim(), 
      desc.trim(), 
      hostEmail, 
      eventType, 
      eventType !== 'offline' ? meetingLink.trim() : ''
    );

    setLoading(false);

    if (serviceError) {
      setError(serviceError.message || (lang === 'vi' ? 'Đã có lỗi xảy ra khi tạo sự kiện.' : 'An error occurred while creating the event.'));
    } else if (data) {
      if (data.admin_token) {
        localStorage.setItem(`circlelink_admin_token_${data.slug}`, data.admin_token);
      }
      // Event created successfully! Route to Host Admin Dashboard
      navigate(`/event/${data.slug}/admin`);
    }
  };



  const handleLogout = async () => {
    await eventService.signOut();
    setIsLoggedIn(false);
    setHostEmail('');
  };

  const handleTryNow = () => {
    if (formRef.current) {
      formRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const handleLearnMore = () => {
    if (faqRef.current) {
      faqRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const toggleFaq = (index) => {
    setOpenFaq(openFaq === index ? null : index);
  };

  const faqItems = [
    { q: t.faqQ1, a: t.faqA1 },
    { q: t.faqQ2, a: t.faqA2 },
    { q: t.faqQ3, a: t.faqA3 },
    { q: t.faqQ4, a: t.faqA4 },
    { q: t.faqQ5, a: t.faqA5 },
    { q: t.faqQ6, a: t.faqA6 }
  ];

  return (
    <div className="warm-theme">
      {/* Background blobs */}
      <div className="bg-blob blob-1"></div>
      <div className="bg-blob blob-2"></div>
      <div className="bg-blob blob-3"></div>

      {/* Dynamic Navigation Header */}
      <header className="app-header">
        <div className="header-container">
          <Logo variant={1} showText={true} size={36} />
          
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            {/* Host session state or login prompt */}
            {isLoggedIn ? (
              <div className="host-session-badge">
                <i className="fa-solid fa-user-tie" style={{ color: '#ff6b4a' }}></i>
                <span>{hostEmail}</span>
                <button onClick={handleLogout} title={t.logout}>
                  <i className="fa-solid fa-right-from-bracket"></i>
                </button>
              </div>
            ) : null}

            {/* Language Switcher Button */}
            <button className="lang-toggle-btn" onClick={handleLangToggle}>
              <i className="fa-solid fa-globe" style={{ marginRight: '4px' }}></i>
              {lang === 'vi' ? 'EN' : 'VI'}
            </button>
            
            <button className="btn btn-outline" onClick={handleTryNow} style={{ padding: '8px 16px', fontSize: '13px', borderRadius: '20px' }}>
              <i className="fa-solid fa-bolt"></i> {t.tryNow}
            </button>
          </div>
        </div>
      </header>

      <div className="home-container" style={{ marginTop: '20px' }}>
        {/* Hero Section */}
        <section className="hero-section">
          {/* Main Locked SVG Logo Concept */}
          <div className="hero-logo-large">
            <Logo variant={1} size={110} animated={true} />
          </div>

          {/* Multilingual Hero Title */}
          {lang === 'vi' ? (
            <h1 className="hero-title">Mở Rộng <span>Vòng Tròn</span> Kết Nối</h1>
          ) : (
            <h1 className="hero-title">Expand Your <span>Social</span> Circle</h1>
          )}
          
          {/* Slogan Container */}
          <div className="hero-slogan-wrap" key={lang}>
            <i className="fa-solid fa-quote-left" style={{ marginRight: '8px', opacity: 0.5, fontSize: '14px' }}></i>
            {t.slogan}
            <i className="fa-solid fa-quote-right" style={{ marginLeft: '8px', opacity: 0.5, fontSize: '14px' }}></i>
          </div>

          <p className="hero-subtitle">
            {t.subtitle}
          </p>

          <div className="cta-buttons-wrap">
            <button onClick={handleTryNow} className="btn btn-primary btn-glow btn-cta-try">
              <i className="fa-solid fa-rocket"></i> {t.tryNow}
            </button>
            <button onClick={handleLearnMore} className="btn btn-outline btn-cta-learn">
              <i className="fa-solid fa-circle-question"></i> {t.learnMore}
            </button>
          </div>
        </section>

        {/* Interactive Step-by-Step Workflow */}
        <section className="workflow-section">
          <h3>{t.workflowTitle}</h3>
          <div className="workflow-grid">
            <div className="workflow-card glass">
              <div className="workflow-step-num">1</div>
              <h5>{t.step1Title}</h5>
              <p>{t.step1Desc}</p>
              <div className="workflow-arrow"><i className="fa-solid fa-chevron-right"></i></div>
            </div>

            <div className="workflow-card glass">
              <div className="workflow-step-num">2</div>
              <h5>{t.step2Title}</h5>
              <p>{t.step2Desc}</p>
              <div className="workflow-arrow"><i className="fa-solid fa-chevron-right"></i></div>
            </div>

            <div className="workflow-card glass">
              <div className="workflow-step-num">3</div>
              <h5>{t.step3Title}</h5>
              <p>{t.step3Desc}</p>
              <div className="workflow-arrow"><i className="fa-solid fa-chevron-right"></i></div>
            </div>

            <div className="workflow-card glass">
              <div className="workflow-step-num">4</div>
              <h5>{t.step4Title}</h5>
              <p>{t.step4Desc}</p>
            </div>
          </div>
        </section>

        {/* Redesigned Event Creation Form */}
        <main 
          ref={formRef} 
          className="home-actions-card glass"
          style={{ scrollMarginTop: '100px' }}
        >
          <h3>
            <i className="fa-solid fa-square-plus" style={{ color: 'var(--accent-violet)', marginRight: '8px' }}></i> 
            {t.formTitle}
          </h3>
          
          {error && (
            <div style={{ background: 'rgba(220, 38, 38, 0.08)', border: '1px solid rgba(220, 38, 38, 0.15)', color: '#dc2626', padding: '10px 14px', borderRadius: '10px', fontSize: '13px', marginBottom: '20px', textAlign: 'left' }}>
              <i className="fa-solid fa-triangle-exclamation" style={{ marginRight: '8px' }}></i> {error}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="form-group-home">
              <label>{t.formNameLabel} <span className="required">*</span></label>
              <div className="input-wrapper">
                <i className="fa-solid fa-heading input-icon"></i>
                <input 
                  type="text" 
                  placeholder={t.formNamePlaceholder} 
                  value={title} 
                  onChange={handleTitleChange} 
                  required 
                />
              </div>
            </div>

            <div className="form-group-home">
              <label>{t.formDescLabel}</label>
              <div className="input-wrapper">
                <i className="fa-solid fa-align-left input-icon"></i>
                <input 
                  type="text" 
                  placeholder={t.formDescPlaceholder} 
                  value={desc} 
                  onChange={(e) => setDesc(e.target.value)} 
                />
              </div>
            </div>

            <div className="form-group-home">
              <label>{t.eventTypeLabel}</label>
              <div style={{ display: 'flex', gap: '10px', marginTop: '8px', flexWrap: 'wrap' }}>
                <label 
                  className={`filter-chip ${eventType === 'offline' ? 'active' : ''}`} 
                  style={{ 
                    cursor: 'pointer', 
                    padding: '8px 16px', 
                    display: 'inline-flex', 
                    alignItems: 'center', 
                    gap: '6px',
                    margin: 0,
                    borderRadius: '20px',
                    transition: 'all 0.2s',
                    border: eventType === 'offline' ? '1px solid rgba(59, 42, 30, 0.3)' : '1px solid rgba(59, 42, 30, 0.08)',
                    background: eventType === 'offline' ? 'rgba(59, 42, 30, 0.12)' : 'rgba(59, 42, 30, 0.03)',
                    color: eventType === 'offline' ? '#3b2a1e' : 'rgba(59, 42, 30, 0.6)',
                    fontWeight: eventType === 'offline' ? 'bold' : 'normal'
                  }}
                >
                  <input 
                    type="radio" 
                    name="eventType" 
                    value="offline" 
                    checked={eventType === 'offline'} 
                    onChange={() => setEventType('offline')}
                    style={{ display: 'none' }}
                  />
                  <i className="fa-solid fa-people-group"></i>
                  <span>{t.eventTypeOffline}</span>
                </label>
                <label 
                  className={`filter-chip ${eventType === 'online' ? 'active' : ''}`} 
                  style={{ 
                    cursor: 'pointer', 
                    padding: '8px 16px', 
                    display: 'inline-flex', 
                    alignItems: 'center', 
                    gap: '6px',
                    margin: 0,
                    borderRadius: '20px',
                    transition: 'all 0.2s',
                    border: eventType === 'online' ? '1px solid rgba(59, 42, 30, 0.3)' : '1px solid rgba(59, 42, 30, 0.08)',
                    background: eventType === 'online' ? 'rgba(59, 42, 30, 0.12)' : 'rgba(59, 42, 30, 0.03)',
                    color: eventType === 'online' ? '#3b2a1e' : 'rgba(59, 42, 30, 0.6)',
                    fontWeight: eventType === 'online' ? 'bold' : 'normal'
                  }}
                >
                  <input 
                    type="radio" 
                    name="eventType" 
                    value="online" 
                    checked={eventType === 'online'} 
                    onChange={() => setEventType('online')}
                    style={{ display: 'none' }}
                  />
                  <i className="fa-solid fa-video"></i>
                  <span>{t.eventTypeOnline}</span>
                </label>
                <label 
                  className={`filter-chip ${eventType === 'hybrid' ? 'active' : ''}`} 
                  style={{ 
                    cursor: 'pointer', 
                    padding: '8px 16px', 
                    display: 'inline-flex', 
                    alignItems: 'center', 
                    gap: '6px',
                    margin: 0,
                    borderRadius: '20px',
                    transition: 'all 0.2s',
                    border: eventType === 'hybrid' ? '1px solid rgba(59, 42, 30, 0.3)' : '1px solid rgba(59, 42, 30, 0.08)',
                    background: eventType === 'hybrid' ? 'rgba(59, 42, 30, 0.12)' : 'rgba(59, 42, 30, 0.03)',
                    color: eventType === 'hybrid' ? '#3b2a1e' : 'rgba(59, 42, 30, 0.6)',
                    fontWeight: eventType === 'hybrid' ? 'bold' : 'normal'
                  }}
                >
                  <input 
                    type="radio" 
                    name="eventType" 
                    value="hybrid" 
                    checked={eventType === 'hybrid'} 
                    onChange={() => setEventType('hybrid')}
                    style={{ display: 'none' }}
                  />
                  <i className="fa-solid fa-circle-nodes"></i>
                  <span>{t.eventTypeHybrid}</span>
                </label>
              </div>
            </div>

            {eventType !== 'offline' && (
              <div className="form-group-home" style={{ animation: 'fadeIn 0.3s ease' }}>
                <label>{t.meetingLinkLabel} <span className="required">*</span></label>
                <div className="input-wrapper">
                  <i className="fa-solid fa-globe input-icon"></i>
                  <input 
                    type="url" 
                    placeholder={t.meetingLinkPlaceholder} 
                    value={meetingLink} 
                    onChange={(e) => setMeetingLink(e.target.value)} 
                    required 
                  />
                </div>
              </div>
            )}

            <div className="form-group-home">
              <label>{t.formSlugLabel} <span className="required">*</span></label>
              <div className="input-wrapper">
                <i className="fa-solid fa-link input-icon"></i>
                <input 
                  type="text" 
                  placeholder="url-su-kien" 
                  value={slug} 
                  onChange={(e) => setSlug(e.target.value.replace(/\s+/g, '-'))} 
                  required 
                />
              </div>
              <span style={{ fontSize: '12px', color: 'var(--text-muted)', textAlign: 'left', display: 'block', marginTop: '4px' }}>
                {t.formSlugHint}<strong>{slug || 'url-cua-ban'}</strong>
              </span>
            </div>

            <button type="submit" className="btn btn-primary btn-glow" style={{ width: '100%', marginTop: '10px' }} disabled={loading}>
              {loading ? (
                <span><i className="fa-solid fa-spinner fa-spin"></i> {t.formCreating}</span>
              ) : (
                <span><i className="fa-solid fa-rocket"></i> {t.formSubmitBtn}</span>
              )}
            </button>
          </form>
          
          {/* Disclaimer */}
          <div style={{ marginTop: '16px', fontSize: '12.5px', color: 'var(--text-muted)', textAlign: 'center', lineHeight: '1.4' }}>
            {lang === 'vi' ? (
              <span>
                Bằng cách tạo sự kiện, bạn đồng ý với{' '}
                <Link to="/terms" target="_blank" style={{ color: 'var(--accent-violet)', textDecoration: 'underline' }}>
                  Điều khoản dịch vụ
                </Link>{' '}
                &{' '}
                <Link to="/privacy" target="_blank" style={{ color: 'var(--accent-violet)', textDecoration: 'underline' }}>
                  Chính sách bảo mật
                </Link>
                , đồng thời đồng ý cho phép CircleLink lưu trữ dữ liệu sự kiện trên Supabase.
              </span>
            ) : (
              <span>
                By creating an event, you agree to our{' '}
                <Link to="/terms" target="_blank" style={{ color: 'var(--accent-violet)', textDecoration: 'underline' }}>
                  Terms of Service
                </Link>{' '}
                &{' '}
                <Link to="/privacy" target="_blank" style={{ color: 'var(--accent-violet)', textDecoration: 'underline' }}>
                  Privacy Policy
                </Link>
                , and consent to event data storage on Supabase.
              </span>
            )}
          </div>
        </main>

        {/* Features grid */}
        <section className="home-features-grid">
          <div className="feature-card glass">
            <div className="feature-icon">
              <i className="fa-solid fa-qrcode"></i>
            </div>
            <h4>{t.feat1Title}</h4>
            <p>{t.feat1Desc}</p>
          </div>

          <div className="feature-card glass">
            <div className="feature-icon">
              <i className="fa-solid fa-address-card"></i>
            </div>
            <h4>{t.feat2Title}</h4>
            <p>{t.feat2Desc}</p>
          </div>

          <div className="feature-card glass">
            <div className="feature-icon">
              <i className="fa-solid fa-file-arrow-download"></i>
            </div>
            <h4>{t.feat3Title}</h4>
            <p>{t.feat3Desc}</p>
          </div>
        </section>

        {/* Frequently Asked Questions FAQ Accordion */}
        <section ref={faqRef} className="faq-section" style={{ scrollMarginTop: '100px' }}>
          <h3>{t.faqTitle}</h3>
          
          <div className="faq-list">
            {faqItems.map((item, index) => (
              <div key={index} className={`faq-item glass ${openFaq === index ? 'active' : ''}`}>
                <button className="faq-question" onClick={() => toggleFaq(index)}>
                  <span>{item.q}</span>
                  <i className={`fa-solid ${openFaq === index ? 'fa-minus' : 'fa-plus'}`}></i>
                </button>
                <div className="faq-answer">
                  <p>{item.a}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="faq-author-contact glass" style={{ 
            marginTop: '30px', 
            padding: '24px', 
            borderRadius: '16px', 
            border: '1px solid var(--border-color)',
            background: 'rgba(255, 255, 255, 0.02)',
            textAlign: 'center'
          }}>
            <h4 style={{ margin: '0 0 10px 0', fontFamily: 'var(--font-heading)', fontWeight: '700', fontSize: '15px', color: 'var(--text-primary)' }}>
              <i className="fa-solid fa-address-book" style={{ marginRight: '8px', color: 'var(--accent-violet)' }}></i>
              {t.faqAuthorContactTitle}
            </h4>
            <p style={{ margin: '0 0 16px 0', fontSize: '13px', color: 'var(--text-secondary)' }}>
              {t.faqAuthorContactText}
            </p>
            <div style={{ display: 'flex', gap: '20px', justifyContent: 'center', flexWrap: 'wrap', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13.5px', color: 'var(--text-primary)', fontWeight: '600' }}>
                <i className="fa-solid fa-user-circle" style={{ color: 'var(--accent-pink)' }}></i>
                <span>Thanhvespa</span>
              </div>
              <a href="mailto:thanhinbali@gmail.com" style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13.5px', color: 'var(--text-primary)', textDecoration: 'none', fontWeight: '600' }}>
                <i className="fa-solid fa-envelope" style={{ color: 'var(--accent-violet)' }}></i>
                <span style={{ textDecoration: 'underline' }}>thanhinbali@gmail.com</span>
              </a>
            </div>
          </div>
        </section>
      </div>

      {/* Footer */}
      <footer style={{ textAlign: 'center', padding: '40px 0 50px 0', borderTop: '1px solid var(--border-color)', marginTop: '60px', width: '100%' }}>
        <div style={{ display: 'flex', justifyContent: 'center', gap: '20px', marginBottom: '10px', fontSize: '14px' }}>
          <Link to="/terms" target="_blank" style={{ color: 'var(--text-secondary)', textDecoration: 'none' }}>
            {t.legalTerms}
          </Link>
          <span style={{ color: 'var(--border-color)' }}>|</span>
          <Link to="/privacy" target="_blank" style={{ color: 'var(--text-secondary)', textDecoration: 'none' }}>
            {t.legalPrivacy}
          </Link>
        </div>
        <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
          © {new Date().getFullYear()} CircleLink. All rights reserved. Powered by Supabase.
        </p>
      </footer>

      {/* Host Login Modal Dialog */}
      {showLoginModal && (
        <div className="login-modal-overlay">
          <div className="login-modal" style={{ maxWidth: '400px' }}>
            <button className="btn-close-modal" onClick={() => setShowLoginModal(false)}>
              <i className="fa-solid fa-xmark"></i>
            </button>
            <h3>{t.authTitle}</h3>
            <p style={{ marginBottom: '24px' }}>{t.authSubtitle}</p>
            
            {loginError && (
              <div style={{ background: 'rgba(220, 38, 38, 0.08)', border: '1px solid rgba(220, 38, 38, 0.15)', color: '#dc2626', padding: '10px 14px', borderRadius: '10px', fontSize: '13px', marginBottom: '20px', textAlign: 'left' }}>
                <i className="fa-solid fa-circle-exclamation" style={{ marginRight: '8px' }}></i> {loginError}
              </div>
            )}

            {/* Google Sign In Button */}
            <button 
              type="button" 
              className="btn btn-outline" 
              onClick={async () => {
                setLoginError('');
                const { error } = await eventService.signInWithGoogle();
                if (error) {
                  setLoginError(error.message);
                }
              }}
              style={{ 
                width: '100%', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center', 
                gap: '10px', 
                padding: '12px',
                borderRadius: '12px',
                background: '#fff',
                color: '#3c4043',
                border: '1px solid #dadce0',
                fontWeight: '600',
                fontSize: '14.5px',
                cursor: 'pointer',
                boxShadow: '0 1px 2px 0 rgba(60,64,67,0.3), 0 1px 3px 1px rgba(60,64,67,0.15)',
                transition: 'background-color .218s, border-color .218s, box-shadow .218s'
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.background = '#f8f9fa';
                e.currentTarget.style.boxShadow = '0 1px 3px 0 rgba(60,64,67,0.3), 0 4px 8px 3px rgba(60,64,67,0.15)';
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.background = '#fff';
                e.currentTarget.style.boxShadow = '0 1px 2px 0 rgba(60,64,67,0.3), 0 1px 3px 1px rgba(60,64,67,0.15)';
              }}
            >
              <svg viewBox="0 0 24 24" width="18" height="18" xmlns="http://www.w3.org/2000/svg">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" fill="#EA4335"/>
              </svg>
              <span>{t.loginWithGoogle}</span>
            </button>

            {/* Login Consent Disclaimer */}
            <div style={{ marginTop: '20px', fontSize: '11px', color: 'var(--text-muted)', textAlign: 'center', lineHeight: '1.4' }}>
              {lang === 'vi' ? (
                <span>
                  Bằng việc đăng nhập, bạn đồng ý với{' '}
                  <Link to="/terms" target="_blank" style={{ color: 'var(--accent-violet)', textDecoration: 'underline' }} onClick={() => setShowLoginModal(false)}>
                    Điều khoản
                  </Link>{' '}
                  &{' '}
                  <Link to="/privacy" target="_blank" style={{ color: 'var(--accent-violet)', textDecoration: 'underline' }} onClick={() => setShowLoginModal(false)}>
                    Chính sách bảo mật
                  </Link>{' '}
                  của chúng tôi, đồng thời chấp thuận xử lý dữ liệu trên Supabase.
                </span>
              ) : (
                <span>
                  By logging in, you agree to our{' '}
                  <Link to="/terms" target="_blank" style={{ color: 'var(--accent-violet)', textDecoration: 'underline' }} onClick={() => setShowLoginModal(false)}>
                    Terms
                  </Link>{' '}
                  &{' '}
                  <Link to="/privacy" target="_blank" style={{ color: 'var(--accent-violet)', textDecoration: 'underline' }} onClick={() => setShowLoginModal(false)}>
                    Privacy Policy
                  </Link>
                  , and consent to Supabase data processing.
                </span>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Home;
