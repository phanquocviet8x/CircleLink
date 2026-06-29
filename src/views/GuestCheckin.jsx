import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
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

function GuestCheckin() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const [eventData, setEventData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [toastMsg, setToastMsg] = useState('');
  
  // Multilingual State
  const [lang, setLang] = useState(getLanguage());
  const [checkedIn, setCheckedIn] = useState(false);

  // Form Fields
  const [avatar, setAvatar] = useState('avatar-1');
  const [fullname, setFullname] = useState('');
  const [role, setRole] = useState('');
  const [bio, setBio] = useState('');
  const [looking, setLooking] = useState('');
  const [help, setHelp] = useState('');

  // Contact & Privacy States
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [telegram, setTelegram] = useState('');
  const [facebook, setFacebook] = useState('');
  const [linkedin, setLinkedin] = useState('');
  const [instagram, setInstagram] = useState('');

  const [sharePhone, setSharePhone] = useState(true);
  const [shareEmail, setShareEmail] = useState(true);
  const [shareTelegram, setShareTelegram] = useState(true);
  const [shareFacebook, setShareFacebook] = useState(true);
  const [shareLinkedin, setShareLinkedin] = useState(true);
  const [shareInstagram, setShareInstagram] = useState(true);

  const [submitting, setSubmitting] = useState(false);

  const t = getTranslations(lang);

  const handleLangToggle = () => {
    const newLang = lang === 'vi' ? 'en' : 'vi';
    setLanguage(newLang);
    setLang(newLang);
  };

  useEffect(() => {
    async function loadEvent() {
      setLoading(true);
      const { data: event, error } = await eventService.getEvent(slug);
      if (error || !event) {
        alert(lang === 'vi' ? "Sự kiện không tồn tại!" : "Event not found!");
        navigate('/');
        return;
      }
      setEventData(event);
      setLoading(false);
    }
    loadEvent();
  }, [slug, navigate, lang]);

  const showToast = (msg) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(''), 3000);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!fullname || !role || !bio) return;

    // Client-side rate limiting to prevent bot flood
    const lastCheckinTime = localStorage.getItem(`last_checkin_time_${slug}`);
    const now = Date.now();
    if (lastCheckinTime && (now - parseInt(lastCheckinTime)) < 15000) {
      showToast(lang === 'vi' 
        ? '⚠️ Bạn đang check-in quá nhanh. Vui lòng đợi 15 giây.' 
        : '⚠️ You are checking in too fast. Please wait 15 seconds.'
      );
      return;
    }

    if (eventData.require_phone && !phone.trim()) {
      showToast(lang === 'vi' ? '⚠️ Vui lòng nhập Số điện thoại để tham gia.' : '⚠️ Please enter your Phone Number to check in.');
      return;
    }

    setSubmitting(true);

    const attendeeData = {
      name: fullname.trim(),
      role,
      bio: bio.trim(),
      avatar,
      looking: looking.trim() || (lang === 'vi' ? 'Không chia sẻ cụ thể.' : 'Not specified.'),
      help: help.trim() || (lang === 'vi' ? 'Không chia sẻ cụ thể.' : 'Not specified.'),
      contacts: {
        phone: phone.trim(),
        email: email.trim(),
        telegram: telegram.trim(),
        facebook: facebook.trim(),
        linkedin: linkedin.trim(),
        instagram: instagram.trim()
      },
      privacy: {
        phone: sharePhone,
        email: shareEmail,
        telegram: shareTelegram,
        facebook: shareFacebook,
        linkedin: shareLinkedin,
        instagram: shareInstagram
      }
    };

    const { error } = await eventService.addAttendee(eventData.id, attendeeData);
    setSubmitting(false);

    if (error) {
      alert((lang === 'vi' ? "Lỗi check-in: " : "Check-in error: ") + error.message);
    } else {
      // Trigger confetti explosion!
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 }
      });

      // Save successful check-in timestamp for rate limit cooldown
      try {
        localStorage.setItem(`last_checkin_time_${slug}`, Date.now().toString());
      } catch (_) {}

      setCheckedIn(true);
      showToast(t.checkinSuccessConfetti);
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', color: 'var(--text-secondary)' }}>
        <h3><i className="fa-solid fa-spinner fa-spin" style={{ marginRight: '10px' }}></i> {lang === 'vi' ? 'Đang chuẩn bị cổng check-in...' : 'Preparing check-in gate...'}</h3>
      </div>
    );
  }

  // If check-in gate is closed by host, render the locked gate view
  if (!eventData.is_checkin_open) {
    return (
      <div className="warm-theme">
        <div className="bg-blob blob-1"></div>
        <div className="bg-blob blob-2"></div>
        <div className="bg-blob blob-3"></div>

        <header className="app-header">
          <div className="header-container">
            <Link to="/" style={{ textDecoration: 'none', color: 'inherit' }}>
              <Logo variant={1} showText={true} size={30} />
            </Link>
            
            <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
              <button className="lang-toggle-btn" onClick={handleLangToggle}>
                <i className="fa-solid fa-globe" style={{ marginRight: '4px' }}></i>
                {lang === 'vi' ? 'EN' : 'VI'}
              </button>
            </div>
          </div>
        </header>
        
        <div className="checkin-container glass" style={{ marginTop: '100px', textAlign: 'center' }}>
          <div style={{ fontSize: '48px', color: 'var(--accent-pink)', marginBottom: '16px' }}>
            <i className="fa-solid fa-lock"></i>
          </div>
          <h2 style={{ fontFamily: 'var(--font-heading)', fontWeight: '800', marginBottom: '8px' }}>{t.checkinClosedTitle}</h2>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '24px' }}>
            {lang === 'vi' ? 'Host đã đóng cổng đăng ký cho sự kiện:' : 'Host has closed registration for the event:'} <strong>{eventData.title}</strong>.
          </p>
          <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
            <Link to={`/directory/${slug}`} className="btn btn-primary">
              <i className="fa-solid fa-address-book"></i> {t.checkinBtnGoDirectory}
            </Link>
            <Link to="/" className="btn btn-outline">{t.checkinBtnGoHome}</Link>
          </div>
        </div>
      </div>
    );
  }

  if (checkedIn) {
    return (
      <div className="warm-theme">
        <div className="bg-blob blob-1"></div>
        <div className="bg-blob blob-2"></div>
        <div className="bg-blob blob-3"></div>

        <header className="app-header">
          <div className="header-container">
            <Link to="/" style={{ textDecoration: 'none', color: 'inherit' }}>
              <Logo variant={1} showText={true} size={30} />
            </Link>
            
            <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
              <button className="lang-toggle-btn" onClick={handleLangToggle}>
                <i className="fa-solid fa-globe" style={{ marginRight: '4px' }}></i>
                {lang === 'vi' ? 'EN' : 'VI'}
              </button>
            </div>
          </div>
        </header>
        
        <div className="app-container" style={{ margin: '80px auto' }}>
          <div className="checkin-container glass" style={{ textAlign: 'center', padding: '40px 30px' }}>
            <div style={{ fontSize: '64px', color: '#10b981', marginBottom: '20px' }}>
              <i className="fa-solid fa-circle-check"></i>
            </div>
            <h2 style={{ fontFamily: 'var(--font-heading)', fontWeight: '800', marginBottom: '8px' }}>
              {lang === 'vi' ? 'Check-in Thành Công!' : 'Check-in Successful!'}
            </h2>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '30px' }}>
              {eventData.event_type !== 'offline' && eventData.meeting_link
                ? t.checkinSuccessOnline
                : (lang === 'vi' ? 'Thông tin của bạn đã được ghi nhận. Hãy tiếp tục kết nối với mọi người.' : 'Your profile has been saved. Go connect with other participants.')}
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxWidth: '320px', margin: '0 auto' }}>
              {eventData.event_type !== 'offline' && eventData.meeting_link && (
                <a 
                  href={eventData.meeting_link} 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="btn btn-primary btn-glow"
                  style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center', 
                    gap: '8px', 
                    textDecoration: 'none',
                    padding: '12px',
                    borderRadius: '24px',
                    fontWeight: 'bold'
                  }}
                >
                  <i className="fa-solid fa-video"></i> {t.joinMeetingBtn}
                </a>
              )}
              <Link 
                to={`/directory/${slug}`} 
                className={eventData.event_type !== 'offline' && eventData.meeting_link ? "btn btn-outline" : "btn btn-primary btn-glow"}
                style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center', 
                  gap: '8px', 
                  textDecoration: 'none',
                  padding: '12px',
                  borderRadius: '24px',
                  fontWeight: 'bold'
                }}
              >
                <i className="fa-solid fa-address-book"></i> {t.checkinBtnGoDirectory}
              </Link>
              <Link 
                to="/" 
                className="btn btn-outline"
                style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center', 
                  gap: '8px', 
                  textDecoration: 'none',
                  padding: '12px',
                  borderRadius: '24px',
                  border: 'none',
                  background: 'transparent',
                  color: 'var(--text-muted)'
                }}
              >
                {t.checkinBtnGoHome}
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

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
          
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            <button className="lang-toggle-btn" onClick={handleLangToggle}>
              <i className="fa-solid fa-globe" style={{ marginRight: '4px' }}></i>
              {lang === 'vi' ? 'EN' : 'VI'}
            </button>
          </div>
        </div>
      </header>

      <div className="app-container" style={{ margin: '20px auto' }}>
        <div className="checkin-container glass">
          <div className="form-header">
            <span style={{ fontSize: '12px', color: 'var(--accent-violet)', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '1px' }}>
              {t.checkinTitle}
            </span>
            <h2 style={{ marginTop: '6px' }}>{eventData.title}</h2>
            <p>{lang === 'vi' ? 'Chia sẻ thông tin để kết nối cùng mọi người trong sự kiện.' : 'Share your profile to connect with others at the event.'}</p>
          </div>

          {toastMsg && (
            <div style={{ position: 'fixed', bottom: '30px', right: '30px', background: 'var(--bg-dark)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', padding: '12px 24px', borderRadius: '12px', boxShadow: 'var(--shadow-lg)', zIndex: 1000 }}>
              {toastMsg}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            {/* Avatar Selector */}
            <div className="form-group avatar-group">
              <label>{t.checkinFormAvatar}</label>
              <div className="avatar-selector">
                {Object.keys(avatarPresets).map((key) => {
                  const av = avatarPresets[key];
                  return (
                    <div 
                      key={key}
                      className={`avatar-option ${avatar === key ? 'active' : ''}`} 
                      style={{ background: av.style }}
                      onClick={() => setAvatar(key)}
                    >
                      <i className={`fa-solid ${av.icon}`}></i>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Basic Info */}
            <div className="form-row">
              <div className="form-group col-6">
                <label>{t.checkinFormName} <span className="required">*</span></label>
                <div className="input-wrapper">
                  <i className="fa-signature fa-solid input-icon"></i>
                  <input 
                    type="text" 
                    placeholder={t.checkinFormNamePlaceholder} 
                    value={fullname}
                    onChange={(e) => setFullname(e.target.value)}
                    required 
                  />
                </div>
              </div>

              <div className="form-group col-6">
                <label>{t.checkinFormRole} <span className="required">*</span></label>
                <div className="input-wrapper">
                  <i className="fa-briefcase fa-solid input-icon"></i>
                  <select value={role} onChange={(e) => setRole(e.target.value)} required>
                    <option value="" disabled>{lang === 'vi' ? 'Chọn vai trò...' : 'Select role...'}</option>
                    <option value="Founder">{t.roleFounder} / Startup</option>
                    <option value="Developer">{t.roleDeveloper} / Coder</option>
                    <option value="Designer">{t.roleDesigner} / UI-UX</option>
                    <option value="Marketer">{t.roleMarketer} / Growth</option>
                    <option value="Investor">{t.roleInvestor}</option>
                    <option value="Other">{t.roleOther}</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="form-group">
              <label>{t.checkinFormBio} <span className="required">*</span></label>
              <div className="input-wrapper">
                <i className="fa-quote-left fa-solid input-icon textarea-icon"></i>
                <textarea 
                  rows="2" 
                  maxLength="120" 
                  placeholder={lang === 'vi' ? "1 dòng giới thiệu ngắn ấn tượng về bản thân (Tối đa 120 ký tự)..." : "1 short line introducing yourself (Max 120 chars)..."}
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  required
                ></textarea>
              </div>
            </div>

            {/* Icebreakers */}
            <div className="icebreaker-section">
              <h3 className="subsection-title">
                <i className="fa-ice-cream fa-solid" style={{ marginRight: '8px' }}></i> 
                {lang === 'vi' ? 'Câu hỏi phá băng (Icebreaker)' : 'Icebreaker Questions'}
              </h3>
              <div className="form-row">
                <div className="form-group col-6">
                  <label>{t.checkinFormLooking}</label>
                  <div className="input-wrapper">
                    <i className="fa-magnifying-glass-plus fa-solid input-icon"></i>
                    <input 
                      type="text" 
                      placeholder={t.checkinFormLookingPlaceholder} 
                      value={looking}
                      onChange={(e) => setLooking(e.target.value)}
                    />
                  </div>
                </div>
                <div className="form-group col-6">
                  <label>{t.checkinFormHelp}</label>
                  <div className="input-wrapper">
                    <i className="fa-handshake-angle fa-solid input-icon"></i>
                    <input 
                      type="text" 
                      placeholder={t.checkinFormHelpPlaceholder} 
                      value={help}
                      onChange={(e) => setHelp(e.target.value)}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Contact details + Privacy */}
            <div className="contact-section">
              <h3 className="subsection-title">
                <span><i className="fa-solid fa-id-card"></i> {t.checkinFormPrivacy}</span>
                <span className="sub-label">
                  {lang === 'vi' ? 'Tích chọn bên phải để công khai thông tin' : 'Check the box on the right to make details public'}
                </span>
              </h3>
              
              <div className="contact-grid">
                
                {/* Phone */}
                <div className="contact-input-row">
                  <div className="input-wrapper">
                    <i className="fa-solid fa-phone input-icon"></i>
                    <input 
                      type="tel" 
                      placeholder={lang === 'vi' ? `Số điện thoại / Zalo${eventData.require_phone ? ' *' : ''}` : `Phone / Zalo${eventData.require_phone ? ' *' : ''}`}
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      required={eventData.require_phone}
                    />
                  </div>
                  <label className="privacy-toggle">
                    <input type="checkbox" checked={sharePhone} onChange={(e) => setSharePhone(e.target.checked)} />
                    <span className="toggle-slider"></span>
                    <span className="toggle-text" title={sharePhone ? t.checkinFormPrivacyPublic : t.checkinFormPrivacyPrivate}>
                      <i className={`fa-solid ${sharePhone ? 'fa-eye' : 'fa-eye-slash'}`}></i>
                    </span>
                  </label>
                </div>

                {/* Email */}
                <div className="contact-input-row">
                  <div className="input-wrapper">
                    <i className="fa-solid fa-envelope input-icon"></i>
                    <input 
                      type="email" 
                      placeholder="Email" 
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                    />
                  </div>
                  <label className="privacy-toggle">
                    <input type="checkbox" checked={shareEmail} onChange={(e) => setShareEmail(e.target.checked)} />
                    <span className="toggle-slider"></span>
                    <span className="toggle-text" title={shareEmail ? t.checkinFormPrivacyPublic : t.checkinFormPrivacyPrivate}>
                      <i className={`fa-solid ${shareEmail ? 'fa-eye' : 'fa-eye-slash'}`}></i>
                    </span>
                  </label>
                </div>

                {/* Telegram */}
                <div className="contact-input-row">
                  <div className="input-wrapper">
                    <i className="fa-brands fa-telegram input-icon"></i>
                    <input 
                      type="text" 
                      placeholder="Telegram username" 
                      value={telegram}
                      onChange={(e) => setTelegram(e.target.value)}
                    />
                  </div>
                  <label className="privacy-toggle">
                    <input type="checkbox" checked={shareTelegram} onChange={(e) => setShareTelegram(e.target.checked)} />
                    <span className="toggle-slider"></span>
                    <span className="toggle-text" title={shareTelegram ? t.checkinFormPrivacyPublic : t.checkinFormPrivacyPrivate}>
                      <i className={`fa-solid ${shareTelegram ? 'fa-eye' : 'fa-eye-slash'}`}></i>
                    </span>
                  </label>
                </div>

                {/* Facebook */}
                <div className="contact-input-row">
                  <div className="input-wrapper">
                    <i className="fa-brands fa-facebook input-icon"></i>
                    <input 
                      type="text" 
                      placeholder="Facebook URL" 
                      value={facebook}
                      onChange={(e) => setFacebook(e.target.value)}
                    />
                  </div>
                  <label className="privacy-toggle">
                    <input type="checkbox" checked={shareFacebook} onChange={(e) => setShareFacebook(e.target.checked)} />
                    <span className="toggle-slider"></span>
                    <span className="toggle-text" title={shareFacebook ? t.checkinFormPrivacyPublic : t.checkinFormPrivacyPrivate}>
                      <i className={`fa-solid ${shareFacebook ? 'fa-eye' : 'fa-eye-slash'}`}></i>
                    </span>
                  </label>
                </div>

                {/* LinkedIn */}
                <div className="contact-input-row">
                  <div className="input-wrapper">
                    <i className="fa-brands fa-linkedin input-icon"></i>
                    <input 
                      type="text" 
                      placeholder="LinkedIn profile URL" 
                      value={linkedin}
                      onChange={(e) => setLinkedin(e.target.value)}
                    />
                  </div>
                  <label className="privacy-toggle">
                    <input type="checkbox" checked={shareLinkedin} onChange={(e) => setShareLinkedin(e.target.checked)} />
                    <span className="toggle-slider"></span>
                    <span className="toggle-text" title={shareLinkedin ? t.checkinFormPrivacyPublic : t.checkinFormPrivacyPrivate}>
                      <i className={`fa-solid ${shareLinkedin ? 'fa-eye' : 'fa-eye-slash'}`}></i>
                    </span>
                  </label>
                </div>

                {/* Instagram */}
                <div className="contact-input-row">
                  <div className="input-wrapper">
                    <i className="fa-brands fa-instagram input-icon"></i>
                    <input 
                      type="text" 
                      placeholder="Instagram username" 
                      value={instagram}
                      onChange={(e) => setInstagram(e.target.value)}
                    />
                  </div>
                  <label className="privacy-toggle">
                    <input type="checkbox" checked={shareInstagram} onChange={(e) => setShareInstagram(e.target.checked)} />
                    <span className="toggle-slider"></span>
                    <span className="toggle-text" title={shareInstagram ? t.checkinFormPrivacyPublic : t.checkinFormPrivacyPrivate}>
                      <i className={`fa-solid ${shareInstagram ? 'fa-eye' : 'fa-eye-slash'}`}></i>
                    </span>
                  </label>
                </div>

              </div>
            </div>

            <button type="submit" className="btn btn-primary btn-glow" style={{ width: '100%', marginTop: '24px' }} disabled={submitting}>
              {submitting ? (
                <span><i className="fa-solid fa-spinner fa-spin"></i> {lang === 'vi' ? 'Đang gửi...' : 'Submitting...'}</span>
              ) : (
                <span><i className="fa-solid fa-circle-check"></i> {t.checkinFormSubmit}</span>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

export default GuestCheckin;
