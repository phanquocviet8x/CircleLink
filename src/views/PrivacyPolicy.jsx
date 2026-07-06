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
                  <h3 style={{ color: 'var(--accent-violet)', marginBottom: '8px', fontFamily: 'var(--font-heading)' }}>1. Bên kiểm soát dữ liệu</h3>
                  <p>Bên chịu trách nhiệm kiểm soát và xử lý dữ liệu cá nhân đối với dịch vụ CircleLink là cá nhân nhà phát triển <strong>ThanhVespa</strong>, liên hệ qua email <a href="mailto:thanhinbali@gmail.com" style={{ color: 'var(--accent-violet)' }}>thanhinbali@gmail.com</a>. Chính sách này được xây dựng phù hợp với Luật Bảo vệ dữ liệu cá nhân số 91/2025/QH15 (hiệu lực từ 01/01/2026) và các văn bản hướng dẫn.</p>
                </section>

                <section>
                  <h3 style={{ color: 'var(--accent-violet)', marginBottom: '8px', fontFamily: 'var(--font-heading)' }}>2. Dữ liệu chúng tôi thu thập</h3>
                  <p>Khi bạn check-in hoặc đăng ký sử dụng CircleLink, chúng tôi thu thập các thông tin sau:</p>
                  <ul style={{ paddingLeft: '20px', display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '6px' }}>
                    <li>Thông tin bắt buộc: Họ và tên, vai trò chính (Founder, Developer, Designer, Marketer, Investor, Khác), và phần giới thiệu ngắn (Bio).</li>
                    <li>Thông tin liên hệ (không bắt buộc, tùy thuộc cấu hình sự kiện): Số điện thoại/Zalo, địa chỉ Email, Telegram username, Facebook URL, LinkedIn URL, Instagram username.</li>
                    <li>Lựa chọn avatar đại diện.</li>
                  </ul>
                  <p style={{ marginTop: '8px' }}>Chúng tôi chỉ thu thập trên cơ sở <strong>sự đồng ý</strong> của bạn khi bạn chủ động điền và gửi biểu mẫu check-in.</p>
                </section>

                <section>
                  <h3 style={{ color: 'var(--accent-violet)', marginBottom: '8px', fontFamily: 'var(--font-heading)' }}>3. Mục đích sử dụng dữ liệu</h3>
                  <p>Thông tin của bạn chỉ được sử dụng nhằm mục đích kết nối xã hội trong sự kiện, cụ thể:</p>
                  <ul style={{ paddingLeft: '20px', display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '6px' }}>
                    <li>Hiển thị tên và avatar trên màn hình chào mừng Live Board thời gian thực của sự kiện.</li>
                    <li>Hiển thị trong danh bạ sự kiện để những người tham dự khác có thể tìm kiếm, tương tác, và kết nối với bạn.</li>
                    <li>Cho phép xuất tệp danh bạ (vCard) để người dùng khác lưu thông tin liên hệ của bạn vào danh bạ điện thoại cá nhân (nếu bạn cho phép).</li>
                  </ul>
                  <p style={{ marginTop: '8px' }}>Chúng tôi <strong>không</strong> dùng dữ liệu của bạn cho quảng cáo, không bán và không cho thuê dữ liệu cá nhân cho bên thứ ba.</p>
                </section>

                <section>
                  <h3 style={{ color: 'var(--accent-violet)', marginBottom: '8px', fontFamily: 'var(--font-heading)' }}>4. Lưu trữ đám mây & Chuyển dữ liệu ra nước ngoài (Supabase)</h3>
                  <p><strong>Lưu trữ trên Supabase:</strong> Cơ sở dữ liệu của CircleLink được cung cấp và vận hành bởi <strong>Supabase, Inc.</strong> (supabase.com) trên hạ tầng đám mây.</p>
                  <p style={{ marginTop: '8px' }}><strong>Chuyển dữ liệu xuyên biên giới:</strong> Máy chủ lưu trữ dữ liệu đặt tại khu vực <strong>Tokyo, Nhật Bản</strong>. Điều này đồng nghĩa dữ liệu cá nhân của bạn được chuyển và xử lý bên ngoài lãnh thổ Việt Nam. Bằng việc đồng ý với chính sách này và gửi thông tin check-in, bạn <strong>đồng ý cho phép chuyển dữ liệu cá nhân ra nước ngoài</strong> để lưu trữ, đồng bộ và xử lý trên hệ thống của Supabase, phù hợp với quy định về chuyển dữ liệu xuyên biên giới của Luật 91/2025/QH15.</p>
                </section>

                <section>
                  <h3 style={{ color: 'var(--accent-violet)', marginBottom: '8px', fontFamily: 'var(--font-heading)' }}>5. Thời hạn lưu trữ</h3>
                  <p>Dữ liệu check-in được lưu trong suốt thời gian diễn ra sự kiện và tối đa <strong>90 ngày</strong> sau khi sự kiện kết thúc, trừ khi bạn hoặc Host chủ động xóa sớm hơn. Sau thời hạn này, hoặc khi Host xóa sự kiện, dữ liệu sẽ bị xóa vĩnh viễn khỏi cơ sở dữ liệu.</p>
                </section>

                <section>
                  <h3 style={{ color: 'var(--accent-violet)', marginBottom: '8px', fontFamily: 'var(--font-heading)' }}>6. Quyền của bạn đối với dữ liệu cá nhân</h3>
                  <ul style={{ paddingLeft: '20px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <li><strong>Quyền được biết & đồng ý:</strong> Bạn được thông báo và tự quyết định việc cung cấp dữ liệu trước khi check-in.</li>
                    <li><strong>Quyền truy cập & chỉnh sửa:</strong> Bạn có thể xem và chỉnh sửa profile bất kỳ lúc nào từ thiết bị đã dùng để check-in.</li>
                    <li><strong>Quyền ẩn thông tin liên hệ:</strong> Bạn có thể bật/tắt hiển thị Số điện thoại, Email và các kênh liên hệ khác. Khi tắt, thông tin này được giữ riêng tư với người khác trong danh bạ.</li>
                    <li><strong>Quyền xóa:</strong> Bạn có thể tự xóa hồ sơ khỏi thiết bị đã check-in, hoặc yêu cầu Host xóa; dữ liệu sẽ bị xóa hoàn toàn khỏi cơ sở dữ liệu.</li>
                    <li><strong>Quyền rút lại đồng ý:</strong> Bạn có thể rút lại sự đồng ý bất kỳ lúc nào bằng cách xóa hồ sơ hoặc gửi yêu cầu tới email liên hệ ở Mục 8. Việc rút lại không ảnh hưởng đến tính hợp pháp của việc xử lý trước đó.</li>
                    <li><strong>Quyền phản đối & khiếu nại:</strong> Bạn có quyền phản đối việc xử lý và khiếu nại tới cơ quan có thẩm quyền theo quy định pháp luật.</li>
                  </ul>
                </section>

                <section>
                  <h3 style={{ color: 'var(--accent-violet)', marginBottom: '8px', fontFamily: 'var(--font-heading)' }}>7. Dữ liệu của trẻ em</h3>
                  <p>Dịch vụ dành cho người dùng từ <strong>16 tuổi trở lên</strong>. Chúng tôi không cố ý thu thập dữ liệu của người dưới 16 tuổi. Nếu phát hiện đã thu thập dữ liệu như vậy mà không có sự đồng ý hợp lệ của cha mẹ/người giám hộ, chúng tôi sẽ xóa ngay khi được thông báo.</p>
                </section>

                <section>
                  <h3 style={{ color: 'var(--accent-violet)', marginBottom: '8px', fontFamily: 'var(--font-heading)' }}>8. Liên hệ hỗ trợ</h3>
                  <p>Nếu bạn có câu hỏi hoặc muốn thực hiện các quyền nêu trên, xin liên hệ ban tổ chức sự kiện hoặc gửi email cho nhà phát triển tại: <a href="mailto:thanhinbali@gmail.com" style={{ color: 'var(--accent-violet)' }}>thanhinbali@gmail.com</a>.</p>
                </section>
              </>
            ) : (
              <>
                <section>
                  <h3 style={{ color: 'var(--accent-violet)', marginBottom: '8px', fontFamily: 'var(--font-heading)' }}>1. Data Controller</h3>
                  <p>The party responsible for controlling and processing personal data for the CircleLink service is the individual developer <strong>ThanhVespa</strong>, reachable at <a href="mailto:thanhinbali@gmail.com" style={{ color: 'var(--accent-violet)' }}>thanhinbali@gmail.com</a>. This policy is designed to align with Vietnam's Personal Data Protection Law No. 91/2025/QH15 (effective 01/01/2026) and its guiding regulations.</p>
                </section>

                <section>
                  <h3 style={{ color: 'var(--accent-violet)', marginBottom: '8px', fontFamily: 'var(--font-heading)' }}>2. Data We Collect</h3>
                  <p>When checking in or using CircleLink, we collect the following information:</p>
                  <ul style={{ paddingLeft: '20px', display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '6px' }}>
                    <li>Required Info: Full name, primary role (Founder, Developer, Designer, Marketer, Investor, Other), and a short bio.</li>
                    <li>Contact Details (optional, depending on event configuration): Phone/Zalo, Email, Telegram username, Facebook URL, LinkedIn URL, Instagram username.</li>
                    <li>Your selected avatar preset.</li>
                  </ul>
                  <p style={{ marginTop: '8px' }}>We collect data solely on the basis of your <strong>consent</strong>, given when you voluntarily complete and submit the check-in form.</p>
                </section>

                <section>
                  <h3 style={{ color: 'var(--accent-violet)', marginBottom: '8px', fontFamily: 'var(--font-heading)' }}>3. How We Use Data</h3>
                  <p>Your profile data is processed to facilitate in-event networking, specifically for:</p>
                  <ul style={{ paddingLeft: '20px', display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '6px' }}>
                    <li>Greeting check-in guests in real-time on the event's Live Board display.</li>
                    <li>Listing your profile in the shared event directory, enabling other participants to search, filter, and connect with you.</li>
                    <li>Exporting contact files (vCards) for users who wish to save your public contact details to their local phone directories (subject to your visibility settings).</li>
                  </ul>
                  <p style={{ marginTop: '8px' }}>We do <strong>not</strong> use your data for advertising, and we never sell or lease personal data to third parties.</p>
                </section>

                <section>
                  <h3 style={{ color: 'var(--accent-violet)', marginBottom: '8px', fontFamily: 'var(--font-heading)' }}>4. Cloud Storage & Cross-Border Transfer (Supabase)</h3>
                  <p><strong>Supabase hosting:</strong> CircleLink's database and cloud infrastructure are powered by <strong>Supabase, Inc.</strong> (supabase.com).</p>
                  <p style={{ marginTop: '8px' }}><strong>Cross-border transfer:</strong> Data is hosted in the <strong>Tokyo, Japan</strong> region, meaning your personal data is transferred and processed outside Vietnam. By agreeing to this policy and submitting the check-in form, you <strong>consent to the cross-border transfer</strong> of your personal data for storage, sync, and processing on Supabase systems, in line with the cross-border data transfer provisions of Law 91/2025/QH15.</p>
                </section>

                <section>
                  <h3 style={{ color: 'var(--accent-violet)', marginBottom: '8px', fontFamily: 'var(--font-heading)' }}>5. Data Retention</h3>
                  <p>Check-in data is retained for the duration of the event and for up to <strong>90 days</strong> after it ends, unless you or the Host delete it earlier. After this period, or when the Host deletes the event, the data is permanently removed from the database.</p>
                </section>

                <section>
                  <h3 style={{ color: 'var(--accent-violet)', marginBottom: '8px', fontFamily: 'var(--font-heading)' }}>6. Your Rights</h3>
                  <ul style={{ paddingLeft: '20px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <li><strong>Right to be informed & consent:</strong> You are informed and decide whether to provide data before checking in.</li>
                    <li><strong>Access & rectification:</strong> You can view and edit your profile at any time from the device used to check in.</li>
                    <li><strong>Contact visibility:</strong> You can toggle the visibility of your Phone, Email and other channels; when hidden they stay private from others in the directory.</li>
                    <li><strong>Erasure:</strong> You can delete your profile from your check-in device, or request the Host to remove you; the record is fully deleted from the database.</li>
                    <li><strong>Withdraw consent:</strong> You may withdraw consent at any time by deleting your profile or emailing the contact in Section 8. Withdrawal does not affect the lawfulness of prior processing.</li>
                    <li><strong>Object & complain:</strong> You may object to processing and lodge a complaint with the competent authority as provided by law.</li>
                  </ul>
                </section>

                <section>
                  <h3 style={{ color: 'var(--accent-violet)', marginBottom: '8px', fontFamily: 'var(--font-heading)' }}>7. Children's Data</h3>
                  <p>The service is intended for users aged <strong>16 and above</strong>. We do not knowingly collect data from anyone under 16. If we learn we have collected such data without valid parental/guardian consent, we will delete it promptly upon notice.</p>
                </section>

                <section>
                  <h3 style={{ color: 'var(--accent-violet)', marginBottom: '8px', fontFamily: 'var(--font-heading)' }}>8. Contact Support</h3>
                  <p>For any questions or to exercise the rights above, please contact the event organizer or email the developer at: <a href="mailto:thanhinbali@gmail.com" style={{ color: 'var(--accent-violet)' }}>thanhinbali@gmail.com</a>.</p>
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
