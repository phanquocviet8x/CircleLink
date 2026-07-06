import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import Logo from '../components/Logo';
import { getTranslations, getLanguage, setLanguage } from '../services/translations';

function PrivacyPolicy() {
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
              {t.legalPrivacy}
            </h1>
            <p style={{ color: 'var(--text-secondary)', marginTop: '8px' }}>
              {lang === 'vi' ? 'Cập nhật lần cuối: Ngày 6 tháng 7 năm 2026' : 'Last updated: July 6, 2026'}
            </p>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', color: 'var(--text-primary)', fontSize: '15px', lineHeight: '1.7' }}>
            {lang === 'vi' ? (
              <>
                <section>
                  <h3 style={{ color: 'var(--accent-violet)', marginBottom: '8px', fontFamily: 'var(--font-heading)' }}>1. Dữ liệu chúng tôi thu thập</h3>
                  <p>Khi bạn check-in hoặc đăng ký sử dụng CircleLink, chúng tôi thu thập các thông tin sau:</p>
                  <ul style={{ paddingLeft: '20px', display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '6px' }}>
                    <li>Thông tin bắt buộc: Họ và tên, vai trò chính (Founder, Developer, Designer, Marketer, Investor, Khác), và phần giới thiệu ngắn (Bio).</li>
                    <li>Thông tin liên hệ (không bắt buộc, tùy thuộc cấu hình sự kiện): Số điện thoại/Zalo, địa chỉ Email, Telegram username, Facebook URL, LinkedIn URL, Instagram username.</li>
                    <li>Lựa chọn avatar đại diện.</li>
                  </ul>
                </section>

                <section>
                  <h3 style={{ color: 'var(--accent-violet)', marginBottom: '8px', fontFamily: 'var(--font-heading)' }}>2. Cách sử dụng dữ liệu</h3>
                  <p>Thông tin của bạn được sử dụng nhằm mục đích kết nối xã hội trong sự kiện, cụ thể:</p>
                  <ul style={{ paddingLeft: '20px', display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '6px' }}>
                    <li>Hiển thị tên và avatar trên màn hình chào mừng Live Board thời gian thực của sự kiện.</li>
                    <li>Hiển thị trong danh bạ sự kiện để những người tham dự khác có thể tìm kiếm, tương tác, và kết nối với bạn.</li>
                    <li>Cho phép xuất tệp danh bạ (vCard) để người dùng khác lưu thông tin liên hệ của bạn vào danh bạ điện thoại cá nhân (nếu bạn cho phép).</li>
                  </ul>
                </section>

                <section>
                  <h3 style={{ color: 'var(--accent-violet)', marginBottom: '8px', fontFamily: 'var(--font-heading)' }}>3. Chia sẻ dữ liệu và Lưu trữ đám mây (Supabase)</h3>
                  <p><strong>Bảo mật thông tin:</strong> Chúng tôi cam kết không bán dữ liệu cá nhân của bạn cho bên thứ ba.</p>
                  <p style={{ marginTop: '8px' }}><strong>Lưu trữ trên Supabase:</strong> Cơ sở dữ liệu của CircleLink được cung cấp và vận hành bởi <strong>Supabase, Inc.</strong> (supabase.com) trên cơ sở hạ tầng đám mây an toàn. Bằng việc đồng ý với chính sách này và gửi thông tin check-in, bạn đồng ý chia sẻ và cho phép dữ liệu của mình được lưu trữ, đồng bộ và xử lý trên hệ thống máy chủ của Supabase.</p>
                </section>

                <section>
                  <h3 style={{ color: 'var(--accent-violet)', marginBottom: '8px', fontFamily: 'var(--font-heading)' }}>4. Quyền riêng tư của bạn</h3>
                  <ul style={{ paddingLeft: '20px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <li><strong>Quyền ẩn thông tin liên hệ:</strong> Bạn có thể bật/tắt hiển thị Số điện thoại và Email khi check-in hoặc khi cập nhật profile. Khi tắt, các thông tin này sẽ hiển thị là "Riêng tư" đối với những người dùng khác trong danh bạ.</li>
                    <li><strong>Quyền chỉnh sửa và xóa bỏ:</strong> Bạn có quyền chỉnh sửa thông tin profile bất kỳ lúc nào từ thiết bị đã dùng để check-in. Bạn cũng có thể yêu cầu Host của sự kiện xóa thông tin của bạn khỏi danh sách người tham gia, lúc đó dữ liệu sẽ hoàn toàn bị xóa khỏi cơ sở dữ liệu Supabase của sự kiện.</li>
                  </ul>
                </section>

                <section>
                  <h3 style={{ color: 'var(--accent-violet)', marginBottom: '8px', fontFamily: 'var(--font-heading)' }}>5. Liên hệ hỗ trợ</h3>
                  <p>Nếu bạn có câu hỏi hoặc yêu cầu liên quan đến chính sách bảo mật này, xin vui lòng liên hệ với ban tổ chức sự kiện hoặc gửi email cho nhà phát triển tại: <a href="mailto:thanhinbali@gmail.com" style={{ color: 'var(--accent-violet)' }}>thanhinbali@gmail.com</a>.</p>
                </section>
              </>
            ) : (
              <>
                <section>
                  <h3 style={{ color: 'var(--accent-violet)', marginBottom: '8px', fontFamily: 'var(--font-heading)' }}>1. Data We Collect</h3>
                  <p>When checking in or using CircleLink, we collect the following information:</p>
                  <ul style={{ paddingLeft: '20px', display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '6px' }}>
                    <li>Required Info: Full name, primary role (Founder, Developer, Designer, Marketer, Investor, Other), and a short bio.</li>
                    <li>Contact Details (optional, depending on event configuration): Phone/Zalo, Email, Telegram username, Facebook URL, LinkedIn URL, Instagram username.</li>
                    <li>Your selected avatar preset.</li>
                  </ul>
                </section>

                <section>
                  <h3 style={{ color: 'var(--accent-violet)', marginBottom: '8px', fontFamily: 'var(--font-heading)' }}>2. How We Use Data</h3>
                  <p>Your profile data is processed to facilitate in-event networking, specifically for:</p>
                  <ul style={{ paddingLeft: '20px', display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '6px' }}>
                    <li>Greeting check-in guests in real-time on the event's Live Board display.</li>
                    <li>Listing your profile in the shared event directory, enabling other participants to search, filter, and connect with you.</li>
                    <li>Exporting contact files (vCards) for users who wish to save your public contact details to their local phone directories (subject to your visibility settings).</li>
                  </ul>
                </section>

                <section>
                  <h3 style={{ color: 'var(--accent-violet)', marginBottom: '8px', fontFamily: 'var(--font-heading)' }}>3. Data Sharing & Cloud Storage (Supabase)</h3>
                  <p><strong>Information Security:</strong> We do not sell or lease your personal information to third parties.</p>
                  <p style={{ marginTop: '8px' }}><strong>Supabase Cloud Database:</strong> CircleLink's database hosting and cloud infrastructure are powered by <strong>Supabase, Inc.</strong> (supabase.com). By agreeing to this policy and submitting the check-in form, you explicitly consent to sharing, storing, and processing your profile data on Supabase database systems.</p>
                </section>

                <section>
                  <h3 style={{ color: 'var(--accent-violet)', marginBottom: '8px', fontFamily: 'var(--font-heading)' }}>4. Your Privacy Controls</h3>
                  <ul style={{ paddingLeft: '20px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <li><strong>Contact Visibility Toggle:</strong> You can toggle the privacy of your Phone number and Email during check-in or profile updates. When hidden, they are kept private from other attendees in the directory.</li>
                    <li><strong>Access and Rectification:</strong> You can edit your profile information at any time from the check-in device. You can also request the event Host to remove you from the event, which deletes your record from the database.</li>
                  </ul>
                </section>

                <section>
                  <h3 style={{ color: 'var(--accent-violet)', marginBottom: '8px', fontFamily: 'var(--font-heading)' }}>5. Contact Support</h3>
                  <p>For any questions or concerns regarding this policy, please contact the event organizer or email the developer at: <a href="mailto:thanhinbali@gmail.com" style={{ color: 'var(--accent-violet)' }}>thanhinbali@gmail.com</a>.</p>
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

export default PrivacyPolicy;
