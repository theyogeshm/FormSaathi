import React, { useState, useEffect, useRef } from 'react';
import { Camera, Mic, Search, CheckCircle2, Upload, FileText, Download, QrCode, Sparkles, RefreshCw, AlertCircle, Printer } from 'lucide-react';
import { ShowcaseTab, DemoDocument, FormTemplate, FormField } from '../types';
import { DEMO_DOCUMENTS, FORM_TEMPLATES, LANGUAGES } from '../data';
import { t } from '../translations';
import csvContent from '../../data/formsaathi_fake_users.csv?raw';

const parseCSV = (csvText: string) => {
  const lines = csvText.trim().split('\n');
  if (lines.length === 0) return [];
  
  const rawHeaders = lines[0].split(',');
  const headers = rawHeaders.map(h => {
    let clean = h.trim().replace(/^"|"$/g, '').toLowerCase();
    if (clean.includes('ustomer_id')) {
      return 'customer_id';
    }
    return clean;
  });

  const records: Record<string, string>[] = [];
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    const values = [];
    let currentVal = '';
    let inQuotes = false;

    for (let j = 0; j < line.length; j++) {
      const char = line[j];
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        values.push(currentVal.trim());
        currentVal = '';
      } else {
        currentVal += char;
      }
    }
    values.push(currentVal.trim());

    const record: Record<string, string> = {};
    headers.forEach((header, index) => {
      let val = values[index] || '';
      val = val.replace(/^"|"$/g, '').trim();
      record[header] = val;
    });
    records.push(record);
  }
  return records;
};

const csvRecords = parseCSV(csvContent);

interface ShowcaseProps {
  initialActiveTab?: ShowcaseTab;
  key?: any;
  currentLang?: string;
  onChangeLang?: (lang: string) => void;
}

export default function Showcase({ initialActiveTab = 'photo', currentLang = 'en', onChangeLang }: ShowcaseProps) {
  const [activeTab, setActiveTab] = useState<ShowcaseTab>(initialActiveTab);
  const [selectedDoc, setSelectedDoc] = useState<DemoDocument | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<FormTemplate>(FORM_TEMPLATES[0]);
  const [formFields, setFormFields] = useState<FormField[]>(FORM_TEMPLATES[0].fields);
  const [isScanning, setIsScanning] = useState<boolean>(false);
  const [scanProgress, setScanProgress] = useState<number>(0);
  const [scanningStatus, setScanningStatus] = useState<string>('');
  
  // Voice Simulation states
  const [isVoiceRecording, setIsVoiceRecording] = useState<boolean>(false);
  const [voiceStep, setVoiceStep] = useState<number>(0);
  const [voiceTranscript, setVoiceTranscript] = useState<string>('');
  const [voiceTranslation, setVoiceTranslation] = useState<string>('');

  // Search Template states
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Language is driven by the global currentLang prop from App

  // PDF & QR Modal state
  const [showResultModal, setShowResultModal] = useState<boolean>(false);
  const [pdfGenerationStatus, setPdfGenerationStatus] = useState<'idle' | 'generating' | 'success'>('idle');

  // Custom audio/mic animation
  const [soundwaveBars, setSoundwaveBars] = useState<number[]>([15, 30, 10, 45, 25, 12, 35, 18]);

  // Guided Walkthrough states
  const [guidedFieldIndex, setGuidedFieldIndex] = useState<number>(-1);
  const [isWalkthroughPlaying, setIsWalkthroughPlaying] = useState<boolean>(false);

  // Upload preview states
  const [uploadedImageSrc, setUploadedImageSrc] = useState<string | null>(null);
  const [pendingUploadedDoc, setPendingUploadedDoc] = useState<DemoDocument | null>(null);

  // Active User record from CSV
  const [activeUserRecord, setActiveUserRecord] = useState<Record<string, string> | null>(null);

  // TTS Voice Assistance state
  const [activeSpeechId, setActiveSpeechId] = useState<string | null>(null);
  const [isSpeaking, setIsSpeaking] = useState<boolean>(false);

  // Autofill status message for demo feedback
  const [autofillStatusMessage, setAutofillStatusMessage] = useState<string>('');

  // Handle active tab changes
  useEffect(() => {
    resetDemoState();
  }, [activeTab]);

  // Reset states
  const resetDemoState = () => {
    setSelectedDoc(null);
    setIsScanning(false);
    setScanProgress(0);
    setScanningStatus('');
    setIsVoiceRecording(false);
    setVoiceStep(0);
    setVoiceTranscript('');
    setVoiceTranslation('');
    setGuidedFieldIndex(-1);
    setIsWalkthroughPlaying(false);
    setUploadedImageSrc(null);
    setPendingUploadedDoc(null);
    setActiveUserRecord(null);
    setAutofillStatusMessage('');
    // Clear form fields
    const cleared = selectedTemplate.fields.map(f => ({ ...f, value: '', confidence: 0 }));
    setFormFields(cleared);
  };

  // Language code mapping for Web Speech API
  const getLangCode = (lang: string): string => {
    const map: Record<string, string> = {
      en: 'en-IN',
      hinglish: 'hi-IN',
      hi: 'hi-IN',
      ta: 'ta-IN',
      bn: 'bn-IN',
      mr: 'mr-IN',
      te: 'te-IN',
    };
    return map[lang] || 'en-IN';
  };

  // Speak text using Web Speech API
  const speakText = (text: string, speechId: string, lang?: string) => {
    if (!('speechSynthesis' in window)) return;
    // Stop any ongoing speech
    window.speechSynthesis.cancel();
    // If same button clicked while playing → toggle off
    if (activeSpeechId === speechId && isSpeaking) {
      setActiveSpeechId(null);
      setIsSpeaking(false);
      return;
    }
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = lang || getLangCode(currentLang);
    utterance.rate = 0.92;
    utterance.pitch = 1;
    utterance.onstart = () => { setActiveSpeechId(speechId); setIsSpeaking(true); };
    utterance.onend = () => { setActiveSpeechId(null); setIsSpeaking(false); };
    utterance.onerror = () => { setActiveSpeechId(null); setIsSpeaking(false); };
    window.speechSynthesis.speak(utterance);
  };

  // Stop all speech
  const stopSpeech = () => {
    if ('speechSynthesis' in window) window.speechSynthesis.cancel();
    setActiveSpeechId(null);
    setIsSpeaking(false);
  };

  // Field focus handler
  const handleFieldFocus = (fieldId: string) => {
    const index = formFields.findIndex(f => f.id === fieldId);
    if (index !== -1) {
      setGuidedFieldIndex(index);
    }
  };

  // Multilingual guidance text per field
  const getFieldGuidanceAll = (fieldId: string): Record<string, { tip: string; regional: string; reason: string }> => {
    const db: Record<string, Record<string, { tip: string; regional: string; reason: string }>> = {
      fullName: {
        en: { tip: 'Enter your full legal name as it appears on your official bank records. Do not use initials.', regional: 'Enter your complete name exactly as written in your Aadhaar or PAN card.', reason: 'Required to match regulatory databases for KYC compliance checks.' },
        hinglish: { tip: 'Enter your full legal name as it appears on your official bank records. Do not use initials.', regional: 'Apna pura naam likhein jaise Aadhaar ya PAN card mein likha hai. Initials mat use karein.', reason: 'Required to match regulatory databases for KYC compliance checks.' },
        hi: { tip: 'Enter your full legal name as it appears on your official bank records. Do not use initials.', regional: 'कृपया अपना पूरा कानूनी नाम दर्ज करें जैसा कि आपके आधार या पैन कार्ड में है। शुरुआती अक्षरों का उपयोग न करें।', reason: 'Required to match regulatory databases for KYC compliance checks.' },
        ta: { tip: 'Enter your full legal name as it appears on your official bank records. Do not use initials.', regional: 'உங்கள் ஆதார் அல்லது பான் கார்டில் உள்ளபடி முழு பெயரை உள்ளிடவும். சுருக்கெழுத்துகளை பயன்படுத்தாதீர்கள்.', reason: 'Required to match regulatory databases for KYC compliance checks.' },
        bn: { tip: 'Enter your full legal name as it appears on your official bank records. Do not use initials.', regional: 'আপনার আধার বা প্যান কার্ডে যেমন আছে ঠিক তেমন পুরো নাম লিখুন। সংক্ষিপ্ত অক্ষর ব্যবহার করবেন না।', reason: 'Required to match regulatory databases for KYC compliance checks.' },
        mr: { tip: 'Enter your full legal name as it appears on your official bank records. Do not use initials.', regional: 'आधार किंवा पॅन कार्डवर जसे आहे तसे पूर्ण नाव लिहा. शॉर्टफॉर्म वापरू नका.', reason: 'Required to match regulatory databases for KYC compliance checks.' },
        te: { tip: 'Enter your full legal name as it appears on your official bank records. Do not use initials.', regional: 'మీ ఆధార్ లేదా పాన్ కార్డులో ఉన్న పూర్తి పేరు నమోదు చేయండి. సంక్షిప్తాలు వాడవద్దు.', reason: 'Required to match regulatory databases for KYC compliance checks.' },
      },
      fatherName: {
        en: { tip: 'Provide the full name of your father or spouse. Write legal names only.', regional: 'Write the full name of your father or husband/wife as on government documents.', reason: 'Used for identity verification and unique profile documentation.' },
        hinglish: { tip: 'Provide the full name of your father or spouse. Write legal names only.', regional: 'Apne pita ya spouse ka pura naam likhein jaise government documents mein hai.', reason: 'Used for identity verification and unique profile documentation.' },
        hi: { tip: 'Provide the full name of your father or spouse. Write legal names only.', regional: 'अपने पिता या जीवनसाथी का पूरा नाम दर्ज करें जैसा सरकारी दस्तावेज़ में है।', reason: 'Used for identity verification and unique profile documentation.' },
        ta: { tip: 'Provide the full name of your father or spouse. Write legal names only.', regional: 'உங்கள் தந்தை அல்லது துணைவியின் முழு பெயரை அரசாங்க ஆவணங்களில் உள்ளவாறு எழுதவும்.', reason: 'Used for identity verification and unique profile documentation.' },
        bn: { tip: 'Provide the full name of your father or spouse. Write legal names only.', regional: 'আপনার বাবা বা স্বামী/স্ত্রীর পুরো নাম সরকারি নথি অনুযায়ী লিখুন।', reason: 'Used for identity verification and unique profile documentation.' },
        mr: { tip: 'Provide the full name of your father or spouse. Write legal names only.', regional: 'वडिलांचे किंवा पती/पत्नीचे सरकारी कागदपत्रांवरील पूर्ण नाव लिहा.', reason: 'Used for identity verification and unique profile documentation.' },
        te: { tip: 'Provide the full name of your father or spouse. Write legal names only.', regional: 'మీ తండ్రి లేదా జీవిత భాగస్వామి పూర్తి పేరు ప్రభుత్వ పత్రాల ప్రకారం నమోదు చేయండి.', reason: 'Used for identity verification and unique profile documentation.' },
      },
      dob: {
        en: { tip: 'Enter your date of birth in YYYY-MM-DD format (e.g., 1985-04-12). Must match official ID proofs.', regional: 'Write your birth date in YYYY-MM-DD format matching your Aadhaar card.', reason: 'Needed to check age limits and fulfill banking registration policies.' },
        hinglish: { tip: 'Enter your date of birth in YYYY-MM-DD format (e.g., 1985-04-12). Must match official ID proofs.', regional: 'Janam tithi YYYY-MM-DD format mein likhein, jaise Aadhaar mein hai.', reason: 'Needed to check age limits and fulfill banking registration policies.' },
        hi: { tip: 'Enter your date of birth in YYYY-MM-DD format (e.g., 1985-04-12). Must match official ID proofs.', regional: 'अपनी जन्म तिथि YYYY-MM-DD प्रारूप में दर्ज करें जैसा आधार कार्ड में है।', reason: 'Needed to check age limits and fulfill banking registration policies.' },
        ta: { tip: 'Enter your date of birth in YYYY-MM-DD format (e.g., 1985-04-12). Must match official ID proofs.', regional: 'உங்கள் பிறந்த தேதியை YYYY-MM-DD வடிவில் ஆதார் கார்டு படி உள்ளிடவும்.', reason: 'Needed to check age limits and fulfill banking registration policies.' },
        bn: { tip: 'Enter your date of birth in YYYY-MM-DD format (e.g., 1985-04-12). Must match official ID proofs.', regional: 'আপনার জন্ম তারিখ YYYY-MM-DD ফরম্যাটে আধার কার্ড অনুযায়ী লিখুন।', reason: 'Needed to check age limits and fulfill banking registration policies.' },
        mr: { tip: 'Enter your date of birth in YYYY-MM-DD format (e.g., 1985-04-12). Must match official ID proofs.', regional: 'आधार कार्डनुसार जन्म तारीख YYYY-MM-DD स्वरूपात लिहा.', reason: 'Needed to check age limits and fulfill banking registration policies.' },
        te: { tip: 'Enter your date of birth in YYYY-MM-DD format (e.g., 1985-04-12). Must match official ID proofs.', regional: 'మీ ఆధార్ కార్డు ప్రకారం పుట్టిన తేదీని YYYY-MM-DD ఆకారంలో నమోదు చేయండి.', reason: 'Needed to check age limits and fulfill banking registration policies.' },
      },
      gender: {
        en: { tip: 'Select your legal gender from the dropdown menu options.', regional: 'Select the gender that matches your official identity documents.', reason: 'Important demographical parameter required by regulatory frameworks.' },
        hinglish: { tip: 'Select your legal gender from the dropdown menu options.', regional: 'Dropdown se apna gender select karein jo aapke official documents mein hai.', reason: 'Important demographical parameter required by regulatory frameworks.' },
        hi: { tip: 'Select your legal gender from the dropdown menu options.', regional: 'ड्रॉपडाउन से अपना लिंग चुनें जो आपके सरकारी दस्तावेज़ में है।', reason: 'Important demographical parameter required by regulatory frameworks.' },
        ta: { tip: 'Select your legal gender from the dropdown menu options.', regional: 'உங்கள் அரசாங்க ஆவணங்களுடன் பொருந்தும் பாலினத்தை தேர்ந்தெடுக்கவும்.', reason: 'Important demographical parameter required by regulatory frameworks.' },
        bn: { tip: 'Select your legal gender from the dropdown menu options.', regional: 'আপনার সরকারি পরিচয়পত্র অনুযায়ী লিঙ্গ নির্বাচন করুন।', reason: 'Important demographical parameter required by regulatory frameworks.' },
        mr: { tip: 'Select your legal gender from the dropdown menu options.', regional: 'सरकारी कागदपत्रांशी जुळणारे लिंग निवडा.', reason: 'Important demographical parameter required by regulatory frameworks.' },
        te: { tip: 'Select your legal gender from the dropdown menu options.', regional: 'మీ అధికారిక పత్రాలకు సరిపోయే లింగాన్ని ఎంచుకోండి.', reason: 'Important demographical parameter required by regulatory frameworks.' },
      },
      phone: {
        en: { tip: 'Enter your active 10-digit mobile number linked to your bank account and Aadhaar.', regional: 'Enter the mobile number linked to your Aadhaar and bank account.', reason: 'Required for OTP validations, alerts, and transactional communications.' },
        hinglish: { tip: 'Enter your active 10-digit mobile number linked to your bank account and Aadhaar.', regional: 'Apna 10-digit mobile number daalen jo Aadhaar aur bank account se linked hai.', reason: 'Required for OTP validations, alerts, and transactional communications.' },
        hi: { tip: 'Enter your active 10-digit mobile number linked to your bank account and Aadhaar.', regional: 'अपने बैंक और आधार से जुड़ा 10-अंकीय मोबाइल नंबर दर्ज करें।', reason: 'Required for OTP validations, alerts, and transactional communications.' },
        ta: { tip: 'Enter your active 10-digit mobile number linked to your bank account and Aadhaar.', regional: 'ஆதார் மற்றும் வங்கிக் கணக்குடன் இணைக்கப்பட்ட 10 இலக்க மொபைல் எண்ணை உள்ளிடவும்.', reason: 'Required for OTP validations, alerts, and transactional communications.' },
        bn: { tip: 'Enter your active 10-digit mobile number linked to your bank account and Aadhaar.', regional: 'আধার ও ব্যাংক অ্যাকাউন্টের সাথে যুক্ত ১০ সংখ্যার মোবাইল নম্বর লিখুন।', reason: 'Required for OTP validations, alerts, and transactional communications.' },
        mr: { tip: 'Enter your active 10-digit mobile number linked to your bank account and Aadhaar.', regional: 'आधार आणि बँक खात्याशी जोडलेला 10 अंकी मोबाईल नंबर टाका.', reason: 'Required for OTP validations, alerts, and transactional communications.' },
        te: { tip: 'Enter your active 10-digit mobile number linked to your bank account and Aadhaar.', regional: 'ఆధార్ మరియు బ్యాంకు ఖాతాతో అనుసంధానమైన 10 అంకెల మొబైల్ నంబర్ నమోదు చేయండి.', reason: 'Required for OTP validations, alerts, and transactional communications.' },
      },
      address: {
        en: { tip: 'Enter your complete residential address including flat number, building, street, and locality.', regional: 'Write your full home address as it appears on your Aadhaar card.', reason: 'Necessary for mailing debit cards, checkbooks, and physical statements.' },
        hinglish: { tip: 'Enter your complete residential address including flat number, building, street, and locality.', regional: 'Apna pura ghar ka address likhein jaise Aadhaar mein hai — flat number, building, gali, sheher.', reason: 'Necessary for mailing debit cards, checkbooks, and physical statements.' },
        hi: { tip: 'Enter your complete residential address including flat number, building, street, and locality.', regional: 'फ्लैट नंबर, इमारत, गली और इलाके सहित अपना पूरा आवासीय पता दर्ज करें।', reason: 'Necessary for mailing debit cards, checkbooks, and physical statements.' },
        ta: { tip: 'Enter your complete residential address including flat number, building, street, and locality.', regional: 'ஃப்ளாட் எண், கட்டிடம், தெரு மற்றும் பகுதி உட்பட உங்கள் முழு முகவரியை உள்ளிடவும்.', reason: 'Necessary for mailing debit cards, checkbooks, and physical statements.' },
        bn: { tip: 'Enter your complete residential address including flat number, building, street, and locality.', regional: 'ফ্ল্যাট নম্বর, ভবন, রাস্তা এবং এলাকা সহ আপনার সম্পূর্ণ বাড়ির ঠিকানা লিখুন।', reason: 'Necessary for mailing debit cards, checkbooks, and physical statements.' },
        mr: { tip: 'Enter your complete residential address including flat number, building, street, and locality.', regional: 'फ्लॅट नंबर, इमारत, रस्ता आणि परिसरासह संपूर्ण राहणीचा पत्ता लिहा.', reason: 'Necessary for mailing debit cards, checkbooks, and physical statements.' },
        te: { tip: 'Enter your complete residential address including flat number, building, street, and locality.', regional: 'ఫ్లాట్ నంబర్, భవనం, వీధి మరియు ప్రాంతంతో పూర్తి నివాస చిరునామా నమోదు చేయండి.', reason: 'Necessary for mailing debit cards, checkbooks, and physical statements.' },
      },
      pincode: {
        en: { tip: 'Enter the 6-digit postal code (PIN) corresponding to your residential address.', regional: 'Enter the 6-digit PIN code for your area as in your Aadhaar.', reason: 'Verifies geographic jurisdiction and helps in sorting logistics.' },
        hinglish: { tip: 'Enter the 6-digit postal code (PIN) corresponding to your residential address.', regional: 'Apne area ka 6-digit PIN code daalen jaise Aadhaar mein hai.', reason: 'Verifies geographic jurisdiction and helps in sorting logistics.' },
        hi: { tip: 'Enter the 6-digit postal code (PIN) corresponding to your residential address.', regional: 'अपने क्षेत्र का 6-अंकीय पिनकोड दर्ज करें जैसा आधार में है।', reason: 'Verifies geographic jurisdiction and helps in sorting logistics.' },
        ta: { tip: 'Enter the 6-digit postal code (PIN) corresponding to your residential address.', regional: 'உங்கள் ஆதார் கார்டில் உள்ள 6 இலக்க பின் குறியீட்டை உள்ளிடவும்.', reason: 'Verifies geographic jurisdiction and helps in sorting logistics.' },
        bn: { tip: 'Enter the 6-digit postal code (PIN) corresponding to your residential address.', regional: 'আপনার আধার কার্ডে থাকা ৬ সংখ্যার পিনকোড লিখুন।', reason: 'Verifies geographic jurisdiction and helps in sorting logistics.' },
        mr: { tip: 'Enter the 6-digit postal code (PIN) corresponding to your residential address.', regional: 'आधार कार्डवर असलेला 6 अंकी पिनकोड टाका.', reason: 'Verifies geographic jurisdiction and helps in sorting logistics.' },
        te: { tip: 'Enter the 6-digit postal code (PIN) corresponding to your residential address.', regional: 'మీ ఆధార్ కార్డులో ఉన్న 6 అంకెల పిన్ కోడ్ నమోదు చేయండి.', reason: 'Verifies geographic jurisdiction and helps in sorting logistics.' },
      },
      accountType: {
        en: { tip: 'Choose the specific account tier you are opening: Savings, Current, or Salary.', regional: 'Select what type of bank account you want to open.', reason: 'Determines the minimum balance requirements and interest rates.' },
        hinglish: { tip: 'Choose the specific account tier you are opening: Savings, Current, or Salary.', regional: 'Select karein ki aap kaun sa account kholna chahte hain — Savings, Current ya Salary.', reason: 'Determines the minimum balance requirements and interest rates.' },
        hi: { tip: 'Choose the specific account tier you are opening: Savings, Current, or Salary.', regional: 'चुनें कि आप कौन सा खाता खोलना चाहते हैं — बचत, चालू या वेतन खाता।', reason: 'Determines the minimum balance requirements and interest rates.' },
        ta: { tip: 'Choose the specific account tier you are opening: Savings, Current, or Salary.', regional: 'நீங்கள் திறக்க விரும்பும் கணக்கு வகையை தேர்ந்தெடுக்கவும் — சேமிப்பு, நடப்பு அல்லது சம்பளம்.', reason: 'Determines the minimum balance requirements and interest rates.' },
        bn: { tip: 'Choose the specific account tier you are opening: Savings, Current, or Salary.', regional: 'আপনি কোন ধরনের অ্যাকাউন্ট খুলতে চান তা নির্বাচন করুন — সেভিংস, কারেন্ট বা স্যালারি।', reason: 'Determines the minimum balance requirements and interest rates.' },
        mr: { tip: 'Choose the specific account tier you are opening: Savings, Current, or Salary.', regional: 'तुम्हाला कोणते खाते उघडायचे आहे ते निवडा — बचत, चालू किंवा पगार.', reason: 'Determines the minimum balance requirements and interest rates.' },
        te: { tip: 'Choose the specific account tier you are opening: Savings, Current, or Salary.', regional: 'మీరు ఏ ఖాతా తెరవాలని ఉందో ఎంచుకోండి — పొదుపు, కరెంట్ లేదా జీతం ఖాతా.', reason: 'Determines the minimum balance requirements and interest rates.' },
      },
      nomineeName: {
        en: { tip: 'Enter the full name of the person you want to nominate for this account.', regional: 'Write the complete name of the person who will receive your account funds if something happens to you.', reason: 'Required to ensure hassle-free transfer of funds to your legal heir in the future.' },
        hinglish: { tip: 'Enter the full name of the person you want to nominate for this account.', regional: 'Us insaan ka pura naam likhein jise aap apne account ka nominee banana chahte hain.', reason: 'Required to ensure hassle-free transfer of funds to your legal heir in the future.' },
        hi: { tip: 'Enter the full name of the person you want to nominate for this account.', regional: 'उस व्यक्ति का पूरा नाम दर्ज करें जिसे आप इस खाते के लिए नॉमिनी बनाना चाहते हैं।', reason: 'Required to ensure hassle-free transfer of funds to your legal heir in the future.' },
        ta: { tip: 'Enter the full name of the person you want to nominate for this account.', regional: 'நீங்கள் நியமிக்க விரும்பும் நபரின் முழு பெயரை உள்ளிடவும்.', reason: 'Required to ensure hassle-free transfer of funds to your legal heir in the future.' },
        bn: { tip: 'Enter the full name of the person you want to nominate for this account.', regional: 'আপনি যাকে নমিনি করতে চান তার পুরো নাম লিখুন।', reason: 'Required to ensure hassle-free transfer of funds to your legal heir in the future.' },
        mr: { tip: 'Enter the full name of the person you want to nominate for this account.', regional: 'तुम्हाला ज्याला नॉमिनी करायचे आहे त्याचे पूर्ण नाव लिहा.', reason: 'Required to ensure hassle-free transfer of funds to your legal heir in the future.' },
        te: { tip: 'Enter the full name of the person you want to nominate for this account.', regional: 'మీరు నామినీగా నియమించాలనుకుంటున్న వ్యక్తి పూర్తి పేరు నమోదు చేయండి.', reason: 'Required to ensure hassle-free transfer of funds to your legal heir in the future.' },
      },
    };
    const langData = db[fieldId]?.[currentLang] || db[fieldId]?.['en'];
    const enData = db[fieldId]?.['en'];
    if (langData && enData) {
      return { tip: enData.tip, regional: langData.regional, reason: enData.reason };
    }
    const fallback = { tip: 'Provide the requested details accurately. Double-check for typing errors.', regional: '', reason: 'Ensures accurate database recording and prevents rejection.' };
    if (currentLang === 'hi') fallback.regional = 'अनुरोधित विवरण सटीक रूप से दर्ज करें।';
    else if (currentLang === 'hinglish') fallback.regional = 'Maangi gayi jaankari sahi se bhare.  Typing mistakes check karein.';
    else if (currentLang === 'ta') fallback.regional = 'கோரப்பட்ட விவரங்களை சரியாக வழங்கவும்.';
    else if (currentLang === 'bn') fallback.regional = 'অনুরোধিত বিবরণ সঠিকভাবে প্রদান করুন।';
    else if (currentLang === 'mr') fallback.regional = 'विनंती केलेले तपशील अचूकपणे भरा.';
    else if (currentLang === 'te') fallback.regional = 'అభ్యర్థించిన వివరాలు ఖచ్చితంగా నమోదు చేయండి.';
    else fallback.regional = 'Enter the requested details carefully.';
    return fallback;
  };

  // Get guidance for current field (uses multilingual data)
  const getFieldGuidance = (fieldId: string) => getFieldGuidanceAll(fieldId);


  // Start guided fill simulation
  const startGuidedWalkthrough = (presetFields: Record<string, string>) => {
    if (!presetFields) return;
    setIsWalkthroughPlaying(true);
    setGuidedFieldIndex(0);
    setFormFields(prev => prev.map(f => ({ ...f, value: '', confidence: 0 })));
  };

  // Walkthrough simulation runner effect
  useEffect(() => {
    if (!isWalkthroughPlaying || guidedFieldIndex < 0 || guidedFieldIndex >= formFields.length) {
      if (isWalkthroughPlaying && guidedFieldIndex >= formFields.length) {
        setIsWalkthroughPlaying(false);
      }
      return;
    }

    const currentField = formFields[guidedFieldIndex];
    let targetValue = '';

    if (activeUserRecord) {
      const dataToFill: Record<string, string> = {
        fullName: activeUserRecord.full_name || '',
        fatherName: activeUserRecord.father_spouse_name || '',
        dob: activeUserRecord.dob || '',
        gender: activeUserRecord.gender || '',
        phone: activeUserRecord.mobile || '',
        address: activeUserRecord.address || '',
        pincode: activeUserRecord.pincode || '',
        accountType: activeUserRecord.account_type === 'Savings' ? 'Savings Bank Account' : activeUserRecord.account_type === 'Current' ? 'Current Account' : activeUserRecord.account_type || '',
        nomineeName: activeUserRecord.nominee_name || '',
      };
      targetValue = dataToFill[currentField.id] || '';
    }

    if (!targetValue) {
      setFormFields(prev => prev.map(f => f.id === currentField.id ? { ...f, value: 'N/A', confidence: 100 } : f));
      const nextTimer = setTimeout(() => {
        setGuidedFieldIndex(prev => prev + 1);
      }, 1000);
      return () => clearTimeout(nextTimer);
    }

    let currentText = '';
    let charIndex = 0;

    const typingInterval = setInterval(() => {
      if (charIndex < targetValue.length) {
        currentText += targetValue[charIndex];
        setFormFields(prev => prev.map(f => f.id === currentField.id ? { ...f, value: currentText } : f));
        charIndex++;
      } else {
        clearInterval(typingInterval);
        setFormFields(prev => prev.map(f => f.id === currentField.id ? { ...f, value: targetValue, confidence: 100 } : f));
        
        const nextTimer = setTimeout(() => {
          setGuidedFieldIndex(prev => prev + 1);
        }, 1500);

        return () => clearTimeout(nextTimer);
      }
    }, 60);

    return () => {
      clearInterval(typingInterval);
    };
  }, [isWalkthroughPlaying, guidedFieldIndex, formFields.length, activeUserRecord]);

  // Soundwave animation effect
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isVoiceRecording) {
      interval = setInterval(() => {
        setSoundwaveBars(prev => prev.map(() => Math.floor(Math.random() * 45) + 8));
      }, 100);
    }
    return () => clearInterval(interval);
  }, [isVoiceRecording]);

  // Select a preset document to scan
  const handleSelectPresetDoc = (doc: DemoDocument) => {
    setSelectedDoc(doc);
    triggerScanningSequence(doc.fields, 'document');
  };

  // Handle file drop/upload simulation
  const handleFileUploadSim = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      const previewUrl = URL.createObjectURL(file);
      setUploadedImageSrc(previewUrl);

      const randomDoc: DemoDocument = {
        id: 'uploaded_doc',
        name: file.name,
        type: 'form',
        image: '📄',
        fields: {}
      };
      setPendingUploadedDoc(randomDoc);
    }
  };

  // Helper to map CSV user record to SBI Nomination Form (DA-1) fields
  const getDa1DataToFill = (currentUser: Record<string, string>) => {
    let relationship = '';
    let age = '';
    let dob = '';
    let guardian = '';
    let guardianAddr = '';
    
    if (currentUser.nominee_name) {
      if (currentUser.nominee_name === 'Pratik Kumar') {
        relationship = 'Son';
        age = '12';
        dob = '2014-06-24';
        guardian = currentUser.full_name || '';
        guardianAddr = (currentUser.address || '') + ' (Age: ' + String(2026 - Number((currentUser.dob || '1980').split('-')[0])) + ')';
      } else {
        relationship = currentUser.nominee_name.includes('Sharma') || currentUser.nominee_name.includes('Irfan') || currentUser.nominee_name.includes('Verma') || currentUser.nominee_name.includes('Kumar') || currentUser.nominee_name.includes('Singh') || currentUser.nominee_name.includes('Joshi') ? 'Spouse' : 'Family Member';
        age = '35';
      }
    }

    return {
      fullName: currentUser.full_name ? `${currentUser.full_name}, residing at ${currentUser.address || ''}${currentUser.pincode ? ' - ' + currentUser.pincode : ''}` : '',
      branchName: 'Patna Main Branch',
      depositNature: currentUser.account_type === 'Savings' ? 'Savings Bank Account' : currentUser.account_type === 'Current' ? 'Current Account' : currentUser.account_type || 'Savings Bank Account',
      depositDistNo: '39485720194',
      depositDetails: 'Mobile: ' + (currentUser.mobile || 'N/A'),
      nomineeName: currentUser.nominee_name || '',
      nomineeAddress: currentUser.nominee_name ? `${currentUser.address || ''}${currentUser.mobile ? ', Mob: ' + currentUser.mobile : ''}` : '',
      nomineeRelationship: relationship,
      nomineeAge: age,
      nomineeDob: dob,
      guardianName: guardian,
      guardianAddress: guardianAddr,
      printNomineeName: currentUser.nominee_name ? 'Yes' : 'No',
    };
  };

  // Trigger Scanning & Parsing Sequence
  const triggerScanningSequence = (unusedData: Record<string, string>, source: 'document' | 'voice') => {
    setIsScanning(true);
    setScanProgress(0);
    setScanningStatus(t('sh_status_scanning', currentLang));
    setAutofillStatusMessage('');

    // Select or reuse the active user record from the CSV
    let currentUser = activeUserRecord;
    if (!currentUser || source !== 'voice') {
      const randomIndex = Math.floor(Math.random() * csvRecords.length);
      currentUser = csvRecords[randomIndex];
      setActiveUserRecord(currentUser);
    }

    const dataToFill = getDa1DataToFill(currentUser);

    const statuses = [
      { progress: 20, msg: t('sh_status_scanning', currentLang) },
      { progress: 50, msg: t('sh_status_detecting', currentLang) },
      { progress: 80, msg: t('sh_status_preparing', currentLang) },
      { progress: 100, msg: t('sh_status_mapped', currentLang) },
    ];

    let currentStep = 0;
    const interval = setInterval(() => {
      if (currentStep < statuses.length) {
        setScanProgress(statuses[currentStep].progress);
        setScanningStatus(statuses[currentStep].msg);
        currentStep++;
      } else {
        clearInterval(interval);
        setTimeout(() => {
          setIsScanning(false);
          
          // Force SBI Nomination Form (DA-1) for this demo
          const sbiDa1Template = FORM_TEMPLATES.find(t => t.id === 'sbi_da1') || FORM_TEMPLATES[0];
          setSelectedTemplate(sbiDa1Template);

          if (!selectedDoc) {
            setSelectedDoc({
              id: 'blank_sbi_da1',
              name: 'SBI Nomination Form (DA-1)',
              type: 'form',
              image: '📝',
              fields: {}
            });
          }
          
          // Auto fill fields one by one with micro-animation
          autoFillFormFields(dataToFill, currentUser!, sbiDa1Template.fields);
        }, 500);
      }
    }, 600);
  };

  // Auto-fill form fields one by one
  const autoFillFormFields = (dataToFill: Record<string, string>, currentUser: Record<string, string>, fields: FormField[]) => {
    // We clear current fields first
    setFormFields(fields.map(f => ({ ...f, value: '', confidence: 0 })));

    let index = 0;
    const interval = setInterval(() => {
      if (index < fields.length) {
        const templateField = fields[index];
        const mappedValue = dataToFill[templateField.id];
        
        if (mappedValue !== undefined && mappedValue !== '') {
          const fieldId = templateField.id;
          setFormFields(prev => prev.map((f) => {
            if (f.id === fieldId) {
              return { 
                ...f, 
                value: mappedValue, 
                confidence: Math.floor(Math.random() * 6) + 94, // 94% to 99%
                mappedFrom: selectedDoc ? selectedDoc.name : 'Uploaded File'
              };
            }
            return f;
          }));
        }
        index++;
      } else {
        clearInterval(interval);

        // Check for nominee reminder flow or success message
        if (activeTab === 'photo') {
          setAutofillStatusMessage('sh_autofill_success');
        }
      }
    }, 350);
  };

  const sourceIsVoice = () => activeTab === 'voice';

  // Voice Interaction Simulation
  const handleStartVoiceSim = (userRecord?: Record<string, string> | null) => {
    let currentUser = userRecord || activeUserRecord;
    if (!currentUser) {
      const randomIndex = Math.floor(Math.random() * csvRecords.length);
      currentUser = csvRecords[randomIndex];
      setActiveUserRecord(currentUser);
    }

    setIsVoiceRecording(true);
    setVoiceStep(1);
    setVoiceTranscript('Listening for instructions...');
    setVoiceTranslation('');

    const hasNominee = !!currentUser.nominee_name;

    // Step 1: User starts speaking about nominee details
    setTimeout(() => {
      setVoiceStep(2);
      if (hasNominee) {
        setVoiceTranscript(`“मैं ${currentUser.nominee_name} को नामांकित करना चाहता हूँ, जो परिवार के सदस्य हैं।”`);
        setVoiceTranslation(`“I want to nominate ${currentUser.nominee_name}, who is a family member.”`);
      } else {
        setVoiceTranscript(`“मैं प्रतीक कुमार को नामांकित करना चाहती हूँ, जो मेरा बेटा है और 12 साल का है।”`);
        setVoiceTranslation(`“I want to nominate Pratik Kumar, who is my son and is 12 years old.”`);
      }
    }, 2000);

    // Step 2: Processing state
    setTimeout(() => {
      setVoiceStep(3);
    }, 4500);

    // Step 3: Complete and fill fields
    setTimeout(() => {
      setVoiceStep(4);
      setIsVoiceRecording(false);
      
      let updatedUser = currentUser;
      if (!hasNominee) {
        updatedUser = { ...currentUser, nominee_name: 'Pratik Kumar' };
        setActiveUserRecord(updatedUser);
      }
      
      // Trigger scanning sequence using the voice source
      triggerScanningSequence({}, 'voice');
    }, 7500);
  };

  // Switch form template (Search or Selection)
  const handleSelectTemplate = (template: FormTemplate) => {
    setSelectedTemplate(template);
    setFormFields(template.fields.map(f => ({ ...f, value: '', confidence: 0 })));
    resetDemoState();
  };

  // Filter templates based on query
  const filteredTemplates = FORM_TEMPLATES.filter(t => 
    t.id !== 'sbi_da1' && (
      t.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
      t.bankName.toLowerCase().includes(searchQuery.toLowerCase())
    )
  );

  // Get translated field label using the centralized translation system
  const getTranslatedLabel = (fieldId: string) => {
    return t('field_' + fieldId, currentLang);
  };

  // Submit filled form
  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPdfGenerationStatus('generating');
    setShowResultModal(true);

    setTimeout(() => {
      setPdfGenerationStatus('success');
    }, 1800);
  };

  // Instant autofill using random record from CSV
  const handleInstantAutofill = () => {
    if (csvRecords.length === 0) return;
    const randomIndex = Math.floor(Math.random() * csvRecords.length);
    const currentUser = csvRecords[randomIndex];
    setActiveUserRecord(currentUser);

    const sbiDa1Template = FORM_TEMPLATES.find(t => t.id === 'sbi_da1') || FORM_TEMPLATES[0];
    setSelectedTemplate(sbiDa1Template);
    setAutofillStatusMessage('');

    if (!selectedDoc) {
      setSelectedDoc({
        id: 'blank_sbi_da1',
        name: 'SBI Nomination Form (DA-1)',
        type: 'form',
        image: '📝',
        fields: {}
      });
    }

    const dataToFill = getDa1DataToFill(currentUser);

    setFormFields(sbiDa1Template.fields.map(f => {
      const mappedValue = dataToFill[f.id];
      if (mappedValue !== undefined && mappedValue !== '') {
        return {
          ...f,
          value: mappedValue,
          confidence: Math.floor(Math.random() * 6) + 94, // 94% to 99%
          mappedFrom: 'Instant Autofill'
        };
      }
      return { ...f, value: '', confidence: 0, mappedFrom: undefined };
    }));

    setAutofillStatusMessage('sh_autofill_success');
  };

  // Check if any field is filled
  const isAnyFieldFilled = formFields.some(f => f.value !== '');

  return (
    <section id="showcase" className="bg-background py-16 border-t border-outline-variant/20">
      <div className="max-w-7xl mx-auto px-6">
        
        {/* Section Headers */}
        <div className="text-center space-y-4 mb-10">
          <span className="font-label-caps text-xs text-secondary font-bold tracking-widest uppercase bg-rose-50 border border-rose-200 px-4 py-1.5 rounded-full inline-block">
            {t('sh_badge', currentLang)}
          </span>
          <h2 className="font-headline-lg text-3xl sm:text-4xl lg:text-5xl font-extrabold text-on-surface tracking-tight">
            {t('sh_title', currentLang)}
          </h2>
          <p className="text-body-md text-on-surface-variant max-w-xl mx-auto">
            {t('sh_desc', currentLang)}
          </p>
          <div className="bg-primary/5 border border-primary/20 py-2.5 px-4 rounded-xl max-w-xl mx-auto text-xs font-semibold text-primary leading-relaxed shadow-sm">
            {t('sh_demo_note', currentLang)}
          </div>
        </div>

        {/* Tab Controls */}
        <div className="flex justify-center gap-2 sm:gap-3 mb-10 max-w-xl mx-auto bg-surface-container-low p-1.5 rounded-full border border-outline-variant/30">
          <button 
            type="button"
            onClick={() => setActiveTab('photo')}
            className={`flex-1 py-2 px-3 rounded-full font-bold text-xs sm:text-sm transition-all flex items-center justify-center gap-1.5 cursor-pointer whitespace-nowrap ${activeTab === 'photo' ? 'bg-primary text-white shadow-md' : 'text-on-surface-variant hover:text-primary'}`}
            id="tab-photo-btn"
          >
            <Camera className="w-4 h-4" />
            {t('sh_tab_photo', currentLang)}
          </button>
          <button 
            type="button"
            onClick={() => setActiveTab('voice')}
            className={`flex-1 py-2 px-3 rounded-full font-bold text-xs sm:text-sm transition-all flex items-center justify-center gap-1.5 cursor-pointer whitespace-nowrap ${activeTab === 'voice' ? 'bg-primary text-white shadow-md' : 'text-on-surface-variant hover:text-primary'}`}
            id="tab-voice-btn"
          >
            <Mic className="w-4 h-4" />
            {t('sh_tab_voice', currentLang)}
          </button>
          <button 
            type="button"
            onClick={() => setActiveTab('search')}
            className={`flex-1 py-2 px-3 rounded-full font-bold text-xs sm:text-sm transition-all flex items-center justify-center gap-1.5 cursor-pointer whitespace-nowrap ${activeTab === 'search' ? 'bg-primary text-white shadow-md' : 'text-on-surface-variant hover:text-primary'}`}
            id="tab-search-btn"
          >
            <Search className="w-4 h-4" />
            {t('sh_tab_search', currentLang)}
          </button>
        </div>

        {/* Split Grid: Interactive Input Area & Active Form Viewer */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* LEFT PANEL: Input & Scan Area (5 columns) */}
          <div className="lg:col-span-5 space-y-6">
            <div className="bg-white rounded-3xl p-6 border border-outline-variant/30 shadow-md flex flex-col justify-between min-h-[460px]">
              
              {/* Tab Content Header */}
              <div className="border-b border-outline-variant/20 pb-4 mb-4">
                <h3 className="text-xl font-bold text-on-surface flex items-center gap-2">
                  {activeTab === 'photo' && <><Camera className="w-5 h-5 text-primary" /> {t('sh_visual_scanner', currentLang)}</>}
                  {activeTab === 'voice' && <><Mic className="w-5 h-5 text-primary" /> {t('sh_voice_assistant', currentLang)}</>}
                  {activeTab === 'search' && <><Search className="w-5 h-5 text-primary" /> {t('sh_search_library', currentLang)}</>}
                </h3>
                <p className="text-xs text-on-surface-variant mt-1">
                  {activeTab === 'photo' && t('sh_visual_desc', currentLang)}
                  {activeTab === 'voice' && t('sh_voice_desc', currentLang)}
                  {activeTab === 'search' && t('sh_search_desc', currentLang)}
                </p>
              </div>

              {/* Tab Interactive State Machine */}
              <div className="flex-grow flex flex-col justify-center py-4">
                
                {/* 1. PHOTO TAB */}
                {activeTab === 'photo' && (
                  <div className="space-y-6">
                    {/* Simulated File Drop area */}
                    {!isScanning && !selectedDoc && !uploadedImageSrc && (
                      <div className="border-2 border-dashed border-outline-variant/60 rounded-2xl p-8 flex flex-col items-center text-center hover:border-primary transition-colors relative cursor-pointer group">
                        <input 
                          type="file" 
                          accept="image/*" 
                          onChange={handleFileUploadSim}
                          className="absolute inset-0 opacity-0 cursor-pointer"
                        />
                        <Upload className="w-10 h-10 text-on-surface-variant/70 mb-4 group-hover:scale-110 transition-transform duration-300" />
                        <h4 className="font-bold text-sm text-on-surface mb-1">{t('sh_upload_title', currentLang)}</h4>
                        <p className="text-xs text-on-surface-variant max-w-[200px]">
                          {t('sh_upload_desc', currentLang)}
                        </p>
                      </div>
                    )}

                    {!isScanning && !selectedDoc && uploadedImageSrc && (
                      <div className="border border-outline-variant/60 rounded-2xl p-6 flex flex-col items-center text-center bg-surface-container-low relative">
                        {/* Image Preview */}
                        <div className="w-full max-h-48 overflow-hidden rounded-xl mb-4 border border-outline-variant/40 flex items-center justify-center bg-black/5">
                          <img 
                            src={uploadedImageSrc} 
                            alt="Uploaded form preview" 
                            className="max-w-full max-h-48 object-contain"
                          />
                        </div>
                        {/* Success Message */}
                        <p className="text-xs font-bold text-green-600 bg-green-50 px-3 py-1.5 rounded-full border border-green-200 mb-4 animate-fade-in flex items-center gap-1.5">
                          <CheckCircle2 className="w-4 h-4" />
                          {t('sh_upload_success', currentLang)}
                        </p>
                        {/* Buttons */}
                        <div className="flex gap-3 w-full">
                          <button
                            type="button"
                            onClick={() => {
                              if (pendingUploadedDoc) {
                                setSelectedDoc(pendingUploadedDoc);
                                triggerScanningSequence(pendingUploadedDoc.fields, 'document');
                              }
                            }}
                            className="flex-1 bg-primary text-white hover:bg-primary-container py-2.5 rounded-xl font-bold text-xs flex items-center justify-center gap-2 cursor-pointer shadow transition-all hover:scale-102 transform active:scale-95"
                          >
                            {t('sh_proceed', currentLang)}
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setUploadedImageSrc(null);
                              setPendingUploadedDoc(null);
                            }}
                            className="bg-white text-on-surface border border-outline-variant/30 hover:bg-surface-container py-2.5 px-4 rounded-xl font-bold text-xs cursor-pointer transition-colors"
                          >
                            {t('sh_cancel', currentLang)}
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Preloaded Mock Documents for instant preview */}
                    {!isScanning && !selectedDoc && (
                      <div className="space-y-3">
                        <span className="text-xs font-bold text-on-surface-variant uppercase tracking-wider block">
                          {t('sh_try_sample', currentLang)}
                        </span>
                        <div className="grid grid-cols-2 gap-3">
                          {DEMO_DOCUMENTS.map((doc) => (
                            <button
                              key={doc.id}
                              type="button"
                              onClick={() => handleSelectPresetDoc(doc)}
                              className={`p-4 rounded-xl border text-left transition-all flex items-center gap-3 cursor-pointer hover:border-primary hover:bg-primary/5 ${selectedDoc?.id === doc.id ? 'border-primary bg-primary/5 ring-1 ring-primary' : 'border-outline-variant/40 bg-surface'}`}
                            >
                              <span className="text-2xl">{doc.image}</span>
                              <div className="min-w-0">
                                <h5 className="font-bold text-xs truncate text-on-surface">{doc.name}</h5>
                                <span className="text-[10px] text-primary uppercase font-bold">
                                  {t('sh_blank_replica', currentLang)}
                                </span>
                              </div>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Active Scan Laser Mockup */}
                    {isScanning && (
                      <div className="relative bg-surface-container-low rounded-2xl border border-outline-variant/40 overflow-hidden p-6 flex flex-col items-center justify-center min-h-[220px]">
                        {/* The animated scanner beam */}
                        <div className="absolute inset-x-0 h-1.5 bg-primary shadow-[0_0_12px_rgba(78,0,120,0.8)] scanning-laser"></div>
                        
                        <div className="space-y-4 text-center z-10 flex flex-col items-center">
                          <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center animate-spin">
                            <RefreshCw className="w-6 h-6 text-primary" />
                          </div>
                          
                          <div className="space-y-1">
                            <span className="text-xs font-bold text-primary uppercase tracking-wider">
                              {t('sh_mapping_progress', currentLang)} {scanProgress}%
                            </span>
                            <p className="text-sm font-semibold text-on-surface">
                              {scanningStatus}
                            </p>
                          </div>

                          <div className="w-48 bg-outline-variant/30 h-1.5 rounded-full overflow-hidden">
                            <div 
                              className="bg-primary h-full transition-all duration-300"
                              style={{ width: `${scanProgress}%` }}
                            ></div>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Successfully Scanned -> Launch Guided Assistant */}
                    {!isScanning && selectedDoc && (
                      <div className="space-y-4 animate-fade-in">
                        {/* Success banner */}
                        <div className="bg-green-50 border border-green-200 rounded-2xl p-4 flex gap-3 items-start justify-between">
                          <div className="flex gap-3 items-start">
                            <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                            <div>
                              <h4 className="font-bold text-xs text-green-800">{t('sh_mapped_recreated', currentLang)}</h4>
                              <p className="text-[10px] text-green-700/90 mt-1">
                                {t('sh_privacy_notice', currentLang).split('{name}')[0]}
                                <strong>{selectedDoc.name}</strong>
                                {t('sh_privacy_notice', currentLang).split('{name}')[1] || ''}
                              </p>
                            </div>
                          </div>
                          {uploadedImageSrc && (
                            <div className="w-12 h-16 border border-green-200 rounded bg-white overflow-hidden flex-shrink-0 flex items-center justify-center shadow-sm">
                              <img src={uploadedImageSrc} className="w-full h-full object-cover" alt="Scanned Form Preview" />
                            </div>
                          )}
                        </div>

                        {/* Guided Assistant Panel */}
                        <div className="bg-primary/5 border border-primary/20 rounded-2xl p-5 space-y-4 relative overflow-hidden">
                          <div className="flex justify-between items-center border-b border-primary/10 pb-2">
                            <span className="text-[10px] font-extrabold text-primary uppercase tracking-widest flex items-center gap-1.5">
                              <Sparkles className="w-3.5 h-3.5 text-secondary animate-pulse" /> {t('sh_ai_guide', currentLang)}
                            </span>
                            <span className="text-[10px] font-bold text-primary bg-primary/10 px-2 py-0.5 rounded border border-primary/20">
                              {t('sh_guided_mode', currentLang)}
                            </span>
                          </div>

                          {guidedFieldIndex >= 0 && guidedFieldIndex < formFields.length ? (
                            (() => {
                              const currentField = formFields[guidedFieldIndex];
                              const info = getFieldGuidance(currentField.id);
                              return (
                                <div className="space-y-3">
                                  <div>
                                    <span className="text-[10px] text-on-surface-variant font-bold uppercase">{t('sh_current_box', currentLang)}</span>
                                    <h5 className="font-extrabold text-sm text-on-surface flex items-center justify-between mt-0.5">
                                      <span>{t('field_' + currentField.id, currentLang)}</span>
                                      <span className="text-[9px] text-primary/80 font-bold bg-white px-2 py-0.5 rounded border">
                                        {t('sh_field_of', currentLang)
                                          .replace('{current}', String(guidedFieldIndex + 1))
                                          .replace('{total}', String(formFields.length))}
                                      </span>
                                    </h5>
                                  </div>

                                  <div className="space-y-2 pt-2 border-t border-outline-variant/10 text-xs">
                                    <div className="space-y-1">
                                      <span className="text-[9px] font-bold text-secondary uppercase block">{t('sh_guide_tip_label', currentLang)}</span>
                                      <p className="text-on-surface leading-relaxed font-medium bg-white p-2.5 rounded-lg border border-outline-variant/20">
                                        {info.tip}
                                      </p>
                                    </div>
                                    
                                    <div className="space-y-1 pt-1">
                                      <span className="text-[9px] font-bold text-primary uppercase block">{t('sh_guide_reg_label', currentLang)}</span>
                                      <p className="text-on-surface-variant leading-relaxed font-semibold italic bg-white p-2.5 rounded-lg border border-outline-variant/20">
                                        {info.regional}
                                      </p>
                                    </div>

                                    <div className="space-y-1 pt-1 animate-fade-in">
                                      <span className="text-[9px] font-bold text-on-surface-variant uppercase block">{t('sh_guide_why_label', currentLang)}</span>
                                      <p className="text-on-surface-variant text-[11px] leading-relaxed">
                                        {info.reason}
                                      </p>
                                    </div>
                                  </div>

                                  <div className="pt-2 flex items-center justify-between">
                                    <span className="text-[10px] text-on-surface-variant font-bold">
                                      {currentField.value ? (
                                        <span className="text-green-600 flex items-center gap-1 font-extrabold">
                                          <CheckCircle2 className="w-3.5 h-3.5" /> {t('sh_format_verified', currentLang)}
                                        </span>
                                      ) : (
                                        <span className="text-amber-600 flex items-center gap-1 font-extrabold animate-pulse">
                                          ⚡ {t('sh_awaiting_input', currentLang)}
                                        </span>
                                      )}
                                    </span>
                                  </div>
                                </div>
                              );
                            })()
                          ) : (
                            <div className="text-center py-4 space-y-2">
                              <p className="text-xs text-on-surface-variant font-medium">
                                {guidedFieldIndex >= formFields.length 
                                  ? t('sh_autofill_success', currentLang) 
                                  : t('sh_status_scan_begin', currentLang)}
                              </p>
                            </div>
                          )}

                          <div className="flex gap-1.5 pt-2 flex-wrap sm:flex-nowrap">
                            {!isWalkthroughPlaying && guidedFieldIndex < formFields.length && (
                              <>
                                <button
                                  type="button"
                                  onClick={() => startGuidedWalkthrough(selectedDoc.fields)}
                                  className="flex-grow bg-primary text-white hover:bg-primary-container py-2 px-2 rounded-xl font-bold text-[10px] sm:text-xs flex items-center justify-center gap-1 cursor-pointer shadow hover:scale-102 transform active:scale-95 transition-all whitespace-nowrap"
                                >
                                  <Sparkles className="w-3 h-3" />
                                  {t('sh_simulate_fill', currentLang)}
                                </button>
                                <button
                                  type="button"
                                  onClick={handleInstantAutofill}
                                  className="bg-secondary text-white hover:bg-secondary-container py-2 px-2 rounded-xl font-bold text-[10px] sm:text-xs flex items-center justify-center gap-1 cursor-pointer shadow hover:scale-102 transform active:scale-95 transition-all whitespace-nowrap"
                                >
                                  <Sparkles className="w-3 h-3 animate-pulse" />
                                  {t('sh_instant_fill', currentLang)}
                                </button>
                              </>
                            )}
                            {isWalkthroughPlaying && (
                              <button
                                type="button"
                                onClick={() => setIsWalkthroughPlaying(false)}
                                className="flex-grow bg-amber-500 text-white hover:bg-amber-600 py-2 px-2 rounded-xl font-bold text-[10px] sm:text-xs flex items-center justify-center gap-1 cursor-pointer shadow transition-all whitespace-nowrap"
                              >
                                <RefreshCw className="w-3 h-3 animate-spin" />
                                {t('sh_pause', currentLang)}
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={resetDemoState}
                              className="bg-white text-on-surface border border-outline-variant/30 hover:bg-surface-container py-2 px-2.5 rounded-xl font-bold text-[10px] sm:text-xs cursor-pointer transition-colors whitespace-nowrap"
                            >
                              {t('sh_reset', currentLang)}
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* 2. VOICE TAB */}
                {activeTab === 'voice' && (
                  <div className="space-y-6">
                    <div className="flex flex-col items-center justify-center py-4">
                      {isVoiceRecording ? (
                        <div className="space-y-4 flex flex-col items-center">
                          {/* Animated soundwaves */}
                          <div className="flex items-end justify-center gap-1.5 h-16 px-4">
                            {soundwaveBars.map((val, idx) => (
                              <div 
                                key={idx}
                                className="w-1.5 bg-secondary rounded-full transition-all duration-100"
                                style={{ height: `${val}px` }}
                              ></div>
                            ))}
                          </div>
                          <span className="text-[10px] font-extrabold text-secondary animate-pulse uppercase tracking-widest">
                            {t('sh_voice_session', currentLang)}
                          </span>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleStartVoiceSim()}
                          className="px-6 py-3 rounded-full bg-primary hover:bg-primary-container text-white flex items-center gap-2 shadow-lg hover:shadow-xl hover:scale-102 transition-all cursor-pointer font-bold text-xs"
                        >
                          <Mic className="w-4 h-4" />
                          {t('sh_simulate_voice', currentLang)}
                        </button>
                      )}

                      {!isVoiceRecording && voiceStep === 0 && (
                        <p className="text-[11px] text-on-surface-variant text-center mt-4 max-w-xs leading-relaxed">
                          {t('sh_voice_timeline_sub', currentLang)}
                        </p>
                      )}
                    </div>

                    {/* Speech Dialogue Timeline */}
                    {voiceStep >= 1 && (
                      <div className="space-y-3 bg-surface-container-low border border-outline-variant/30 rounded-2xl p-4 animate-fade-in">
                        <div className="flex justify-between items-center border-b border-outline-variant/20 pb-2">
                          <span className="text-[10px] font-extrabold text-primary uppercase tracking-widest flex items-center gap-1">
                            <Sparkles className="w-3 h-3 text-secondary animate-pulse" /> {t('sh_bhashini', currentLang)}
                          </span>
                          <span className="text-[10px] font-bold text-on-surface-variant bg-white px-2 py-0.5 rounded border">
                            {t('sh_voice_timeline_title', currentLang)}
                          </span>
                        </div>

                        {/* Dialogue step 1: AI */}
                        <div className="space-y-1.5 text-xs">
                          <span className="text-[9px] font-extrabold text-primary uppercase tracking-wider block">{t('sh_ai_name', currentLang)}</span>
                          <p className="text-on-surface font-semibold leading-relaxed bg-white p-2.5 rounded-lg border border-outline-variant/20">
                            {t('sh_ai_q_nominee', currentLang)}
                          </p>
                          <p className="text-on-surface-variant italic leading-relaxed text-[11px] pl-2 border-l border-primary/20">
                            {t('sh_ai_q_nominee_reg', currentLang)}
                          </p>
                        </div>

                        {/* Dialogue step 2: User */}
                        {voiceStep >= 2 && (
                          <div className="space-y-1.5 text-xs pt-3 border-t border-outline-variant/10 animate-fade-in">
                            <span className="text-[9px] font-extrabold text-secondary uppercase tracking-wider block">
                              {t('sh_customer_name', currentLang).replace('{name}', activeUserRecord?.full_name.split(' ')[0] || 'Customer')}
                            </span>
                            <p className="text-on-surface font-semibold italic bg-white p-2.5 rounded-lg border border-outline-variant/20">
                              {voiceTranscript}
                            </p>
                            <p className="text-on-surface-variant leading-relaxed text-[11px] pl-2 border-l border-secondary/20">
                              {voiceTranslation}
                            </p>
                          </div>
                        )}

                        {/* Dialogue step 3: AI processes */}
                        {voiceStep >= 3 && (
                          <div className="space-y-1 text-center bg-purple-50 border border-purple-100 rounded-xl p-2.5 text-[11px] font-bold text-primary animate-pulse">
                            {t('sh_timeline_processing', currentLang)}
                          </div>
                        )}

                        {/* Dialogue step 4: AI success */}
                        {voiceStep === 4 && (
                          <div className="space-y-1.5 text-xs pt-3 border-t border-outline-variant/10 animate-fade-in">
                            <span className="text-[9px] font-extrabold text-green-700 uppercase tracking-wider block">{t('sh_ai_name', currentLang)}</span>
                            {activeUserRecord?.nominee_name ? (
                              (() => {
                                const isSimulated = activeUserRecord.nominee_name === 'Pratik Kumar';
                                const rel = isSimulated ? 'Son' : 'Family Member';
                                const age = isSimulated ? '12 (Minor)' : '35';
                                return (
                                  <>
                                    <p className="text-green-800 font-semibold leading-relaxed bg-green-50 p-2.5 rounded-lg border border-green-200">
                                      {t('sh_timeline_success', currentLang)
                                        .replace('{name}', activeUserRecord.nominee_name)
                                        .replace('{rel}', rel)
                                        .replace('{age}', age)}
                                    </p>
                                    
                                    {/* Nominee Field Values box */}
                                    <div className="bg-white border border-outline-variant/30 rounded-xl p-3 text-[11px] space-y-2 mt-2">
                                      <div className="flex justify-between border-b pb-1">
                                        <span className="text-on-surface-variant">{t('field_nomineeName', currentLang)}:</span>
                                        <span className="font-bold text-on-surface">{activeUserRecord.nominee_name}</span>
                                      </div>
                                      <div className="flex justify-between border-b pb-1">
                                        <span className="text-on-surface-variant">{t('field_nomineeRelationship', currentLang)}:</span>
                                        <span className="font-bold text-on-surface">{rel}</span>
                                      </div>
                                      <div className="flex justify-between">
                                        <span className="text-on-surface-variant">{t('field_nomineeAge', currentLang)}:</span>
                                        <span className="font-bold text-on-surface">{age}</span>
                                      </div>
                                    </div>
                                  </>
                                );
                              })()
                            ) : (
                              <>
                                <p className="text-green-800 font-semibold leading-relaxed bg-green-50 p-2.5 rounded-lg border border-green-200">
                                  {t('sh_timeline_success', currentLang)
                                    .replace('{name}', 'Pratik Kumar')
                                    .replace('{rel}', 'Son')
                                    .replace('{age}', '12')}
                                </p>
                                
                                {/* Nominee Field Values box */}
                                <div className="bg-white border border-outline-variant/30 rounded-xl p-3 text-[11px] space-y-2 mt-2">
                                  <div className="flex justify-between border-b pb-1">
                                    <span className="text-on-surface-variant">{t('field_nomineeName', currentLang)}:</span>
                                    <span className="font-bold text-on-surface">Pratik Kumar</span>
                                  </div>
                                  <div className="flex justify-between border-b pb-1">
                                    <span className="text-on-surface-variant">{t('field_nomineeRelationship', currentLang)}:</span>
                                    <span className="font-bold text-on-surface">Son</span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span className="text-on-surface-variant">{t('field_nomineeAge', currentLang)}:</span>
                                    <span className="font-bold text-on-surface">12 (Minor)</span>
                                  </div>
                                </div>
                              </>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* 3. SEARCH TAB */}
                {activeTab === 'search' && (
                  <div className="space-y-4">
                    {/* Search Field */}
                    <div className="relative">
                      <Search className="w-4 h-4 text-on-surface-variant absolute left-3.5 top-1/2 -translate-y-1/2" />
                      <input 
                        type="text"
                        placeholder={t('sh_search_placeholder', currentLang)}
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full bg-surface border border-outline-variant rounded-xl pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
                      />
                    </div>

                    {/* Template Catalog */}
                    <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
                      {filteredTemplates.length > 0 ? (
                        filteredTemplates.map((tmpl) => (
                          <button
                            key={tmpl.id}
                            type="button"
                            onClick={() => handleSelectTemplate(tmpl)}
                            className={`w-full p-3 rounded-xl border text-left transition-all flex justify-between items-center cursor-pointer hover:border-primary ${selectedTemplate.id === tmpl.id ? 'border-primary bg-primary/5' : 'border-outline-variant/30 bg-surface'}`}
                          >
                            <div>
                              <h5 className="font-bold text-xs text-on-surface">{tmpl.title}</h5>
                              <span className="text-[10px] text-on-surface-variant">
                                {tmpl.bankName} • {tmpl.fields.length} Fields
                              </span>
                            </div>
                            <span className="text-[10px] font-bold text-primary bg-primary/10 px-2 py-1 rounded">
                              {t('sh_select', currentLang)}
                            </span>
                          </button>
                        ))
                      ) : (
                        <div className="p-8 text-center text-xs text-on-surface-variant">
                          {t('sh_search_no_results', currentLang)}
                        </div>
                      )}
                    </div>

                    <p className="text-[11px] text-on-surface-variant leading-relaxed text-center italic bg-surface-container-low p-2 rounded-xl">
                      {t('sh_search_note', currentLang)}
                    </p>
                  </div>
                )}

              </div>

              {/* Verified Badges (Always Visible) */}
              <div className="border-t border-outline-variant/20 pt-4 flex gap-1.5 justify-center flex-wrap sm:flex-nowrap" id="scan-checks">
                <div className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-[9px] sm:text-[10px] font-extrabold border transition-all whitespace-nowrap ${selectedDoc || voiceStep >= 4 ? 'bg-green-50 text-green-700 border-green-200' : 'bg-surface-container-low text-on-surface-variant border-outline-variant/30'}`}>
                  <CheckCircle2 className="w-3 h-3" />
                  {t('sh_layout_mapped', currentLang)}
                </div>
                <div className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-[9px] sm:text-[10px] font-extrabold border transition-all whitespace-nowrap ${selectedDoc || voiceStep >= 4 ? 'bg-green-50 text-green-700 border-green-200' : 'bg-surface-container-low text-on-surface-variant border-outline-variant/30'}`}>
                  <CheckCircle2 className="w-3 h-3" />
                  {t('sh_formats_verified', currentLang)}
                </div>
              </div>

            </div>
          </div>

          {/* RIGHT PANEL: Live Banking Form Fill Area (7 columns) */}
          <div className="lg:col-span-7 space-y-4">
            
            <div className="bg-white rounded-3xl p-6 border border-outline-variant/30 shadow-md flex flex-col min-h-[460px]">
              
              {/* Form Header with Language Toggle */}
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-outline-variant/20 pb-4 gap-4">
                <div className="min-w-0 flex-1">
                  <span className="text-[10px] font-extrabold text-secondary uppercase tracking-widest block">
                    {t('sh_form_title', currentLang)}
                  </span>
                  <h3 className="text-md font-bold text-on-surface truncate max-w-xs sm:max-w-md" title={selectedTemplate.title}>
                    {selectedTemplate.title}
                  </h3>
                </div>

                {/* Multilingual Pills — synced to global language */}
                <div className="flex flex-shrink-0 items-center gap-1.5 bg-surface-container-low p-1 rounded-lg border border-outline-variant/30">
                  <span className="text-[10px] font-bold text-on-surface-variant px-1.5">{t('sh_lang_label', currentLang)}</span>
                  {LANGUAGES.map((l) => (
                    <button
                      key={l.code}
                      type="button"
                      onClick={() => onChangeLang && onChangeLang(l.code)}
                      className={`px-2 py-1 rounded text-xs font-bold transition-all cursor-pointer ${currentLang === l.code ? 'bg-primary text-white' : 'text-on-surface-variant hover:text-primary hover:bg-white'}`}
                      title={l.name}
                    >
                      {l.nativeName}
                    </button>
                  ))}
                </div>
              </div>

              {/* Form Body Fields */}
              <form onSubmit={handleFormSubmit} className="flex-grow space-y-4 py-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {formFields.map((field) => {
                    const label = t('field_' + field.id, currentLang);
                    const placeholder = t('holder_' + field.id, currentLang);
                    return (
                      <div key={field.id} className="space-y-1">
                        <label className="text-xs font-bold text-on-surface flex items-center justify-between">
                          <span>{label}</span>
                          {field.confidence > 0 && (
                            <span className="text-[9px] font-extrabold text-green-600 bg-green-50 px-1.5 py-0.5 rounded">
                              {field.confidence}% Match
                            </span>
                          )}
                        </label>
                        
                        {field.type === 'select' ? (
                          <select
                            value={field.value}
                            onFocus={() => handleFieldFocus(field.id)}
                            onChange={(e) => {
                              const val = e.target.value;
                              setFormFields(prev => prev.map(f => f.id === field.id ? { ...f, value: val, confidence: 100 } : f));
                            }}
                            className={`w-full bg-surface border rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-primary transition-all ${field.confidence > 0 ? 'border-green-300 ring-1 ring-green-100 bg-green-50/10' : 'border-outline-variant'}`}
                          >
                            <option value="">{t('sh_select', currentLang)}...</option>
                            {field.options?.map((opt, i) => (
                              <option key={i} value={opt}>{opt}</option>
                            ))}
                          </select>
                        ) : (
                          <input 
                            type={field.type}
                            placeholder={placeholder}
                            value={field.value}
                            onFocus={() => handleFieldFocus(field.id)}
                            onChange={(e) => {
                              const val = e.target.value;
                              setFormFields(prev => prev.map(f => f.id === field.id ? { ...f, value: val, confidence: 100 } : f));
                            }}
                            className={`w-full bg-surface border rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-primary transition-all ${field.confidence > 0 ? 'border-green-300 ring-1 ring-green-100 bg-green-50/10 font-medium' : 'border-outline-variant'}`}
                          />
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Form Actions */}
                <div className="pt-6 border-t border-outline-variant/20 flex flex-col sm:flex-row justify-between items-center gap-4">
                  <div className="flex items-center gap-2">
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                    </span>
                    <span className="text-xs font-semibold text-on-surface-variant">
                      {autofillStatusMessage ? (
                        <span className="text-green-600 font-bold flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5 animate-pulse" /> {t(autofillStatusMessage, currentLang)}
                        </span>
                      ) : (
                        isAnyFieldFilled ? t('sh_status_ai', currentLang) : t('sh_status_scan_begin', currentLang)
                      )}
                    </span>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                    <button
                      type="button"
                      onClick={handleInstantAutofill}
                      className="w-full sm:w-auto px-4 py-2.5 rounded-full font-bold text-xs whitespace-nowrap bg-primary/10 text-primary hover:bg-primary/20 border border-primary/20 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <Sparkles className="w-3.5 h-3.5 text-secondary animate-pulse" />
                      {t('sh_autofill_btn', currentLang)}
                    </button>

                    <button
                      type="submit"
                      disabled={!isAnyFieldFilled}
                      className={`w-full sm:w-auto px-4 py-2.5 rounded-full font-bold text-xs whitespace-nowrap shadow-md transition-all flex items-center justify-center gap-1.5 cursor-pointer ${isAnyFieldFilled ? 'bg-secondary text-white hover:bg-secondary-container hover:shadow-lg hover:scale-102' : 'bg-surface-container-highest text-on-surface-variant/40 cursor-not-allowed border'}`}
                    >
                      <Download className="w-3.5 h-3.5" />
                      {t('sh_download_btn', currentLang)}
                    </button>
                  </div>
                </div>
              </form>

            </div>
          </div>

        </div>

      </div>

      {/* FINAL HIGH-FIDELITY RESULT MODAL */}
      {showResultModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-on-surface/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-[32px] max-w-xl w-full p-8 shadow-2xl relative border border-outline-variant/30 overflow-hidden animate-scale-up">
            
            {/* Header decor */}
            <div className="absolute top-0 left-0 w-full h-1.5 brand-gradient"></div>
            
            {/* PDF Generation Loader State */}
            {pdfGenerationStatus === 'generating' && (
              <div className="py-12 flex flex-col items-center justify-center space-y-6 text-center">
                <div className="w-16 h-16 rounded-full border-4 border-primary border-t-transparent animate-spin"></div>
                <div className="space-y-1">
                  <h4 className="text-xl font-bold text-on-surface">{t('res_generating', currentLang)}</h4>
                  <p className="text-sm text-on-surface-variant max-w-xs">
                    {t('res_formatting', currentLang)}
                  </p>
                </div>
              </div>
            )}

            {/* Success State */}
            {pdfGenerationStatus === 'success' && (
              <div className="space-y-6">
                
                {/* Header */}
                <div className="flex justify-between items-start border-b border-outline-variant/20 pb-4">
                  <div>
                    <span className="text-[10px] font-extrabold text-green-600 bg-green-50 px-2.5 py-1 rounded-full border border-green-200">
                      STATUS: SUCCESSFUL
                    </span>
                    <h3 className="text-xl font-bold text-on-surface mt-2">{t('res_success_title', currentLang)}</h3>
                  </div>
                  <button 
                    type="button"
                    onClick={() => setShowResultModal(false)}
                    className="text-on-surface-variant hover:text-on-surface text-lg font-bold bg-surface-container p-2 rounded-full cursor-pointer"
                  >
                    ✕
                  </button>
                </div>

                {/* Subheading explanation */}
                <p className="text-xs text-on-surface-variant leading-relaxed">
                  {t('res_success_desc', currentLang)}
                </p>

                {/* PDF and QR Code Layout Details */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  
                  {/* Mock Form PDF summary card */}
                  <div className="bg-surface-container-low border border-outline-variant/40 rounded-2xl p-4 space-y-3">
                    <span className="text-[10px] font-extrabold text-primary uppercase tracking-widest flex items-center gap-1.5">
                      <FileText className="w-3.5 h-3.5 text-primary" /> {t('res_pdf_title', currentLang)}
                    </span>
                    
                    <div className="space-y-2 text-[11px]">
                      {formFields.slice(0, 5).map(f => (
                        <div key={f.id} className="flex justify-between border-b border-outline-variant/10 pb-1">
                          <span className="text-on-surface-variant">{t('field_' + f.id, currentLang)}:</span>
                          <span className="font-bold text-on-surface truncate max-w-[120px]">{f.value || 'N/A'}</span>
                        </div>
                      ))}
                    </div>
                    
                    <button 
                      type="button"
                      onClick={() => alert('Mock PDF Download triggered! In production, this saves the filled form directly.')}
                      className="w-full bg-white text-primary border border-primary/20 hover:bg-primary/5 py-2 rounded-xl font-bold text-xs flex items-center justify-center gap-2 cursor-pointer transition-colors"
                    >
                      <Download className="w-3.5 h-3.5" />
                      {t('res_save_pdf', currentLang)}
                    </button>
                  </div>

                  {/* QR Code display card */}
                  <div className="bg-surface-container-low border border-outline-variant/40 rounded-2xl p-4 flex flex-col items-center justify-between space-y-4">
                    <span className="text-[10px] font-extrabold text-secondary uppercase tracking-widest flex items-center gap-1.5">
                      <QrCode className="w-3.5 h-3.5 text-secondary" /> {t('res_qr_title', currentLang)}
                    </span>

                    {/* Vector representation of QR */}
                    <div className="bg-white p-3 rounded-xl border border-outline-variant/30 shadow-sm relative group">
                      <svg className="w-24 h-24 text-on-surface" viewBox="0 0 100 100">
                        {/* QR Corners */}
                        <rect x="5" y="5" width="25" height="25" fill="currentColor" />
                        <rect x="10" y="10" width="15" height="15" fill="white" />
                        <rect x="13" y="13" width="9" height="9" fill="currentColor" />

                        <rect x="70" y="5" width="25" height="25" fill="currentColor" />
                        <rect x="75" y="10" width="15" height="15" fill="white" />
                        <rect x="78" y="13" width="9" height="9" fill="currentColor" />

                        <rect x="5" y="70" width="25" height="25" fill="currentColor" />
                        <rect x="10" y="75" width="15" height="15" fill="white" />
                        <rect x="13" y="78" width="9" height="9" fill="currentColor" />

                        {/* Random QR bits */}
                        <rect x="40" y="15" width="10" height="5" fill="currentColor" />
                        <rect x="45" y="30" width="15" height="10" fill="currentColor" />
                        <rect x="15" y="45" width="10" height="15" fill="currentColor" />
                        <rect x="35" y="55" width="25" height="5" fill="currentColor" />
                        <rect x="70" y="45" width="15" height="15" fill="currentColor" />
                        <rect x="75" y="75" width="10" height="10" fill="currentColor" />
                        <rect x="50" y="75" width="10" height="5" fill="currentColor" />
                        <rect x="55" y="85" width="15" height="10" fill="currentColor" />
                      </svg>
                      {/* Logo center decor */}
                      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white p-1 rounded-md border text-[8px] font-extrabold text-primary shadow">
                        FS
                      </div>
                    </div>

                    <button 
                      type="button"
                      onClick={() => alert('Simulating Teller scanner: QR contains encrypted and compressed JSON package of this banking request.')}
                      className="w-full bg-primary text-white hover:bg-primary-container py-2 rounded-xl font-bold text-xs flex items-center justify-center gap-2 cursor-pointer transition-colors"
                    >
                      <Printer className="w-3.5 h-3.5" />
                      {t('res_print_slip', currentLang)}
                    </button>
                  </div>

                </div>

                {/* Footer close button */}
                <div className="pt-4 border-t border-outline-variant/20 flex justify-end gap-2">
                  <button 
                    type="button"
                    onClick={() => setShowResultModal(false)}
                    className="bg-surface-container-highest text-on-surface hover:bg-outline-variant/30 px-6 py-2.5 rounded-full font-bold text-xs cursor-pointer transition-all"
                  >
                    {t('res_close', currentLang)}
                  </button>
                </div>

              </div>
            )}

          </div>
        </div>
      )}

    </section>
  );
}
