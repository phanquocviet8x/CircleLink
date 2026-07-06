import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import Logo from '../components/Logo';
import { getTranslations, getLanguage, setLanguage } from '../services/translations';

function TermsOfService() {
  const [lang, setLang] = useState(getLanguage());
  const t = getTranslations(lang);

  const handleLangToggle = () => {
    const newLang = lang === 'vi' ? 'en' : 'vi';
    setLanguage(newLang);
    setLang(newLang);
  };

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

      <div className="app-container" style={{ margin: '100px auto 40px auto', maxWidth: '800px', padding: '0 20px' }}>
        <div className="glass" style={{ padding: '40px 30px', borderRadius: '24px' }}>
          <div style={{ textAlign: 'center', marginBottom: '30px' }}>
            <span style={{ fontSize: '12px', color: 'var(--accent-violet)', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '1px' }}>
              CircleLink Legal
            </span>
            <h1 style={{ fontFamily: 'var(--font-heading)', fontWeight: '800', marginTop: '10px', fontSize: '2.5rem', background: 'var(--grad-primary)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              {t.legalTerms}
            </h1>
            <p style={{ color: 'var(--text-secondary)', marginTop: '8px' }}>
              {lang === 'vi' ? 'Cập nhật lần cuối: Ngày 6 tháng 7 năm 2026' : 'Last updated: July 6, 2026'}
            </p>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', color: 'var(--text-primary)', fontSize: '15px', lineHeight: '1.7' }}>
            {lang === 'vi' ? (
              <>
                <section>
                  <h3 style={{ color: 'var(--accent-violet)', marginBottom: '8px', fontFamily: 'var(--font-heading)' }}>1. Chấp thuận điều khoản</h3>
                  <p>Bằng cách truy cập, đăng ký hoặc sử dụng dịch vụ CircleLink, bạn đồng ý tuân thủ và bị ràng buộc bởi các Điều khoản dịch vụ này. Nếu bạn không đồng ý với bất kỳ phần nào của các điều khoản này, vui lòng không sử dụng dịch vụ của chúng tôi.</p>
                </section>

                <section>
                  <h3 style={{ color: 'var(--accent-violet)', marginBottom: '8px', fontFamily: 'var(--font-heading)' }}>2. Mô tả dịch vụ</h3>
                  <p>CircleLink cung cấp giải pháp check-in sự kiện trực tiếp, chia sẻ profile cá nhân thời gian thực và quản lý danh bạ sự kiện. Dịch vụ hỗ trợ cả chế độ lưu trữ cục bộ (Local Storage) và đồng bộ qua cơ sở dữ liệu đám mây Supabase.</p>
                </section>

                <section>
                  <h3 style={{ color: 'var(--accent-violet)', marginBottom: '8px', fontFamily: 'var(--font-heading)' }}>3. Quyền và Trách nhiệm của Người dùng</h3>
                  <ul style={{ paddingLeft: '20px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <li>Bạn phải cung cấp thông tin chính xác, trung thực khi điền form check-in hoặc tạo tài khoản sự kiện.</li>
                    <li>Không sử dụng dịch vụ cho bất kỳ mục đích bất hợp pháp nào hoặc vi phạm pháp luật hiện hành.</li>
                    <li>Không được tải lên hoặc phát tán bất kỳ nội dung độc hại, lừa đảo, xúc phạm hoặc giả mạo danh tính của người khác.</li>
                    <li>Bạn tự chịu trách nhiệm bảo mật thiết bị cá nhân của mình để bảo vệ dữ liệu check-in đã lưu trữ.</li>
                  </ul>
                </section>

                <section>
                  <h3 style={{ color: 'var(--accent-violet)', marginBottom: '8px', fontFamily: 'var(--font-heading)' }}>4. Quyền sở hữu và Giới hạn trách nhiệm</h3>
                  <p>CircleLink đóng vai trò là nền tảng kết nối trung gian. Chúng tôi không chịu trách nhiệm đối với các tương tác, giao dịch hoặc tranh chấp phát sinh giữa những người tham dự sự kiện ngoài đời thực hoặc trực tuyến.</p>
                  <p style={{ marginTop: '8px' }}>Chúng tôi có quyền tạm ngừng hoặc chấm dứt quyền truy cập của bất kỳ người dùng nào vi phạm các quy định này mà không cần thông báo trước.</p>
                </section>

                <section>
                  <h3 style={{ color: 'var(--accent-violet)', marginBottom: '8px', fontFamily: 'var(--font-heading)' }}>5. Thay đổi Điều khoản</h3>
                  <p>Chúng tôi có thể cập nhật các Điều khoản dịch vụ này bất kỳ lúc nào. Việc tiếp tục sử dụng dịch vụ sau khi có các thay đổi đồng nghĩa với việc bạn chấp nhận các điều khoản mới.</p>
                </section>
              </>
            ) : (
              <>
                <section>
                  <h3 style={{ color: 'var(--accent-violet)', marginBottom: '8px', fontFamily: 'var(--font-heading)' }}>1. Acceptance of Terms</h3>
                  <p>By accessing, registering, or using CircleLink, you agree to comply with and be bound by these Terms of Service. If you do not agree to any part of these terms, please do not use our service.</p>
                </section>

                <section>
                  <h3 style={{ color: 'var(--accent-violet)', marginBottom: '8px', fontFamily: 'var(--font-heading)' }}>2. Description of Service</h3>
                  <p>CircleLink is an in-event check-in, real-time profile sharing, and event directory solution. The application operates in dual-mode supporting local browser storage as well as cloud-sync via Supabase.</p>
                </section>

                <section>
                  <h3 style={{ color: 'var(--accent-violet)', marginBottom: '8px', fontFamily: 'var(--font-heading)' }}>3. User Rights and Obligations</h3>
                  <ul style={{ paddingLeft: '20px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <li>You must provide accurate and truthful information when completing the check-in form or creating an event.</li>
                    <li>You agree not to use the service for any illegal purposes or in violation of applicable laws.</li>
                    <li>You must not upload or distribute malicious, fraudulent, offensive, or impersonated identity content.</li>
                    <li>You are responsible for securing your personal device to protect your check-in credentials.</li>
                  </ul>
                </section>

                <section>
                  <h3 style={{ color: 'var(--accent-violet)', marginBottom: '8px', fontFamily: 'var(--font-heading)' }}>4. Ownership and Liability Limits</h3>
                  <p>CircleLink acts as a networking facilitator. We do not assume any liability for interactions, transactions, or disputes arising between participants offline or online.</p>
                  <p style={{ marginTop: '8px' }}>We reserve the right to suspend or terminate access for any user violating these provisions without prior notice.</p>
                </section>

                <section>
                  <h3 style={{ color: 'var(--accent-violet)', marginBottom: '8px', fontFamily: 'var(--font-heading)' }}>5. Changes to Terms</h3>
                  <p>We may update these Terms of Service at any time. Your continued use of the service following modifications constitutes acceptance of the new terms.</p>
                </section>
              </>
            )}
          </div>

          <div style={{ marginTop: '40px', borderTop: '1px solid var(--border-color)', paddingTop: '24px', display: 'flex', justifyContent: 'center' }}>
            <Link to="/" className="btn btn-primary" style={{ textDecoration: 'none' }}>
              <i className="fa-solid fa-house"></i> {t.backToHome}
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export default TermsOfService;
