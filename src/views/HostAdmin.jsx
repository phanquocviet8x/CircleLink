import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { eventService } from '../services/eventService';
import Logo from '../components/Logo';
import { getTranslations, getLanguage, setLanguage } from '../services/translations';
import { supabase } from '../supabaseClient';

const avatarPresets = {
  'avatar-1': { icon: 'fa-user-astronaut', style: 'linear-gradient(135deg, #FF6B6B, #FF8E53)' },
  'avatar-2': { icon: 'fa-user-ninja', style: 'linear-gradient(135deg, #4E65FF, #92EFFD)' },
  'avatar-3': { icon: 'fa-user-tie', style: 'linear-gradient(135deg, #7F00FF, #E100FF)' },
  'avatar-4': { icon: 'fa-user-secret', style: 'linear-gradient(135deg, #11998e, #38ef7d)' },
  'avatar-5': { icon: 'fa-user-graduate', style: 'linear-gradient(135deg, #F9D423, #FF4E50)' },
  'avatar-6': { icon: 'fa-robot', style: 'linear-gradient(135deg, #8A2387, #E94057)' }
};

const formatDateTimeLocal = (dateStr) => {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return '';
  const offset = d.getTimezoneOffset() * 60000;
  return new Date(d.getTime() - offset).toISOString().slice(0, 16);
};

function HostAdmin() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const [eventData, setEventData] = useState(null);
  const [initialEventData, setInitialEventData] = useState(null);
  const [attendeesList, setAttendeesList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchVal, setSearchVal] = useState('');
  
  // Multilingual state
  const [lang, setLang] = useState(getLanguage());
  
  // Local state for settings form
  const [title, setTitle] = useState('');
  const [desc, setDesc] = useState('');
  const [checkinOpen, setCheckinOpen] = useState(true);
  const [requirePhone, setRequirePhone] = useState(false);
  const [isPremium, setIsPremium] = useState(false);
  const [eventType, setEventType] = useState('offline');
  const [meetingLink, setMeetingLink] = useState('');
  const [eventDate, setEventDate] = useState('');
  const [durationDays, setDurationDays] = useState(7);

  // Admin Token Verification State
  const [tokenInput, setTokenInput] = useState('');
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [checkingToken, setCheckingToken] = useState(true);
  const [tokenError, setTokenError] = useState('');
  const [verifying, setVerifying] = useState(false);

  const t = getTranslations(lang);

  useEffect(() => {
    async function loadEventData() {
      setLoading(true);
      const { data: event, error: eventErr } = await eventService.getEvent(slug);
      if (eventErr || !event) {
        alert(lang === 'vi' ? "Sự kiện không tồn tại!" : "Event not found!");
        navigate('/');
        return;
      }
      setEventData(event);
      setInitialEventData(event);
      setTitle(event.title);
      setDesc(event.description || '');
      setCheckinOpen(event.is_checkin_open);
      setRequirePhone(event.require_phone);
      setIsPremium(event.is_premium || false);
      setEventType(event.event_type || 'offline');
      setMeetingLink(event.meeting_link || '');
      setEventDate(formatDateTimeLocal(event.event_date));
      setDurationDays(event.duration_days || 7);

      let token = localStorage.getItem(`circlelink_admin_token_${slug}`);
      
      // If token not in localStorage, check if the authenticated user is the host and recover it
      if (!token && supabase) {
        try {
          const { data: { session } } = await supabase.auth.getSession();
          if (session && session.user && session.user.email) {
            const { data: myEvent } = await eventService.getMyHostedEvent(session.user.email);
            if (myEvent && myEvent.slug === slug && myEvent.admin_token) {
              token = myEvent.admin_token;
              localStorage.setItem(`circlelink_admin_token_${slug}`, token);
            }
          }
        } catch (err) {
          console.error("Failed to recover session or token:", err);
        }
      }

      if (token) {
        const { isValid } = await eventService.verifyAdminToken(slug, token);
        if (isValid) {
          setIsAuthorized(true);
          const { data: list, error: listErr } = await eventService.adminGetAttendees(event.id, slug);
          if (!listErr && list) {
            setAttendeesList(list);
          }
        }
      }
      setCheckingToken(false);
      setLoading(false);
    }
    loadEventData();
  }, [slug, navigate, lang]);

  const handleVerifyToken = async (e) => {
    e.preventDefault();
    if (!tokenInput.trim() || !eventData) return;
    setVerifying(true);
    setTokenError('');
    
    const { isValid } = await eventService.verifyAdminToken(slug, tokenInput.trim());
    setVerifying(false);
    
    if (isValid) {
      localStorage.setItem(`circlelink_admin_token_${slug}`, tokenInput.trim());
      setIsAuthorized(true);
      setLoading(true);
      const { data: list, error: listErr } = await eventService.adminGetAttendees(eventData.id, slug);
      if (!listErr && list) {
        setAttendeesList(list);
      }
      setLoading(false);
    } else {
      setTokenError(lang === 'vi' ? 'Token không hợp lệ, vui lòng thử lại!' : 'Invalid token, please try again!');
    }
  };

  // Subscribe to real-time check-ins to keep the admin list synced
  useEffect(() => {
    if (!eventData) return;

    const unsubscribe = eventService.subscribeToAttendees(
      eventData.id,
      (newAttendee) => {
        setAttendeesList(prev => {
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
      undefined,
      (updatedAttendee) => {
        setAttendeesList(prev => prev.map(a => a.id === updatedAttendee.id ? updatedAttendee : a));
      }
    );

    return () => {
      unsubscribe();
    };
  }, [eventData]);

  const handleUpdateDetails = async (fieldUpdates = {}) => {
    if (!title.trim()) return;
    const finalUpdates = {
      title: title.trim(),
      description: desc.trim(),
      event_type: eventType,
      meeting_link: eventType !== 'offline' ? meetingLink.trim() : '',
      event_date: eventDate ? new Date(eventDate).toISOString() : null,
      duration_days: Number(durationDays),
      ...fieldUpdates
    };
    const { error } = await eventService.updateEvent(slug, finalUpdates);
    if (error) {
      alert((lang === 'vi' ? "Lỗi khi cập nhật thông tin: " : "Error updating details: ") + error.message);
    } else {
      // Refresh eventData to show computed changes like expires_at
      const { data: updatedEvent } = await eventService.getEvent(slug);
      if (updatedEvent) {
        setEventData(updatedEvent);
      }
    }
  };

  const handleEventTypeChange = async (newType) => {
    setEventType(newType);
    await handleUpdateDetails({ event_type: newType });
  };

  const handleToggleCheckin = async (e) => {
    const val = e.target.checked;
    setCheckinOpen(val);
    const { error } = await eventService.updateEvent(slug, { is_checkin_open: val });
    if (error) {
      alert("Lỗi: " + error.message);
      setCheckinOpen(!val);
    }
  };

  const handleTogglePhone = async (e) => {
    const val = e.target.checked;
    setRequirePhone(val);
    const { error } = await eventService.updateEvent(slug, { require_phone: val });
    if (error) {
      alert("Lỗi: " + error.message);
      setRequirePhone(!val);
    }
  };

  const handleTogglePremium = async (val) => {
    setIsPremium(val);
    const { error } = await eventService.updateEvent(slug, { is_premium: val });
    if (error) {
      alert((lang === 'vi' ? "Lỗi cập nhật gói dịch vụ: " : "Error updating plan: ") + error.message);
      setIsPremium(!val);
    }
  };

  const handleKick = async (id, name) => {
    const confirmKick = confirm(lang === 'vi' ? `Bạn có chắc chắn muốn xóa thành viên "${name}" khỏi sự kiện không?` : `Are you sure you want to remove "${name}" from this event?`);
    if (!confirmKick) return;

    const { error } = await eventService.kickAttendee(id, slug);
    if (!error) {
      setAttendeesList(prev => prev.filter(a => a.id !== id));
    } else {
      alert((lang === 'vi' ? "Lỗi khi xóa thành viên: " : "Error removing member: ") + error.message);
    }
  };

  const handleResetEvent = async () => {
    const confirmReset = confirm(lang === 'vi' ? "CẢNH BÁO:\nBạn có chắc chắn muốn xóa sạch toàn bộ danh sách check-in?\nThao tác này sẽ dọn dẹp sạch cả bảng và không thể phục hồi." : "WARNING:\nAre you sure you want to clear the entire check-in list?\nThis action will completely wipe the database table and cannot be undone.");
    if (!confirmReset) return;

    const { error } = await eventService.resetEvent(eventData.id, slug);
    if (!error) {
      setAttendeesList([]);
    } else {
      alert((lang === 'vi' ? "Lỗi khi xóa sạch dữ liệu: " : "Error clearing data: ") + error.message);
    }
  };

  const handleRotateToken = async () => {
    const confirmRotate = confirm(
      lang === 'vi'
        ? "Tạo lại mã quản trị (admin token)?\nMọi liên kết/token đã chia sẻ trước đây sẽ NGỪNG hoạt động. Thiết bị hiện tại của bạn vẫn giữ quyền quản trị."
        : "Regenerate the admin token?\nAny previously shared token/link will STOP working. This device keeps admin access."
    );
    if (!confirmRotate) return;

    const { data, error } = await eventService.rotateAdminToken(slug);
    if (error) {
      alert((lang === 'vi' ? "Lỗi khi tạo lại token: " : "Error regenerating token: ") + error.message);
    } else {
      alert(
        (lang === 'vi' ? "Đã tạo mã quản trị mới:\n\n" : "New admin token generated:\n\n") + data +
        (lang === 'vi' ? "\n\nHãy lưu lại mã này ở nơi an toàn." : "\n\nStore it somewhere safe.")
      );
    }
  };

  const handleDeleteEvent = async () => {
    const confirmDelete = confirm(
      lang === 'vi'
        ? "🚨 CẢNH BÁO CỰC KỲ QUAN TRỌNG:\nBạn có chắc chắn muốn XÓA VĨNH VIỄN sự kiện này?\nMọi thông tin sự kiện cùng toàn bộ danh sách khách tham dự sẽ bị xóa sạch khỏi Supabase và không thể khôi phục lại."
        : "🚨 EXTREMELY IMPORTANT WARNING:\nAre you sure you want to PERMANENTLY DELETE this event?\nAll event information and guest list data will be completely wiped from Supabase and cannot be recovered."
    );
    if (!confirmDelete) return;

    const { error } = await eventService.deleteEvent(slug);
    if (error) {
      alert((lang === 'vi' ? "Lỗi khi xóa sự kiện: " : "Error deleting event: ") + error.message);
    } else {
      localStorage.removeItem(`circlelink_admin_token_${slug}`);
      alert(lang === 'vi' ? "Đã xóa sự kiện thành công!" : "Event deleted successfully!");
      navigate('/');
    }
  };

  const handleCreateNewEvent = async () => {
    if (!title.trim()) {
      alert(lang === 'vi' ? "Vui lòng nhập tên sự kiện!" : "Please enter the event name!");
      return;
    }

    const currentTitle = title.trim();
    const currentDesc = desc.trim();
    const currentEventType = eventType;
    const currentMeetingLink = currentEventType !== 'offline' ? meetingLink.trim() : '';

    const origTitle = initialEventData?.title || '';
    const origDesc = initialEventData?.description || '';
    const origEventType = initialEventData?.event_type || 'offline';
    const origMeetingLink = initialEventData?.meeting_link || '';
    const origEventDate = formatDateTimeLocal(initialEventData?.event_date);
    const origDurationDays = initialEventData?.duration_days || 7;

    const isDifferent =
      currentTitle !== origTitle ||
      currentDesc !== origDesc ||
      currentEventType !== origEventType ||
      (currentEventType !== 'offline' && currentMeetingLink !== origMeetingLink) ||
      eventDate !== origEventDate ||
      Number(durationDays) !== Number(origDurationDays);

    if (!isDifferent) {
      alert(lang === 'vi' ? "sự kiện đang tồn tại" : "sự kiện đang tồn tại");
      return;
    }

    const confirmMsg = lang === 'vi'
      ? "sự kiện đang có sẽ bị xoá và thay thế bằng sự kiện bạn mới nhập vào"
      : "sự kiện đang có sẽ bị xoá và thay thế bằng sự kiện bạn mới nhập vào";

    const proceed = confirm(confirmMsg);
    if (!proceed) return;

    setLoading(true);

    const hostEmail = eventData?.host_email || localStorage.getItem('circlelink_host_email') || '';

    // Delete the current event
    const { error: deleteErr } = await eventService.deleteEvent(slug);
    if (deleteErr) {
      alert((lang === 'vi' ? "Lỗi khi xóa sự kiện hiện tại: " : "Error deleting current event: ") + deleteErr.message);
      setLoading(false);
      return;
    }

    localStorage.removeItem(`circlelink_admin_token_${slug}`);

    // Generate new slug
    const newSlug = currentTitle
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // remove tone marks (Vietnamese)
      .replace(/[đĐ]/g, 'd')
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-');

    const newEventDate = eventDate ? new Date(eventDate).toISOString() : new Date().toISOString();
    const finalDurationDays = Number(durationDays) || 7;

    // Create the new event
    const { data: newEvent, error: createErr } = await eventService.createEvent(
      newSlug,
      currentTitle,
      currentDesc,
      hostEmail,
      currentEventType,
      currentMeetingLink,
      newEventDate,
      finalDurationDays
    );

    if (createErr) {
      const errMsg = createErr.message || '';
      if (errMsg.includes('SLUG_DATE_TAKEN')) {
        alert(lang === 'vi'
          ? "Đường dẫn sự kiện này đã được sử dụng cho một sự kiện khác trong hôm nay. Vui lòng đổi tên sự kiện khác."
          : "This event slug is already taken for today. Please choose a different event name.");
      } else {
        alert((lang === 'vi' ? "Lỗi khi tạo sự kiện mới: " : "Error creating new event: ") + errMsg);
      }
      navigate('/');
    } else if (newEvent) {
      if (newEvent.admin_token) {
        localStorage.setItem(`circlelink_admin_token_${newEvent.slug}`, newEvent.admin_token);
      }
      alert(lang === 'vi' ? "Đã tạo sự kiện mới thành công!" : "New event created successfully!");
      navigate(`/event/${newEvent.slug}/admin`);
    }
    setLoading(false);
  };

  const exportToCSV = () => {
    if (attendeesList.length === 0) {
      alert(lang === 'vi' ? "Danh sách trống. Không thể xuất file CSV." : "Check-in list is empty. Cannot export CSV.");
      return;
    }

    const parseJsonField = (field) => {
      if (!field) return {};
      if (typeof field === 'object') return field;
      try {
        return JSON.parse(field);
      } catch (_) {
        return {};
      }
    };

    let csvContent = lang === 'vi'
      ? 'Họ tên,Vai trò,Bio,Đang tìm kiếm,Có thể giúp đỡ,Điện thoại/Zalo,Quyền SĐT,Email,Quyền Email,Telegram,Facebook,LinkedIn,Instagram,Thời gian Check-in\r\n'
      : 'Name,Role,Bio,Looking For,Can Help With,Phone/Zalo,Phone Privacy,Email,Email Privacy,Telegram,Facebook,LinkedIn,Instagram,Check-in Time\r\n';
    
    attendeesList.forEach(guest => {
      const escape = (val) => {
        if (val === null || val === undefined) return '';
        return `"${val.toString().replace(/"/g, '""')}"`;
      };

      const contactsObj = parseJsonField(guest.contacts);
      const privacyObj = parseJsonField(guest.privacy);
      
      const phone = contactsObj.phone ? `="${contactsObj.phone}"` : '';
      const email = contactsObj.email || '';
      const telegram = contactsObj.telegram || '';
      const facebook = contactsObj.facebook || '';
      const linkedin = contactsObj.linkedin || '';
      const instagram = contactsObj.instagram || '';

      const phonePrivacy = privacyObj.phone ? (lang === 'vi' ? 'Công khai' : 'Public') : (lang === 'vi' ? 'Riêng tư' : 'Private');
      const emailPrivacy = privacyObj.email ? (lang === 'vi' ? 'Công khai' : 'Public') : (lang === 'vi' ? 'Riêng tư' : 'Private');
      
      const row = [
        escape(guest.name),
        escape(guest.role),
        escape(guest.bio),
        escape(guest.looking),
        escape(guest.help),
        escape(phone),
        escape(phonePrivacy),
        escape(email),
        escape(emailPrivacy),
        escape(telegram),
        escape(facebook),
        escape(linkedin),
        escape(instagram),
        escape(guest.created_at ? new Date(guest.created_at).toLocaleString() : '')
      ];
      
      csvContent += row.join(',') + '\r\n';
    });
    
    const BOM = '\uFEFF';
    const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });
    const filename = `checkin_list_${slug}_${Date.now()}.csv`;
    
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const downloadQRCode = () => {
    const checkinUrl = `${window.location.origin}${window.location.pathname}#/checkin/${slug}`;
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(checkinUrl)}&color=3b2a1e&bgcolor=fffdf9`;
    
    fetch(qrUrl)
      .then(resp => resp.blob())
      .then(blob => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `qrcode_circlelink_${slug}.png`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      })
      .catch(() => {
        window.open(qrUrl, '_blank');
      });
  };

  const handleLangToggle = () => {
    const newLang = lang === 'vi' ? 'en' : 'vi';
    setLanguage(newLang);
    setLang(newLang);
  };

  const handleLogout = () => {
    const confirmLogout = confirm(
      lang === 'vi' 
        ? 'Bạn có chắc chắn muốn đăng xuất khỏi quyền quản trị sự kiện này?' 
        : 'Are you sure you want to log out from this event admin?'
    );
    if (!confirmLogout) return;
    localStorage.removeItem(`circlelink_admin_token_${slug}`);
    setIsAuthorized(false);
  };

  if (loading || checkingToken) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', color: 'var(--text-secondary)' }}>
        <h3><i className="fa-solid fa-spinner fa-spin" style={{ marginRight: '10px' }}></i> {lang === 'vi' ? 'Đang tải cấu hình Admin...' : 'Loading Admin config...'}</h3>
      </div>
    );
  }

  if (!isAuthorized) {
    return (
      <div className="warm-theme" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', padding: '20px' }}>
        <div className="bg-blob blob-1"></div>
        <div className="bg-blob blob-2"></div>
        <div className="bg-blob blob-3"></div>
        
        <div className="glass host-card" style={{ maxWidth: '400px', width: '100%', padding: '30px', borderRadius: '16px', backdropFilter: 'blur(20px)' }}>
          <div style={{ textAlign: 'center', marginBottom: '24px' }}>
            <Logo variant={1} showText={true} size={40} />
            <h3 style={{ marginTop: '20px', color: 'var(--text-primary)' }}>
              {lang === 'vi' ? 'Xác thực Quyền Admin' : 'Admin Authentication'}
            </h3>
            <p style={{ fontSize: '14px', color: 'var(--text-secondary)', marginTop: '8px' }}>
              {lang === 'vi' 
                ? `Vui lòng nhập Admin Token của sự kiện "${eventData?.title || slug}" để tiếp tục quản lý.`
                : `Please enter the Admin Token for "${eventData?.title || slug}" to continue.`}
            </p>
          </div>

          <form onSubmit={handleVerifyToken}>
            <div className="admin-settings-group" style={{ marginBottom: '20px' }}>
              <label>{lang === 'vi' ? 'Nhập Admin Token' : 'Enter Admin Token'}</label>
              <div className="input-wrapper">
                <i className="fa-solid fa-key input-icon"></i>
                <input 
                  type="password" 
                  placeholder="e.g. 550e8400-e29b-41d4-a716-446655440000"
                  value={tokenInput} 
                  onChange={(e) => setTokenInput(e.target.value)} 
                  required
                />
              </div>
              {tokenError && (
                <p style={{ color: '#ff6b6b', fontSize: '12px', marginTop: '8px' }}>
                  <i className="fa-solid fa-triangle-exclamation"></i> {tokenError}
                </p>
              )}
            </div>

            <button 
              type="submit" 
              className="btn btn-primary" 
              style={{ width: '100%', padding: '12px', justifyContent: 'center' }}
              disabled={verifying}
            >
              {verifying ? (
                <span><i className="fa-solid fa-spinner fa-spin"></i> {lang === 'vi' ? 'Đang xác minh...' : 'Verifying...'}</span>
              ) : (
                <span><i className="fa-solid fa-shield-halved"></i> {lang === 'vi' ? 'Xác minh Quyền Admin' : 'Verify Admin'}</span>
              )}
            </button>
          </form>

          <div style={{ marginTop: '20px', textAlign: 'center' }}>
            <Link to="/" style={{ color: 'var(--accent-warm)', textDecoration: 'none', fontSize: '14px' }}>
              <i className="fa-solid fa-arrow-left"></i> {lang === 'vi' ? 'Quay lại Trang chủ' : 'Back to Home'}
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const filteredList = attendeesList.filter(guest => {
    if (!searchVal) return true;
    const s = searchVal.toLowerCase();
    return guest.name.toLowerCase().includes(s) || guest.role.toLowerCase().includes(s);
  });

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
            {/* Language Switcher Button */}
            <button className="lang-toggle-btn" onClick={handleLangToggle}>
              <i className="fa-solid fa-globe" style={{ marginRight: '4px' }}></i>
              {lang === 'vi' ? 'EN' : 'VI'}
            </button>

            {isAuthorized && (
              <button 
                className="lang-toggle-btn" 
                onClick={handleLogout}
                style={{ 
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  border: '1px solid rgba(220, 38, 38, 0.3)',
                  color: '#ef4444',
                  background: 'rgba(220, 38, 38, 0.05)',
                  cursor: 'pointer'
                }}
              >
                <i className="fa-solid fa-right-from-bracket"></i>
                <span>{lang === 'vi' ? 'Đăng xuất' : 'Logout'}</span>
              </button>
            )}

            <nav className="nav-tabs" style={{ background: 'transparent', border: 'none', padding: 0 }}>
              <button className="nav-tab" onClick={() => navigate(`/event/${slug}`)}>
                <i className="fa-solid fa-desktop"></i>
                <span>{t.liveBoard}</span>
              </button>
              <button className="nav-tab active">
                <i className="fa-solid fa-sliders"></i>
                <span>{t.hostAdmin}</span>
              </button>
            </nav>
          </div>
        </div>
      </header>

      <main className="app-container">
        <div className="host-admin-dashboard" style={{ display: 'grid' }}>
          
          {/* Left: Configuration & Settings Form */}
          <div className="host-card admin-settings glass">
            <div className="admin-header-title">
              <h3><i className="fa-solid fa-gears"></i> {t.adminConfig}</h3>
              <p>{t.adminDesc}</p>
              {eventData && eventData.event_date && (
                <p style={{ fontSize: '12.5px', color: 'var(--text-muted)', lineHeight: '1.6', marginTop: '4px' }}>
                  <i className="fa-solid fa-calendar-day" style={{ marginRight: '6px' }}></i>
                  {t.adminEventDateLabel}: <strong>{new Date(eventData.event_date).toLocaleString(lang === 'vi' ? 'vi-VN' : 'en-US')}</strong>
                  {eventData.expires_at && (
                    <>
                      {' · '}
                      <i className="fa-solid fa-trash-can" style={{ margin: '0 6px 0 2px' }}></i>
                      {t.adminPurgeDateLabel}: <strong>{new Date(new Date(eventData.expires_at).getTime() + 24 * 60 * 60 * 1000).toLocaleString(lang === 'vi' ? 'vi-VN' : 'en-US')}</strong>
                    </>
                  )}
                </p>
              )}
            </div>

            <div className="admin-settings-group">
              <label>{t.adminNameLabel}</label>
              <div className="input-wrapper">
                <i className="fa-solid fa-heading input-icon"></i>
                <input 
                  type="text" 
                  value={title} 
                  onChange={(e) => setTitle(e.target.value)} 
                  onBlur={handleUpdateDetails}
                />
              </div>
            </div>

            <div className="admin-settings-group">
              <label>{t.adminDescLabel}</label>
              <div className="input-wrapper">
                <i className="fa-solid fa-align-left input-icon"></i>
                <input 
                  type="text" 
                  value={desc} 
                  onChange={(e) => setDesc(e.target.value)} 
                  onBlur={() => handleUpdateDetails()}
                />
              </div>
            </div>

            <div className="admin-settings-group">
              <label>{t.formEventDateLabel}</label>
              <div className="input-wrapper">
                <i className="fa-solid fa-calendar-days input-icon"></i>
                <input 
                  type="datetime-local" 
                  value={eventDate} 
                  onChange={(e) => setEventDate(e.target.value)} 
                  onBlur={() => handleUpdateDetails({ event_date: eventDate })}
                />
              </div>
            </div>

            <div className="admin-settings-group">
              <label>{t.formDurationLabel}</label>
              <div className="input-wrapper">
                <i className="fa-solid fa-hourglass-half input-icon"></i>
                <select 
                  value={durationDays} 
                  onChange={async (e) => {
                    const val = Number(e.target.value);
                    setDurationDays(val);
                    await handleUpdateDetails({ duration_days: val });
                  }}
                >
                  <option value="1">{t.formDuration1Day}</option>
                  <option value="3">{t.formDuration3Days}</option>
                  <option value="7">{t.formDuration7Days}</option>
                  <option value="30">{t.formDuration30Days}</option>
                </select>
              </div>
            </div>

            <div className="admin-settings-group">
              <label>{t.eventTypeLabel}</label>
              <div style={{ display: 'flex', gap: '8px', marginTop: '6px', flexWrap: 'wrap' }}>
                <button 
                  type="button"
                  className={`filter-chip ${eventType === 'offline' ? 'active' : ''}`}
                  onClick={() => handleEventTypeChange('offline')}
                  style={{ 
                    flex: 1, 
                    padding: '8px 12px', 
                    fontSize: '12px',
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                    cursor: 'pointer',
                    borderRadius: '20px',
                    transition: 'all 0.2s',
                    border: eventType === 'offline' ? '1px solid rgba(59, 42, 30, 0.3)' : '1px solid rgba(59, 42, 30, 0.08)',
                    background: eventType === 'offline' ? 'rgba(59, 42, 30, 0.12)' : 'rgba(59, 42, 30, 0.03)',
                    color: eventType === 'offline' ? '#3b2a1e' : 'rgba(59, 42, 30, 0.6)',
                    fontWeight: eventType === 'offline' ? 'bold' : 'normal'
                  }}
                >
                  <i className="fa-solid fa-people-group"></i> 
                  <span>{t.eventTypeOffline}</span>
                </button>
                <button 
                  type="button"
                  className={`filter-chip ${eventType === 'online' ? 'active' : ''}`}
                  onClick={() => handleEventTypeChange('online')}
                  style={{ 
                    flex: 1, 
                    padding: '8px 12px', 
                    fontSize: '12px',
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                    cursor: 'pointer',
                    borderRadius: '20px',
                    transition: 'all 0.2s',
                    border: eventType === 'online' ? '1px solid rgba(59, 42, 30, 0.3)' : '1px solid rgba(59, 42, 30, 0.08)',
                    background: eventType === 'online' ? 'rgba(59, 42, 30, 0.12)' : 'rgba(59, 42, 30, 0.03)',
                    color: eventType === 'online' ? '#3b2a1e' : 'rgba(59, 42, 30, 0.6)',
                    fontWeight: eventType === 'online' ? 'bold' : 'normal'
                  }}
                >
                  <i className="fa-solid fa-video"></i> 
                  <span>{t.eventTypeOnline}</span>
                </button>
                <button 
                  type="button"
                  className={`filter-chip ${eventType === 'hybrid' ? 'active' : ''}`}
                  onClick={() => handleEventTypeChange('hybrid')}
                  style={{ 
                    flex: 1, 
                    padding: '8px 12px', 
                    fontSize: '12px',
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                    cursor: 'pointer',
                    borderRadius: '20px',
                    transition: 'all 0.2s',
                    border: eventType === 'hybrid' ? '1px solid rgba(59, 42, 30, 0.3)' : '1px solid rgba(59, 42, 30, 0.08)',
                    background: eventType === 'hybrid' ? 'rgba(59, 42, 30, 0.12)' : 'rgba(59, 42, 30, 0.03)',
                    color: eventType === 'hybrid' ? '#3b2a1e' : 'rgba(59, 42, 30, 0.6)',
                    fontWeight: eventType === 'hybrid' ? 'bold' : 'normal'
                  }}
                >
                  <i className="fa-solid fa-circle-nodes"></i> 
                  <span>{t.eventTypeHybrid}</span>
                </button>
              </div>
            </div>

            {eventType !== 'offline' && (
              <div className="admin-settings-group" style={{ animation: 'fadeIn 0.3s ease' }}>
                <label>{t.meetingLinkLabel}</label>
                <div className="input-wrapper">
                  <i className="fa-solid fa-globe input-icon"></i>
                  <input 
                    type="url" 
                    placeholder={t.meetingLinkPlaceholder}
                    value={meetingLink} 
                    onChange={(e) => setMeetingLink(e.target.value)} 
                    onBlur={() => handleUpdateDetails({ meeting_link: meetingLink.trim() })}
                  />
                </div>
              </div>
            )}

            <div style={{ marginTop: '20px', marginBottom: '20px' }}>
              <button 
                type="button"
                onClick={handleCreateNewEvent} 
                className="btn btn-primary"
                style={{ 
                  width: '100%', 
                  padding: '12px', 
                  justifyContent: 'center',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  fontWeight: 'bold'
                }}
              >
                <i className="fa-solid fa-plus-circle"></i> 
                <span>{lang === 'vi' ? 'Tạo sự kiện mới' : 'Create new event'}</span>
              </button>
            </div>

            <div className="admin-settings-group" style={{ borderTop: '1px solid rgba(59, 42, 30, 0.08)', paddingTop: '16px' }}>
              <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span>{t.planLabel}</span>
                <span className={`plan-badge ${isPremium ? 'premium' : 'free'}`} style={{
                  padding: '2px 8px',
                  borderRadius: '12px',
                  fontSize: '10px',
                  fontWeight: 'bold',
                  textTransform: 'uppercase',
                  background: isPremium ? 'linear-gradient(135deg, #f59e0b, #d97706)' : 'rgba(59, 42, 30, 0.1)',
                  color: isPremium ? '#fff' : 'rgba(59, 42, 30, 0.6)'
                }}>
                  {isPremium ? t.planPremiumBadge : t.planFreeBadge}
                </span>
              </label>
              <div style={{ display: 'flex', gap: '8px', marginTop: '6px' }}>
                <button 
                  type="button"
                  className={`filter-chip ${!isPremium ? 'active' : ''}`}
                  onClick={() => handleTogglePremium(false)}
                  style={{ 
                    flex: 1, 
                    padding: '8px 12px', 
                    fontSize: '12px',
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                    cursor: 'pointer',
                    borderRadius: '20px',
                    transition: 'all 0.2s',
                    border: !isPremium ? '1px solid rgba(59, 42, 30, 0.3)' : '1px solid rgba(59, 42, 30, 0.08)',
                    background: !isPremium ? 'rgba(59, 42, 30, 0.12)' : 'rgba(59, 42, 30, 0.03)',
                    color: !isPremium ? '#3b2a1e' : 'rgba(59, 42, 30, 0.6)',
                    fontWeight: !isPremium ? 'bold' : 'normal'
                  }}
                >
                  <i className="fa-solid fa-leaf"></i> 
                  <span>{t.planFree}</span>
                </button>
                <button 
                  type="button"
                  className={`filter-chip ${isPremium ? 'active' : ''}`}
                  onClick={() => handleTogglePremium(true)}
                  style={{ 
                    flex: 1, 
                    padding: '8px 12px', 
                    fontSize: '12px',
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                    cursor: 'pointer',
                    borderRadius: '20px',
                    transition: 'all 0.2s',
                    border: isPremium ? '1px solid #d97706' : '1px solid rgba(59, 42, 30, 0.08)',
                    background: isPremium ? 'linear-gradient(135deg, rgba(245, 158, 11, 0.15), rgba(217, 119, 6, 0.15))' : 'rgba(59, 42, 30, 0.03)',
                    color: isPremium ? '#d97706' : 'rgba(59, 42, 30, 0.6)',
                    fontWeight: isPremium ? 'bold' : 'normal',
                    boxShadow: isPremium ? '0 0 10px rgba(245, 158, 11, 0.1)' : 'none'
                  }}
                >
                  <i className="fa-solid fa-crown"></i> 
                  <span>{t.planPremium}</span>
                </button>
              </div>
              {!isPremium && (
                <p style={{ fontSize: '11px', color: '#d97706', marginTop: '6px', marginBottom: 0, display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <i className="fa-solid fa-triangle-exclamation"></i>
                  <span>{t.planUpgradePrompt}</span>
                </p>
              )}
            </div>

            <div className="admin-settings-switches">
              <div className="admin-switch-row">
                <div className="switch-info">
                  <span className="switch-label">{t.adminGateOpen}</span>
                  <span className="switch-desc">
                    {lang === 'vi' ? 'Cho phép khách mời quét QR và gửi profile' : 'Allow guests to scan QR and submit profiles'}
                  </span>
                </div>
                <label className="privacy-toggle">
                  <input type="checkbox" checked={checkinOpen} onChange={handleToggleCheckin} />
                  <span className="toggle-slider"></span>
                  <span className="toggle-text"><i className="fa-solid fa-power-off"></i></span>
                </label>
              </div>

              <div className="admin-switch-row">
                <div className="switch-info">
                  <span className="switch-label">{t.adminRequirePhone}</span>
                  <span className="switch-desc">
                    {lang === 'vi' ? 'Yêu cầu SĐT ở form check-in để liên lạc' : 'Require phone numbers in the check-in form'}
                  </span>
                </div>
                <label className="privacy-toggle">
                  <input type="checkbox" checked={requirePhone} onChange={handleTogglePhone} />
                  <span className="toggle-slider"></span>
                  <span className="toggle-text"><i className="fa-solid fa-exclamation"></i></span>
                </label>
              </div>
            </div>

            <div className="admin-data-actions">
              <h4>{lang === 'vi' ? 'Xuất báo cáo & Dữ liệu' : 'Export Reports & Data'}</h4>
              <div className="data-buttons-grid">
                <button onClick={exportToCSV} className="btn btn-secondary">
                  <i className="fa-solid fa-file-csv"></i> {t.adminBtnExport}
                </button>
                <button onClick={downloadQRCode} className="btn btn-outline">
                  <i className="fa-solid fa-download"></i> {t.adminBtnDownloadQR}
                </button>
              </div>
              <button onClick={handleResetEvent} className="btn btn-outline btn-reset-danger">
                <i className="fa-solid fa-trash-can"></i> {lang === 'vi' ? 'Xóa toàn bộ khách check-in' : 'Clear all checked-in guests'}
              </button>
            </div>
            
            {/* Security: Rotate admin token */}
            <div className="glass" style={{ padding: '20px', borderRadius: '16px', marginTop: '24px' }}>
              <h4 style={{ fontFamily: 'var(--font-heading)', fontWeight: '700', marginBottom: '8px', fontSize: '15px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <i className="fa-solid fa-key"></i>
                {lang === 'vi' ? 'Bảo mật: Mã quản trị' : 'Security: Admin Token'}
              </h4>
              <p style={{ color: 'var(--text-secondary)', fontSize: '12.5px', marginBottom: '16px', lineHeight: '1.4' }}>
                {lang === 'vi' ? 'Nếu mã quản trị bị lộ, hãy tạo lại. Mọi token/liên kết đã chia sẻ trước đó sẽ ngừng hoạt động; thiết bị này vẫn giữ quyền quản trị.' : 'If your admin token is exposed, regenerate it. Any previously shared token/link stops working; this device keeps admin access.'}
              </p>
              <button onClick={handleRotateToken} className="btn btn-outline" style={{ width: '100%', fontWeight: 'bold' }}>
                <i className="fa-solid fa-rotate"></i> {lang === 'vi' ? 'Tạo lại mã quản trị' : 'Regenerate admin token'}
              </button>
            </div>

            {/* Danger Zone: Delete Event */}
            <div className="glass" style={{ padding: '20px', borderRadius: '16px', marginTop: '24px', background: 'rgba(220, 38, 38, 0.02)', border: '1px solid rgba(220, 38, 38, 0.15)' }}>
              <h4 style={{ fontFamily: 'var(--font-heading)', fontWeight: '700', marginBottom: '8px', color: '#ef4444', fontSize: '15px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <i className="fa-solid fa-triangle-exclamation"></i>
                {lang === 'vi' ? 'Vùng nguy hiểm: Xóa sự kiện' : 'Danger Zone: Delete Event'}
              </h4>
              <p style={{ color: 'var(--text-secondary)', fontSize: '12.5px', marginBottom: '16px', lineHeight: '1.4' }}>
                {lang === 'vi' ? 'Hành động này sẽ xóa vĩnh viễn sự kiện và toàn bộ danh sách check-in khỏi cơ sở dữ liệu Supabase. Tất cả dữ liệu sẽ mất hoàn toàn và không thể khôi phục.' : 'This will permanently delete the event and all guest check-in records from the Supabase database. All data will be lost and cannot be recovered.'}
              </p>
              <button onClick={handleDeleteEvent} className="btn" style={{ background: 'linear-gradient(135deg, #ef4444, #b91c1c)', color: '#fff', width: '100%', fontWeight: 'bold' }}>
                <i className="fa-solid fa-trash-arrow-up"></i> {lang === 'vi' ? 'XÓA VĨNH VIỄN SỰ KIỆN NÀY' : 'DELETE THIS EVENT PERMANENTLY'}
              </button>
            </div>
          </div>

          {/* Right: Moderation List */}
          <div className="host-card admin-moderation glass">
            <div className="section-title-bar">
              <h3><i className="fa-solid fa-users-gear"></i> {lang === 'vi' ? 'Kiểm duyệt thành viên' : 'Moderate Members'}</h3>
              <div className="stat-badge">
                <span>{filteredList.length}</span> {lang === 'vi' ? 'đã check-in' : 'checked-in'}
              </div>
            </div>

            <div className="admin-search-box">
              <i className="fa-solid fa-magnifying-glass"></i>
              <input 
                type="text" 
                placeholder={t.adminSearchPlaceholder} 
                value={searchVal}
                onChange={(e) => setSearchVal(e.target.value)}
              />
            </div>

            <div className="moderation-table-wrapper">
              <table className="moderation-table">
                <thead>
                  <tr>
                    <th>{lang === 'vi' ? 'Thành viên' : 'Member'}</th>
                    <th>{lang === 'vi' ? 'Vai trò' : 'Role'}</th>
                    <th>{lang === 'vi' ? 'Thời gian' : 'Time'}</th>
                    <th style={{ textAlign: 'right' }}>{lang === 'vi' ? 'Hành động' : 'Actions'}</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredList.length > 0 ? (
                    filteredList.map((guest) => {
                      const av = avatarPresets[guest.avatar] || avatarPresets['avatar-1'];
                      const timeStr = guest.created_at 
                        ? new Date(guest.created_at).toLocaleTimeString(lang === 'vi' ? 'vi-VN' : 'en-US', { hour: '2-digit', minute: '2-digit' })
                        : '14:00';
                      return (
                        <tr key={guest.id}>
                          <td>
                            <div className="mod-member-cell">
                              <div className="mod-avatar" style={{ background: av.style }}>
                                <i className={`fa-solid ${av.icon}`}></i>
                              </div>
                              <span className="mod-name" title={guest.name}>{guest.name}</span>
                            </div>
                          </td>
                          <td>
                            <span className={`role-badge ${guest.role.toLowerCase()}`}>{guest.role}</span>
                          </td>
                          <td>
                            <span style={{ color: 'var(--text-secondary)' }}>{timeStr}</span>
                          </td>
                          <td style={{ textAlign: 'right' }}>
                            <button onClick={() => handleKick(guest.id, guest.name)} className="btn-kick">
                              <i className="fa-solid fa-user-xmark"></i> {t.adminTableKick}
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan="4" style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text-muted)' }}>
                        <i className="fa-solid fa-circle-info" style={{ fontSize: '20px', display: 'block', marginBottom: '8px' }}></i>
                        {lang === 'vi' ? 'Chưa có thành viên nào check-in hoặc khớp với tìm kiếm.' : 'No members checked in yet or matched your search.'}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
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

export default HostAdmin;
