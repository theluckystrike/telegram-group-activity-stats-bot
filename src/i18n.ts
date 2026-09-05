// Static-text localization for GroupPulse. Only user-facing static copy lives here —
// dynamic/group-facing content (leaderboards, /quiet, /me stats, weekly reports) stays in
// index.ts and is intentionally left in English so it reads the same for every member.

export const LANGS = ["en", "ru", "es", "pt", "id", "de", "tr", "uk", "fa", "ar", "hi"] as const;
export type Lang = (typeof LANGS)[number];
export type Key =
  | "start"
  | "help"
  | "monthProOnly"
  | "proGroupInfo"
  | "proRunInGroup"
  | "thankYou"
  | "adminOnly"
  | "resetDone"
  | "btn_addToGroup"
  | "btn_shareBot"
  | "btn_unlockProStars"
  // Mini App (MINIAPP-SPEC.md): 14 shared keys + app_storyText + 3 pulse-specific.
  | "app_title"
  | "app_loading"
  | "app_moreApps"
  | "app_empty"
  | "app_shareChat"
  | "app_shareStory"
  | "app_storyText"
  | "app_shareFail"
  | "app_errNoInit"
  | "app_errExpired"
  | "app_errBadSig"
  | "app_unlockPro"
  | "app_proOneTime"
  | "app_proMonthly"
  | "app_payDone"
  | "app_payCancelled"
  | "app_payFailed"
  | "app_pro"
  | "app_group";

/** ctx.from.language_code -> first two letters -> known table language, else "en". */
export function resolveLang(code?: string): Lang {
  const c = (code ?? "").slice(0, 2).toLowerCase();
  return (LANGS as readonly string[]).includes(c) ? (c as Lang) : "en";
}

/** Look up `key` for `lang` (falling back to English), substituting `{name}` tokens from `vars`. */
export function t(lang: string, key: Key, vars?: Record<string, string | number>): string {
  const l: Lang = (LANGS as readonly string[]).includes(lang) ? (lang as Lang) : "en";
  let s = TABLE[key][l] ?? TABLE[key].en;
  if (vars) for (const [k, v] of Object.entries(vars)) s = s.replaceAll(`{${k}}`, String(v));
  return s;
}

const TABLE: Record<Key, Record<Lang, string>> = {
  start: {
    en: "📊 Who actually talks in your group?\nAdd me, then `/pulse week` — top posters, totals, busiest hour.\nI count messages, never read them.\nFree: today + week, {freeDays}-day history · /help",
    ru: "📊 Кто на самом деле общается в вашей группе?\nДобавьте меня, затем `/pulse week` — топ участников, итоги, самый активный час.\nЯ считаю сообщения, но никогда их не читаю.\nБесплатно: сегодня + неделя, история {freeDays} дней · /help",
    es: "📊 ¿Quién habla realmente en tu grupo?\nAgrégame y luego `/pulse week` — los que más publican, totales, hora más activa.\nCuento los mensajes, nunca los leo.\nGratis: hoy + semana, historial de {freeDays} días · /help",
    pt: "📊 Quem realmente fala no seu grupo?\nAdicione-me e depois `/pulse week` — quem mais posta, totais, hora mais ativa.\nEu conto as mensagens, nunca as leio.\nGrátis: hoje + semana, histórico de {freeDays} dias · /help",
    id: "📊 Siapa yang benar-benar aktif di grupmu?\nTambahkan aku, lalu `/pulse week` — poster teratas, total, jam tersibuk.\nAku menghitung pesan, tidak pernah membacanya.\nGratis: hari ini + minggu, riwayat {freeDays} hari · /help",
    de: "📊 Wer redet wirklich in deiner Gruppe?\nFüge mich hinzu, dann `/pulse week` — Top-Poster, Gesamtzahlen, aktivste Stunde.\nIch zähle Nachrichten, lese sie nie.\nKostenlos: heute + Woche, {freeDays}-Tage-Verlauf · /help",
    tr: "📊 Grubunda gerçekten kim konuşuyor?\nBeni ekle, sonra `/pulse week` — en çok paylaşanlar, toplamlar, en yoğun saat.\nMesajları sayarım, asla okumam.\nÜcretsiz: bugün + hafta, {freeDays} günlük geçmiş · /help",
    uk: "📊 Хто насправді спілкується у вашій групі?\nДодайте мене, потім `/pulse week` — топ учасників, підсумки, найактивніша година.\nЯ рахую повідомлення, але ніколи їх не читаю.\nБезкоштовно: сьогодні + тиждень, історія {freeDays} днів · /help",
    fa: "📊 چه کسی واقعاً در گروه شما صحبت می‌کند؟\nمرا اضافه کنید، سپس `/pulse week` — پرمشغله‌ترین‌ها، مجموع‌ها، شلوغ‌ترین ساعت.\nمن پیام‌ها را می‌شمارم، هرگز نمی‌خوانم.\nرایگان: امروز + هفته، تاریخچه {freeDays} روزه · /help",
    ar: "📊 من الذي يتحدث فعلاً في مجموعتك؟\nأضفني، ثم `/pulse week` — الأكثر نشاطًا، الإجماليات، أكثر ساعة نشاطًا.\nأنا أعدّ الرسائل، لا أقرأها أبدًا.\nمجانًا: اليوم + الأسبوع، سجل {freeDays} يومًا · /help",
    hi: "📊 आपके ग्रुप में असल में कौन बात करता है?\nमुझे जोड़ें, फिर `/pulse week` — टॉप पोस्टर, कुल, सबसे व्यस्त घंटा।\nमैं मैसेज गिनता हूं, कभी नहीं पढ़ता।\nमुफ़्त: आज + सप्ताह, {freeDays}-दिन का इतिहास · /help",
  },
  help: {
    en: "📊 *GroupPulse* tracks activity in this group — no message content, only counts.\n\n`/pulse today|week|month` — leaderboard, totals, busiest hour\n`/quiet` — members who went quiet\n`/me` — your own stats\n`/reset` — clear the group's data (admins only)\n\nArgument stays in English: today, week or month.\n\nFree: today + week, {freeDays}-day history. Pro: month view, {proDays}-day history, weekly report, one-time {stars} ⭐ — /pro",
    ru: "📊 *GroupPulse* отслеживает активность в этой группе — не содержимое сообщений, только количество.\n\n`/pulse today|week|month` — лидерборд, итоги, самый активный час\n`/quiet` — участники, которые затихли\n`/me` — ваша статистика\n`/reset` — очистить данные группы (только для админов)\n\nАргумент остаётся на английском: today, week или month.\n\nБесплатно: сегодня + неделя, история {freeDays} дней. Pro: месячный вид, история {proDays} дней, еженедельный отчёт, разовый платёж {stars} ⭐ — /pro",
    es: "📊 *GroupPulse* rastrea la actividad en este grupo — no el contenido de los mensajes, solo los conteos.\n\n`/pulse today|week|month` — clasificación, totales, hora más activa\n`/quiet` — miembros que se han quedado callados\n`/me` — tus propias estadísticas\n`/reset` — borrar los datos del grupo (solo admins)\n\nEl argumento se mantiene en inglés: today, week o month.\n\nGratis: hoy + semana, historial de {freeDays} días. Pro: vista mensual, historial de {proDays} días, informe semanal, pago único de {stars} ⭐ — /pro",
    pt: "📊 *GroupPulse* rastreia a atividade neste grupo — não o conteúdo das mensagens, apenas contagens.\n\n`/pulse today|week|month` — ranking, totais, hora mais ativa\n`/quiet` — membros que ficaram quietos\n`/me` — suas próprias estatísticas\n`/reset` — limpar os dados do grupo (somente admins)\n\nO argumento continua em inglês: today, week ou month.\n\nGrátis: hoje + semana, histórico de {freeDays} dias. Pro: visão mensal, histórico de {proDays} dias, relatório semanal, pagamento único de {stars} ⭐ — /pro",
    id: "📊 *GroupPulse* melacak aktivitas di grup ini — bukan isi pesan, hanya jumlahnya.\n\n`/pulse today|week|month` — papan peringkat, total, jam tersibuk\n`/quiet` — anggota yang jadi sepi\n`/me` — statistik kamu sendiri\n`/reset` — hapus data grup (khusus admin)\n\nArgumen tetap dalam bahasa Inggris: today, week, atau month.\n\nGratis: hari ini + minggu, riwayat {freeDays} hari. Pro: tampilan bulanan, riwayat {proDays} hari, laporan mingguan, sekali bayar {stars} ⭐ — /pro",
    de: "📊 *GroupPulse* verfolgt die Aktivität in dieser Gruppe — nicht den Nachrichteninhalt, nur die Anzahl.\n\n`/pulse today|week|month` — Bestenliste, Gesamtzahlen, aktivste Stunde\n`/quiet` — Mitglieder, die still geworden sind\n`/me` — deine eigenen Statistiken\n`/reset` — Gruppendaten löschen (nur Admins)\n\nDas Argument bleibt auf Englisch: today, week oder month.\n\nKostenlos: heute + Woche, {freeDays}-Tage-Verlauf. Pro: Monatsansicht, {proDays}-Tage-Verlauf, wöchentlicher Bericht, einmalig {stars} ⭐ — /pro",
    tr: "📊 *GroupPulse* bu gruptaki etkinliği izler — mesaj içeriğini değil, yalnızca sayıları.\n\n`/pulse today|week|month` — lider tablosu, toplamlar, en yoğun saat\n`/quiet` — sessizleşen üyeler\n`/me` — kendi istatistiklerin\n`/reset` — grup verilerini temizle (yalnızca yöneticiler)\n\nArgüman İngilizce kalır: today, week veya month.\n\nÜcretsiz: bugün + hafta, {freeDays} günlük geçmiş. Pro: aylık görünüm, {proDays} günlük geçmiş, haftalık rapor, tek seferlik {stars} ⭐ — /pro",
    uk: "📊 *GroupPulse* відстежує активність у цій групі — не вміст повідомлень, лише кількість.\n\n`/pulse today|week|month` — лідерборд, підсумки, найактивніша година\n`/quiet` — учасники, які затихли\n`/me` — ваша власна статистика\n`/reset` — очистити дані групи (лише для адмінів)\n\nАргумент залишається англійською: today, week або month.\n\nБезкоштовно: сьогодні + тиждень, історія {freeDays} днів. Pro: місячний вигляд, історія {proDays} днів, щотижневий звіт, разовий платіж {stars} ⭐ — /pro",
    fa: "📊 *GroupPulse* فعالیت این گروه را دنبال می‌کند — نه محتوای پیام‌ها، فقط تعداد آن‌ها.\n\n`/pulse today|week|month` — جدول رتبه‌بندی، مجموع‌ها، شلوغ‌ترین ساعت\n`/quiet` — اعضایی که ساکت شده‌اند\n`/me` — آمار خودتان\n`/reset` — پاک کردن داده‌های گروه (فقط ادمین‌ها)\n\nآرگومان به انگلیسی باقی می‌ماند: today، week یا month.\n\nرایگان: امروز + هفته، تاریخچه {freeDays} روزه. Pro: نمای ماهانه، تاریخچه {proDays} روزه، گزارش هفتگی، پرداخت یک‌باره {stars} ⭐ — /pro",
    ar: "📊 *GroupPulse* يتتبّع النشاط في هذه المجموعة — ليس محتوى الرسائل، فقط الأعداد.\n\n`/pulse today|week|month` — لوحة المتصدرين، الإجماليات، أكثر ساعة نشاطًا\n`/quiet` — الأعضاء الذين هدأوا\n`/me` — إحصائياتك الخاصة\n`/reset` — مسح بيانات المجموعة (للمشرفين فقط)\n\nتبقى الوسيطة بالإنجليزية: today أو week أو month.\n\nمجانًا: اليوم + الأسبوع، سجل {freeDays} يومًا. Pro: العرض الشهري، سجل {proDays} يومًا، تقرير أسبوعي، دفعة واحدة {stars} ⭐ — /pro",
    hi: "📊 *GroupPulse* इस ग्रुप की गतिविधि ट्रैक करता है — मैसेज का कंटेंट नहीं, सिर्फ़ गिनती।\n\n`/pulse today|week|month` — लीडरबोर्ड, कुल, सबसे व्यस्त घंटा\n`/quiet` — जो सदस्य शांत हो गए\n`/me` — आपका अपना आँकड़ा\n`/reset` — ग्रुप का डेटा साफ़ करें (सिर्फ़ एडमिन)\n\nआर्ग्युमेंट अंग्रेज़ी में रहता है: today, week या month।\n\nमुफ़्त: आज + सप्ताह, {freeDays}-दिन का इतिहास। Pro: मासिक व्यू, {proDays}-दिन का इतिहास, साप्ताहिक रिपोर्ट, एकमुश्त {stars} ⭐ — /pro",
  },
  monthProOnly: {
    en: "Month view is a Pro feature for this group.",
    ru: "Месячный вид — функция Pro для этой группы.",
    es: "La vista mensual es una función Pro para este grupo.",
    pt: "A visão mensal é um recurso Pro para este grupo.",
    id: "Tampilan bulanan adalah fitur Pro untuk grup ini.",
    de: "Die Monatsansicht ist eine Pro-Funktion für diese Gruppe.",
    tr: "Aylık görünüm bu grup için bir Pro özelliğidir.",
    uk: "Місячний вигляд — функція Pro для цієї групи.",
    fa: "نمای ماهانه یک ویژگی Pro برای این گروه است.",
    ar: "العرض الشهري ميزة Pro لهذه المجموعة.",
    hi: "मासिक व्यू इस ग्रुप के लिए Pro सुविधा है।",
  },
  proGroupInfo: {
    en: "Pro for this group: month view, {proDays}-day history, weekly report, one-time {stars} ⭐.",
    ru: "Pro для этой группы: месячный вид, история {proDays} дней, еженедельный отчёт, разовый платёж {stars} ⭐.",
    es: "Pro para este grupo: vista mensual, historial de {proDays} días, informe semanal, pago único de {stars} ⭐.",
    pt: "Pro para este grupo: visão mensal, histórico de {proDays} dias, relatório semanal, pagamento único de {stars} ⭐.",
    id: "Pro untuk grup ini: tampilan bulanan, riwayat {proDays} hari, laporan mingguan, sekali bayar {stars} ⭐.",
    de: "Pro für diese Gruppe: Monatsansicht, {proDays}-Tage-Verlauf, wöchentlicher Bericht, einmalig {stars} ⭐.",
    tr: "Bu grup için Pro: aylık görünüm, {proDays} günlük geçmiş, haftalık rapor, tek seferlik {stars} ⭐.",
    uk: "Pro для цієї групи: місячний вигляд, історія {proDays} днів, щотижневий звіт, разовий платіж {stars} ⭐.",
    fa: "Pro برای این گروه: نمای ماهانه، تاریخچه {proDays} روزه، گزارش هفتگی، پرداخت یک‌باره {stars} ⭐.",
    ar: "Pro لهذه المجموعة: العرض الشهري، سجل {proDays} يومًا، تقرير أسبوعي، دفعة واحدة {stars} ⭐.",
    hi: "इस ग्रुप के लिए Pro: मासिक व्यू, {proDays}-दिन का इतिहास, साप्ताहिक रिपोर्ट, एकमुश्त {stars} ⭐।",
  },
  proRunInGroup: {
    en: "Run /pro inside the group you want to upgrade.",
    ru: "Запустите /pro внутри группы, которую хотите обновить.",
    es: "Ejecuta /pro dentro del grupo que quieres mejorar.",
    pt: "Execute /pro dentro do grupo que deseja atualizar.",
    id: "Jalankan /pro di dalam grup yang ingin kamu tingkatkan.",
    de: "Führe /pro in der Gruppe aus, die du upgraden möchtest.",
    tr: "Yükseltmek istediğin grubun içinde /pro çalıştır.",
    uk: "Запустіть /pro всередині групи, яку хочете оновити.",
    fa: "دستور /pro را داخل گروهی که می‌خواهید ارتقا دهید اجرا کنید.",
    ar: "شغّل /pro داخل المجموعة التي تريد ترقيتها.",
    hi: "जिस ग्रुप को अपग्रेड करना है, उसके अंदर /pro चलाएं।",
  },
  thankYou: {
    en: "✅ Pro unlocked for the group. Month view, {proDays}-day history, and weekly reports are on.\n\n/more — more free tools",
    ru: "✅ Pro активирован для группы. Месячный вид, история {proDays} дней и еженедельные отчёты включены.\n\n/more — другие бесплатные инструменты",
    es: "✅ Pro activado para el grupo. Vista mensual, historial de {proDays} días e informes semanales activados.\n\n/more — más herramientas gratis",
    pt: "✅ Pro ativado para o grupo. Visão mensal, histórico de {proDays} dias e relatórios semanais estão ativos.\n\n/more — mais ferramentas grátis",
    id: "✅ Pro aktif untuk grup. Tampilan bulanan, riwayat {proDays} hari, dan laporan mingguan sudah aktif.\n\n/more — alat gratis lainnya",
    de: "✅ Pro für die Gruppe freigeschaltet. Monatsansicht, {proDays}-Tage-Verlauf und wöchentliche Berichte sind aktiv.\n\n/more — weitere kostenlose Tools",
    tr: "✅ Grup için Pro açıldı. Aylık görünüm, {proDays} günlük geçmiş ve haftalık raporlar etkin.\n\n/more — daha fazla ücretsiz araç",
    uk: "✅ Pro активовано для групи. Місячний вигляд, історія {proDays} днів і щотижневі звіти увімкнені.\n\n/more — інші безкоштовні інструменти",
    fa: "✅ Pro برای گروه فعال شد. نمای ماهانه، تاریخچه {proDays} روزه و گزارش‌های هفتگی روشن است.\n\n/more — ابزارهای رایگان بیشتر",
    ar: "✅ تم تفعيل Pro للمجموعة. العرض الشهري وسجل {proDays} يومًا والتقارير الأسبوعية مفعّلة.\n\n/more — أدوات مجانية أخرى",
    hi: "✅ ग्रुप के लिए Pro अनलॉक हुआ। मासिक व्यू, {proDays}-दिन का इतिहास और साप्ताहिक रिपोर्ट चालू हैं।\n\n/more — और मुफ़्त टूल्स",
  },
  adminOnly: {
    en: "Only group admins can /reset.",
    ru: "Только администраторы группы могут использовать /reset.",
    es: "Solo los administradores del grupo pueden usar /reset.",
    pt: "Somente administradores do grupo podem usar /reset.",
    id: "Hanya admin grup yang dapat menggunakan /reset.",
    de: "Nur Gruppenadmins können /reset verwenden.",
    tr: "/reset yalnızca grup yöneticileri tarafından kullanılabilir.",
    uk: "Лише адміністратори групи можуть використовувати /reset.",
    fa: "فقط ادمین‌های گروه می‌توانند از /reset استفاده کنند.",
    ar: "يمكن فقط لمشرفي المجموعة استخدام /reset.",
    hi: "केवल ग्रुप एडमिन ही /reset इस्तेमाल कर सकते हैं।",
  },
  resetDone: {
    en: "🧹 Group data cleared.",
    ru: "🧹 Данные группы очищены.",
    es: "🧹 Datos del grupo borrados.",
    pt: "🧹 Dados do grupo limpos.",
    id: "🧹 Data grup dihapus.",
    de: "🧹 Gruppendaten gelöscht.",
    tr: "🧹 Grup verileri temizlendi.",
    uk: "🧹 Дані групи очищено.",
    fa: "🧹 داده‌های گروه پاک شد.",
    ar: "🧹 تم مسح بيانات المجموعة.",
    hi: "🧹 ग्रुप का डेटा साफ़ हो गया।",
  },
  btn_addToGroup: {
    en: "Add me to a group", ru: "Добавить в группу", es: "Añadirme a un grupo",
    pt: "Adicionar a um grupo", id: "Tambahkan ke grup", de: "Zu Gruppe hinzufügen",
    tr: "Gruba ekle", uk: "Додати до групи", fa: "افزودن به گروه",
    ar: "أضفني إلى مجموعة", hi: "ग्रुप में जोड़ें",
  },
  btn_shareBot: {
    en: "Share this bot", ru: "Поделиться ботом", es: "Compartir este bot",
    pt: "Compartilhar este bot", id: "Bagikan bot ini", de: "Bot teilen",
    tr: "Botu paylaş", uk: "Поділитися ботом", fa: "اشتراک‌گذاری ربات",
    ar: "شارك هذا البوت", hi: "यह बॉट शेयर करें",
  },
  btn_unlockProStars: {
    en: "Unlock Pro, {stars} ⭐", ru: "Купить Pro, {stars} ⭐", es: "Desbloquear Pro, {stars} ⭐",
    pt: "Desbloquear Pro, {stars} ⭐", id: "Buka Pro, {stars} ⭐", de: "Pro freischalten, {stars} ⭐",
    tr: "Pro'yu aç, {stars} ⭐", uk: "Купити Pro, {stars} ⭐", fa: "باز کردن Pro، {stars} ⭐",
    ar: "فتح Pro، {stars} ⭐", hi: "Pro अनलॉक करें, {stars} ⭐",
  },

  // ---- Mini App (MINIAPP-SPEC.md) ----
  // The 14 keys shared by every bot's Mini App: translations copied verbatim from
  // habit/src/i18n.ts (generic checkout/error/share copy, not bot-specific).
  app_loading: {
    en: "Loading…", ru: "Загрузка…", es: "Cargando…", pt: "Carregando…", id: "Memuat…",
    de: "Wird geladen…", tr: "Yükleniyor…", uk: "Завантаження…", fa: "در حال بارگذاری…",
    ar: "جارٍ التحميل…", hi: "लोड हो रहा है…",
  },
  app_moreApps: {
    en: "More apps", ru: "Другие приложения", es: "Más apps", pt: "Mais apps", id: "Aplikasi lain",
    de: "Mehr Apps", tr: "Diğer uygulamalar", uk: "Інші застосунки", fa: "برنامه‌های بیشتر",
    ar: "تطبيقات أخرى", hi: "और ऐप्स",
  },
  app_shareChat: {
    en: "💬 Share to a chat", ru: "💬 Отправить в чат", es: "💬 Compartir en chat", pt: "💬 Enviar no chat",
    id: "💬 Bagikan ke chat", de: "💬 In Chat teilen", tr: "💬 Sohbette paylaş", uk: "💬 Надіслати в чат",
    fa: "💬 ارسال به گفتگو", ar: "💬 مشاركة في محادثة", hi: "💬 चैट में भेजें",
  },
  app_shareStory: {
    en: "📣 Share to story", ru: "📣 В историю", es: "📣 A tu historia", pt: "📣 Nos stories",
    id: "📣 Bagikan ke story", de: "📣 Als Story teilen", tr: "📣 Hikâyede paylaş", uk: "📣 В історію",
    fa: "📣 اشتراک در استوری", ar: "📣 مشاركة في قصة", hi: "📣 स्टोरी में साझा करें",
  },
  app_shareFail: {
    en: "Sharing is unavailable right now.", ru: "Поделиться сейчас не получилось.",
    es: "Ahora mismo no se puede compartir.", pt: "Não foi possível compartilhar agora.",
    id: "Berbagi sedang tidak tersedia.", de: "Teilen ist gerade nicht möglich.",
    tr: "Şu anda paylaşılamıyor.", uk: "Поділитися зараз не вдалося.",
    fa: "در حال حاضر اشتراک‌گذاری ممکن نیست.", ar: "المشاركة غير متاحة الآن.",
    hi: "अभी साझा नहीं किया जा सकता।",
  },
  app_errNoInit: {
    en: "Open this app from the bot — tap the menu button.", ru: "Откройте это приложение из бота — кнопка меню.",
    es: "Abre esta app desde el bot — toca el botón de menú.", pt: "Abra este app pelo bot — toque no botão de menu.",
    id: "Buka aplikasi ini dari bot — ketuk tombol menu.", de: "Öffne diese App über den Bot — tippe auf den Menü-Button.",
    tr: "Bu uygulamayı bottan aç — menü düğmesine dokun.", uk: "Відкрийте застосунок із бота — кнопка меню.",
    fa: "این برنامه را از داخل ربات باز کنید — دکمه منو.", ar: "افتح هذا التطبيق من البوت — زر القائمة.",
    hi: "यह ऐप बॉट से खोलें — मेनू बटन दबाएँ।",
  },
  app_errExpired: {
    en: "This session expired. Close and reopen the app.", ru: "Сессия истекла. Закройте и откройте приложение снова.",
    es: "La sesión caducó. Cierra y vuelve a abrir la app.", pt: "A sessão expirou. Feche e abra o app de novo.",
    id: "Sesi berakhir. Tutup lalu buka lagi aplikasinya.", de: "Sitzung abgelaufen. App schließen und neu öffnen.",
    tr: "Oturum doldu. Uygulamayı kapatıp yeniden aç.", uk: "Сесія завершилася. Закрийте й відкрийте застосунок.",
    fa: "نشست منقضی شد. برنامه را ببندید و دوباره باز کنید.", ar: "انتهت الجلسة. أغلق التطبيق ثم افتحه من جديد.",
    hi: "सेशन खत्म हो गया। ऐप बंद करके फिर खोलें।",
  },
  app_errBadSig: {
    en: "This link is not valid. Reopen the app from the bot.", ru: "Ссылка недействительна. Откройте приложение из бота.",
    es: "Este enlace no es válido. Abre la app desde el bot.", pt: "Este link não é válido. Abra o app pelo bot.",
    id: "Tautan ini tidak valid. Buka aplikasi dari bot.", de: "Dieser Link ist ungültig. Öffne die App über den Bot.",
    tr: "Bu bağlantı geçersiz. Uygulamayı bottan aç.", uk: "Посилання недійсне. Відкрийте застосунок із бота.",
    fa: "این پیوند معتبر نیست. برنامه را از ربات باز کنید.", ar: "هذا الرابط غير صالح. افتح التطبيق من البوت.",
    hi: "यह लिंक मान्य नहीं है। ऐप बॉट से खोलें।",
  },
  app_unlockPro: {
    en: "🔓 Unlock Pro", ru: "🔓 Открыть Pro", es: "🔓 Desbloquear Pro", pt: "🔓 Desbloquear Pro",
    id: "🔓 Buka Pro", de: "🔓 Pro freischalten", tr: "🔓 Pro'yu aç", uk: "🔓 Відкрити Pro",
    fa: "🔓 فعال‌سازی Pro", ar: "🔓 تفعيل Pro", hi: "🔓 Pro अनलॉक करें",
  },
  app_proOneTime: {
    en: "One-time {n} ⭐", ru: "Разово {n} ⭐", es: "Pago único {n} ⭐", pt: "Único {n} ⭐",
    id: "Sekali bayar {n} ⭐", de: "Einmalig {n} ⭐", tr: "Tek seferlik {n} ⭐", uk: "Разово {n} ⭐",
    fa: "یک‌باره {n} ⭐", ar: "مرة واحدة {n} ⭐", hi: "एकमुश्त {n} ⭐",
  },
  app_proMonthly: {
    en: "Monthly {n} ⭐/mo", ru: "Ежемесячно {n} ⭐", es: "Mensual {n} ⭐/mes", pt: "Mensal {n} ⭐/mês",
    id: "Bulanan {n} ⭐/bln", de: "Monatlich {n} ⭐", tr: "Aylık {n} ⭐/ay", uk: "Щомісяця {n} ⭐",
    fa: "ماهانه {n} ⭐", ar: "شهريًا {n} ⭐", hi: "मासिक {n} ⭐",
  },
  app_payDone: {
    en: "✅ Pro unlocked. Thank you.", ru: "✅ Pro активирован. Спасибо.", es: "✅ Pro activado. Gracias.",
    pt: "✅ Pro ativado. Obrigado.", id: "✅ Pro aktif. Terima kasih.", de: "✅ Pro aktiviert. Danke.",
    tr: "✅ Pro açıldı. Teşekkürler.", uk: "✅ Pro активовано. Дякуємо.", fa: "✅ Pro فعال شد. سپاسگزاریم.",
    ar: "✅ تم تفعيل Pro. شكرًا لك.", hi: "✅ Pro चालू हो गया। धन्यवाद।",
  },
  app_payCancelled: {
    en: "Payment cancelled.", ru: "Оплата отменена.", es: "Pago cancelado.", pt: "Pagamento cancelado.",
    id: "Pembayaran dibatalkan.", de: "Zahlung abgebrochen.", tr: "Ödeme iptal edildi.", uk: "Оплату скасовано.",
    fa: "پرداخت لغو شد.", ar: "أُلغيت عملية الدفع.", hi: "भुगतान रद्द हुआ।",
  },
  app_payFailed: {
    en: "Payment failed. Please try again.", ru: "Оплата не прошла. Попробуйте ещё раз.",
    es: "El pago falló. Inténtalo de nuevo.", pt: "O pagamento falhou. Tente de novo.",
    id: "Pembayaran gagal. Coba lagi.", de: "Zahlung fehlgeschlagen. Bitte erneut versuchen.",
    tr: "Ödeme başarısız. Tekrar dene.", uk: "Оплата не пройшла. Спробуйте ще раз.",
    fa: "پرداخت ناموفق بود. دوباره تلاش کنید.", ar: "فشل الدفع. حاول مرة أخرى.",
    hi: "भुगतान विफल। फिर कोशिश करें।",
  },

  // ---- pulse-specific Mini App keys ----
  app_title: {
    en: "GroupPulse", ru: "GroupPulse", es: "GroupPulse", pt: "GroupPulse", id: "GroupPulse",
    de: "GroupPulse", tr: "GroupPulse", uk: "GroupPulse", fa: "GroupPulse", ar: "GroupPulse", hi: "GroupPulse",
  },
  app_empty: {
    en: "No tracked groups yet…", ru: "Пока нет отслеживаемых групп…", es: "Aún no hay grupos rastreados…",
    pt: "Ainda sem grupos rastreados…", id: "Belum ada grup yang dilacak…", de: "Noch keine erfassten Gruppen…",
    tr: "Henüz izlenen grup yok…", uk: "Поки немає відстежуваних груп…",
    fa: "هنوز گروه ردیابی‌شده‌ای نیست…", ar: "لا توجد مجموعات متتبَّعة بعد…",
    hi: "अभी तक कोई ट्रैक किया गया ग्रुप नहीं…",
  },
  app_storyText: {
    en: "See who's active in your group — free activity leaderboard.",
    ru: "Узнайте, кто активен в вашей группе — бесплатный рейтинг активности.",
    es: "Descubre quién está activo en tu grupo — tabla de actividad gratis.",
    pt: "Descubra quem está ativo no seu grupo — ranking de atividade grátis.",
    id: "Lihat siapa yang aktif di grupmu — papan peringkat aktivitas gratis.",
    de: "Sieh, wer in deiner Gruppe aktiv ist — kostenlose Aktivitäts-Rangliste.",
    tr: "Grubunda kimin aktif olduğunu gör — ücretsiz aktivite lider tablosu.",
    uk: "Дізнайтеся, хто активний у вашій групі — безкоштовний рейтинг активності.",
    fa: "ببینید چه کسی در گروه شما فعال است — رتبه‌بندی فعالیت رایگان.",
    ar: "اكتشف من النشط في مجموعتك — لوحة نشاط مجانية.",
    hi: "देखें आपके ग्रुप में कौन सक्रिय है — मुफ़्त एक्टिविटी लीडरबोर्ड।",
  },
  app_pro: {
    en: "Unlock Pro · {n} ⭐", ru: "Pro · {n} ⭐", es: "Desbloquear · {n} ⭐", pt: "Desbloquear · {n} ⭐",
    id: "Buka Pro · {n} ⭐", de: "Freischalten · {n} ⭐", tr: "Pro'yu aç · {n} ⭐", uk: "Відкрити Pro · {n} ⭐",
    fa: "فعال‌سازی · {n} ⭐", ar: "فتح Pro · {n} ⭐", hi: "अनलॉक करें · {n} ⭐",
  },
  // Null-title fallback for a group row (P1-5: a missing g.title must never throw).
  app_group: {
    en: "Group", ru: "Группа", es: "Grupo", pt: "Grupo", id: "Grup", de: "Gruppe",
    tr: "Grup", uk: "Група", fa: "گروه", ar: "مجموعة", hi: "ग्रुप",
  },
};

/** The 11 language codes this bot ships, in table order. */
export const APP_LANGS: Lang[] = [...LANGS];

/** Every `app_*` key, for every language, as a plain object — the Mini App's embedded
 * `APP_I18N` dictionary. English fills any gap so a client lookup can never miss.
 * Both loops are bounded by the static table (11 languages x the app_* key set). */
export function appDict(): Record<string, Record<string, string>> {
  const keys = (Object.keys(TABLE) as Key[]).filter((k) => k.startsWith("app_"));
  const out: Record<string, Record<string, string>> = {};
  for (const l of LANGS) {
    const m: Record<string, string> = {};
    for (const k of keys) m[k] = TABLE[k][l] ?? TABLE[k].en;
    out[l] = m;
  }
  return out;
}
