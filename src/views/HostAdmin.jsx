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

function HostAdmin() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const [eventData, setEventData] = useState(null);
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
  const [eventType, setEventType] = useState('offline');
  const [meetingLink, setMeetingLink] = useState('');

  const t = getTranslations(lang);

  const handleLangToggle = () => {
    const newLang = lang === 'vi' ? 'en' : 'vi';
    setLanguage(newLang);
    setLang(newLang);
  };

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
      setTitle(event.title);
      setDesc(event.description || '');
      setCheckinOpen(event.is_checkin_open);
      setRequirePhone(event.require_phone);
      setEventType(event.event_type || 'offline');
      setMeetingLink(event.meeting_link || '');

      const { data: list, error: listErr } = await eventService.getAttendees(event.id);
      if (!listErr && list) {
        setAttendeesList(list);
      }
      setLoading(false);
    }
    loadEventData();
  }, [slug, navigate, lang]);

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
      ...fieldUpdates
    };
    const { error } = await eventService.updateEvent(slug, finalUpdates);
    if (error) {
      alert((lang === 'vi' ? "Lỗi khi cập nhật thông tin: " : "Error updating details: ") + error.message);
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

  const handleKick = async (id, name) => {
    const confirmKick = confirm(lang === 'vi' ? `Bạn có chắc chắn muốn xóa thành viên "${name}" khỏi sự kiện không?` : `Are you sure you want to remove "${name}" from this event?`);
    if (!confirmKick) return;

    const { error } = await eventService.kickAttendee(id);
    if (!error) {
      setAttendeesList(prev => prev.filter(a => a.id !== id));
    } else {
      alert((lang === 'vi' ? "Lỗi khi xóa thành viên: " : "Error removing member: ") + error.message);
    }
  };

  const handleResetEvent = async () => {
    const confirmReset = confirm(lang === 'vi' ? "CẢNH BÁO:\nBạn có chắc chắn muốn xóa sạch toàn bộ danh sách check-in?\nThao tác này sẽ dọn dẹp sạch cả bảng và không thể phục hồi." : "WARNING:\nAre you sure you want to clear the entire check-in list?\nThis action will completely wipe the database table and cannot be undone.");
    if (!confirmReset) return;

    const { error } = await eventService.resetEvent(eventData.id);
    if (!error) {
      setAttendeesList([]);
    } else {
      alert((lang === 'vi' ? "Lỗi khi xóa sạch dữ liệu: " : "Error clearing data: ") + error.message);
    }
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

    // Prepend 'sep=,' so Excel overrides local regional separator settings
    let csvContent = 'sep=,\r\n' + (lang === 'vi'
      ? 'Họ tên,Vai trò,Bio,Đang tìm kiếm,Có thể giúp đỡ,Điện thoại/Zalo,Quyền SĐT,Email,Quyền Email,Telegram,Facebook,LinkedIn,Instagram,Thời gian Check-in\r\n'
      : 'Name,Role,Bio,Looking For,Can Help With,Phone/Zalo,Phone Privacy,Email,Email Privacy,Telegram,Facebook,LinkedIn,Instagram,Check-in Time\r\n');
    
    attendeesList.forEach(guest => {
      const escape = (val) => {
        if (val === null || val === undefined) return '';
        return `"${val.toString().replace(/"/g, '""')}"`;
      };

      const contactsObj = parseJsonField(guest.contacts);
      const privacyObj = parseJsonField(guest.privacy);
      
      const phone = contactsObj.phone || '';
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

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', color: 'var(--text-secondary)' }}>
        <h3><i className="fa-solid fa-spinner fa-spin" style={{ marginRight: '10px' }}></i> {lang === 'vi' ? 'Đang tải cấu hình Admin...' : 'Loading Admin config...'}</h3>
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
    </div>
  );
}

export default HostAdmin;
