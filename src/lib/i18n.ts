import { useEffect, useState } from "react";
import type { Lang } from "./store";

export const nameDict: Record<string, { en: string; hi: string; mr: string }> = {
  Ramesh: { en: "Ramesh", hi: "रमेश", mr: "रमेश" },
  Suresh: { en: "Suresh", hi: "सुरेश", mr: "सुरेश" },
  Mahesh: { en: "Mahesh", hi: "महेश", mr: "महेश" },
  Ganesh: { en: "Ganesh", hi: "गणेश", mr: "गणेश" },
  Vijay: { en: "Vijay", hi: "विजय", mr: "विजय" },
  Sunil: { en: "Sunil", hi: "सुनील", mr: "सुनील" },
  Anil: { en: "Anil", hi: "अनिल", mr: "अनिल" },
  Rajesh: { en: "Rajesh", hi: "राजेश", mr: "राजेश" },
  Sneha: { en: "Sneha", hi: "स्नेहा", mr: "स्नेहा" },
  Pooja: { en: "Pooja", hi: "पूजा", mr: "पूजा" },
  Rahul: { en: "Rahul", hi: "राहुल", mr: "राहुल" },
  Priya: { en: "Priya", hi: "प्रिया", mr: "प्रिया" },
  "Test xyz": { en: "Test xyz", hi: "टेस्ट एक्सवाईजेड", mr: "टेस्ट एक्सवायझेड" },
};

export function translateName(name: string, lang: Lang): string {
  if (!name) return "";
  const clean = name.trim();
  if (nameDict[clean]) return nameDict[clean][lang];
  const key = Object.keys(nameDict).find((k) => k.toLowerCase() === clean.toLowerCase());
  if (key && nameDict[key]) return nameDict[key][lang];
  return name;
}

const dict = {
  // Navigation Tabs
  navHome: { en: "Home", hi: "होम", mr: "मुख्यपृष्ठ" },
  navCommuter: { en: "Commuter", hi: "यात्री", mr: "प्रवासी" },
  navConsole: { en: "Family Console", hi: "परिवार कंसोल", mr: "कुटुंब कन्सोल" },
  navOnboard: { en: "Onboard Driver", hi: "चालक जोड़ें", mr: "चालक जोडा" },

  // Home Page
  heroTitle: {
    en: "No screenshots. Only proof.",
    hi: "कोई स्क्रीनशॉट नहीं. केवल पक्का सबूत.",
    mr: "कोणतेही स्क्रीनशॉट नाही. फक्त पुरावा.",
  },
  heroDesc: {
    en: "UPI verification for Mumbai auto drivers carrying only a 2G keypad phone. The family member who holds the UPI account confirms each fare in real time, and the driver instantly receives an SMS.",
    hi: "2G कीपैड फोन वाले मुंबई ऑटो चालकों के लिए UPI सत्यापन। परिवार का सदस्य बैंक क्रेडिट देखकर तुरंत पुष्टि करता है और चालक को SMS मिलता है।",
    mr: "2G कीपॅड फोन वापरणाऱ्या मुंबईतील ऑटो चालकांसाठी UPI पडताळणी. कुटुंब रिअल क्रेडिट पाहून पुष्टी करते आणि चालकाला लगेच SMS मिळतो.",
  },
  step1Title: {
    en: "Scan & enter fare",
    hi: "स्कैन करें और किराया लिखें",
    mr: "स्कॅन करा आणि भाडे लिहा",
  },
  step1Desc: {
    en: "Commuter scans the sticker and types the meter fare.",
    hi: "यात्री स्टिकर स्कैन करके मीटर किराया लिखता है।",
    mr: "प्रवासी स्टिकर स्कॅन करून मीटर भाडे लिहितो.",
  },
  step2Title: {
    en: "Pay in own UPI app",
    hi: "अपने UPI ऐप से भुगतान करें",
    mr: "आपल्या UPI ॲपवरून पैसे भरा",
  },
  step2Desc: {
    en: "Payee and token note AM#### are pre-filled automatically.",
    hi: "भुगतानकर्ता और टोकन नोट AM#### पहले से भरे होते हैं।",
    mr: "पेई आणि टोकन नोट AM#### आधीच भरलेले असतात.",
  },
  step3Title: { en: "Show the token", hi: "स्क्रीन पर 4 अंक दिखाएं", mr: "स्क्रीनवर 4 अंक दाखवा" },
  step3Desc: {
    en: "Giant 4 digits on screen; driver gets matching SMS on keypad phone.",
    hi: "स्क्रीन पर बड़े 4 अंक; चालक को वही टोकन SMS से मिलता है।",
    mr: "स्क्रीनवर मोठे 4 अंक; चालकाला तोच टोकन SMS द्वारे मिळतो.",
  },
  step4Title: { en: "Family confirms", hi: "परिवार पुष्टि करता है", mr: "कुटुंब पुष्टी करते" },
  step4Desc: {
    en: "Proxy verifies bank credit and taps Confirm. Driver gets CONFIRMED SMS.",
    hi: "परिवार बैंक क्रेडिट देखकर Confirm दबाता है। चालक को CONFIRMED SMS मिलता है।",
    mr: "कुटुंब बँक क्रेडिट पाहून Confirm दाबते. चालकाला CONFIRMED SMS मिळतो.",
  },
  demoNotice: {
    en: "Demo mode: open commuter and family console in two tabs to see real-time sync.",
    hi: "डेमो मोड: वास्तविक समय सिंक देखने के लिए दो टैब में यात्री और कंसोल खोलें।",
    mr: "डेमो मोड: रिअल-टाइम सिंक पाहण्यासाठी दोन टॅबमध्ये प्रवासी आणि कन्सोल उघडा.",
  },
  resetDemoBtn: { en: "Reset demo", hi: "डेमो रीसेट करें", mr: "डेमो रीसेट करा" },

  // Commuter Flow
  meterFare: { en: "Meter fare", hi: "मीटर किराया", mr: "मीटर भाडे" },
  passengerName: {
    en: "Passenger / Sender Name",
    hi: "यात्री / भेजने वाले का नाम",
    mr: "प्रवासी / पाठवणाऱ्याचे नाव",
  },
  passengerPlaceholder: {
    en: "e.g. Test xyz",
    hi: "जैसे टेस्ट एक्सवाईजेड",
    mr: "उदा. टेस्ट एक्सवायझेड",
  },
  pay: { en: "Pay", hi: "भुगतान करें", mr: "पैसे भरा" },
  footer: {
    en: "Pays directly to the driver's family account",
    hi: "सीधे ड्राइवर के परिवार के खाते में",
    mr: "थेट चालकाच्या कुटुंबाच्या खात्यात",
  },
  ready: { en: "Ready", hi: "तैयार", mr: "तयार" },
  awaiting: { en: "Awaiting", hi: "प्रतीक्षा", mr: "प्रतीक्षा" },
  verified: { en: "Verified", hi: "पुष्टि", mr: "पुष्टी" },
  failed: { en: "Failed", hi: "रद्द", mr: "रद्द" },
  amountRule: { en: "Enter ₹10 to ₹5000", hi: "₹10 से ₹5000 तक लिखें", mr: "₹10 ते ₹5000 लिहा" },
  openUpi: { en: "Open UPI App", hi: "UPI ऐप खोलें", mr: "UPI ॲप उघडा" },
  noUpi: {
    en: "No UPI app? Copy this ID and pay manually:",
    hi: "UPI ऐप नहीं खुला? यह ID कॉपी करके भुगतान करें:",
    mr: "UPI ॲप उघडले नाही? हा ID कॉपी करून पैसे भरा:",
  },
  noteToken: { en: "Add note", hi: "नोट में लिखें", mr: "नोटमध्ये लिहा" },
  didPay: {
    en: "Did your payment go through?",
    hi: "क्या आपका भुगतान हो गया?",
    mr: "तुमचे पैसे गेले का?",
  },
  iPaid: { en: "I have paid", hi: "मैंने भुगतान किया", mr: "मी पैसे भरले" },
  cancel: { en: "Cancel", hi: "रद्द करें", mr: "रद्द करा" },
  token: { en: "TOKEN", hi: "टोकन", mr: "टोकन" },
  showDriver: { en: "Show this to the driver", hi: "यह ड्राइवर को दिखाएं", mr: "हे चालकाला दाखवा" },
  waitingConfirm: {
    en: "Waiting for family to confirm credit",
    hi: "परिवार की पुष्टि का इंतज़ार",
    mr: "कुटुंबाच्या पुष्टीची वाट",
  },
  confirmed: { en: "CONFIRMED", hi: "पुष्टि हुई", mr: "पुष्टी झाली" },
  notPaid: { en: "NOT PAID", hi: "भुगतान नहीं हुआ", mr: "पैसे मिळाले नाहीत" },
  doNotRelease: { en: "Do not release", hi: "जाने न दें", mr: "सोडू नका" },
  retry: { en: "Try again", hi: "फिर से कोशिश करें", mr: "पुन्हा प्रयत्न करा" },
  brightness: {
    en: "Tip: raise screen brightness",
    hi: "सुझाव: स्क्रीन की रोशनी बढ़ाएं",
    mr: "सूचना: स्क्रीनचा प्रकाश वाढवा",
  },
  invalidQr: {
    en: "This QR is no longer active",
    hi: "यह QR अब सक्रिय नहीं है",
    mr: "हा QR आता सक्रिय नाही",
  },

  // Family Console
  proxyConsole: {
    en: "Family Proxy Console",
    hi: "परिवार प्रॉक्सी कंसोल",
    mr: "कुटुंब प्रॉक्सी कन्सोल",
  },
  proxySubtitle: {
    en: "Check your bank credit for note AM####, then verify.",
    hi: "नोट AM#### के साथ बैंक क्रेडिट देखें, फिर पुष्टि करें।",
    mr: "नोट AM#### सह बँक क्रेडिट तपासा, नंतर पुष्टी करा.",
  },
  senderNameLabel: { en: "Sender's name", hi: "भेजने वाले का नाम", mr: "पाठवणाऱ्याचे नाव" },
  amountLabel: { en: "Amount", hi: "राशि", mr: "रक्कम" },
  statusLabel: { en: "Status", hi: "स्थिति", mr: "स्थिती" },
  statusSuccess: { en: "Success", hi: "सफल", mr: "यशस्वी" },
  statusPending: { en: "Pending Confirmation", hi: "पुष्टि लंबित", mr: "पुष्टी प्रलंबित" },
  statusFailed: { en: "Failed", hi: "विफल", mr: "अयशस्वी" },
  tokenLabel: { en: "Token AM", hi: "टोकन AM", mr: "टोकन AM" },
  confirmBtn: { en: "Confirm", hi: "पुष्टि करें", mr: "पुष्टी करा" },
  rejectBtn: { en: "Reject", hi: "अस्वीकार करें", mr: "नाकारा" },
  awaitingTab: { en: "Awaiting", hi: "प्रतीक्षारत", mr: "प्रतीक्षेत" },
  confirmedTab: { en: "Confirmed", hi: "पुष्टि हुई", mr: "पुष्टी झाली" },
  failedTab: { en: "Failed", hi: "विफल", mr: "अयशस्वी" },
  driver: { en: "Driver", hi: "चालक", mr: "चालक" },
  simulatedInbox: {
    en: "Simulated 2G SMS Inbox",
    hi: "सिम्युलेटेड 2G SMS इनबॉक्स",
    mr: "सिम्युलेटेड 2G SMS इनबॉक्स",
  },
  simulatedKeypadTitle: {
    en: "Simulated 2G Keypad Inbox",
    hi: "सिम्युलेटेड 2G कीपैड SMS इनबॉक्स",
    mr: "सिम्युलेटेड 2G कीपॅड SMS इनबॉक्स",
  },
  emptySessions: {
    en: "Nothing in this list. Open the commuter page to initiate a fare.",
    hi: "इस सूची में कुछ नहीं है। किराया शुरू करने के लिए यात्री पृष्ठ खोलें।",
    mr: "या सूचीमध्ये काहीही नाही. भाडे सुरू करण्यासाठी प्रवासी पृष्ठ उघडा.",
  },

  // Onboard Page
  onboardTitle: { en: "Onboard a driver", hi: "ऑटो चालक जोड़ें", mr: "ऑटो चालक जोडा" },
  onboardSubtitle: {
    en: "Bind a driver's 2G phone to your family UPI ID and print their dashboard QR sticker.",
    hi: "चालक के 2G फोन को अपने परिवार UPI ID से जोड़ें और डैशबोर्ड QR स्टिकर प्रिंट करें।",
    mr: "चालकाचा 2G फोन कुटुंबाच्या UPI ID शी जोडा आणि डॅशबोर्ड QR स्टिकर प्रिंट करा.",
  },
  driverFirstName: { en: "Driver first name", hi: "चालक का नाम", mr: "चालकाचे नाव" },
  vehicle: { en: "Vehicle", hi: "गाड़ी", mr: "गाडी" },
  vehicleNumber: {
    en: "Vehicle number",
    hi: "गाड़ी नंबर (जैसे MH02AB1234)",
    mr: "गाडी क्रमांक (उदा. MH02AB1234)",
  },
  familyPhone: { en: "Family (proxy) phone", hi: "परिवार का फोन नंबर", mr: "कुटुंबाचा फोन नंबर" },
  driverKeypadPhone: {
    en: "Driver 2G keypad phone",
    hi: "चालक का कीपैड फोन नंबर",
    mr: "चालकाचा कीपॅड फोन नंबर",
  },
  sendOtpBtn: { en: "Send OTP", hi: "OTP भेजें", mr: "OTP पाठवा" },
  enterOtp: {
    en: "Enter OTP received by driver",
    hi: "चालक को मिला OTP लिखें",
    mr: "चालकाला मिळालेला OTP लिहा",
  },
  familyUpiId: {
    en: "Family UPI ID (for receiving fares)",
    hi: "परिवार UPI ID (पैसे प्राप्त करने के लिए)",
    mr: "कुटुंब UPI ID (पैसे मिळवण्यासाठी)",
  },
  driverSmsLang: { en: "Driver SMS language", hi: "चालक SMS भाषा", mr: "चालक SMS भाषा" },
  consentText: {
    en: "I agree to receive passenger fares into my UPI account and verify them. The driver agrees to receive SMS alerts on their keypad phone.",
    hi: "मैं अपने UPI खाते में यात्री किराया प्राप्त करने और पुष्टि करने के लिए सहमत हूँ। चालक अपने फोन पर SMS प्राप्त करने के लिए सहमत है।",
    mr: "मी माझ्या UPI खात्यात प्रवासी भाडे मिळवण्यास आणि पुष्टी करण्यास सहमत आहे. चालक त्याच्या फोनवर SMS मिळवण्यास सहमत आहे.",
  },
  createStickerBtn: { en: "Create QR sticker", hi: "QR स्टिकर बनाएं", mr: "QR स्टिकर तयार करा" },
  printStickerBtn: { en: "Print Sticker", hi: "स्टिकर प्रिंट करें", mr: "स्टिकर प्रिंट करा" },
  rotateQrBtn: { en: "Rotate QR", hi: "QR कोड बदलें", mr: "QR कोड बदला" },
  tabActiveStickers: {
    en: "Active Auto QR Stickers",
    hi: "सक्रिय ऑटो QR स्टिकर",
    mr: "सक्रिय ऑटो QR स्टिकर",
  },
  tabRegisterNew: { en: "Register New Auto", hi: "नया ऑटो जोड़ें", mr: "नवीन ऑटो जोडा" },

  // Sticker Card Keys
  stickerBrand: { en: "AutoMitra · UPI", hi: "ऑटोमित्र · UPI", mr: "ऑटोमित्र · UPI" },
  stickerTransit: { en: "MUMBAI TRANSIT", hi: "मुंबई ट्रान्सिट", mr: "मुंबई ट्रान्सिट" },
  stickerScanQr: {
    en: "Scan QR with any app",
    hi: "किसी भी ऐप से स्कैन करें",
    mr: "कोणत्याही ॲपवरून स्कॅन करा",
  },
  stickerDriverLabel: { en: "Driver", hi: "चालक", mr: "चालक" },
  stickerAutoLabel: { en: "Auto Rickshaw", hi: "ऑटो रिक्शा", mr: "ऑटो रिक्षा" },
  stickerSlugLabel: { en: "QR Code ID", hi: "QR कोड आईडी", mr: "QR कोड आयडी" },
  stickerInstructionTitle: {
    en: "Scan to pay meter fare",
    hi: "मीटर किराया देने के लिए स्कैन करें",
    mr: "मीटर भाडे देण्यासाठी स्कॅन करा",
  },
  stickerInstructionSubtitle: {
    en: "Show 4-digit token to driver upon payment",
    hi: "भुगतान के बाद चालक को 4 अंकों का टोकन दिखाएं",
    mr: "पैसे भरल्यानंतर चालकाला 4 अंकांचा टोकन दाखवा",
  },
  stickerStep1: { en: "1. Scan QR", hi: "१. QR स्कैन", mr: "१. QR स्कॅन" },
  stickerStep2: { en: "2. Pay Fare", hi: "२. किराया भरें", mr: "२. भाडे भरा" },
  stickerStep3: { en: "3. Show 4-Digit Token", hi: "३. ४-अंक दिखाएं", mr: "३. ४-अंक दाखवा" },
  stickerSecurityVerify: {
    en: "Official Mumbai Auto Transit Verification",
    hi: "आधिकारिक मुंबई ऑटो ट्रांजिट सत्यापन",
    mr: "अधिकृत मुंबई ऑटो ट्रान्सिट पडताळणी",
  },
  driverDetailsTitle: { en: "Driver Details", hi: "चालक विवरण", mr: "चालक तपशील" },
  stickerGuidanceTitle: {
    en: "Dashboard Sticker Guidance",
    hi: "डैशबोर्ड स्टिकर निर्देश",
    mr: "डॅशबोर्ड स्टिकर मार्गदर्शन",
  },
  stickerGuidanceDesc: {
    en: "Print on 148×105mm standard waterproof vinyl and attach to the inside passenger partition.",
    hi: "148×105mm मानक वाटरप्रूफ विनाइल पर प्रिंट करें और अंदर यात्री विभाजन पर लगाएं।",
    mr: "148×105mm मानक वॉटरप्रूफ विनाइलवर प्रिंट करा आणि आतील प्रवासी पार्टीशनवर लावा.",
  },
} as const;

export type Key = keyof typeof dict;

export function useLang() {
  const [lang, setLang] = useState<Lang>("en");

  useEffect(() => {
    if (typeof window === "undefined") return;
    const m = document.cookie.match(/am_lang=(en|hi|mr)/);
    if (m) setLang(m[1] as Lang);

    const onLang = (e: Event) => {
      const detail = (e as CustomEvent<Lang>).detail;
      if (detail && (detail === "en" || detail === "hi" || detail === "mr")) {
        setLang(detail);
      }
    };
    window.addEventListener("am_lang_change", onLang);
    return () => window.removeEventListener("am_lang_change", onLang);
  }, []);

  const set = (l: Lang) => {
    if (typeof window !== "undefined") {
      document.cookie = `am_lang=${l};path=/;max-age=31536000`;
      window.dispatchEvent(new CustomEvent("am_lang_change", { detail: l }));
    }
    setLang(l);
  };

  const t = (k: Key): string => {
    const item = dict[k];
    if (!item) return String(k);
    return item[lang] ?? item.en;
  };

  const tn = (name: string): string => translateName(name, lang);

  return { lang, setLang: set, t, tn };
}
