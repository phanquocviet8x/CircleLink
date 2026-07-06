import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { eventService } from '../services/eventService';
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

function UserProfileSettings() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const [lang, setLang] = useState(getLanguage());
  const [loading, setLoading] = useState(true);
  const [eventData, setEventData] = useState(null);
  const [attendee, setAttendee] = useState(null);
  const [toastMsg, setToastMsg] = useState('');
  
  // Privacy checkboxes
  const [sharePhone, setSharePhone] = useState(true);
  const [shareEmail, setShareEmail] = useState(true);
  const [shareTelegram, setShareTelegram] = useState(true);
  const [shareFacebook, setShareFacebook] = useState(true);
  const [shareLinkedin, setShareLinkedin] = useState(true);
  const [shareInstagram, setShareInstagram] = useState(true);
  
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const t = getTranslations(lang);

  const handleLangToggle = () => {
    const newLang = lang === 'vi' ? 'en' : 'vi';
    setLanguage(newLang);
    setLang(newLang);
  };

  const showToast = (msg) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(''), 3000);
  };

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      const { data: event, error: eventErr } = await eventService.getEvent(slug);
      if (eventErr || !event) {
        alert(lang === 'vi' ? "Sự kiện không tồn tại!" : "Event not found!");
        navigate('/');
        return;
      }
      setEventData(event);

      const savedAttendeeId = localStorage.getItem(`circlelink_attendee_id_${slug}`);
      if (!savedAttendeeId) {
        // No check-in profile found on device, redirect to checkin form
        navigate(`/checkin/${slug}`);
        return;
      }

      const { data: att, error: attErr } = await eventService.getAttendee(savedAttendeeId);
      if (attErr || !att) {
        // Clean invalid attendee ID and redirect
        localStorage.removeItem(`circlelink_attendee_id_${slug}`);
        navigate(`/checkin/${slug}`);
        return;
      }

      setAttendee(att);
      
      // Load privacy settings
      if (att.privacy) {
        setSharePhone(att.privacy.phone !== false);
        setShareEmail(att.privacy.email !== false);
        setShareTelegram(att.privacy.telegram !== false);
        setShareFacebook(att.privacy.facebook !== false);
        setShareLinkedin(att.privacy.linkedin !== false);
        setShareInstagram(att.privacy.instagram !== false);
      }
      setLoading(false);
    }
    loadData();
  }, [slug, navigate, lang]);

  const handleSavePrivacy = async () => {
    if (!attendee) return;
    setSaving(true);
    
    const updatedPrivacy = {
      phone: sharePhone,
      email: shareEmail,
      telegram: shareTelegram,
      facebook: shareFacebook,
      linkedin: shareLinkedin,
      instagram: shareInstagram
    };

    const { data, error } = await eventService.updateAttendee(attendee.id, {
      privacy: updatedPrivacy
    });

    setSaving(false);
    if (error) {
      alert((lang === 'vi' ? "Lỗi khi lưu cài đặt: " : "Error saving settings: ") + error.message);
    } else {
      setAttendee(prev => ({ ...prev, privacy: updatedPrivacy }));
      showToast(lang === 'vi' ? "Đã cập nhật cài đặt riêng tư!" : "Privacy settings updated!");
    }
  };

  const handleDeleteProfile = async () => {
    if (!attendee) return;
    const confirmDelete = confirm(
      lang === 'vi'
        ? "⚠️ CẢNH BÁO QUAN TRỌNG:\nBạn có chắc chắn muốn XÓA HOÀN TOÀN thông tin check-in của mình khỏi sự kiện này?\nThông tin của bạn sẽ biến mất vĩnh viễn trên hệ thống và không thể hoàn tác."
        : "⚠️ IMPORTANT WARNING:\nAre you sure you want to PERMANENTLY DELETE your check-in information from this event?\nYour profile details will be removed forever and this action cannot be undone."
    );
    if (!confirmDelete) return;

    setDeleting(true);
    const { error } = await eventService.deleteAttendeeDirect(attendee.id);
    setDeleting(false);

    if (error) {
      alert((lang === 'vi' ? "Lỗi khi xóa tài khoản: " : "Error deleting profile: ") + error.message);
    } else {
      localStorage.removeItem(`circlelink_attendee_id_${slug}`);
      alert(lang === 'vi' ? "Đã xóa toàn bộ thông tin của bạn khỏi hệ thống thành công!" : "Successfully deleted all your check-in information!");
      navigate(`/directory/${slug}`);
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', color: 'var(--text-secondary)' }}>
        <h3><i className="fa-solid fa-spinner fa-spin" style={{ marginRight: '10px' }}></i> {lang === 'vi' ? 'Đang chuẩn bị thông tin hồ sơ...' : 'Preparing profile details...'}</h3>
      </div>
    );
  }

  const av = avatarPresets[attendee.avatar || 'avatar-1'] || avatarPresets['avatar-1'];
  const contacts = attendee.contacts || {};

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
            <Link to={`/directory/${slug}`} className="btn btn-outline" style={{ padding: '8px 16px', fontSize: '13px', borderRadius: '20px' }}>
              <i className="fa-solid fa-address-book"></i> {lang === 'vi' ? 'Xem Danh Bạ' : 'View Directory'}
            </Link>
          </div>
        </div>
      </header>

      <main className="app-container" style={{ margin: '100px auto 40px auto', maxWidth: '800px', padding: '0 20px' }}>
        <div className="glass" style={{ padding: '35px 25px', borderRadius: '24px' }}>
          
          {/* Header Title */}
          <div style={{ textAlign: 'center', marginBottom: '35px' }}>
            <span style={{ fontSize: '12px', color: 'var(--accent-pink)', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '1px' }}>
              {lang === 'vi' ? 'Cài đặt riêng tư & Bảo mật GDPR' : 'Privacy Settings & GDPR controls'}
            </span>
            <h2 style={{ fontFamily: 'var(--font-heading)', fontWeight: '800', marginTop: '6px', fontSize: '28px' }}>
              {lang === 'vi' ? 'Quản lý Hồ sơ Check-in' : 'Manage Check-in Profile'}
            </h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '14px', marginTop: '6px' }}>
              {lang === 'vi' ? 'Tự quản lý quyền riêng tư, ẩn/hiện hoặc xóa vĩnh viễn thông tin cá nhân của bạn khỏi dữ liệu sự kiện.' : 'Manage your sharing settings, hide/show details, or permanently remove your profile from the event database.'}
            </p>
          </div>

          {toastMsg && (
            <div style={{ position: 'fixed', bottom: '30px', right: '30px', background: 'var(--bg-dark)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', padding: '12px 24px', borderRadius: '12px', boxShadow: 'var(--shadow-lg)', zIndex: 1000 }}>
              {toastMsg}
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '30px' }}>
            
            {/* 1. Preview Card Info */}
            <div className="glass" style={{ padding: '24px', borderRadius: '16px', background: 'rgba(255, 255, 255, 0.01)', border: '1px solid rgba(255, 255, 255, 0.04)' }}>
              <h4 style={{ fontFamily: 'var(--font-heading)', fontWeight: '700', marginBottom: '15px', color: 'var(--text-primary)', fontSize: '15px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <i className="fa-solid fa-address-card" style={{ color: 'var(--accent-violet)' }}></i>
                {lang === 'vi' ? 'Hồ sơ hiện tại của bạn:' : 'Your active check-in profile:'}
              </h4>
              
              <div style={{ display: 'flex', gap: '16px', alignItems: 'center', flexWrap: 'wrap' }}>
                <div style={{ width: '60px', height: '60px', borderRadius: '50%', background: av.style, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: '24px' }}>
                  <i className={`fa-solid ${av.icon}`}></i>
                </div>
                <div>
                  <h3 style={{ margin: 0, fontWeight: '800', fontSize: '18px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    {attendee.name}
                    <span className={`role-badge ${attendee.role.toLowerCase()}`} style={{ fontSize: '11px', padding: '2px 8px' }}>{attendee.role}</span>
                  </h3>
                  <p style={{ margin: '4px 0 0 0', color: 'var(--text-secondary)', fontSize: '13px', fontStyle: 'italic' }}>"{attendee.bio}"</p>
                </div>
              </div>

              <div style={{ marginTop: '20px', display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                <Link to={`/checkin/${slug}?edit=true`} className="btn btn-outline" style={{ padding: '8px 16px', borderRadius: '20px', fontSize: '12.5px' }}>
                  <i className="fa-solid fa-pen-to-square"></i> {lang === 'vi' ? 'Chỉnh sửa Profile chi tiết' : 'Edit profile info'}
                </Link>
              </div>
            </div>

            {/* 2. Privacy controls */}
            <div className="glass" style={{ padding: '24px', borderRadius: '16px', background: 'rgba(255, 255, 255, 0.01)', border: '1px solid rgba(255, 255, 255, 0.04)' }}>
              <h4 style={{ fontFamily: 'var(--font-heading)', fontWeight: '700', marginBottom: '10px', color: 'var(--text-primary)', fontSize: '15px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <i className="fa-solid fa-user-shield" style={{ color: 'var(--accent-pink)' }}></i>
                {lang === 'vi' ? 'Cài đặt công khai thông tin liên hệ:' : 'Toggle Visibility of Contact Fields:'}
              </h4>
              <p style={{ color: 'var(--text-muted)', fontSize: '12.5px', marginBottom: '20px' }}>
                {lang === 'vi' ? 'Tích chọn (Bật) để công khai thông tin cho những người tham dự khác trong danh bạ sự kiện. Tắt đi sẽ để ở chế độ riêng tư.' : 'Toggle ON to display field publicly in the event directory. Toggle OFF to keep it hidden/private.'}
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                {/* Phone */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', borderRadius: '10px', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-color)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <i className="fa-solid fa-phone" style={{ color: 'var(--text-secondary)', width: '16px' }}></i>
                    <span style={{ fontSize: '13.5px' }}>{lang === 'vi' ? 'Số điện thoại / Zalo' : 'Phone / Zalo'}: <strong style={{ color: 'var(--text-secondary)' }}>{contacts.phone || (lang === 'vi' ? 'Chưa nhập' : 'Not added')}</strong></span>
                  </div>
                  <label className="privacy-toggle" style={{ margin: 0 }}>
                    <input type="checkbox" checked={sharePhone} disabled={!contacts.phone} onChange={(e) => setSharePhone(e.target.checked)} />
                    <span className="toggle-slider"></span>
                  </label>
                </div>

                {/* Email */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', borderRadius: '10px', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-color)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <i className="fa-solid fa-envelope" style={{ color: 'var(--text-secondary)', width: '16px' }}></i>
                    <span style={{ fontSize: '13.5px' }}>Email: <strong style={{ color: 'var(--text-secondary)' }}>{contacts.email || (lang === 'vi' ? 'Chưa nhập' : 'Not added')}</strong></span>
                  </div>
                  <label className="privacy-toggle" style={{ margin: 0 }}>
                    <input type="checkbox" checked={shareEmail} disabled={!contacts.email} onChange={(e) => setShareEmail(e.target.checked)} />
                    <span className="toggle-slider"></span>
                  </label>
                </div>

                {/* Telegram */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', borderRadius: '10px', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-color)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <i className="fa-brands fa-telegram" style={{ color: 'var(--text-secondary)', width: '16px' }}></i>
                    <span style={{ fontSize: '13.5px' }}>Telegram: <strong style={{ color: 'var(--text-secondary)' }}>{contacts.telegram || (lang === 'vi' ? 'Chưa nhập' : 'Not added')}</strong></span>
                  </div>
                  <label className="privacy-toggle" style={{ margin: 0 }}>
                    <input type="checkbox" checked={shareTelegram} disabled={!contacts.telegram} onChange={(e) => setShareTelegram(e.target.checked)} />
                    <span className="toggle-slider"></span>
                  </label>
                </div>

                {/* Facebook */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', borderRadius: '10px', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-color)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <i className="fa-brands fa-facebook" style={{ color: 'var(--text-secondary)', width: '16px' }}></i>
                    <span style={{ fontSize: '13.5px' }}>Facebook: <strong style={{ color: 'var(--text-secondary)' }}>{contacts.facebook || (lang === 'vi' ? 'Chưa nhập' : 'Not added')}</strong></span>
                  </div>
                  <label className="privacy-toggle" style={{ margin: 0 }}>
                    <input type="checkbox" checked={shareFacebook} disabled={!contacts.facebook} onChange={(e) => setShareFacebook(e.target.checked)} />
                    <span className="toggle-slider"></span>
                  </label>
                </div>

                {/* LinkedIn */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', borderRadius: '10px', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-color)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <i className="fa-brands fa-linkedin" style={{ color: 'var(--text-secondary)', width: '16px' }}></i>
                    <span style={{ fontSize: '13.5px' }}>LinkedIn: <strong style={{ color: 'var(--text-secondary)' }}>{contacts.linkedin || (lang === 'vi' ? 'Chưa nhập' : 'Not added')}</strong></span>
                  </div>
                  <label className="privacy-toggle" style={{ margin: 0 }}>
                    <input type="checkbox" checked={shareLinkedin} disabled={!contacts.linkedin} onChange={(e) => setShareLinkedin(e.target.checked)} />
                    <span className="toggle-slider"></span>
                  </label>
                </div>

                {/* Instagram */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', borderRadius: '10px', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-color)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <i className="fa-brands fa-instagram" style={{ color: 'var(--text-secondary)', width: '16px' }}></i>
                    <span style={{ fontSize: '13.5px' }}>Instagram: <strong style={{ color: 'var(--text-secondary)' }}>{contacts.instagram || (lang === 'vi' ? 'Chưa nhập' : 'Not added')}</strong></span>
                  </div>
                  <label className="privacy-toggle" style={{ margin: 0 }}>
                    <input type="checkbox" checked={shareInstagram} disabled={!contacts.instagram} onChange={(e) => setShareInstagram(e.target.checked)} />
                    <span className="toggle-slider"></span>
                  </label>
                </div>
              </div>

              <button onClick={handleSavePrivacy} disabled={saving} className="btn btn-primary" style={{ width: '100%', marginTop: '20px' }}>
                {saving ? (
                  <span><i className="fa-solid fa-spinner fa-spin"></i> {lang === 'vi' ? 'Đang lưu...' : 'Saving...'}</span>
                ) : (
                  <span><i className="fa-solid fa-floppy-disk"></i> {lang === 'vi' ? 'Lưu cấu hình riêng tư' : 'Save Privacy Options'}</span>
                )}
              </button>
            </div>

            {/* 3. Danger Zone (Delete user checkin info) */}
            <div className="glass" style={{ padding: '24px', borderRadius: '16px', background: 'rgba(220, 38, 38, 0.02)', border: '1px solid rgba(220, 38, 38, 0.15)' }}>
              <h4 style={{ fontFamily: 'var(--font-heading)', fontWeight: '700', marginBottom: '8px', color: '#ef4444', fontSize: '15px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <i className="fa-solid fa-triangle-exclamation"></i>
                {lang === 'vi' ? 'Vùng nguy hiểm: Xóa toàn bộ thông tin' : 'Danger Zone: Wipe All Profile Data'}
              </h4>
              <p style={{ color: 'var(--text-secondary)', fontSize: '12.5px', marginBottom: '16px', lineHeight: '1.5' }}>
                {lang === 'vi' ? 'Bạn có thể xóa toàn bộ dữ liệu check-in của mình khỏi sự kiện bất kỳ lúc nào. Sau khi xóa, bạn sẽ biến mất hoàn toàn khỏi danh bạ và các thiết bị trình chiếu. Hành động này không thể hoàn tác.' : 'You can delete your check-in registration from the database at any time. Once wiped, you will be completely removed from the directories and live boards. This action is permanent and cannot be undone.'}
              </p>

              <button onClick={handleDeleteProfile} disabled={deleting} className="btn" style={{ background: 'linear-gradient(135deg, #ef4444, #b91c1c)', color: '#fff', width: '100%', fontWeight: 'bold' }}>
                {deleting ? (
                  <span><i className="fa-solid fa-spinner fa-spin"></i> {lang === 'vi' ? 'Đang xóa...' : 'Wiping...'}</span>
                ) : (
                  <span><i className="fa-solid fa-user-slash"></i> {lang === 'vi' ? 'Xóa toàn bộ thông tin của tôi' : 'Delete all my information'}</span>
                )}
              </button>
            </div>

          </div>

          <div style={{ marginTop: '40px', borderTop: '1px solid var(--border-color)', paddingTop: '24px', display: 'flex', justifyContent: 'center' }}>
            <Link to={`/directory/${slug}`} className="btn btn-outline" style={{ textDecoration: 'none' }}>
              <i className="fa-solid fa-arrow-left"></i> {lang === 'vi' ? 'Quay lại danh bạ' : 'Back to Directory'}
            </Link>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer style={{ textAlign: 'center', padding: '24px 0 40px 0', borderTop: '1px solid var(--border-color)', marginTop: '40px', width: '100%' }}>
        <div style={{ display: 'flex', justifyContent: 'center', gap: '20px', marginBottom: '10px', fontSize: '13px' }}>
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

export default UserProfileSettings;
