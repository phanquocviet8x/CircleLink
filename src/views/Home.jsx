import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { eventService } from '../services/eventService';
import Logo from '../components/Logo';
import { getTranslations, getLanguage, setLanguage } from '../services/translations';
import { supabase, isDemoMode } from '../supabaseClient';

// Lightweight scroll-reveal hook (IntersectionObserver based, no external deps).
// Attach the returned ref to any element and add className `lv-reveal` (+ `lv-revealed` when visible).
function useReveal() {
  const [revealedKeys, setRevealedKeys] = useState({});
  const observerRef = useRef(null);

  useEffect(() => {
    observerRef.current = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const key = entry.target.dataset.revealKey;
            if (key) {
              setRevealedKeys((prev) => (prev[key] ? prev : { ...prev, [key]: true }));
            }
            observerRef.current.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.15 }
    );
    return () => observerRef.current && observerRef.current.disconnect();
  }, []);

  const revealRef = useCallback((key) => (node) => {
    if (node && observerRef.current) {
      node.dataset.revealKey = key;
      observerRef.current.observe(node);
    }
  }, []);

  const isRevealed = (key) => !!revealedKeys[key];

  return { revealRef, isRevealed };
}

function Home() {
  const [title, setTitle] = useState('');
  const [desc, setDesc] = useState('');
  const [slug, setSlug] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [eventType, setEventType] = useState('offline');
  const [meetingLink, setMeetingLink] = useState('');
  const [eventDate, setEventDate] = useState('');
  const [durationDays, setDurationDays] = useState('7');

  // Multilingual State ('vi' or 'en')
  const [lang, setLang] = useState(getLanguage());

  // Accordion FAQ State
  const [openFaq, setOpenFaq] = useState(null);

  // Host Authentication States
  const [isLoggedIn, setIsLoggedIn] = useState(!!localStorage.getItem('circlelink_host_email'));
  const [hostEmail, setHostEmail] = useState(localStorage.getItem('circlelink_host_email') || '');
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [loginError, setLoginError] = useState('');

  // The event this host currently owns (1 event per email at a time)
  const [myEvent, setMyEvent] = useState(null);

  // Landing v2: the create-event form now lives inside a modal, opened from any "Create event" CTA
  const [showCreateModal, setShowCreateModal] = useState(false);

  // Ref hooks for smooth scrolling
  const faqRef = useRef(null);
  const featuresRef = useRef(null);
  const howRef = useRef(null);

  const navigate = useNavigate();
  const t = getTranslations(lang);
  const { revealRef, isRevealed } = useReveal();

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

  // Fetch the event this host is currently hosting (if any)
  useEffect(() => {
    if (!isLoggedIn || !hostEmail) {
      setMyEvent(null);
      return;
    }
    let cancelled = false;
    eventService.getMyHostedEvent(hostEmail).then(({ data }) => {
      if (!cancelled) {
        setMyEvent(data || null);
        if (data && data.admin_token && data.slug) {
          localStorage.setItem(`circlelink_admin_token_${data.slug}`, data.admin_token);
        }
      }
    });
    return () => { cancelled = true; };
  }, [isLoggedIn, hostEmail]);

  // Map raw service errors to friendly bilingual messages
  const friendlyCreateError = (serviceError) => {
    const msg = serviceError?.message || '';
    if (msg.includes('HOST_EVENT_LIMIT')) {
      return lang === 'vi'
        ? 'Mỗi email chỉ được tổ chức 1 sự kiện tại một thời điểm. Vui lòng quản lý hoặc xóa sự kiện hiện tại trước khi tạo sự kiện mới.'
        : 'Each email can only host 1 event at a time. Please manage or delete your current event before creating a new one.';
    }
    if (msg.includes('SLUG_DATE_TAKEN')) {
      return lang === 'vi'
        ? 'Đường dẫn này đã được dùng cho một sự kiện khác vào đúng ngày bạn chọn. Hãy đổi tên đường dẫn hoặc chọn ngày khác.'
        : 'This URL is already used by another event on the same date you picked. Try a different slug or date.';
    }
    if (msg.includes('EVENT_DATE_REQUIRED')) {
      return lang === 'vi' ? 'Vui lòng chọn ngày giờ diễn ra sự kiện.' : 'Please pick the event date and time.';
    }
    if (msg.includes('EVENT_DATE_IN_PAST')) {
      return lang === 'vi' ? 'Ngày giờ sự kiện không được ở quá khứ.' : 'The event date/time cannot be in the past.';
    }
    if (msg.includes('INVALID_DURATION')) {
      return lang === 'vi' ? 'Thời hạn tồn tại của sự kiện không hợp lệ.' : 'Invalid event lifetime option.';
    }
    return msg;
  };

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
        setEventDate(pendingEvent.eventDate || '');
        setDurationDays(pendingEvent.durationDays || '7');
        setShowCreateModal(true);

        const autoCreate = async () => {
          setLoading(true);
          setError('');

          const { data, error: serviceError } = await eventService.createEvent(
            pendingEvent.slug,
            pendingEvent.title,
            pendingEvent.desc,
            hostEmail,
            pendingEvent.eventType,
            pendingEvent.meetingLink,
            pendingEvent.eventDate,
            Number(pendingEvent.durationDays) || 7
          );

          setLoading(false);

          if (serviceError) {
            setError(friendlyCreateError(serviceError) || (lang === 'vi' ? 'Đã có lỗi xảy ra khi tự động tạo sự kiện.' : 'An error occurred while automatically creating the event.'));
            // Refresh hosted-event state (e.g. when blocked by the 1-event-per-email limit)
            eventService.getMyHostedEvent(hostEmail).then(({ data: ev }) => setMyEvent(ev || null));
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

    // Event date/time is required (also used to scope slug uniqueness per day)
    if (!eventDate) {
      setError(lang === 'vi' ? 'Vui lòng chọn ngày giờ diễn ra sự kiện.' : 'Please pick the event date and time.');
      return;
    }

    // Auth gate check: require login to create/host an event!
    if (!isLoggedIn) {
      // Save form data to localStorage so we can auto-create the event after successful login
      localStorage.setItem('circlelink_pending_event', JSON.stringify({
        title: title.trim(),
        desc: desc.trim(),
        slug: slug.trim().toLowerCase(),
        eventType,
        meetingLink: eventType !== 'offline' ? meetingLink.trim() : '',
        eventDate,
        durationDays
      }));
      setLoginError('');
      setShowLoginModal(true);
      return;
    }

    // 1 event per email at a time
    if (myEvent) {
      setError(friendlyCreateError({ message: 'HOST_EVENT_LIMIT' }));
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
      eventType !== 'offline' ? meetingLink.trim() : '',
      eventDate,
      Number(durationDays)
    );

    setLoading(false);

    if (serviceError) {
      setError(friendlyCreateError(serviceError) || (lang === 'vi' ? 'Đã có lỗi xảy ra khi tạo sự kiện.' : 'An error occurred while creating the event.'));
      eventService.getMyHostedEvent(hostEmail).then(({ data: ev }) => setMyEvent(ev || null));
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

  // Opens the create-event modal (navbar / hero / pricing CTAs all funnel here)
  const openCreateModal = () => {
    setError('');
    setShowCreateModal(true);
  };

  const closeCreateModal = () => {
    setShowCreateModal(false);
  };

  const scrollToRef = (ref) => {
    if (ref.current) {
      ref.current.scrollIntoView({ behavior: 'smooth' });
    }
  };

  // Demo route: App.jsx defines /event/:slug (NOT /e/:slug) — see route audit note in final report.
  const goToDemo = () => {
    navigate('/event/test-event');
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

  const featureCards = [
    { icon: 'fa-bolt', title: t.lvFeat1Title, desc: t.lvFeat1Desc },
    { icon: 'fa-bullseye', title: t.lvFeat2Title, desc: t.lvFeat2Desc },
    { icon: 'fa-lock', title: t.lvFeat3Title, desc: t.lvFeat3Desc },
    { icon: 'fa-video', title: t.lvFeat4Title, desc: t.lvFeat4Desc },
    { icon: 'fa-hourglass-half', title: t.lvFeat5Title, desc: t.lvFeat5Desc },
    { icon: 'fa-chart-line', title: t.lvFeat6Title, desc: t.lvFeat6Desc }
  ];

  const demoGuests = [
    { name: 'Minh Anh', role: 'Founder' },
    { name: 'Đức Thọ', role: 'Developer' },
    { name: 'Thu Hà', role: 'Investor' }
  ];

  const revealClass = (key) => `lv-reveal${isRevealed(key) ? ' lv-revealed' : ''}`;

  return (
    <div className="landing-v2">
      {/* Background decor: concentric rings + drifting dots */}
      <div className="lv-bg-rings" aria-hidden="true">
        <div className="lv-ring lv-ring-1"></div>
        <div className="lv-ring lv-ring-2"></div>
        <div className="lv-ring lv-ring-3"></div>
        <div className="lv-dot-orbit"></div>
        <div className="lv-dot-orbit"></div>
        <div className="lv-dot-orbit"></div>
        <div className="lv-dot-orbit"></div>
        <div className="lv-dot-orbit"></div>
      </div>

      {/* 2.1 Navbar */}
      <header className="lv-navbar">
        <div className="lv-navbar-inner">
          <div className="lv-brand">
            <Logo variant={5} size={32} animated={true} />
            <span><span className="lv-brand-circle">Circle</span><span className="lv-brand-link">Link</span></span>
          </div>

          <nav className="lv-nav-links">
            <button onClick={() => scrollToRef(featuresRef)}>{t.navFeatures}</button>
            <button onClick={() => scrollToRef(howRef)}>{t.navHowItWorks}</button>
            <button onClick={() => scrollToRef(faqRef)}>{t.navFaq}</button>
          </nav>

          <div className="lv-nav-actions">
            {isLoggedIn && (
              <div className="lv-host-session-badge">
                <i className="fa-solid fa-user-tie" style={{ color: 'var(--land-orange)' }}></i>
                <span>{hostEmail}</span>
                <button onClick={handleLogout} title={t.logout}>
                  <i className="fa-solid fa-right-from-bracket"></i>
                </button>
              </div>
            )}

            <button className="lv-lang-btn" onClick={handleLangToggle}>
              <i className="fa-solid fa-globe" style={{ marginRight: '4px' }}></i>
              {lang === 'vi' ? 'EN' : 'VI'}
            </button>

            {isLoggedIn && myEvent ? (
              <button className="lv-btn lv-btn-primary lv-btn-sm" onClick={() => navigate(`/event/${myEvent.slug}/admin`)}>
                <i className="fa-solid fa-arrow-right-to-bracket"></i> {lang === 'vi' ? 'Quản trị' : 'Admin'}
              </button>
            ) : (
              <button className="lv-btn lv-btn-primary lv-btn-sm" onClick={openCreateModal}>
                <i className="fa-solid fa-plus"></i> {t.navCreateEvent}
              </button>
            )}
          </div>
        </div>
      </header>

      {/* 2.2 Hero */}
      <section className="lv-hero">
        <div className="lv-hero-logo-disc">
          <Logo variant={5} size={110} animated={true} />
        </div>

        {isLoggedIn && myEvent && (
          <div className="lv-my-event-banner">
            <div>
              <h4><i className="fa-solid fa-calendar-check" style={{ color: 'var(--land-orange)', marginRight: '8px' }}></i>{t.myEventBannerTitle}</h4>
              <p>{myEvent.title} · /{myEvent.slug}</p>
            </div>
            <button className="lv-btn lv-btn-primary lv-btn-sm" onClick={() => navigate(`/event/${myEvent.slug}/admin`)}>
              <i className="fa-solid fa-sliders"></i> {t.myEventBannerManage}
            </button>
          </div>
        )}

        {lang === 'vi' ? (
          <h1 className="lv-hero-title">{t.heroTitlePrefix} <span className="lv-grad">{t.heroTitleHighlight}</span> {t.heroTitleSuffix}</h1>
        ) : (
          <h1 className="lv-hero-title">{t.heroTitlePrefix} <span className="lv-grad">{t.heroTitleHighlight}</span> {t.heroTitleSuffix}</h1>
        )}

        <p className="lv-slogan">
          <span className="lv-quote">&ldquo;</span>{t.heroSloganV2}<span className="lv-quote">&rdquo;</span>
        </p>

        <p className="lv-hero-subtitle">{t.heroSubtitleV2}</p>

        <div className="lv-cta-row">
          <button className="lv-btn lv-btn-primary" onClick={openCreateModal}>
            <i className="fa-solid fa-rocket"></i> {t.heroCtaCreate}
          </button>
          <button className="lv-btn lv-btn-outline" onClick={goToDemo}>
            <i className="fa-solid fa-desktop"></i> {t.heroCtaDemo}
          </button>
        </div>

        <p className="lv-social-proof">{t.heroSocialProof}</p>
      </section>

      {/* 2.3 How it works */}
      <section
        ref={(node) => { howRef.current = node; revealRef('how')(node); }}
        className={`lv-section ${revealClass('how')}`}
      >
        <div className="lv-container">
          <h2 className="lv-section-title">{t.howItWorksTitle}</h2>
          <div className="lv-steps-grid">
            <div className="lv-step-card">
              <div className="lv-step-num">1</div>
              <h4>{t.howStep1Title}</h4>
              <p>{t.howStep1Desc}</p>
            </div>
            <div className="lv-step-card">
              <div className="lv-step-num">2</div>
              <h4>{t.howStep2Title}</h4>
              <p>{t.howStep2Desc}</p>
            </div>
            <div className="lv-step-card">
              <div className="lv-step-num">3</div>
              <h4>{t.howStep3Title}</h4>
              <p>{t.howStep3Desc}</p>
            </div>
          </div>
        </div>
      </section>

      {/* 2.4 Features */}
      <section
        ref={(node) => { featuresRef.current = node; revealRef('features')(node); }}
        className={`lv-section ${revealClass('features')}`}
      >
        <div className="lv-container">
          <h2 className="lv-section-title">{t.featuresTitle}</h2>
          <div className="lv-features-grid">
            {featureCards.map((f, i) => (
              <div className="lv-feature-card" key={i}>
                <div className="lv-feature-icon"><i className={`fa-solid ${f.icon}`}></i></div>
                <h4>{f.title}</h4>
                <p>{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 2.5 Live demo mockup (pure CSS, no screenshot asset) */}
      <section ref={revealRef('demo')} className={`lv-section ${revealClass('demo')}`}>
        <div className="lv-container lv-demo-wrap">
          <h2 className="lv-section-title">{t.demoTitle}</h2>
          <p style={{ color: 'var(--land-muted)', marginTop: '-24px', marginBottom: '32px' }}>{t.demoSubtitle}</p>

          <div className="lv-demo-frame">
            <div className="lv-demo-titlebar">
              <span className="lv-dot lv-dot-red"></span>
              <span className="lv-dot lv-dot-yellow"></span>
              <span className="lv-dot lv-dot-green"></span>
              <span style={{ marginLeft: '8px' }}>{t.demoLiveLabel}</span>
            </div>
            <div className="lv-demo-grid">
              {demoGuests.map((g, i) => (
                <div className="lv-demo-card" key={i}>
                  <div className="lv-demo-avatar">{g.name.charAt(0)}</div>
                  <h5>{g.name}</h5>
                  <span>{g.role}</span>
                </div>
              ))}
              <div className="lv-demo-card lv-demo-card-placeholder">
                <i className="fa-solid fa-circle-user" style={{ fontSize: '28px' }}></i>
                <h5 style={{ margin: 0 }}>{t.demoGuestPlaceholderName}</h5>
                <span>{t.demoGuestPlaceholderRole}</span>
              </div>
            </div>
          </div>

          <div className="lv-demo-cta">
            <button className="lv-btn lv-btn-primary" onClick={goToDemo}>
              <i className="fa-solid fa-desktop"></i> {t.demoCtaBtn}
            </button>
          </div>
        </div>
      </section>

      {/* 2.6 Pricing */}
      <section ref={revealRef('pricing')} className={`lv-section ${revealClass('pricing')}`}>
        <div className="lv-container">
          <h2 className="lv-section-title">{t.pricingTitle}</h2>
          <div className="lv-pricing-grid">
            <div className="lv-pricing-card lv-pricing-free">
              <span className="lv-pricing-badge">{t.pricingFreeBadge}</span>
              <h3>{t.pricingFreeName}</h3>
              <p className="lv-pricing-price">{t.pricingFreePrice}</p>
              <ul className="lv-pricing-feature-list">
                <li><i className="fa-solid fa-check" style={{ color: 'var(--land-orange)' }}></i> {t.pricingFreeGuests}</li>
                <li><i className="fa-solid fa-check" style={{ color: 'var(--land-orange)' }}></i> {t.pricingFreeFeature}</li>
              </ul>
              <button className="lv-btn lv-btn-primary" onClick={openCreateModal}>
                <i className="fa-solid fa-rocket"></i> {t.pricingFreeCta}
              </button>
            </div>

            <div className="lv-pricing-card lv-pricing-premium">
              <span className="lv-pricing-badge">{t.pricingPremiumBadge}</span>
              <h3>{t.pricingPremiumName}</h3>
              <p className="lv-pricing-price">{t.pricingPremiumPrice}</p>
              <ul className="lv-pricing-feature-list">
                <li><i className="fa-solid fa-minus"></i> {t.pricingPremiumGuests}</li>
              </ul>
              <a className="lv-btn lv-btn-disabled" href="mailto:thanhinbali@gmail.com?subject=CircleLink%20Premium">
                {t.pricingPremiumCta}
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* 2.7 FAQ */}
      <section
        ref={(node) => { faqRef.current = node; revealRef('faq')(node); }}
        className={`lv-section ${revealClass('faq')}`}
        style={{ scrollMarginTop: '80px' }}
      >
        <div className="lv-container">
          <h2 className="lv-section-title">{t.faqTitle}</h2>

          <div className="lv-faq-list">
            {faqItems.map((item, index) => (
              <div key={index} className={`lv-faq-item ${openFaq === index ? 'lv-active' : ''}`}>
                <button className="lv-faq-question" onClick={() => toggleFaq(index)}>
                  <span>{item.q}</span>
                  <i className={`fa-solid ${openFaq === index ? 'fa-minus' : 'fa-plus'}`}></i>
                </button>
                <div className="lv-faq-answer">
                  <p>{item.a}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="lv-faq-author">
            <h4><i className="fa-solid fa-address-book" style={{ marginRight: '8px', color: 'var(--land-orange)' }}></i>{t.faqAuthorContactTitle}</h4>
            <p>{t.faqAuthorContactText}</p>
            <div className="lv-faq-author-links">
              <span><i className="fa-solid fa-user-circle" style={{ color: 'var(--land-coral)', marginRight: '6px' }}></i>Thanhvespa</span>
              <a href="mailto:thanhinbali@gmail.com">
                <i className="fa-solid fa-envelope" style={{ marginRight: '6px' }}></i>thanhinbali@gmail.com
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="lv-footer">
        <div className="lv-brand" style={{ justifyContent: 'center', marginBottom: '10px' }}>
          <Logo variant={5} size={28} animated={false} />
          <span><span className="lv-brand-circle">Circle</span><span className="lv-brand-link">Link</span></span>
        </div>
        <p className="lv-footer-slogan">{t.footerSlogan}</p>
        <div className="lv-footer-links">
          <Link to="/terms" target="_blank">{t.legalTerms}</Link>
          <span>|</span>
          <Link to="/privacy" target="_blank">{t.legalPrivacy}</Link>
        </div>
        <p className="lv-footer-note">
          <i className="fa-solid fa-shield-halved" style={{ marginRight: '6px' }}></i>{t.footerPdplNote}
        </p>
        <p className="lv-footer-copy">© {new Date().getFullYear()} CircleLink. All rights reserved. Powered by Supabase.</p>
      </footer>

      {/* Create Event Modal (all "Create event" CTAs open this) */}
      {showCreateModal && (
        <div className="lv-modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) closeCreateModal(); }}>
          <div className="lv-modal">
            <button className="lv-modal-close" onClick={closeCreateModal}>
              <i className="fa-solid fa-xmark"></i>
            </button>

            {isLoggedIn && myEvent ? (
              /* Host already has an active event: show management info instead of the create form */
              <div style={{ textAlign: 'center' }}>
                <h3>
                  <i className="fa-solid fa-calendar-check" style={{ color: 'var(--land-orange)', marginRight: '8px' }}></i>
                  {t.myEventBannerTitle}
                </h3>

                <div style={{ padding: '20px', borderRadius: '14px', margin: '16px 0', border: '1px solid var(--land-border)', background: '#fff' }}>
                  <h4 style={{ margin: '0 0 6px 0', fontSize: '18px', color: 'var(--land-ink)' }}>{myEvent.title}</h4>
                  <p style={{ margin: 0, fontSize: '13px', color: 'var(--land-muted)' }}>
                    <i className="fa-solid fa-link" style={{ marginRight: '6px' }}></i>/{myEvent.slug}
                  </p>
                </div>

                <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
                  <button className="lv-btn lv-btn-primary" onClick={() => navigate(`/event/${myEvent.slug}/admin`)}>
                    <i className="fa-solid fa-sliders"></i> {t.myEventBannerManage}
                  </button>
                  <button className="lv-btn lv-btn-outline" onClick={() => navigate(`/event/${myEvent.slug}`)}>
                    <i className="fa-solid fa-desktop"></i> Live Board
                  </button>
                </div>

                <p style={{ marginTop: '18px', fontSize: '12.5px', color: 'var(--land-muted)', lineHeight: '1.5' }}>
                  <i className="fa-solid fa-circle-info" style={{ marginRight: '6px' }}></i>
                  {lang === 'vi'
                    ? 'Mỗi email chỉ được tổ chức 1 sự kiện tại một thời điểm. Để tạo sự kiện mới, hãy xóa sự kiện hiện tại trong trang quản trị.'
                    : 'Each email can host only 1 event at a time. To create a new event, delete the current one from the admin page.'}
                </p>
              </div>
            ) : (
              <>
                <h3>
                  <i className="fa-solid fa-square-plus" style={{ color: 'var(--land-orange)', marginRight: '8px' }}></i>
                  {t.formTitle}
                </h3>

                {error && (
                  <div className="lv-error-box">
                    <i className="fa-solid fa-triangle-exclamation" style={{ marginRight: '8px' }}></i> {error}
                  </div>
                )}

                <form onSubmit={handleSubmit}>
                  <div className="lv-form-group">
                    <label>{t.formNameLabel} <span className="required">*</span></label>
                    <div className="lv-input-wrapper">
                      <i className="fa-solid fa-heading"></i>
                      <input
                        type="text"
                        placeholder={t.formNamePlaceholder}
                        value={title}
                        onChange={handleTitleChange}
                        required
                      />
                    </div>
                  </div>

                  <div className="lv-form-group">
                    <label>{t.formDescLabel}</label>
                    <div className="lv-input-wrapper">
                      <i className="fa-solid fa-align-left"></i>
                      <input
                        type="text"
                        placeholder={t.formDescPlaceholder}
                        value={desc}
                        onChange={(e) => setDesc(e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="lv-form-group">
                    <label>{t.eventTypeLabel}</label>
                    <div style={{ display: 'flex', gap: '10px', marginTop: '8px', flexWrap: 'wrap' }}>
                      <label className={`lv-filter-chip ${eventType === 'offline' ? 'lv-active' : ''}`}>
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
                      <label className={`lv-filter-chip ${eventType === 'online' ? 'lv-active' : ''}`}>
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
                      <label className={`lv-filter-chip ${eventType === 'hybrid' ? 'lv-active' : ''}`}>
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
                    <div className="lv-form-group" style={{ animation: 'fadeIn 0.3s ease' }}>
                      <label>{t.meetingLinkLabel} <span className="required">*</span></label>
                      <div className="lv-input-wrapper">
                        <i className="fa-solid fa-globe"></i>
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

                  <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                    <div className="lv-form-group" style={{ flex: '1 1 220px' }}>
                      <label>{t.formEventDateLabel} <span className="required">*</span></label>
                      <div className="lv-input-wrapper">
                        <i className="fa-solid fa-calendar-days"></i>
                        <input
                          type="datetime-local"
                          value={eventDate}
                          onChange={(e) => setEventDate(e.target.value)}
                          required
                        />
                      </div>
                    </div>

                    <div className="lv-form-group" style={{ flex: '1 1 180px' }}>
                      <label>{t.formDurationLabel}</label>
                      <div className="lv-input-wrapper">
                        <i className="fa-solid fa-hourglass-half"></i>
                        <select value={durationDays} onChange={(e) => setDurationDays(e.target.value)}>
                          <option value="1">{t.formDuration1Day}</option>
                          <option value="3">{t.formDuration3Days}</option>
                          <option value="7">{t.formDuration7Days}</option>
                          <option value="30">{t.formDuration30Days}</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  <span className="lv-hint" style={{ margin: '-8px 0 16px 2px' }}>
                    <i className="fa-solid fa-circle-info" style={{ marginRight: '4px' }}></i>
                    {t.formRetentionHint}
                  </span>

                  <div className="lv-form-group">
                    <label>{t.formSlugLabel} <span className="required">*</span></label>
                    <div className="lv-input-wrapper">
                      <i className="fa-solid fa-link"></i>
                      <input
                        type="text"
                        placeholder="url-su-kien"
                        value={slug}
                        onChange={(e) => setSlug(e.target.value.replace(/\s+/g, '-'))}
                        required
                      />
                    </div>
                    <span className="lv-hint">
                      {t.formSlugHint}<strong>{slug || 'url-cua-ban'}</strong>
                    </span>
                    <span className="lv-hint">
                      <i className="fa-solid fa-circle-info" style={{ marginRight: '4px' }}></i>
                      {t.formSlugDateScopeHint}
                    </span>
                  </div>

                  <button type="submit" className="lv-btn lv-btn-primary" style={{ width: '100%', marginTop: '10px' }} disabled={loading}>
                    {loading ? (
                      <span><i className="fa-solid fa-spinner fa-spin"></i> {t.formCreating}</span>
                    ) : (
                      <span><i className="fa-solid fa-rocket"></i> {t.formSubmitBtn}</span>
                    )}
                  </button>
                </form>

                {/* Disclaimer */}
                <div className="lv-modal-disclaimer">
                  {lang === 'vi' ? (
                    <span>
                      Bằng cách tạo sự kiện, bạn đồng ý với{' '}
                      <Link to="/terms" target="_blank">Điều khoản dịch vụ</Link>{' '}
                      &{' '}
                      <Link to="/privacy" target="_blank">Chính sách bảo mật</Link>
                      , đồng thời đồng ý cho phép CircleLink lưu trữ dữ liệu sự kiện trên Supabase.
                      {' '}{t.formRetentionDisclaimer}
                    </span>
                  ) : (
                    <span>
                      By creating an event, you agree to our{' '}
                      <Link to="/terms" target="_blank">Terms of Service</Link>{' '}
                      &{' '}
                      <Link to="/privacy" target="_blank">Privacy Policy</Link>
                      , and consent to event data storage on Supabase.
                      {' '}{t.formRetentionDisclaimer}
                    </span>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Host Login Modal Dialog */}
      {showLoginModal && (
        <div className="lv-modal-overlay">
          <div className="lv-modal" style={{ maxWidth: '400px' }}>
            <button className="lv-modal-close" onClick={() => setShowLoginModal(false)}>
              <i className="fa-solid fa-xmark"></i>
            </button>
            <h3>{t.authTitle}</h3>
            <p style={{ marginBottom: '24px', color: 'var(--land-muted)', fontSize: '13.5px' }}>{t.authSubtitle}</p>

            {loginError && (
              <div className="lv-error-box">
                <i className="fa-solid fa-circle-exclamation" style={{ marginRight: '8px' }}></i> {loginError}
              </div>
            )}

            {/* Google Sign In Button */}
            <button
              type="button"
              className="lv-google-btn"
              onClick={async () => {
                setLoginError('');
                const { error } = await eventService.signInWithGoogle();
                if (error) {
                  setLoginError(error.message);
                }
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
            <div className="lv-modal-disclaimer">
              {lang === 'vi' ? (
                <span>
                  Bằng việc đăng nhập, bạn đồng ý với{' '}
                  <Link to="/terms" target="_blank" onClick={() => setShowLoginModal(false)}>Điều khoản</Link>{' '}
                  &{' '}
                  <Link to="/privacy" target="_blank" onClick={() => setShowLoginModal(false)}>Chính sách bảo mật</Link>{' '}
                  của chúng tôi, đồng thời chấp thuận xử lý dữ liệu trên Supabase.
                </span>
              ) : (
                <span>
                  By logging in, you agree to our{' '}
                  <Link to="/terms" target="_blank" onClick={() => setShowLoginModal(false)}>Terms</Link>{' '}
                  &{' '}
                  <Link to="/privacy" target="_blank" onClick={() => setShowLoginModal(false)}>Privacy Policy</Link>
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
