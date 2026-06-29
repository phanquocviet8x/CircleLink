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

function EventDirectory() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const [eventData, setEventData] = useState(null);
  const [attendeesList, setAttendeesList] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Multilingual State
  const [lang, setLang] = useState(getLanguage());

  // Search & Filters State
  const [searchVal, setSearchVal] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [myCircleFilterActive, setMyCircleFilterActive] = useState(false);
  const [bookmarkedIds, setBookmarkedIds] = useState(new Set());

  // Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedGuest, setSelectedGuest] = useState(null);

  // Toast State
  const [toastMsg, setToastMsg] = useState('');
  const [toastType, setToastType] = useState('success');

  const t = getTranslations(lang);

  const handleLangToggle = () => {
    const newLang = lang === 'vi' ? 'en' : 'vi';
    setLanguage(newLang);
    setLang(newLang);
  };

  useEffect(() => {
    // Load local bookmarks from localStorage
    try {
      const saved = localStorage.getItem(`circlelink_bookmark_${slug}`);
      if (saved) {
        setBookmarkedIds(new Set(JSON.parse(saved)));
      }
    } catch (_) {}
  }, [slug]);

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

      const { data: list, error: listErr } = await eventService.getAttendees(event.id);
      if (!listErr && list) {
        setAttendeesList(list);
      }
      setLoading(false);
    }
    loadEventData();
  }, [slug, navigate, lang]);

  const showToast = (msg, type = 'success') => {
    setToastMsg(msg);
    setToastType(type);
    setTimeout(() => setToastMsg(''), 3000);
  };

  const toggleBookmark = (id, name) => {
    const next = new Set(bookmarkedIds);
    if (next.has(id)) {
      next.delete(id);
      showToast(lang === 'vi' ? `Đã xóa ${name} khỏi Circle` : `Removed ${name} from Circle`, 'info');
    } else {
      next.add(id);
      showToast(lang === 'vi' ? `Đã thêm ${name} vào Circle` : `Added ${name} to Circle`, 'success');
    }
    setBookmarkedIds(next);
    try {
      localStorage.setItem(`circlelink_bookmark_${slug}`, JSON.stringify(Array.from(next)));
    } catch (_) {}
  };

  const downloadVCard = (guest) => {
    const vCardData = buildVCardString(guest);
    const blob = new Blob([vCardData], { type: 'text/vcard;charset=utf-8;' });
    const filename = `${guest.name.replace(/\s+/g, '_')}.vcf`;
    
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    showToast(t.dirExportSuccess, 'success');
  };

  const buildVCardString = (guest) => {
    const lines = [
      'BEGIN:VCARD',
      'VERSION:3.0',
      `FN:${guest.name}`,
      `ORG:CircleLink - ${eventData?.title || 'Event'}`,
      `TITLE:${guest.role}`,
      `NOTE:Bio: ${guest.bio} | Seek: ${guest.looking} | Support: ${guest.help}`
    ];

    if (guest.contacts?.phone && guest.privacy?.phone) {
      lines.push(`TEL;TYPE=CELL:${guest.contacts.phone}`);
    }
    if (guest.contacts?.email && guest.privacy?.email) {
      lines.push(`EMAIL;TYPE=INTERNET:${guest.contacts.email}`);
    }
    
    // Social Links in note or URL fields if public
    const socials = [];
    if (guest.contacts?.telegram && guest.privacy?.telegram) socials.push(`Telegram: @${guest.contacts.telegram}`);
    if (guest.contacts?.facebook && guest.privacy?.facebook) socials.push(`Facebook: ${guest.contacts.facebook}`);
    if (guest.contacts?.linkedin && guest.privacy?.linkedin) socials.push(`LinkedIn: ${guest.contacts.linkedin}`);
    if (guest.contacts?.instagram && guest.privacy?.instagram) socials.push(`Instagram: ${guest.contacts.instagram}`);
    
    if (socials.length > 0) {
      lines.push(`NOTE;CHARSET=UTF-8:Bio: ${guest.bio} | Icebreakers: [Seek: ${guest.looking} | Support: ${guest.help}] | Socials: ${socials.join(', ')}`);
    }

    lines.push('END:VCARD');
    return lines.join('\r\n');
  };

  const downloadBulkVCards = () => {
    const targetList = myCircleFilterActive 
      ? filteredAttendees.filter(g => bookmarkedIds.has(g.id))
      : filteredAttendees;

    if (targetList.length === 0) return;

    const allVCardString = targetList.map(g => buildVCardString(g)).join('\r\n');
    const blob = new Blob([allVCardString], { type: 'text/vcard;charset=utf-8;' });
    const filename = `circlelink_contacts_${slug}_${Date.now()}.vcf`;
    
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    showToast(t.dirExportSuccess, 'success');
  };

  const openModal = (guest) => {
    setSelectedGuest(guest);
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setSelectedGuest(null);
  };

  // Perform filtration logic
  const filteredAttendees = attendeesList.filter(guest => {
    // 1. My Circle Filter
    if (myCircleFilterActive && !bookmarkedIds.has(guest.id)) {
      return false;
    }
    // 2. Role Filter
    if (roleFilter !== 'all' && guest.role !== roleFilter) {
      return false;
    }
    // 3. Search Query Filter
    if (searchVal.trim()) {
      const s = searchVal.toLowerCase();
      return (
        guest.name.toLowerCase().includes(s) ||
        guest.bio.toLowerCase().includes(s) ||
        guest.looking.toLowerCase().includes(s) ||
        guest.help.toLowerCase().includes(s) ||
        guest.role.toLowerCase().includes(s)
      );
    }
    return true;
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
          
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            {/* Language Switcher pill */}
            <button className="lang-toggle-btn" onClick={handleLangToggle}>
              <i className="fa-solid fa-globe" style={{ marginRight: '4px' }}></i>
              {lang === 'vi' ? 'EN' : 'VI'}
            </button>

            <Link to={`/checkin/${slug}`} className="btn btn-outline" style={{ padding: '8px 16px', fontSize: '13px', borderRadius: '20px' }}>
              <i className="fa-solid fa-user-plus"></i> {t.dirBtnCheckinForm}
            </Link>
          </div>
        </div>
      </header>

      <main className="app-container">
        
        {/* Search & Filters */}
        <div className="directory-control-panel glass">
          <div className="search-box">
            <i className="fa-solid fa-magnifying-glass search-icon"></i>
            <input 
              type="text" 
              placeholder={t.dirSearchPlaceholder}
              value={searchVal}
              onChange={(e) => setSearchVal(e.target.value)}
            />
            {searchVal && (
              <button className="clear-search-btn" style={{ display: 'block' }} onClick={() => setSearchVal('')}>
                <i className="fa-solid fa-circle-xmark"></i>
              </button>
            )}
          </div>

          <div className="quick-suggestions">
            <span style={{ color: 'var(--text-muted)', fontSize: '13px' }}><i className="fa-solid fa-tags"></i> {lang === 'vi' ? 'Gợi ý tìm kiếm:' : 'Suggestions:'}</span>
            {[
              { label: lang === 'vi' ? 'Tìm Co-founder' : 'Find Co-founder', query: 'co-founder' },
              { label: lang === 'vi' ? 'Tìm Developer' : 'Find Developer', query: 'developer' },
              { label: lang === 'vi' ? 'Tìm Designer' : 'Find Designer', query: 'designer' },
              { label: lang === 'vi' ? 'Tìm Nhà đầu tư' : 'Find Investor', query: 'investor' }
            ].map((item) => (
              <button 
                key={item.label}
                className="quick-suggest-btn"
                onClick={() => setSearchVal(item.query)}
              >
                {item.label}
              </button>
            ))}
          </div>

          <div className="filters-row">
            <div className="role-filters">
              {['all', 'Founder', 'Developer', 'Designer', 'Marketer', 'Investor', 'Other'].map((r) => (
                <button 
                  key={r}
                  className={`filter-chip ${roleFilter === r ? 'active' : ''}`}
                  onClick={() => setRoleFilter(r)}
                >
                  {r === 'all' ? t.dirFilterAll : r}
                </button>
              ))}
            </div>

            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
              <button 
                className={`btn-circle-toggle ${myCircleFilterActive ? 'active' : ''}`}
                onClick={() => setMyCircleFilterActive(!myCircleFilterActive)}
              >
                <i className="fa-solid fa-heart"></i>
                <span>{lang === 'vi' ? 'Vòng Tròn Của Tôi' : 'My Circle'}</span>
              </button>

              <button 
                className="btn btn-outline btn-download-all"
                onClick={downloadBulkVCards}
                disabled={filteredAttendees.length === 0}
                style={{
                  borderRadius: '20px',
                  padding: '8px 16px',
                  fontSize: '13px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  height: '36px',
                  border: '1px solid var(--border-color)',
                  background: 'rgba(255, 255, 255, 0.03)',
                  color: 'var(--text-secondary)',
                  cursor: 'pointer',
                  transition: 'all var(--transition-fast)'
                }}
              >
                <i className="fa-solid fa-file-arrow-down"></i>
                <span>{lang === 'vi' ? 'Xuất vCard' : 'Export vCard'} ({filteredAttendees.length})</span>
              </button>
            </div>
          </div>
        </div>

        {/* Directory Grid */}
        <div className="directory-grid">
          {filteredAttendees.length > 0 ? (
            filteredAttendees.map((guest) => {
              const av = avatarPresets[guest.avatar] || avatarPresets['avatar-1'];
              const isBookmarked = bookmarkedIds.has(guest.id);
              
              // Build shared contact indicators
              const shareable = [
                { key: 'phone', icon: 'fa-phone' },
                { key: 'email', icon: 'fa-envelope' },
                { key: 'telegram', icon: 'fa-telegram' },
                { key: 'facebook', icon: 'fa-facebook' },
                { key: 'linkedin', icon: 'fa-linkedin' },
                { key: 'instagram', icon: 'fa-instagram' }
              ];
              const sharedCount = shareable.filter(c => guest.contacts?.[c.key] && guest.privacy?.[c.key]);

              return (
                <div key={guest.id} className="profile-card glass" onClick={() => openModal(guest)}>
                  <button 
                    className={`bookmark-btn ${isBookmarked ? 'active' : ''}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleBookmark(guest.id, guest.name);
                    }}
                  >
                    <i className={isBookmarked ? 'fa-solid fa-heart active' : 'fa-regular fa-heart'}></i>
                  </button>

                  <div className="card-header-row">
                    <div className="card-avatar" style={{ background: av.style }}>
                      <i className={`fa-solid ${av.icon}`}></i>
                    </div>
                    <div className="card-identity">
                      <span className={`role-badge ${guest.role.toLowerCase()}`}>{guest.role}</span>
                      <span className="card-name">{guest.name}</span>
                    </div>
                  </div>

                  <p className="card-bio">{guest.bio}</p>

                  <div className="card-icebreakers">
                    <div className="card-icebreaker-item">
                      <span className="lbl">{t.dirCardLooking}:</span>
                      <span className="val" title={guest.looking}>{guest.looking}</span>
                    </div>
                    <div className="card-icebreaker-item">
                      <span className="lbl">{t.dirCardHelp}:</span>
                      <span className="val" title={guest.help}>{guest.help}</span>
                    </div>
                  </div>

                  <div className="card-footer-row">
                    <div className="card-contact-indicators">
                      {sharedCount.length > 0 ? (
                        sharedCount.map(c => (
                          <i key={c.key} className={`fa-solid ${c.icon} active`} title={`${c.key.toUpperCase()} Shared`}></i>
                        ))
                      ) : (
                        <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>{lang === 'vi' ? 'Không công khai' : 'Private'}</span>
                      )}
                    </div>
                    <button 
                      className="card-vcard-btn"
                      onClick={(e) => {
                        e.stopPropagation();
                        downloadVCard(guest);
                      }}
                    >
                      <i className="fa-solid fa-file-invoice"></i> vCard
                    </button>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="empty-directory" style={{ gridColumn: 'span 4' }}>
              <i className="fa-solid fa-address-book"></i>
              <h3>{t.dirNoResults}</h3>
              <p>{lang === 'vi' ? 'Thử thay đổi bộ lọc hoặc từ khóa tìm kiếm để tìm cộng sự.' : 'Try changing filters or search keywords to find partners.'}</p>
            </div>
          )}
        </div>

      </main>

      {/* Profile Detail Modal */}
      {modalOpen && selectedGuest && (() => {
        const av = avatarPresets[selectedGuest.avatar] || avatarPresets['avatar-1'];
        const isBookmarked = bookmarkedIds.has(selectedGuest.id);
        const contactDefs = [
          { key: 'phone', title: lang === 'vi' ? 'Điện thoại/Zalo' : 'Phone/Zalo', icon: 'fa-phone', class: 'phone-link', prefix: 'tel:' },
          { key: 'email', title: 'Email', icon: 'fa-envelope', class: 'email-link', prefix: 'mailto:' },
          { key: 'telegram', title: 'Telegram', icon: 'fa-telegram', class: 'tg-link', prefix: 'https://t.me/' },
          { key: 'facebook', title: 'Facebook', icon: 'fa-facebook', class: 'fb-link', prefix: '' },
          { key: 'linkedin', title: 'LinkedIn', icon: 'fa-linkedin', class: 'in-link', prefix: '' },
          { key: 'instagram', title: 'Instagram', icon: 'fa-instagram', class: 'ig-link', prefix: '' }
        ];
        const sharedContacts = contactDefs.filter(def => selectedGuest.contacts?.[def.key] && selectedGuest.privacy?.[def.key]);

        return (
          <div className="modal-overlay active" onClick={closeModal}>
            <div className="modal-card glass" onClick={(e) => e.stopPropagation()}>
              <button className="modal-close" onClick={closeModal}>&times;</button>
              
              <div className="modal-header-content">
                <div className="modal-avatar" style={{ background: av.style }}>
                  <i className={`fa-solid ${av.icon}`}></i>
                </div>
                <div className="modal-basic-info">
                  <span className={`role-badge ${selectedGuest.role.toLowerCase()}`}>{selectedGuest.role}</span>
                  <h2>{selectedGuest.name}</h2>
                  <p className="modal-bio">"{selectedGuest.bio}"</p>
                </div>
              </div>

              <div className="modal-body">
                <div className="modal-icebreakers">
                  <div className="icebreaker-box looking">
                    <div className="title"><i className="fa-solid fa-magnifying-glass"></i> {t.checkinFormLooking}</div>
                    <div className="text">{selectedGuest.looking}</div>
                  </div>
                  <div className="icebreaker-box offering">
                    <div className="title"><i className="fa-solid fa-circle-nodes"></i> {t.checkinFormHelp}</div>
                    <div className="text">{selectedGuest.help}</div>
                  </div>
                </div>

                <div className="modal-contacts">
                  <h3>{lang === 'vi' ? 'Thông tin liên hệ được chia sẻ' : 'Shared Contact Details'}</h3>
                  <div className="contact-links-grid">
                    {sharedContacts.length > 0 ? (
                      sharedContacts.map(def => {
                        const val = selectedGuest.contacts[def.key];
                        let url = val;
                        if (def.prefix) {
                          if (def.key === 'telegram') {
                            url = def.prefix + (val.startsWith('@') ? val.substring(1) : val);
                          } else {
                            url = def.prefix + val;
                          }
                        }
                        return (
                          <a key={def.key} href={url} target="_blank" rel="noopener noreferrer" className={`btn-contact-link ${def.class}`}>
                            <i className={`fa-solid ${def.icon}`}></i>
                            <span>{def.title}: {val}</span>
                          </a>
                        );
                      })
                    ) : (
                      <div style={{ gridColumn: 'span 2', textAlign: 'center', color: 'var(--text-muted)', padding: '20px 0' }}>
                        <i className="fa-solid fa-lock" style={{ fontSize: '20px', display: 'block', marginBottom: '8px' }}></i>
                        {lang === 'vi' ? 'Thành viên này chọn không chia sẻ công khai các kênh liên lạc.' : 'This member chose not to share any contact details publicly.'}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="modal-footer">
                <button 
                  className={`btn btn-outline ${isBookmarked ? 'active' : ''}`}
                  style={isBookmarked ? { color: 'var(--accent-pink)', borderColor: 'rgba(236, 72, 153, 0.4)' } : {}}
                  onClick={() => toggleBookmark(selectedGuest.id, selectedGuest.name)}
                >
                  <i className={isBookmarked ? 'fa-solid fa-heart' : 'fa-regular fa-heart'}></i>
                  {isBookmarked ? (lang === 'vi' ? ' Đã Lưu vào Circle' : ' Saved to Circle') : (lang === 'vi' ? ' Lưu vào Circle' : ' Save to Circle')}
                </button>
                <button className="btn btn-primary" onClick={() => downloadVCard(selectedGuest)}>
                  <i className="fa-solid fa-download"></i> {lang === 'vi' ? 'vCard (Danh bạ)' : 'vCard (Contacts)'}
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Toast Alert */}
      {toastMsg && (
        <div className="toast-container">
          <div className={`toast ${toastType}`}>
            {toastMsg}
          </div>
        </div>
      )}
    </div>
  );
}

export default EventDirectory;
