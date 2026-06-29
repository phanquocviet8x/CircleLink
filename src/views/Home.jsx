import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { eventService } from '../services/eventService';
import Logo from '../components/Logo';
import { getTranslations, getLanguage, setLanguage } from '../services/translations';

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
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState('');

  // Ref hooks for smooth scrolling
  const formRef = useRef(null);
  const faqRef = useRef(null);

  const navigate = useNavigate();
  const t = getTranslations(lang);

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
      // Event created successfully! Route to Host Admin Dashboard
      navigate(`/event/${data.slug}/admin`);
    }
  };

  const handleLoginSubmit = (e) => {
    e.preventDefault();
    setLoginError('');

    // Demo authentication logic: check if password is '123456'
    if (loginPassword.trim() === '123456') {
      const email = loginEmail.trim();
      localStorage.setItem('circlelink_host_email', email);
      setIsLoggedIn(true);
      setHostEmail(email);
      setShowLoginModal(false);
      setLoginEmail('');
      setLoginPassword('');
    } else {
      setLoginError(t.loginError);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('circlelink_host_email');
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
    { q: t.faqQ5, a: t.faqA5 }
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
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '6px',
                    margin: 0,
                    borderRadius: '20px',
                    border: '1px solid var(--border-color)',
                    background: eventType === 'offline' ? 'var(--accent-gradient)' : 'rgba(255,255,255,0.03)',
                    color: eventType === 'offline' ? '#fff' : 'var(--text-secondary)',
                    transition: 'all 0.2s'
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
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '6px',
                    margin: 0,
                    borderRadius: '20px',
                    border: '1px solid var(--border-color)',
                    background: eventType === 'online' ? 'var(--accent-gradient)' : 'rgba(255,255,255,0.03)',
                    color: eventType === 'online' ? '#fff' : 'var(--text-secondary)',
                    transition: 'all 0.2s'
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
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '6px',
                    margin: 0,
                    borderRadius: '20px',
                    border: '1px solid var(--border-color)',
                    background: eventType === 'hybrid' ? 'var(--accent-gradient)' : 'rgba(255,255,255,0.03)',
                    color: eventType === 'hybrid' ? '#fff' : 'var(--text-secondary)',
                    transition: 'all 0.2s'
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
        </section>
      </div>

      {/* Host Login Modal Dialog */}
      {showLoginModal && (
        <div className="login-modal-overlay">
          <div className="login-modal">
            <button className="btn-close-modal" onClick={() => setShowLoginModal(false)}>
              <i className="fa-solid fa-xmark"></i>
            </button>
            <h3>{t.authTitle}</h3>
            <p>{t.authSubtitle}</p>
            
            {loginError && (
              <div style={{ background: 'rgba(220, 38, 38, 0.08)', border: '1px solid rgba(220, 38, 38, 0.15)', color: '#dc2626', padding: '10px 14px', borderRadius: '10px', fontSize: '13px', marginBottom: '20px', textAlign: 'left' }}>
                <i className="fa-solid fa-circle-exclamation" style={{ marginRight: '8px' }}></i> {loginError}
              </div>
            )}

            <form onSubmit={handleLoginSubmit}>
              <div className="form-group-home">
                <label>{t.emailLabel} <span className="required">*</span></label>
                <div className="input-wrapper">
                  <i className="fa-solid fa-envelope input-icon"></i>
                  <input 
                    type="email" 
                    placeholder={t.emailPlaceholder}
                    value={loginEmail}
                    onChange={(e) => setLoginEmail(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="form-group-home" style={{ marginBottom: '14px' }}>
                <label>{t.passwordLabel} <span className="required">*</span></label>
                <div className="input-wrapper">
                  <i className="fa-solid fa-key input-icon"></i>
                  <input 
                    type="password" 
                    placeholder={t.passwordPlaceholder}
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    required
                  />
                </div>
              </div>
              
              <span style={{ display: 'block', fontSize: '12px', color: 'var(--text-muted)', marginBottom: '22px', textAlign: 'left', lineHeight: '1.4' }}>
                {t.loginDemoTip}
              </span>

              <button type="submit" className="btn btn-primary" style={{ width: '100%' }}>
                <i className="fa-solid fa-right-to-bracket"></i> {t.loginBtn}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default Home;
