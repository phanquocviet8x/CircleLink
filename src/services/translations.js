// CircleLink Central Multilingual Translation Dictionary

const translations = {
  vi: {
    // COMMON
    logoText: "CircleLink",
    tryNow: "Dùng Thử Ngay",
    learnMore: "Xem FAQ Hỏi Đáp",
    logout: "Đăng xuất",
    requiredField: "bắt buộc",
    roleFounder: "Founder",
    roleDeveloper: "Developer",
    roleDesigner: "Designer",
    roleMarketer: "Marketer",
    roleInvestor: "Investor",
    roleOther: "Khác",

    // AUTH LOGIN MODAL
    authTitle: "Đăng Nhập Host",
    authSubtitle: "Vui lòng đăng nhập để tạo và quản lý sự kiện mới của bạn.",
    emailLabel: "Địa chỉ Email",
    emailPlaceholder: "ten-cua-ban@gmail.com",
    passwordLabel: "Mã PIN xác thực",
    passwordPlaceholder: "Nhập mã PIN 6 số (Ví dụ: 123456)",
    loginBtn: "Xác Nhận Đăng Nhập",
    loginDemoTip: "💡 Chế độ dùng thử: Nhập email bất kỳ và mã PIN là 123456 để vào hệ thống.",
    loginSuccess: "Đăng nhập thành công!",
    loginError: "Mã PIN xác thực không chính xác (Thử nhập 123456).",
    
    // LANDING PAGE (HOME)
    heroTitleVi: "Mở Rộng Vòng Tròn Kết Nối", // handled in JSX specifically
    slogan: "Một chạm kết nối, mở rộng vòng tròn.",
    subtitle: "Giải pháp check-in, share profile thời gian thực và quản lý danh bạ sự kiện offline chuyên nghiệp, nhanh chóng và bảo mật.",
    workflowTitle: "Quy Trình Hoạt Động Của Hệ Thống",
    step1Title: "1. Tạo Sự Kiện",
    step1Desc: "Ban tổ chức thiết lập tên sự kiện để lấy liên kết check-in và màn hình Live Board trình chiếu.",
    step2Title: "2. Quét Mã QR",
    step2Desc: "Khách tham gia quét mã QR trên màn hình chiếu bằng camera điện thoại để mở form check-in.",
    step3Title: "3. Nhập Profile",
    step3Desc: "Khách điền thông tin cá nhân (Vai trò, mạng xã hội, kỹ năng) và đồng bộ tức thời lên hệ thống.",
    step4Title: "4. Lưu Danh Bạ",
    step4Desc: "Xem danh bạ sự kiện thời gian thực, lưu thông tin của người khác trực tiếp vào máy điện thoại chỉ với 1-Click.",

    formTitle: "Tạo sự kiện mới để dùng thử",
    formNameLabel: "Tên sự kiện",
    formNamePlaceholder: "Ví dụ: AI Meetup Hà Nội #1",
    formDescLabel: "Mô tả sự kiện",
    formDescPlaceholder: "Ví dụ: Giao lưu, chia sẻ công nghệ & kết nối...",
    formSlugLabel: "Đường dẫn sự kiện (slug)",
    formSlugHint: "Đường dẫn sẽ có dạng: http://localhost:8000/#/checkin/",
    formSubmitBtn: "Tạo Sự Kiện & Trình Chiếu",
    formCreating: "Đang khởi tạo...",
    eventTypeLabel: "Loại sự kiện",
    eventTypeOffline: "Offline (Trực tiếp)",
    eventTypeOnline: "Online (Trực tuyến)",
    eventTypeHybrid: "Hybrid (Kết hợp)",
    meetingLinkLabel: "Liên kết cuộc họp (Zoom, Meet, Teams...)",
    meetingLinkPlaceholder: "Nhập liên kết cuộc họp (Ví dụ: https://zoom.us/j/...)",
    joinMeetingBtn: "Tham gia họp trực tuyến",
    onlineMeetingActive: "Sự kiện trực tuyến đang diễn ra",
    checkinSuccessOnline: "Check-in thành công! Hãy bấm nút bên dưới để tham gia phòng họp Zoom/Meet.",

    feat1Title: "Check-in Web-first",
    feat1Desc: "Khách mời chỉ cần quét mã QR bằng camera điện thoại để điền profile cá nhân. Không cần cài đặt ứng dụng.",
    feat2Title: "Danh bạ sự kiện Realtime",
    feat2Desc: "Toàn bộ danh sách người tham gia được đồng bộ thời gian thực, cho phép tìm kiếm, lọc theo vai trò kỹ năng.",
    feat3Title: "Lưu vCard 1-Click",
    feat3Desc: "Người tham gia dễ dàng xuất thông tin liên hệ của nhau thành file danh bạ điện thoại để lưu trữ trực tiếp.",

    faqTitle: "Câu Hỏi Thường Gặp",
    faqQ1: "CircleLink là gì?",
    faqA1: "CircleLink là một nền tảng hỗ trợ check-in và kết nối trực tuyến thời gian thực dành cho các buổi offline meetup, hội thảo. Nó giúp người tham dự dễ dàng chia sẻ profile cá nhân và lưu danh bạ của nhau một cách chuyên nghiệp.",
    faqQ2: "Khách tham gia sự kiện có cần cài đặt ứng dụng không?",
    faqA2: "Không cần. CircleLink hoạt động hoàn toàn trên trình duyệt di động (Web-first). Khách tham dự chỉ cần quét mã QR để điền thông tin và xem danh bạ sự kiện ngay lập tức.",
    faqQ3: "Thông tin liên hệ của tôi có bị lộ công khai không?",
    faqA3: "Bạn hoàn toàn có thể tự quyết định. Khi check-in, ứng dụng cho phép thiết lập chế độ riêng tư (ẩn/hiện) cho số điện thoại và email của mình. Chỉ những người bạn đồng ý kết nối mới có thể xem.",
    faqQ4: "Làm thế nào để xuất thông tin danh bạ?",
    faqA4: "Mỗi profile trong danh bạ sự kiện đều có nút xuất vCard. Khi bấm, hệ thống sẽ tự sinh file .vcf tương thích với iPhone/Android để bạn lưu trực tiếp vào danh bạ điện thoại chỉ trong 1-Click.",
    faqQ5: "Nền tảng này có chạy offline hoặc không cần database đám mây không?",
    faqA5: "Có. CircleLink hỗ trợ Chế Độ Kép thông minh. Nếu không cấu hình database Supabase trong file .env, ứng dụng tự động chạy ở chế độ fallback LocalStorage và đồng bộ giữa các tab trình duyệt để bạn thử nghiệm nhanh chóng.",

    // LIVE BOARD VIEW
    liveBoard: "Live Board",
    hostAdmin: "Host Admin",
    eventLiveBadge: "SỰ KIỆN ĐANG DIỄN RA",
    qrInstruction: "Quét mã để check-in & chia sẻ profile của bạn",
    simulatorConsole: "Bảng điều khiển Demo (Simulator)",
    simRandomBtn: "Khách ngẫu nhiên",
    simAutoBtn: "Chạy tự động",
    simStopBtn: "Dừng chạy",
    simSuccessAdd: "Đã thêm khách ảo:",
    waitingFirstGuest: "Đang chờ người tham gia check-in...",
    totalAttendees: "Tổng số người tham gia",
    attendeeListTitle: "Danh sách người tham dự (Realtime)",
    welcoming: "Chào mừng",

    // HOST ADMIN VIEW
    adminTitle: "Quản trị sự kiện",
    adminConfig: "Cấu hình sự kiện",
    adminDesc: "Thiết lập các tham số và trạng thái check-in cho sự kiện của bạn.",
    adminNameLabel: "Tên sự kiện",
    adminDescLabel: "Mô tả sự kiện",
    adminCheckinGate: "Trạng thái cổng check-in",
    adminGateOpen: "Mở cổng nhận thông tin",
    adminGateClosed: "Đóng cổng check-in",
    adminRequirePhone: "Bắt buộc nhập số điện thoại",
    adminUpdateSuccess: "Cập nhật cấu hình sự kiện thành công!",
    adminBtnSave: "Lưu cấu hình",
    adminBtnExport: "Xuất danh sách (CSV)",
    adminBtnDownloadQR: "Tải QR Code (PNG)",
    adminSearchPlaceholder: "Tìm kiếm khách mời...",
    adminTableKick: "Xóa khỏi sự kiện",
    adminTablePhoneHidden: "SĐT (Riêng tư)",
    adminTableEmailHidden: "Email (Riêng tư)",
    adminConfirmKick: "Bạn có chắc chắn muốn xóa khách mời này khỏi sự kiện?",

    // GUEST CHECKIN VIEW
    checkinTitle: "Check-in sự kiện",
    checkinClosedTitle: "Cổng Check-in Đã Đóng",
    checkinClosedDesc: "Host đã đóng cổng đăng ký cho sự kiện này. Vui lòng liên hệ ban tổ chức.",
    checkinBtnGoDirectory: "Xem danh bạ sự kiện",
    checkinBtnGoHome: "Về Trang Chủ",
    checkinFormName: "Họ và tên",
    checkinFormNamePlaceholder: "Nhập họ tên của bạn...",
    checkinFormRole: "Vai trò chính",
    checkinFormBio: "Mô tả ngắn về bạn",
    checkinFormBioPlaceholder: "Ví dụ: AI Researcher, Sách nói, Tìm đối tác...",
    checkinFormPhone: "Số điện thoại",
    checkinFormEmail: "Địa chỉ Email",
    checkinFormPrivacy: "Thiết lập riêng tư SĐT & Email",
    checkinFormPrivacyPrivate: "Chỉ hiển thị cho người liên hệ",
    checkinFormPrivacyPublic: "Công khai cho toàn sự kiện",
    checkinFormLooking: "Tôi đang tìm kiếm",
    checkinFormLookingPlaceholder: "Ví dụ: Co-founder, Designer, Dự án tự do...",
    checkinFormHelp: "Tôi có thể hỗ trợ",
    checkinFormHelpPlaceholder: "Ví dụ: Pitching, Setup server, MKT kế hoạch...",
    checkinFormAvatar: "Chọn Avatar của bạn",
    checkinFormSubmit: "Gửi thông tin check-in",
    checkinSuccessConfetti: "Check-in thành công! Hãy lưu danh bạ sự kiện.",
    checkinSuccessRedirect: "Đang chuyển hướng sang danh bạ...",

    // EVENT DIRECTORY VIEW
    dirTitle: "Danh Bạ Sự Kiện",
    dirSearchPlaceholder: "Tìm theo tên, bio, vai trò, kỹ năng...",
    dirFilterRole: "Bộ lọc vai trò",
    dirFilterAll: "Tất cả",
    dirBtnCheckinForm: "Check-in Form",
    dirCardLooking: "Tìm kiếm",
    dirCardHelp: "Hỗ trợ",
    dirCardBtnSaveContact: "Lưu danh bạ",
    dirCardBtnLiked: "Đã thích",
    dirCardBtnLike: "Thích",
    dirNoResults: "Không tìm thấy khách mời nào phù hợp.",
    dirLoading: "Đang tải danh bạ sự kiện...",
    dirExportSuccess: "Đã xuất file vCard thành công!"
  },
  en: {
    // COMMON
    logoText: "CircleLink",
    tryNow: "Try It Now",
    learnMore: "Read FAQ Section",
    logout: "Log out",
    requiredField: "required",
    roleFounder: "Founder",
    roleDeveloper: "Developer",
    roleDesigner: "Designer",
    roleMarketer: "Marketer",
    roleInvestor: "Investor",
    roleOther: "Other",

    // AUTH LOGIN MODAL
    authTitle: "Host Login",
    authSubtitle: "Please log in to create and manage your new events.",
    emailLabel: "Email Address",
    emailPlaceholder: "your-name@gmail.com",
    passwordLabel: "Verification PIN",
    passwordPlaceholder: "Enter 6-digit PIN (E.g., 123456)",
    loginBtn: "Confirm Login",
    loginDemoTip: "💡 Demo Mode: Enter any email and use 123456 as the verification PIN to enter.",
    loginSuccess: "Login successful!",
    loginError: "Incorrect verification PIN (Try entering 123456).",
    
    // LANDING PAGE (HOME)
    heroTitleVi: "Expand Your Social Circle",
    slogan: "One touch to connect, expand your circle.",
    subtitle: "A professional realtime check-in, profile sharing, and directory management solution for offline meetups and conferences.",
    workflowTitle: "How the System Works",
    step1Title: "1. Create Event",
    step1Desc: "The Host sets up the event name to get a check-in link and a Live Board display screen.",
    step2Title: "2. Scan QR Code",
    step2Desc: "Guests scan the QR code on the screen using their phones to open the web check-in form.",
    step3Title: "3. Input Profile",
    step3Desc: "Guests fill in their info (Role, social media, skills) and sync in real time.",
    step4Title: "4. Save Contact",
    step4Desc: "Browse the directory and save other people's contacts directly to your phone with 1-click.",

    formTitle: "Create a new event to try",
    formNameLabel: "Event Name",
    formNamePlaceholder: "E.g., AI Meetup San Francisco #1",
    formDescLabel: "Event Description",
    formDescPlaceholder: "E.g., Networking, sharing tech & connections...",
    formSlugLabel: "Event URL (slug)",
    formSlugHint: "Your event URL will be: http://localhost:8000/#/checkin/",
    formSubmitBtn: "Create Event & Live Board",
    formCreating: "Initializing...",
    eventTypeLabel: "Event Type",
    eventTypeOffline: "Offline (In-person)",
    eventTypeOnline: "Online (Virtual)",
    eventTypeHybrid: "Hybrid (Combined)",
    meetingLinkLabel: "Meeting Link (Zoom, Meet, Teams...)",
    meetingLinkPlaceholder: "Enter meeting link (E.g., https://zoom.us/j/...)",
    joinMeetingBtn: "Join Online Meeting",
    onlineMeetingActive: "Online Meeting Active",
    checkinSuccessOnline: "Check-in successful! Click the button below to join the Zoom/Meet room.",

    feat1Title: "Web-first Check-in",
    feat1Desc: "Guests scan the QR code to fill out their profile. No app downloads required.",
    feat2Title: "Realtime Directory",
    feat2Desc: "All attendee list syncs in real time. Search and filter by roles or skills instantly.",
    feat3Title: "1-Click vCard Export",
    feat3Desc: "Easily export other participants' contact info as vCard files to save directly to your phone.",

    faqTitle: "Frequently Asked Questions",
    faqQ1: "What is CircleLink?",
    faqA1: "CircleLink is a platform supporting realtime check-in and online networking for offline meetups and workshops. It helps participants easily share profiles and save each other's contacts professionally.",
    faqQ2: "Do guests need to install an app?",
    faqA2: "No app install is needed. CircleLink runs completely in mobile web browsers. Guests just scan the QR code to check in and see the event directory instantly.",
    faqQ3: "Will my contact information be public?",
    faqA3: "You are in control. During check-in, you can toggle privacy settings for your phone number and email. Only details you set to public or share will be visible to others.",
    faqQ4: "How do I save someone's contact?",
    faqA4: "Every profile in the event directory has a vCard button. Clicking it generates a native .vcf file compatible with iOS/Android to save the contact in 1-click.",
    faqQ5: "Can it run without a cloud database?",
    faqA5: "Yes. CircleLink features a smart Dual-Mode Engine. Without Supabase config, it runs on local storage and syncs between tabs for immediate local testing.",

    // LIVE BOARD VIEW
    liveBoard: "Live Board",
    hostAdmin: "Host Admin",
    eventLiveBadge: "EVENT IN PROGRESS",
    qrInstruction: "Scan to check-in & share your profile",
    simulatorConsole: "Demo Console (Simulator)",
    simRandomBtn: "Random Guest",
    simAutoBtn: "Auto Run",
    simStopBtn: "Stop Run",
    simSuccessAdd: "Added virtual guest:",
    waitingFirstGuest: "Waiting for participants to check in...",
    totalAttendees: "Total Participants",
    attendeeListTitle: "Attendee List (Realtime)",
    welcoming: "Welcome",

    // HOST ADMIN VIEW
    adminTitle: "Event Admin",
    adminConfig: "Event Settings",
    adminDesc: "Configure parameters and check-in gate status for your event.",
    adminNameLabel: "Event Title",
    adminDescLabel: "Event Description",
    adminCheckinGate: "Check-in Gate Status",
    adminGateOpen: "Open Gate for Registrations",
    adminGateClosed: "Close Check-in Gate",
    adminRequirePhone: "Require Phone Number",
    adminUpdateSuccess: "Event settings updated successfully!",
    adminBtnSave: "Save Settings",
    adminBtnExport: "Export Attendee List (CSV)",
    adminBtnDownloadQR: "Download QR Code (PNG)",
    adminSearchPlaceholder: "Search attendees...",
    adminTableKick: "Remove",
    adminTablePhoneHidden: "Phone (Private)",
    adminTableEmailHidden: "Email (Private)",
    adminConfirmKick: "Are you sure you want to remove this guest from the event?",

    // GUEST CHECKIN VIEW
    checkinTitle: "Event Check-in",
    checkinClosedTitle: "Check-in Gate Closed",
    checkinClosedDesc: "The Host has closed registration for this event. Please contact the organizer.",
    checkinBtnGoDirectory: "View Directory",
    checkinBtnGoHome: "Go to Home",
    checkinFormName: "Full name",
    checkinFormNamePlaceholder: "Enter your full name...",
    checkinFormRole: "Primary Role",
    checkinFormBio: "Short Bio",
    checkinFormBioPlaceholder: "E.g., AI Researcher, Audiobooks, Seeking partners...",
    checkinFormPhone: "Phone number",
    checkinFormEmail: "Email Address",
    checkinFormPrivacy: "Phone & Email Privacy",
    checkinFormPrivacyPrivate: "Only show to direct contacts",
    checkinFormPrivacyPublic: "Public to all attendees",
    checkinFormLooking: "I am looking for",
    checkinFormLookingPlaceholder: "E.g., Co-founder, Designer, Freelance gig...",
    checkinFormHelp: "I can support",
    checkinFormHelpPlaceholder: "E.g., Pitching, Setup server, MKT planning...",
    checkinFormAvatar: "Select your Avatar",
    checkinFormSubmit: "Submit check-in profile",
    checkinSuccessConfetti: "Check-in successful! Saving directory...",
    checkinSuccessRedirect: "Redirecting to directory...",

    // EVENT DIRECTORY VIEW
    dirTitle: "Event Directory",
    dirSearchPlaceholder: "Search by name, bio, role, skill...",
    dirFilterRole: "Filter by role",
    dirFilterAll: "All",
    dirBtnCheckinForm: "Check-in Form",
    dirCardLooking: "Looking for",
    dirCardHelp: "Can help with",
    dirCardBtnSaveContact: "Save Contact",
    dirCardBtnLiked: "Liked",
    dirCardBtnLike: "Like",
    dirNoResults: "No matching guests found.",
    dirLoading: "Loading event directory...",
    dirExportSuccess: "vCard file exported successfully!"
  }
};

/**
 * Hook or function to get active language preference
 */
export function getLanguage() {
  try {
    return localStorage.getItem('circlelink_lang') || 'vi';
  } catch (_) {
    return 'vi';
  }
}

/**
 * Save language preference
 */
export function setLanguage(lang) {
  try {
    localStorage.setItem('circlelink_lang', lang);
  } catch (_) {}
}

/**
 * Get translations based on language
 */
export function getTranslations(lang = null) {
  const activeLang = lang || getLanguage();
  return translations[activeLang] || translations.vi;
}
