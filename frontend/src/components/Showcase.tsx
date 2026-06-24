import React, { useState, useEffect, useRef } from 'react';
import { Camera, Mic, Search, CheckCircle2, Upload, FileText, Download, QrCode, Sparkles, RefreshCw, AlertCircle, Printer, Volume2, VolumeX } from 'lucide-react';
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
  const [isTypingComplete, setIsTypingComplete] = useState<boolean>(false);
  const [hasVoicePlayedForField, setHasVoicePlayedForField] = useState<boolean>(false);

  // Upload preview states
  const [uploadedImageSrc, setUploadedImageSrc] = useState<string | null>(null);
  const [pendingUploadedDoc, setPendingUploadedDoc] = useState<DemoDocument | null>(null);

  // Active User record from CSV
  const [activeUserRecord, setActiveUserRecord] = useState<Record<string, string> | null>(null);

  // TTS Voice Assistance state
  const [activeSpeechId, setActiveSpeechId] = useState<string | null>(null);
  const [isSpeaking, setIsSpeaking] = useState<boolean>(false);
  // 'idle' | 'playing' | 'paused' | 'stopped'
  const [speechStatus, setSpeechStatus] = useState<'idle' | 'playing' | 'paused' | 'stopped'>('idle');
  // label of voice currently in use (dev console badge)
  const [activeVoiceLabel, setActiveVoiceLabel] = useState<string>('');

  // Autofill status message for demo feedback
  const [autofillStatusMessage, setAutofillStatusMessage] = useState<string>('');

  // Form-specific language (can differ from global UI language via the in-form picker)
  // Initialized from the global lang prop; re-syncs whenever the global lang changes
  const [formLang, setFormLang] = useState<string>(currentLang);

  // Sync form language when global UI language changes
  useEffect(() => {
    setFormLang(currentLang);
  }, [currentLang]);

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
    stopSpeech();
  };

  // Language BCP-47 code mapping for Web Speech API
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

  /**
   * Pick the best available SpeechSynthesisVoice for a given BCP-47 lang code.
   * Priority: exact match → region-prefix match → en-US/en-GB fallback → first available.
   * Logs selected voice to console for dev debugging.
   */
  const getBestVoice = (langCode: string): SpeechSynthesisVoice | null => {
    if (!('speechSynthesis' in window)) return null;
    const voices = window.speechSynthesis.getVoices();
    if (voices.length === 0) return null;

    // 1. Exact BCP-47 match (e.g. 'hi-IN')
    let voice = voices.find(v => v.lang === langCode) ?? null;

    // 2. Language prefix match (e.g. lang starts with 'hi')
    if (!voice) {
      const prefix = langCode.split('-')[0];
      voice = voices.find(v => v.lang.startsWith(prefix)) ?? null;
      if (voice) console.warn(`[FormSaathi TTS] No exact voice for ${langCode}. Fallback: ${voice.name} (${voice.lang})`);
    }

    // 3. Fall back to any English voice
    if (!voice) {
      voice = voices.find(v => v.lang.startsWith('en-IN')) ??
              voices.find(v => v.lang.startsWith('en-US')) ??
              voices.find(v => v.lang.startsWith('en')) ?? null;
      if (voice) console.warn(`[FormSaathi TTS] No ${langCode} voice. English fallback: ${voice.name} (${voice.lang})`);
    }

    // 4. Last resort: first available voice
    if (!voice && voices.length > 0) {
      voice = voices[0];
      console.warn(`[FormSaathi TTS] Using first available voice: ${voice.name}`);
    }

    if (voice) console.info(`[FormSaathi TTS] ✓ "${voice.name}" lang=${voice.lang} local=${voice.localService}`);
    return voice;
  };

  // Pre-load voices at mount so getBestVoice always has a populated list.
  // Chrome fires onvoiceschanged asynchronously; without this, the first call returns [].
  useEffect(() => {
    if (!('speechSynthesis' in window)) return;
    // Trigger initial load
    window.speechSynthesis.getVoices();
    const handleVoicesChanged = () => { window.speechSynthesis.getVoices(); };
    window.speechSynthesis.addEventListener('voiceschanged', handleVoicesChanged);
    return () => window.speechSynthesis.removeEventListener('voiceschanged', handleVoicesChanged);
  }, []);

  // Speak text using Web Speech API — Chrome-hardened implementation
  const speakText = (text: string, speechId: string, lang?: string) => {
    if (!('speechSynthesis' in window)) {
      console.warn('[FormSaathi TTS] speechSynthesis not supported');
      return;
    }

    // Toggle off if the same button is clicked while already playing
    if (activeSpeechId === speechId && isSpeaking) {
      if (window.speechSynthesis.paused) {
        window.speechSynthesis.resume();
      }
      window.speechSynthesis.cancel();
      setActiveSpeechId(null);
      setIsSpeaking(false);
      setSpeechStatus('stopped');
      setActiveVoiceLabel('');
      return;
    }

    // Hard-cancel anything currently playing
    if (window.speechSynthesis.paused) {
      window.speechSynthesis.resume();
    }
    window.speechSynthesis.cancel();

    const targetLang = lang || getLangCode(formLang);

    // ⚠️ Chrome bugs addressed here:
    // 1. speak() right after cancel() is silently dropped → wait 200ms
    // 2. synthesis engine can get stuck "paused" after tab switch → call resume()
    // 3. Assigning utterance.voice with a stale reference fails silently →
    //    always get fresh voices list and assign fresh voice object immediately before speak()
    setTimeout(() => {
      // Un-stuck Chrome's paused synthesis engine
      if (window.speechSynthesis.paused) {
        window.speechSynthesis.resume();
      }

      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate   = 0.95; // requirement 3: rate = 0.95
      utterance.pitch  = 1.0;  // requirement 3: pitch = 1.0
      utterance.volume = 1.0;  // requirement 3: volume = 1.0

      const voice = getBestVoice(targetLang);
      if (voice) {
        utterance.voice = voice;
        utterance.lang = voice.lang;
        setActiveVoiceLabel(`${voice.name} (${voice.lang})`);
      } else {
        utterance.lang = targetLang;
        setActiveVoiceLabel(targetLang);
      }

      // Chrome keep-alive: synthesis auto-pauses after ~15s of audio.
      // A periodic resume() call prevents silent cutoff on long texts.
      let keepAlive: ReturnType<typeof setInterval> | null = null;

      utterance.onstart = () => {
        setActiveSpeechId(speechId);
        setIsSpeaking(true);
        setSpeechStatus('playing');
        // Ping resume every 10s to prevent Chrome's auto-pause
        keepAlive = setInterval(() => {
          if (window.speechSynthesis.speaking && window.speechSynthesis.paused) {
            window.speechSynthesis.resume();
          }
        }, 10000);
        console.info(`[FormSaathi TTS] ✓ Playing with voice: ${utterance.voice?.name || 'Default'}`);
      };
      utterance.onpause  = () => { setSpeechStatus('paused'); };
      utterance.onresume = () => { setSpeechStatus('playing'); };
      utterance.onend = () => {
        if (keepAlive) clearInterval(keepAlive);
        setActiveSpeechId(null);
        setIsSpeaking(false);
        setSpeechStatus('idle');
        setActiveVoiceLabel('');
      };
      utterance.onerror = (e) => {
        if (keepAlive) clearInterval(keepAlive);
        // 'interrupted' is not a real error — it just means cancel() was called
        if (e.error !== 'interrupted' && e.error !== 'canceled') {
          console.error('[FormSaathi TTS] Error:', e.error);
        }
        setActiveSpeechId(null);
        setIsSpeaking(false);
        setSpeechStatus('idle');
        setActiveVoiceLabel('');
      };

      window.speechSynthesis.speak(utterance);
      console.info(`[FormSaathi TTS] speak() called, lang=${targetLang}, speaking=${window.speechSynthesis.speaking}`);
    }, 200);
  };

  // Stop all speech
  const stopSpeech = () => {
    if ('speechSynthesis' in window) window.speechSynthesis.cancel();
    setActiveSpeechId(null);
    setIsSpeaking(false);
    setSpeechStatus('stopped');
    setActiveVoiceLabel('');
  };

  // Field focus handler
  const handleFieldFocus = (fieldId: string) => {
    const index = formFields.findIndex(f => f.id === fieldId);
    if (index !== -1) {
      setGuidedFieldIndex(index);
    }
  };

  // Multilingual guidance text per field
  const getFieldGuidanceAll = (fieldId: string): { tip: string; regional: string; reason: string } => {
    const db: Record<string, Record<string, { tip: string; regional: string; reason: string }>> = {
      fullName: {
        en: {
          tip: "Enter your full legal name as it appears on your official documents like Aadhaar or PAN card.",
          regional: "Please write your full name exactly as it is spelled on your identity proof, without any short forms.",
          reason: "This ensures that your bank account is registered under your correct legal identity to prevent identity mismatch."
        },
        hinglish: {
          tip: "Enter your full legal name as it appears on your official documents like Aadhaar or PAN card.",
          regional: "Apna poora naam likhein jo aapke Aadhaar ya PAN card par hai, bina kisi short form ke.",
          reason: "Isse aapka bank account aapki sahi legal identity ke under register hota hai aur mismatch nahi hota."
        },
        hi: {
          tip: "Enter your full legal name as it appears on your official documents like Aadhaar or PAN card.",
          regional: "अपना पूरा नाम लिखें जो आपके आधार या पैन कार्ड पर है, बिना किसी शॉर्ट फॉर्म के।",
          reason: "यह सुनिश्चित करता है कि आपका बैंक खाता आपकी सही कानूनी पहचान के तहत पंजीकृत हो ताकि नाम में भिन्नता न हो।"
        },
        ta: {
          tip: "Enter your full legal name as it appears on your official documents like Aadhaar or PAN card.",
          regional: "உங்கள் ஆதார் அல்லது பான் கார்டில் உள்ளவாறு உங்கள் முழு பெயரை எழுதவும், சுருக்கெழுத்துக்களை தவிர்க்கவும்.",
          reason: "இது அடையாளப் பிழைகளைத் தவிர்க்க உங்கள் வங்கிக் கணக்கு சரியான சட்டப்பூர்வ பெயரில் பதிவு செய்யப்படுவதை உறுதி செய்கிறது."
        },
        bn: {
          tip: "Enter your full legal name as it appears on your official documents like Aadhaar or PAN card.",
          regional: "আপনার আধার বা প্যান কার্ডে যেভাবে বানান আছে ঠিক সেভাবে আপনার পুরো নাম লিখুন, কোনো সংক্ষিপ্ত রূপ ব্যবহার করবেন না।",
          reason: "এটি নিশ্চিত করে যে আপনার ব্যাঙ্ক অ্যাকাউন্টটি আপনার সঠিক আইনি পরিচয়ের অধীনে নিবন্ধিত রয়েছে যাতে পরবর্তীতে কোনো অমিল না হয়।"
        },
        mr: {
          tip: "Enter your full legal name as it appears on your official documents like Aadhaar or PAN card.",
          regional: "तुमचे पूर्ण नाव तुमच्या आधार किंवा पॅन कार्डवर जसे आहे तसेच लिहा, कोणतीही लघुरूपे वापरू नका.",
          reason: "हे तुमचे बँक खाते तुमच्या योग्य कायदेशीर नावाखाली नोंदणीकृत असल्याची खात्री करते जेणेकरून नावातील तफावत टळेल."
        },
        te: {
          tip: "Enter your full legal name as it appears on your official documents like Aadhaar or PAN card.",
          regional: "మీ ఆధార్ లేదా పాన్ కార్డులో ఉన్నట్లుగా మీ పూర్తి పేరును రాయండి, సంక్షిప్త రూపాలను ఉపయోగించవద్దు.",
          reason: "ఇది మీ బ్యాంక్ ఖాతా మీ సరైన చట్టపరమైన గుర్తింపు క్రింద నమోదు చేయబడిందని నిర్ధారిస్తుంది, తద్వారా గుర్తింపు సరిపోలని సమస్యలు రావు."
        }
      },
      fatherName: {
        en: {
          tip: "Provide the full name of your father or spouse as shown in government records.",
          regional: "Enter the full name of your father or husband/wife, keeping the spelling same as on their ID proofs.",
          reason: "Required for verifying your family linkage and distinguishing your account from others with similar names."
        },
        hinglish: {
          tip: "Provide the full name of your father or spouse as shown in government records.",
          regional: "Apne pita ya pati/patni ka poora naam likhein, jaisa unke official ID proofs par hai.",
          reason: "Aapke family relationship ko check karne aur same naam wale accounts se alag rakhne ke liye zaruri hai."
        },
        hi: {
          tip: "Provide the full name of your father or spouse as shown in government records.",
          regional: "अपने पिता या पति/पत्नी का पूरा नाम लिखें, जैसा उनके आधिकारिक पहचान पत्र पर है।",
          reason: "आपके पारिवारिक संबंध को सत्यापित करने और समान नाम वाले अन्य खातों से आपके खाते को अलग करने के लिए आवश्यक है।"
        },
        ta: {
          tip: "Provide the full name of your father or spouse as shown in government records.",
          regional: "உங்கள் தந்தை அல்லது கணவர்/மனைவியின் முழு பெயரை, அவர்களின் அடையாள அட்டையில் உள்ளபடி உள்ளிடவும்.",
          reason: "உங்கள் குடும்ப உறவைச் சரிபார்க்கவும், ஒரே மாதிரியான பெயர்களைக் கொண்ட பிற கணக்குகளிலிருந்து உங்கள் கணக்கை வேறுபடுத்தவும் தேவைப்படுகிறது."
        },
        bn: {
          tip: "Provide the full name of your father or spouse as shown in government records.",
          regional: "আপনার বাবা বা স্বামী/স্ত্রীর পুরো নাম লিখুন, তাদের পরিচয়পত্রে যেভাবে আছে সেই বানানই ব্যবহার করুন।",
          reason: "আপনার पारिवारिक পরিচয় যাচাই করতে এবং একই নামের অন্যান্য অ্যাকাউন্ট থেকে আপনার অ্যাকাউন্টকে আলাদা করতে এটি প্রয়োজনীয়।"
        },
        mr: {
          tip: "Provide the full name of your father or spouse as shown in government records.",
          regional: "तुमच्या वडिलांचे किंवा पती/पत्नीचे पूर्ण नाव लिहा, त्यांच्या ओळखपत्रावरील स्पेलिंगप्रमाणेच नोंद करा.",
          reason: "तुमच्या कौटुंबिक संबंधांची पडताळणी करण्यासाठी आणि समान नावाच्या इतर खात्यांपासून तुमचे खाते वेगळे ठेवण्यासाठी आवश्यक आहे."
        },
        te: {
          tip: "Provide the full name of your father or spouse as shown in government records.",
          regional: "మీ తండ్రి లేదా భర్త/భార్య పూర్తి పేరును వారి గుర్తింపు కార్డులలో ఉన్న విధంగా నమోదు చేయండి.",
          reason: "మీ కుటుంబ సంబంధాన్ని ధృవీకరించడానికి మరియు ఒకే రకమైన పేర్లు ఉన్న ఇతర ఖాతాల నుండి మీ ఖాతాను వేరు చేయడానికి ఇది అవసరం."
        }
      },
      dob: {
        en: {
          tip: "Enter your birth date in YYYY-MM-DD format (for example, 1995-08-25).",
          regional: "Select or enter your birth date matching the date printed on your Aadhaar card.",
          reason: "Needed to confirm your age limits for eligibility and for security verification when you contact the bank."
        },
        hinglish: {
          tip: "Enter your birth date in YYYY-MM-DD format (for example, 1995-08-25).",
          regional: "Apni janam tithi YYYY-MM-DD format mein bhariye, jo aapke Aadhaar card se match karti ho.",
          reason: "Aapki eligibility check karne aur jab aap bank ko contact karein tab security check karne ke liye chahiye."
        },
        hi: {
          tip: "Enter your birth date in YYYY-MM-DD format (for example, 1995-08-25).",
          regional: "अपनी जन्म तिथि YYYY-MM-DD प्रारूप में दर्ज करें, जो आपके आधार कार्ड से मेल खाती हो।",
          reason: "योग्यता के लिए आपकी आयु सीमा की पुष्टि करने और जब आप बैंक से संपर्क करते हैं तो सुरक्षा सत्यापन के लिए आवश्यक है।"
        },
        ta: {
          tip: "Enter your birth date in YYYY-MM-DD format (for example, 1995-08-25).",
          regional: "ஆதார் கார்டில் உள்ளவாறு உங்கள் பிறந்த தேதியை YYYY-MM-DD வடிவில் உள்ளிடவும்.",
          reason: "உங்கள் வயது தகுதியை உறுதிப்படுத்தவும், நீங்கள் வங்கியைத் தொடர்பு கொள்ளும்போது பாதுகாப்பு சரிபார்ப்புக்காகவும் இது தேவைப்படுகிறது."
        },
        bn: {
          tip: "Enter your birth date in YYYY-MM-DD format (for example, 1995-08-25).",
          regional: "আপনার আধার কার্ডের সাথে মিলিয়ে আপনার জন্ম তারিখটি YYYY-MM-DD ফরম্যাটে লিখুন।",
          reason: "আপনার যোগ্যতার বয়সসীমা নিশ্চিত করতে এবং ব্যাঙ্কের সাথে যোগাযোগের সময় নিরাপত্তা যাচাইয়ের জন্য এটি প্রয়োজন।"
        },
        mr: {
          tip: "Enter your birth date in YYYY-MM-DD format (for example, 1995-08-25).",
          regional: "तुमची जन्मतारीख आधार कार्डवरील नोंदीप्रमाणे YYYY-MM-DD स्वरूपात भरा.",
          reason: "पात्रतेसाठी तुमचे वय तपासण्यासाठी आणि तुम्ही बँकेशी संपर्क साधता तेव्हा सुरक्षा पडताळणीसाठी आवश्यक आहे."
        },
        te: {
          tip: "Enter your birth date in YYYY-MM-DD format (for example, 1995-08-25).",
          regional: "మీ పుట్టిన తేదీని ఆధార్ కార్డు ప్రకారం YYYY-MM-DD ఆకారంలో నమోదు చేయండి.",
          reason: "మీ అర్హత వయస్సును నిర్ధారించడానికి మరియు మీరు బ్యాంకును సంప్రదించినప్పుడు భద్రతా ధృవీకరణ కోసం ఇది అవసరం."
        }
      },
      gender: {
        en: {
          tip: "Select your gender from the list of options.",
          regional: "Choose the gender that matches your legal identity and government documents.",
          reason: "Required as part of demographic records and regulatory KYC verification."
        },
        hinglish: {
          tip: "Select your gender from the list of options.",
          regional: "Dropdown se apna gender choose karein jo aapke government documents se match karta hai.",
          reason: "Aapke gender card and demographic records aur government KYC check ke liye zaruri hai."
        },
        hi: {
          tip: "Select your gender from the list of options.",
          regional: "अपना लिंग चुनें जो आपके सरकारी दस्तावेजों से मेल खाता हो।",
          reason: "जनसांख्यिकीय रिकॉर्ड और विनियामक केवाईसी सत्यापन के हिस्से के रूप में आवश्यक।"
        },
        ta: {
          tip: "Select your gender from the list of options.",
          regional: "உங்கள் அரசு ஆவணங்களுடன் பொருந்தும் பாலினத்தை தேர்ந்தெடுக்கவும்.",
          reason: "மக்கள்தொகை பதிவுகள் மற்றும் ஒழுங்குமுறை கேஒய்சி (KYC) சரிபார்ப்பின் ஒரு பகுதியாக தேவைப்படுகிறது."
        },
        bn: {
          tip: "Select your gender from the list of options.",
          regional: "আপনার সরকারি নথির সাথে মিলে যাওয়া লিঙ্গটি বেছে নিন।",
          reason: "জনপরিসংখ্যানগত রেকর্ড এবং সরকারি কেওয়াইসি (KYC) যাচাইকরণের অংশ হিসেবে এটি প্রয়োজনীয়।"
        },
        mr: {
          tip: "Select your gender from the list of options.",
          regional: "तुमच्या सरकारी ओळखपत्राशी जुळणारे लिंग निवडा.",
          reason: "लोकसंख्याशास्त्रीय नोंदी आणि नियामक केवायसी (KYC) पडताळणीचा भाग म्हणून आवश्यक आहे."
        },
        te: {
          tip: "Select your gender from the list of options.",
          regional: "మీ ప్రభుత్వ పత్రాలకు సరిపోయే లింగాన్ని ఎంచుకోండి.",
          reason: "జనాభా రికార్డులు మరియు నియంత్రణ కేవైసీ (KYC) ధృవీకరణలో భాగంగా ఇది అవసరం."
        }
      },
      panNo: {
        en: {
          tip: "Enter your 10-character Permanent Account Number (PAN) in uppercase.",
          regional: "Provide your 10-digit PAN number. It contains 5 letters, 4 numbers, and 1 letter.",
          reason: "Mandatory under Indian tax laws to monitor high-value transactions and link your account with income tax."
        },
        hinglish: {
          tip: "Enter your 10-character Permanent Account Number (PAN) in uppercase.",
          regional: "Apna 10-character ka PAN number likhein, jismein 5 letters, 4 numbers aur aakhir mein 1 letter hota hai.",
          reason: "Tax rules ke mutabik bade transaction ko check karne aur account ko income tax se link karne ke liye compulsory hai."
        },
        hi: {
          tip: "Enter your 10-character Permanent Account Number (PAN) in uppercase.",
          regional: "अपना 10-अक्षर का पैन (PAN) नंबर दर्ज करें। इसमें 5 अक्षर, 4 अंक और अंत में 1 अक्षर होता है।",
          reason: "भारतीय कर कानूनों के तहत बड़े लेनदेन की निगरानी करने और आपके खाते को आयकर से जोड़ने के लिए अनिवार्य है।"
        },
        ta: {
          tip: "Enter your 10-character Permanent Account Number (PAN) in uppercase.",
          regional: "உங்கள் 10 இலக்க பான் (PAN) எண்ணை உள்ளிடவும். இதில் 5 எழுத்துக்கள், 4 எண்கள் மற்றும் 1 எழுத்து இருக்கும்.",
          reason: "உயர் மதிப்பு பரிவர்த்தனைகளைக் கண்காணிக்கவும், உங்கள் கணக்கை வருமான वரியுடன் இணைக்கவும் இந்திய வரிச் சட்டங்களின் கீழ் கட்டாயமாகும்."
        },
        bn: {
          tip: "Enter your 10-character Permanent Account Number (PAN) in uppercase.",
          regional: "আপনার ১০ সংখ্যার প্যান (PAN) নম্বরটি লিখুন। এতে ৫টি অক্ষর, ৪টি সংখ্যা এবং শেষে ১টি অক্ষর থাকে।",
          reason: "উচ্চ-মূল্যের লেনদেনের ওপর নজর রাখতে এবং আপনার অ্যাকাউন্টটিকে আয়করের সাথে লিঙ্ক করতে ভারতীয় কর আইনের অধীনে এটি বাধ্যতামূলক।"
        },
        mr: {
          tip: "Enter your 10-character Permanent Account Number (PAN) in uppercase.",
          regional: "तुमचा 10 अंकी पॅन (PAN) नंबर नोंदवा. यामध्ये 5 अक्षरे, 4 अंक आणि शेवटी 1 अक्षर असते.",
          reason: "उच्च मूल्याच्या व्यवहारांवर लक्ष ठेवण्यासाठी आणि तुमचे खाते आयकर विभागाशी जोडण्यासाठी भारतीय कर कायद्यानुसार हे बंधनकारक आहे."
        },
        te: {
          tip: "Enter your 10-character Permanent Account Number (PAN) in uppercase.",
          regional: "మీ 10 అంకెల పాన్ (PAN) నంబరును నమోదు చేయండి. ఇందులో 5 అక్షరాలు, 4 అంకెలు మరియు 1 అక్షరం ఉంటాయి.",
          reason: "భారతీయ పన్ను చట్టాల ప్రకారం అధిక విలువ కలిగిన లావాదేవీలను పర్యవేక్షించడానికి మరియు మీ ఖాతాను ఆదాయపు పన్నుతో అనుసంధానించడానికి ఇది తప్పనిసరి."
        }
      },
      aadhaarNo: {
        en: {
          tip: "Enter your 12-digit Aadhaar Card number carefully.",
          regional: "Provide the 12-digit Aadhaar number from your card. Double-check all digits.",
          reason: "Required for biometric identity verification and linking government subsidies directly to your account."
        },
        hinglish: {
          tip: "Enter your 12-digit Aadhaar Card number carefully.",
          regional: "Apna 12-digit ka Aadhaar number likhein. Saare digits ko dhyan se check kar lein.",
          reason: "Biometric identity verification aur sarkari subsidy ko seedhe aapke account se jodne ke liye chahiye."
        },
        hi: {
          tip: "Enter your 12-digit Aadhaar Card number carefully.",
          regional: "अपना 12-अंकीय आधार नंबर दर्ज करें। सभी अंकों को ध्यान से जांच लें।",
          reason: "बायोमेट्रिक पहचान सत्यापन और सरकारी सब्सिडी को सीधे आपके खाते से जोड़ने के लिए आवश्यक है।"
        },
        ta: {
          tip: "Enter your 12-digit Aadhaar Card number carefully.",
          regional: "உங்கள் கார்டில் உள்ள 12 இலக்க ஆதார் (Aadhaar) எண்ணை கவனமாக உள்ளிடவும்.",
          reason: "பயிற்சி அடையாள சரிபார்ப்புக்கும், அரசாங்க மானியங்களை நேரடியாக உங்கள் கணக்குடன் இணைப்பதற்கும் தேவைப்படுகிறது."
        },
        bn: {
          tip: "Enter your 12-digit Aadhaar Card number carefully.",
          regional: "আপনার কার্ডে থাকা ১২ সংখ্যার আধার নম্বরটি লিখুন। সবকটি সংখ্যা ভালো করে মিলিয়ে নিন।",
          reason: "বায়োমেট্রিক পরিচয় যাচাইকরণের জন্য এবং সরকারি ভর্তুকি সরাসরি আপনার অ্যাকাউন্টে লিঙ্ক করার জন্য এটি প্রয়োজনীয়।"
        },
        mr: {
          tip: "Enter your 12-digit Aadhaar Card number carefully.",
          regional: "तुमचा 12 अंकी आधार नंबर काळजीपूर्वक टाका. सर्व अंक पुन्हा तपासून घ्या.",
          reason: "बायोमेट्रिक ओळख पडताळणीसाठी आणि सरकारी सबसिडी थेट तुमच्या खात्यात जमा करण्यासाठी आवश्यक आहे."
        },
        te: {
          tip: "Enter your 12-digit Aadhaar Card number carefully.",
          regional: "మీ కార్డులో ఉన్న 12 అంకెల ఆధార్ నంబరును జాగ్రత్తగా నమోదు చేయండి.",
          reason: "బయోమెట్రిక్ గుర్తింపు ధృవీకరణ మరియు ప్రభుత్వ సబ్సిడీలను నేరుగా మీ ఖాతాకు అనుసంధానించడానికి ఇది అవసరం."
        }
      },
      phone: {
        en: {
          tip: "Enter your active 10-digit mobile number.",
          regional: "Provide the 10-digit phone number that is linked with your Aadhaar for receiving OTPs.",
          reason: "Used for sending transaction alerts, monthly balance updates, and verifying login OTPs."
        },
        hinglish: {
          tip: "Enter your active 10-digit mobile number.",
          regional: "Apna 10-digit ka mobile number likhein jo Aadhaar se linked hai taaki OTP aa sake.",
          reason: "Transaction updates, monthly balance messages aur login verification OTP pane ke liye use hota hai."
        },
        hi: {
          tip: "Enter your active 10-digit mobile number.",
          regional: "अपना 10-अंकीय मोबाइल नंबर दर्ज करें जो आपके आधार से जुड़ा है ताकि ओटीपी प्राप्त हो सके।",
          reason: "लेनदेन अलर्ट, मासिक बैलेंस अपडेट और लॉगिन ओटीपी सत्यापित करने के लिए उपयोग किया जाता है।"
        },
        ta: {
          tip: "Enter your active 10-digit mobile number.",
          regional: "ஆதார் மற்றும் வங்கிக் கணக்குடன் இணைக்கப்பட்ட உங்கள் 10 இலக்க மொபைல் எண்ணை உள்ளிடவும்.",
          reason: "பரிவர்த்தனை எச்சரிக்கைகள், மாதாந்திர இருப்பு விவரங்கள் மற்றும் உள்நுழைவுக்கான ஒடிபி (OTP) ஆகியவற்றை அனுப்பப் பயன்படுகிறது."
        },
        bn: {
          tip: "Enter your active 10-digit mobile number.",
          regional: "আপনার সচল ১০ সংখ্যার মোবাইল নম্বরটি লিখুন যা আধারের সাথে যুক্ত আছে।",
          reason: "লেনদেনের অ্যালার্ট, মাসিক ব্যালেন্স আপডেট এবং লগইন ওটিপি (OTP) যাচাই করার জন্য ব্যবহৃত হয়।"
        },
        mr: {
          tip: "Enter your active 10-digit mobile number.",
          regional: "तुमचा चालू असलेला 10 अंकी मोबाईल नंबर टाका जो तुमच्या आधार कार्डशी जोडलेला आहे.",
          reason: "व्यवहार अलर्ट, मासिक शिल्लक अपडेट आणि लॉगिन ओटीपी (OTP) पडताळणी पाठवण्यासाठी वापरला जातो."
        },
        te: {
          tip: "Enter your active 10-digit mobile number.",
          regional: "మీ ఆధార్ కార్డుతో అనుసంధానించబడిన 10 అంకెల మొబైల్ నంబరును నమోదు చేయండి.",
          reason: "లావాదేవీ అలర్ట్‌లు, నెలవారీ బ్యాలెన్స్ అప్‌డేట్‌లు మరియు లాగిన్ ఓటీపీ (OTP)లను పంపడానికి ఉపయోగించబడుతుంది."
        }
      },
      address: {
        en: {
          tip: "Enter your complete residential address including house number, building, street, and town.",
          regional: "Provide your current full address where you reside, matching your proof of address document.",
          reason: "Required to mail checkbooks, debit cards, and important bank letters to your home."
        },
        hinglish: {
          tip: "Enter your complete residential address including house number, building, street, and town.",
          regional: "Apna poora address likhein — ghar ka number, building, gali, aur sheher jo address proof card par hai.",
          reason: "Cheque book, ATM card aur important bank letters aapke ghar bhejne ke liye chahiye."
        },
        hi: {
          tip: "Enter your complete residential address including house number, building, street, and town.",
          regional: "मकान नंबर, इमारत, गली और शहर सहित अपना पूरा पता दर्ज करें जैसा आपके पते के प्रमाण पत्र में है।",
          reason: "चेकबुक, डेबिट कार्ड और महत्वपूर्ण बैंक पत्र आपके घर भेजने के लिए आवश्यक है।"
        },
        ta: {
          tip: "Enter your complete residential address including house number, building, street, and town.",
          regional: "வீட்டு எண், தெரு மற்றும் ஊர் பெயர் உட்பட உங்களின் முழு வீட்டு முகவரியை உள்ளிடவும்.",
          reason: "செக் புக், டெபிட் கார்டு மற்றும் முக்கியமான வங்கி கடிதங்களை உங்கள் வீட்டிற்கு அனுப்ப தேவைப்படுகிறது."
        },
        bn: {
          tip: "Enter your complete residential address including house number, building, street, and town.",
          regional: "আপনার বাড়ির নম্বর, রাস্তা এবং শহরের নাম সহ সম্পূর্ণ ঠিকানাটি লিখুন যা আপনার ঠিকানার প্রমাণপত্রে আছে।",
          reason: "আপনার বাড়িতে চেক বই, ডেবিট কার্ড এবং ব্যাঙ্কের গুরুত্বপূর্ণ চিঠি পাঠাতে এটি প্রয়োজনীয়।"
        },
        mr: {
          tip: "Enter your complete residential address including house number, building, street, and town.",
          regional: "घर क्रमांक, इमारत, रस्ता आणि गावाच्या नावासह तुमचा संपूर्ण पत्ता लिहा.",
          reason: "चेकबुक, डेबिट कार्ड आणि महत्त्वाचे बँक पत्र तुमच्या घरी पाठवण्यासाठी आवश्यक आहे."
        },
        te: {
          tip: "Enter your complete residential address including house number, building, street, and town.",
          regional: "మీ ఇంటి నంబర్, వీధి మరియు ఊరి పేరుతో సహా పూర్తి నివాస చిరునామాను నమోదు చేయండి.",
          reason: "చెక్ బుక్స్, డెబిట్ కార్డ్స్ మరియు ముఖ్యమైన బ్యాంక్ లేఖలను మీ ఇంటికి పంపడానికి ఇది అవసరం."
        }
      },
      pincode: {
        en: {
          tip: "Enter the 6-digit postal code (PIN code) of your address.",
          regional: "Provide the 6-digit PIN code of your area. This helps the bank locate your post office.",
          reason: "Ensures speedy delivery of debit cards and official correspondence, and routes your profile to the nearest branch."
        },
        hinglish: {
          tip: "Enter the 6-digit postal code (PIN code) of your address.",
          regional: "Apne area ka 6-digit PIN code likhein taaki post office and branch locate ho sake.",
          reason: "Isse post delivery fast hoti hai aur bank ko pata chalta hai ki sabse paas wali branch kaunsi hai."
        },
        hi: {
          tip: "Enter the 6-digit postal code (PIN code) of your address.",
          regional: "अपने क्षेत्र का 6-अंकीय पिन कोड दर्ज करें। इससे डाकघर और शाखा का पता लगाने में मदद मिलती है।",
          reason: "डेबिट कार्ड और आधिकारिक पत्रों की तेजी से डिलीवरी सुनिश्चित करता है, और आपके पते को निकटतम शाखा से जोड़ता है।"
        },
        ta: {
          tip: "Enter the 6-digit postal code (PIN code) of your address.",
          regional: "உங்கள் முகவரியின் 6 இலக்க அஞ்சல் குறியீட்டை (PIN code) உள்ளிடவும்.",
          reason: "டெபிட் கார்டுகள் மற்றும் அதிகாரப்பூர்வ கடிதங்கள் விரைவாக விநியோகிக்கப்படுவதை உறுதி செய்கிறது, மேலும் உங்கள் சுயவிவரத்தை அருகிலுள்ள கிளைக்கு வழிநடத்துகிறது."
        },
        bn: {
          tip: "Enter the 6-digit postal code (PIN code) of your address.",
          regional: "আপনার এলাকার ৬ সংখ্যার পিন কোডটি লিখুন। এটি আপনার পোস্ট অফিস সনাক্ত করতে সাহায্য করে।",
          reason: "ডেবিট কার্ড এবং অফিসিয়াল চিঠিপত্র দ্রুত সরবরাহ নিশ্চিত করে এবং আপনার অ্যাকাউন্টটিকে নিকটস্থ শাখার সাথে লিঙ্ক করতে সাহায্য করে।"
        },
        mr: {
          tip: "Enter the 6-digit postal code (PIN code) of your address.",
          regional: "तुमच्या पत्त्याचा ६ अंकी पिन कोड लिहा. यामुळे बँकेला तुमचे पोस्ट ऑफिस शोधण्यास मदत होते.",
          reason: "डेबिट कार्ड आणि अधिकृत पत्रांचे जलद वितरण सुनिश्चित करते आणि तुमचे प्रोफाइल सर्वात जवळच्या शाखेशी जोडते."
        },
        te: {
          tip: "Enter the 6-digit postal code (PIN code) of your address.",
          regional: "మీ చిరునామా యొక్క 6 అంకెల పిన్ కోడ్‌ను ఇక్కడ నమోదు చేయండి.",
          reason: "డెబిట్ కార్డులు మరియు అధికారిక లేఖల వేగవంతమైన డెలివరీని నిర్ధారిస్తుంది, మరియు మీ ప్రొఫైల్‌ను సమీప శాఖకు అనుసంధానిస్తుంది."
        }
      },
      accountType: {
        en: {
          tip: "Select the type of account you wish to open (Savings, Current, Salary).",
          regional: "Choose whether you want a regular Savings account, Current account, or Salary account.",
          reason: "Determines the interest rates, withdrawal limits, and minimum balance rules for your account."
        },
        hinglish: {
          tip: "Select the type of account you wish to open (Savings, Current, Salary).",
          regional: "Select karein ki aap Savings, Current, ya Salary account mein se kaun sa kholna chahte hain.",
          reason: "Isse aapke interest rate, withdrawal limit aur minimum balance ke rules decide hote hain."
        },
        hi: {
          tip: "Select the type of account you wish to open (Savings, Current, Salary).",
          regional: "चुनें कि आप किस प्रकार का खाता खोलना चाहते हैं (बचत, चालू, या वेतन खाता)।",
          reason: "यह आपके खाते के लिए ब्याज दरों, निकासी सीमाओं और न्यूनतम शेष राशि के नियमों को निर्धारित करता है।"
        },
        ta: {
          tip: "Select the type of account you wish to open (Savings, Current, Salary).",
          regional: "நீங்கள் தொடங்க விரும்பும் கணக்கின் வகையைத் தேர்ந்தெடுக்கவும் (சேமிப்பு, நடப்பு அல்லது சம்பளக் கணக்கு).",
          reason: "உங்கள் கணக்கிற்கான வட்டி விகிதங்கள், பணம் எடுக்கும் வரம்புகள் மற்றும் குறைந்தபட்ச இருப்பு விதிகளை தீர்மானிக்கிறது."
        },
        bn: {
          tip: "Select the type of account you wish to open (Savings, Current, Salary).",
          regional: "আপনি কোন ধরনের অ্যাকাউন্ট খুলতে চান তা বেছে নিন (সঞ্চয়ী, চলতি, বা বেতন অ্যাকাউন্ট)।",
          reason: "এটি আপনার অ্যাকাউন্টের সুদের হার, টাকা তোলার সীমা এবং ন্যূনতম ব্যালেন্সের নিয়মগুলি নির্ধারণ করে।"
        },
        mr: {
          tip: "Select the type of account you wish to open (Savings, Current, Salary).",
          regional: "तुम्हाला कोणत्या प्रकारचे खाते उघडायचे आहे ते निवडा (बचत, चालू किंवा पगार खाते).",
          reason: "तुमच्या खात्यासाठीचे व्याजदर, पैसे काढण्याची मर्यादा आणि किमान शिल्लक रकमेचे नियम ठरवते."
        },
        te: {
          tip: "Select the type of account you wish to open (Savings, Current, Salary).",
          regional: "మీరు తెరవాలనుకుంటున్న ఖాతా రకాన్ని ఎంచుకోండి (పొదుపు, కరెంట్ లేదా జీతాల ఖాతా).",
          reason: "మీ ఖాతాకు సంబంధించిన వడ్డీ రేట్లు, విత్‌డ్రా పరిమితులు మరియు కనీస నిల్వ నిబంధనలను ఇది నిర్ణయిస్తుంది."
        }
      },
      nomineeName: {
        en: {
          tip: "Enter the full name of your nominated beneficiary.",
          regional: "Write the full legal name of the person who should receive the funds in case of emergency.",
          reason: "Required to designate a legal beneficiary who can receive the deposits in case of the account holder's demise."
        },
        hinglish: {
          tip: "Enter the full name of your nominated beneficiary.",
          regional: "Nominee ka poora naam likhein jo aapke baad account ke paise receive kar sake.",
          reason: "Aapke baad aapke paise kisko milenge, us legal nominee ko decide karne ke liye zaruri hai."
        },
        hi: {
          tip: "Enter the full name of your nominated beneficiary.",
          regional: "अपने नामांकित व्यक्ति (नॉमिनी) का पूरा नाम लिखें जो आपकी अनुपस्थिति में राशि प्राप्त कर सके।",
          reason: "खाताधारक की मृत्यु के मामले में जमा राशि प्राप्त करने वाले कानूनी लाभार्थी को नामित करने के लिए आवश्यक है।"
        },
        ta: {
          tip: "Enter the full name of your nominated beneficiary.",
          regional: "பரிந்துரையாளரின் (Nominee) முழு பெயரை எழுதவும்.",
          reason: "கணக்கு வைத்திருப்பவர் இறக்க நேரிட்டால், டெபாசிட் தொகையைப் பெறக்கூடிய சட்டப்பூர்வ பயனாளியை நியமிக்க தேவைப்படுகிறது."
        },
        bn: {
          tip: "Enter the full name of your nominated beneficiary.",
          regional: "আপনার মনোনীত নমিনির পুরো নাম লিখুন যিনি আপনার অনুপস্থিতিতে আমানত গ্রহণ করতে পারবেন।",
          reason: "অ্যাকাউন্ট হোল্ডারের মৃত্যুর ক্ষেত্রে জমাকৃত অর্থ গ্রহণ করতে পারবেন এমন একজন আইনি নমিনি মনোনীত করা প্রয়োজনীয়।"
        },
        mr: {
          tip: "Enter the full name of your nominated beneficiary.",
          regional: "तुम्ही नियुक्त केलेल्या वारसदाराचे (नॉमिनीचे) पूर्ण नाव लिहा.",
          reason: "खातेदाराच्या मृत्यूनंतर बँकेतील रक्कम मिळण्यासाठी कायदेशीर वारसदार (नॉमिनी) नियुक्त करणे आवश्यक आहे."
        },
        te: {
          tip: "Enter the full name of your nominated beneficiary.",
          regional: "మీరు నామినేట్ చేయాలనుకుంటున్న వ్యక్తి యొక్క పూర్తి పేరును ఇక్కడ రాయండి.",
          reason: "ఖాతాదారుడు మరణించిన సందర్భంలో డిపాజిట్లను అందుకోగల చట్టపరమైన నామినీని నియమించడానికి ఇది అవసరం."
        }
      },
      monthlyIncome: {
        en: {
          tip: "Enter your net monthly income in Indian Rupees.",
          regional: "Provide the exact amount you earn in a month after taxes and deductions.",
          reason: "Required by the bank to assess your loan repayment capacity and set appropriate credit limits."
        },
        hinglish: {
          tip: "Enter your net monthly income in Indian Rupees.",
          regional: "Apni har mahine ki net income (salary) bhariye, tax aur deductions katne ke baad.",
          reason: "Bank ko check karna hota hai ki aap loan chuka payenge ya nahi aur credit limit set karne ke liye."
        },
        hi: {
          tip: "Enter your net monthly income in Indian Rupees.",
          regional: "टैक्स और कटौती के बाद हर महीने मिलने वाली अपनी शुद्ध आय (Net Income) दर्ज करें।",
          reason: "बैंक द्वारा आपकी ऋण पुनर्भुगतान क्षमता का आकलन करने और उचित क्रेडिट सीमा निर्धारित करने के लिए आवश्यक है।"
        },
        ta: {
          tip: "Enter your net monthly income in Indian Rupees.",
          regional: "வரி மற்றும் பிற பிடித்தங்களுக்குப் பிறகு உங்களின் நிகர மாத வருமானத்தை உள்ளிடவும்.",
          reason: "வங்கி உங்களின் கடன் திருப்பிச் செலுத்தும் திறனை மதிப்பிடவும், தகுந்த கடன் வரம்புகளை நிர்ணயிக்கவும் இது தேவைப்படுகிறது."
        },
        bn: {
          tip: "Enter your net monthly income in Indian Rupees.",
          regional: "কর ও অন্যান্য কাটার পর প্রতি মাসে আপনার ঘরে আসা আসল আয় বা নেট বেতনের পরিমাণ লিখুন।",
          reason: "আপনার ঋণ পরিশোধের ক্ষমতা মূল্যায়ন করতে এবং উপযুক্ত ক্রেডিট সীমা নির্ধারণ করতে ব্যাঙ্কের এটি প্রয়োজন।"
        },
        mr: {
          tip: "Enter your net monthly income in Indian Rupees.",
          regional: "कर व वजावट वगळता तुमच्या हातात येणारे निव्वळ मासिक उत्पन्न किती आहे ते लिहा.",
          reason: "बँकेला तुमची कर्ज फेडण्याची क्षमता तपासण्यासाठी आणि योग्य क्रेडिट मर्यादा ठरवण्यासाठी आवश्यक आहे."
        },
        te: {
          tip: "Enter your net monthly income in Indian Rupees.",
          regional: "పన్నులు మరియు కటింగ్స్ పోగా మీకు లభించే నికర నెలవారీ ఆదాయాన్ని నమోదు చేయండి.",
          reason: "బ్యాంకు మీ రుణాన్ని తిరిగి చెల్లించే సామర్థ్యాన్ని అంచనా వేయడానికి మరియు తగిన క్రెడిట్ పరిమితులను నిర్ణయించడానికి ఇది అవసరం."
        }
      },
      employerName: {
        en: {
          tip: "Enter the full name of the company or organization you work for.",
          regional: "Write the official registered name of your employer or business entity.",
          reason: "Helps the bank verify your employment stability and categorize you as a salaried or self-employed customer."
        },
        hinglish: {
          tip: "Enter the full name of the company or organization you work for.",
          regional: "Apni company ya office ka registered naam likhein jahan aap kaam karte hain.",
          reason: "Aapki naukri ki stability verify karne aur salaried/self-employed category decide karne mein help karta hai."
        },
        hi: {
          tip: "Enter the full name of the company or organization you work for.",
          regional: "उस कंपनी या संगठन का पूरा नाम लिखें जिसके लिए आप काम करते हैं।",
          reason: "बैंक को आपकी रोजगार स्थिरता को सत्यापित करने और आपको वेतनभोगी या स्व-नियोजित ग्राहक के रूप में वर्गीकृत करने में मदद करता है।"
        },
        ta: {
          tip: "Enter the full name of the company or organization you work for.",
          regional: "நீங்கள் பணிபுரியும் நிறுவனம் அல்லது அமைப்பின் முழு பெயரை உள்ளிடவும்.",
          reason: "வங்கி உங்களின் வேலை ஸ்திரத்தன்மையை சரிபார்க்கவும், உங்களை சம்பளம் பெறுபவர் அல்லது சுயதொழில் செய்பவராக வகைப்படுத்தவும் உதவுகிறது."
        },
        bn: {
          tip: "Enter the full name of the company or organization you work for.",
          regional: "আপনি যে কোম্পানি বা সংস্থায় কাজ করেন তার সম্পূর্ণ নাম লিখুন।",
          reason: "ব্যাঙ্ককে আপনার চাকরির স্থায়িত্ব যাচাই করতে এবং আপনাকে বেতনভোগী বা স্ব-নিযুক্ত গ্রাহক হিসেবে শ্রেণীবদ্ধ করতে সাহায্য করে।"
        },
        mr: {
          tip: "Enter the full name of the company or organization you work for.",
          regional: "तुम्ही ज्या कंपनीत किंवा संस्थेत काम करता त्याचे अधिकृत नाव लिहा.",
          reason: "बँकेला तुमच्या नोकरीची स्थिरता तपासण्यास आणि तुम्हाला पगारदार किंवा स्वयंरोजगार ग्राहक म्हणून वर्गीकृत करण्यास मदत करते."
        },
        te: {
          tip: "Enter the full name of the company or organization you work for.",
          regional: "మీరు పనిచేస్తున్న కంపెనీ లేదా సంస్థ యొక్క పూర్తి పేరును రాయండి.",
          reason: "బ్యాంకు మీ ఉపాధి స్థిరత్వాన్ని ధృవీకరించడానికి మరియు మిమ్మల్ని జీతభత్యాలు పొందే లేదా స్వయం ఉపాధి పొందే కస్టమర్‌గా వర్గీకరించడానికి సహాయపడుతుంది."
        }
      },
      loanAmount: {
        en: {
          tip: "Enter the total loan amount you wish to borrow in Rupees.",
          regional: "Specify the amount of money you want to request as a loan from the bank.",
          reason: "Specifies the funding amount requested, used to calculate monthly EMI and interest schedule options."
        },
        hinglish: {
          tip: "Enter the total loan amount you wish to borrow in Rupees.",
          regional: "Aapko kitne loan ki jarurat hai, woh total amount Rupees mein likhein.",
          reason: "Isse EMI aur interest rates ki calculation hoti hai jisse aapko suitable plans diye ja sakein."
        },
        hi: {
          tip: "Enter the total loan amount you wish to borrow in Rupees.",
          regional: "जितने ऋण की आपको आवश्यकता है, वह कुल राशि रुपये में दर्ज करें।",
          reason: "अनुरोधित राशि को निर्दिष्ट करता है, जिसका उपयोग मासिक ईएमआई और ब्याज दरों की गणना के लिए किया जाता है।"
        },
        ta: {
          tip: "Enter the total loan amount you wish to borrow in Rupees.",
          regional: "நீங்கள் பெற விரும்பும் மொத்த கடன் தொகையை ரூபாயில் குறிப்பிடவும்.",
          reason: "கோரப்பட்ட கடன் தொகையைக் குறிப்பிடுகிறது, இது மாதாந்திர இஎம்ஐ (EMI) மற்றும் வட்டி அட்டவணை விருப்பங்களைக் கணக்கிடப் பயன்படுகிறது."
        },
        bn: {
          tip: "Enter the total loan amount you wish to borrow in Rupees.",
          regional: "আপনি মোট কত টাকা ঋণ নিতে চান তা অংকে লিখুন।",
          reason: "অনুরোধ করা ঋণের পরিমাণ নির্দিষ্ট করে, যা মাসিক ইএমআই (EMI) এবং সুদের হিসাব গণনা করতে ব্যবহৃত হয়।"
        },
        mr: {
          tip: "Enter the total loan amount you wish to borrow in Rupees.",
          regional: "तुम्हाला हव्या असलेल्या एकूण कर्ज रकमेची नोंद करा.",
          reason: "मागणी केलेल्या कर्जाची रक्कम दर्शवते, ज्याचा वापर मासिक ईएमआय (EMI) आणि व्याज मोजण्यासाठी केला जातो."
        },
        te: {
          tip: "Enter the total loan amount you wish to borrow in Rupees.",
          regional: "మీకు కావలసిన మొత్తం రుణ మొత్తాన్ని రూపాయలలో నమోదు చేయండి.",
          reason: "కోరబడిన నిధుల మొత్తాన్ని ఇది తెలియజేస్తుంది, దీని ద్వారా నెలవారీ ఈఎంఐ (EMI) మరియు వడ్డీని లెక్కిస్తారు."
        }
      },
      branchName: {
        en: {
          tip: "Enter the branch name where your deposit or account is maintained.",
          regional: "Write the name of the bank branch where you are submitting this application.",
          reason: "Determines the specific bank office where your account records are hosted and serviced."
        },
        hinglish: {
          tip: "Enter the branch name where your deposit or account is maintained.",
          regional: "Apni bank branch ka naam likhein jahan aapka account khola ja raha hai.",
          reason: "Isse pata chalta hai ki aapke account records kis specific branch office mein store kiye jayenge."
        },
        hi: {
          tip: "Enter the branch name where your deposit or account is maintained.",
          regional: "उस बैंक शाखा का नाम लिखें जहाँ आपका खाता खोला जा रहा है या जमा रखा जा रहा है।",
          reason: "उस विशिष्ट बैंक कार्यालय को निर्धारित करता है जहां आपके खाता रिकॉर्ड रखे जाते हैं और सेवाएं दी जाती हैं।"
        },
        ta: {
          tip: "Enter the branch name where your deposit or account is maintained.",
          regional: "உங்களின் வைப்புத்தொகை அல்லது கணக்கு உள்ள வங்கியின் கிளைப் பெயரை உள்ளிடவும்.",
          reason: "உங்கள் கணக்கு பதிவுகள் பராமரிக்கப்படும் மற்றும் சேவை வழங்கப்படும் குறிப்பிட்ட வங்கி கிளையை தீர்மானிக்கிறது."
        },
        bn: {
          tip: "Enter the branch name where your deposit or account is maintained.",
          regional: "যে শাখায় আপনার অ্যাকাউন্ট বা আমানত রয়েছে তার নাম লিখুন।",
          reason: "নির্দিষ্ট ব্যাঙ্কের শাখাটি নির্ধারণ করে যেখানে আপনার অ্যাকাউন্ট রেকর্ড রাখা হবে এবং পরিষেবা দেওয়া হবে।"
        },
        mr: {
          tip: "Enter the branch name where your deposit or account is maintained.",
          regional: "तुमचे खाते किंवा ठेव ज्या शाखेत आहे त्या शाखेचे नाव लिहा.",
          reason: "तुमच्या खात्याचे रेकॉर्ड कोणत्या बँक शाखेत ठेवले आणि हाताळले जातील हे ठरवते."
        },
        te: {
          tip: "Enter the branch name where your deposit or account is maintained.",
          regional: "మీ డిపాజిట్ లేదా ఖాతా ఉన్న బ్యాంక్ బ్రాంచ్ పేరును ఇక్కడ రాయండి.",
          reason: "మీ ఖాతా రికార్డులు ఉంచబడే మరియు సేవలు అందించబడే నిర్దిష్ట బ్యాంక్ కార్యాలయాన్ని ఇది నిర్ణయిస్తుంది."
        }
      },
      depositNature: {
        en: {
          tip: "Enter the nature/type of deposit (Savings, Fixed, Recurring).",
          regional: "Specify the type of deposit, such as Fixed Deposit (FD) or Recurring Deposit (RD).",
          reason: "Identifies the account scheme type, which determines interest yield and withdrawal rules."
        },
        hinglish: {
          tip: "Enter the nature/type of deposit (Savings, Fixed, Recurring).",
          regional: "Deposit ka type likhein, jaise FD (Fixed) ya RD (Recurring) ya Savings account.",
          reason: "Isse account ka type pata chalta hai, jo interest rate aur withdrawal rules ko decide karta hai."
        },
        hi: {
          tip: "Enter the nature/type of deposit (Savings, Fixed, Recurring).",
          regional: "जमा का प्रकार लिखें (जैसे बचत बैंक, सावधि जमा - FD, या आवर्ती जमा - RD)।",
          reason: "खाता योजना के प्रकार की पहचान करता है, जो ब्याज दर और निकासी के नियमों को निर्धारित करता है।"
        },
        ta: {
          tip: "Enter the nature/type of deposit (Savings, Fixed, Recurring).",
          regional: "வைப்புத்தொகையின் வகையைக் குறிப்பிடவும் (சேமிப்பு, நிலையான வைப்பு அல்லது தொடர் வைப்பு).",
          reason: "கணக்கு திட்ட வகையை அடையாளப்படுத்துகிறது, இது வட்டி வருவாய் மற்றும் பணம் எடுக்கும் விதிகளை தீர்மானிக்கிறது."
        },
        bn: {
          tip: "Enter the nature/type of deposit (Savings, Fixed, Recurring).",
          regional: "আমানতের ধরণ লিখুন (যেমন সেভিংস ব্যাঙ্ক, ফিক্সড ডিপোজিট বা আরডি)।",
          reason: "অ্যাকাউন্টের ধরন চিহ্নিত করে, যা সুদের হার এবং টাকা তোলার নিয়ম নির্ধারণ করে।"
        },
        mr: {
          tip: "Enter the nature/type of deposit (Savings, Fixed, Recurring).",
          regional: "ठेवीचे स्वरूप लिहा (उदा. बचत ठेव, मुदत ठेव - FD किंवा आवर्ती ठेव - RD).",
          reason: "ठेवीचा प्रकार स्पष्ट करतो, ज्यावरून व्याजदर आणि पैसे काढण्याचे नियम ठरतात."
        },
        te: {
          tip: "Enter the nature/type of deposit (Savings, Fixed, Recurring).",
          regional: "డిపాజిట్ రకాన్ని నమోదు చేయండి (పొదుపు ఖాతా, ఫిక్స్‌డ్ డిపాజిట్ లేదా రికరింగ్ డిపాజిట్).",
          reason: "ఖాతా పథకం రకాన్ని గుర్తిస్తుంది, ఇది వడ్డీ మరియు విత్‌డ్రా నిబంధనలను నిర్ణయిస్తుంది."
        }
      },
      depositDistNo: {
        en: {
          tip: "Enter the account number or receipt number for this deposit.",
          regional: "Provide the unique number of your deposit receipt or your bank account number.",
          reason: "Provides the unique identifier for the specific deposit receipt or ledger account to apply nomination."
        },
        hinglish: {
          tip: "Enter the account number or receipt number for this deposit.",
          regional: "Deposit receipt number ya account number likhein jise link karna hai.",
          reason: "Isse deposit receipt ya account ka unique number pata chalta hai jahan nomination link hona hai."
        },
        hi: {
          tip: "Enter the account number or receipt number for this deposit.",
          regional: "इस जमा के लिए खाता संख्या या जमा रसीद संख्या दर्ज करें।",
          reason: "नामांकन लागू करने के लिए विशिष्ट जमा रसीद या खाता संख्या के लिए विशिष्ट पहचानकर्ता प्रदान करता है।"
        },
        ta: {
          tip: "Enter the account number or receipt number for this deposit.",
          regional: "இந்த வைப்புத்தொகைக்கான கணக்கு எண் அல்லது ரசீது எண்ணை உள்ளிடவும்.",
          reason: "பரிந்துரையை இணைக்க வேண்டிய டெபாசிట్ రసీదు లేదా கணக்கின் தனித்துவமான எண்ணை வழங்குகிறது."
        },
        bn: {
          tip: "Enter the account number or receipt number for this deposit.",
          regional: "এই আমানতের জন্য অ্যাকাউন্ট নম্বর বা রসিদ নম্বরটি লিখুন।",
          reason: "মনোনয়ন লিঙ্ক করার জন্য নির্দিষ্ট আমানত রসিদ বা খতিয়ান অ্যাকাউন্টের অনন্য নম্বর প্রদান করে।"
        },
        mr: {
          tip: "Enter the account number or receipt number for this deposit.",
          regional: "या ठेवीशी संबंधित असलेला खाते क्रमांक किंवा पावती क्रमांक लिहा.",
          reason: "वारसदार नोंदणी करण्यासाठी विशिष्ट ठेव पावती किंवा खाते क्रमांक स्पष्ट करतो."
        },
        te: {
          tip: "Enter the account number or receipt number for this deposit.",
          regional: "ఈ డిపాజిట్‌కు సంబంధించిన ఖాతా సంఖ్య లేదా రశీదు సంఖ్యను నమోదు చేయండి.",
          reason: "నామినేషన్ అనుసంధానించడానికి నిర్దిష్ట డిపాజిట్ రసీదు లేదా ఖాతా యొక్క ప్రత్యేక గుర్తింపు సంఖ్యను అందిస్తుంది."
        }
      },
      depositDetails: {
        en: {
          tip: "Enter additional details like maturity instructions or deposit duration.",
          regional: "Write details like duration of deposit, maturity instructions, or interest payout frequency.",
          reason: "Captures terms like duration and maturity instructions to avoid discrepancies at payout."
        },
        hinglish: {
          tip: "Enter additional details like maturity instructions or deposit duration.",
          regional: "Deposit ki duration aur maturity instructions jaisi extra details bhariye.",
          reason: "Ismein deposit ki maturity instructions aur duration fill ki jati hai taaki bad mein koi problem na ho."
        },
        hi: {
          tip: "Enter additional details like maturity instructions or deposit duration.",
          regional: "जमा अवधि और परिपक्वता निर्देशों (Maturity Instructions) जैसी अतिरिक्त जानकारी दर्ज करें।",
          reason: "भुगतान के समय विसंगतियों से बचने के लिए अवधि और परिपक्वता निर्देशों जैसे विवरण दर्ज करता है।"
        },
        ta: {
          tip: "Enter additional details like maturity instructions or deposit duration.",
          regional: "வைப்புத்தொகையின் முதிர்வு வழிமுறைகள் அல்லது காலம் போன்ற கூடுதல் விவரங்களை உள்ளிடவும்.",
          reason: "பணம் செலுத்தும் போது ஏற்படும் முரண்பாடுகளைத் தவிர்க்க, டெபாசிட் காலம் மற்றும் முதிர்வு வழிமுறைகளை பதிவு செய்கிறது."
        },
        bn: {
          tip: "Enter additional details like maturity instructions or deposit duration.",
          regional: "আমানতের মেয়াদ বা ম্যাচুরিটির নির্দেশাবলীর মতো অতিরিক্ত তথ্য লিখুন।",
          reason: "পরিশোধের সময় কোনো ঝামেলা এড়াতে আমানতের মেয়াদ এবং পরিপক্কতার নির্দেশাবলী রেকর্ড করে।"
        },
        mr: {
          tip: "Enter additional details like maturity instructions or deposit duration.",
          regional: "ठेवीचा कालावधी किंवा मॅच्युरिटीच्या सूचनांसारखे अतिरिक्त तपशील लिहा.",
          reason: "पैसे मिळताना कोणतीही अडचण येऊ नये म्हणून ठेव कालावधी आणि मॅच्युरिटीच्या सूचनांची नोंद ठेवते."
        },
        te: {
          tip: "Enter additional details like maturity instructions or deposit duration.",
          regional: "డిపాజిట్ వ్యవధి మరియు మెచ్యూరిటీ సూచనల వంటి అదనపు వివరాలను నమోదు చేయండి.",
          reason: "చెల్లింపు సమయంలో ఎటువంటి వ్యత్యాసాలు రాకుండా వ్యవధి మరియు మెచ్యూరిటీ సూచనల వంటి వివరాలను నమోదు చేస్తుంది."
        }
      },
      nomineeAddress: {
        en: {
          tip: "Enter the complete address and mobile number of the nominee.",
          regional: "Write the residential address and phone number of the nominated person.",
          reason: "Helps the bank contact the nominee and verify their physical identity at the time of claim."
        },
        hinglish: {
          tip: "Enter the complete address and mobile number of the nominee.",
          regional: "Nominee ka poora residential address aur mobile number likhein.",
          reason: "Bank ko nominee se contact karne aur claim ke samay unki address verification ke liye zaruri hai."
        },
        hi: {
          tip: "Enter the complete address and mobile number of the nominee.",
          regional: "नामित व्यक्ति का पूरा पता और मोबाइल नंबर लिखें।",
          reason: "दावे के समय नामांकित व्यक्ति से संपर्क करने और उनके पते को सत्यापित करने में बैंक की मदद करता है।"
        },
        ta: {
          tip: "Enter the complete address and mobile number of the nominee.",
          regional: "பரிந்துரையாளரின் முழு முகவரி மற்றும் மொபைல் எண்ணை உள்ளிடவும்.",
          reason: "உரிமைகோரும் நேரத்தில் பரிந்துரையாளரைத் தொடர்பு கொள்ளவும், அவர்களின் முகவரியை சரிபார்க்கவும் வங்கிக்கு உதவுகிறது."
        },
        bn: {
          tip: "Enter the complete address and mobile number of the nominee.",
          regional: "নমিনির সম্পূর্ণ ঠিকানা এবং মোবাইল নম্বর লিখুন।",
          reason: "দাবির সময় নমিনির সাথে যোগাযোগ করতে এবং তাদের বাড়ির ঠিকানা যাচাই করতে ব্যাঙ্ককে সাহায্য করে।"
        },
        mr: {
          tip: "Enter the complete address and mobile number of the nominee.",
          regional: "वारसदाराचा पूर्ण पत्ता आणि मोबाईल नंबर लिहा.",
          reason: "हक्काच्या दाव्यावेळी वारसदाराशी संपर्क साधण्यास आणि त्यांच्या पत्त्याची पडताळणी करण्यास बँकेला मदत करते."
        },
        te: {
          tip: "Enter the complete address and mobile number of the nominee.",
          regional: "నామినీ యొక్క పూర్తి చిరునామా మరియు మొబైల్ నంబరును నమోదు చేయండి.",
          reason: "క్లెయిమ్ సమయంలో నామినీని సంప్రదించడానికి మరియు వారి చిరునామాను ధృవీకరించడానికి బ్యాంకుకు సహాయపడుతుంది."
        }
      },
      nomineeRelationship: {
        en: {
          tip: "State the nominee's relationship with you (e.g., Mother, Spouse, Son).",
          regional: "Enter how the nominee is related to you, such as spouse, daughter, or brother.",
          reason: "Establishes the family connection to validate the legitimacy of the nominated beneficiary."
        },
        hinglish: {
          tip: "State the nominee's relationship with you (e.g., Mother, Spouse, Son).",
          regional: "Nominee ke sath apna rishta likhein, jaise Maa, Beta, ya Wife.",
          reason: "Nominee ke sath aapka rishta check karne ke liye taaki claim process sahi se ho sake."
        },
        hi: {
          tip: "State the nominee's relationship with you (e.g., Mother, Spouse, Son).",
          regional: "नामांकित व्यक्ति के साथ अपना संबंध लिखें (जैसे माता, पति/पत्नी, पुत्र)।",
          reason: "नामित लाभार्थी की वैधता को सत्यापित करने के लिए पारिवारिक संबंध स्थापित करता है।"
        },
        ta: {
          tip: "State the nominee's relationship with you (e.g., Mother, Spouse, Son).",
          regional: "உங்களுடன் பரிந்துரையாளருக்கு உள்ள உறவை குறிப்பிடவும் (எ.கா., தாய், மனைவி, மகன்).",
          reason: "பரிந்துரைக்கப்பட்ட பயனாளியின் சட்டபூர்வமான தன்மையை சரிபார்க்க குடும்ப உறவை உறுதிப்படுத்துகிறது."
        },
        bn: {
          tip: "State the nominee's relationship with you (e.g., Mother, Spouse, Son).",
          regional: "আপনার সাথে নমিনির সম্পর্ক উল্লেখ করুন (যেমন মা, স্বামী/স্ত্রী, পুত্র)।",
          reason: "মনোনীত নমিনির বৈধতা যাচাই করার জন্য পারিবারিক সম্পর্ক স্থাপন করে।"
        },
        mr: {
          tip: "State the nominee's relationship with you (e.g., Mother, Spouse, Son).",
          regional: "वारसदाराचे तुमच्याशी असलेले नाते लिहा (उदा. आई, पती/पत्नी, मुलगा).",
          reason: "नियुक्त वारसदाराची वैधता तपासण्यासाठी कौठुंबिक नातेसंबंध स्पष्ट करते."
        },
        te: {
          tip: "State the nominee's relationship with you (e.g., Mother, Spouse, Son).",
          regional: "నామినీతో మీకున్న సంబంధాన్ని పేర్కొనండి (ఉదా. తల్లి, భార్య/భర్త, కుమారుడు).",
          reason: "నామినీ యొక్క చట్టబద్ధతను ధృవీకరించడానికి కుటుంబసంబంధాన్ని ఇది తెలియజేస్తుంది."
        }
      },
      nomineeAge: {
        en: {
          tip: "Enter the nominee's age in completed years.",
          regional: "Provide the age of the nominee. If they are under 18, their date of birth is also required.",
          reason: "Ensures the nominee is legally competent to receive funds directly or if a guardian must be appointed."
        },
        hinglish: {
          tip: "Enter the nominee's age in completed years.",
          regional: "Nominee ki age (umar) likhein. Agar 18 se kam hai toh date of birth bhi likhni hogi.",
          reason: "Isse pata chalta hai ki nominee mature hai ya minor, aur kya appointee/guardian ki zarurat hai."
        },
        hi: {
          tip: "Enter the nominee's age in completed years.",
          regional: "नामांकित व्यक्ति की आयु (वर्षों में) लिखें। यदि वे 18 वर्ष से कम हैं, तो जन्म तिथि भी आवश्यक है।",
          reason: "यह सुनिश्चित करता है कि नामांकित व्यक्ति सीधे धन प्राप्त करने के लिए कानूनी रूप से सक्षम है या अभिभावक नियुक्त किया जाना चाहिए।"
        },
        ta: {
          tip: "Enter the nominee's age in completed years.",
          regional: "பரிந்துரையாளரின் தற்போதைய வயதை உள்ளிடவும். 18 வயதுக்கு உட்பட்டவர் எனில், அவரின் பிறந்த தேதியும் தேவைப்படும்.",
          reason: "பரிந்துரையாளர் நேரடியாக பணத்தைப் பெற தகுதியுடையவரா அல்லது பாதுகாவலர் தேவையா என்பதை உறுதி செய்கிறது."
        },
        bn: {
          tip: "Enter the nominee's age in completed years.",
          regional: "নমিনির বয়স লিখুন। নমিনির বয়স ১৮ বছরের কম হলে তার জন্ম তারিখও দেওয়া আবশ্যক।",
          reason: "নমিনি সরাসরি টাকা পাওয়ার জন্য আইনত যোগ্য নাকি কোনো অভিভাবক নিয়োগ করতে হবে তা নিশ্চিত করে।"
        },
        mr: {
          tip: "Enter the nominee's age in completed years.",
          regional: "वारसदाराचे पूर्ण वय लिहा. वय १८ वर्षांपेक्षा कमी असल्यास जन्मतारीख आवश्यक आहे.",
          reason: "वारसदार थेट पैसे मिळवण्यासाठी सज्ञान आहे की पालकाची गरज आहे हे ठरवण्यासाठी आवश्यक."
        },
        te: {
          tip: "Enter the nominee's age in completed years.",
          regional: "నామినీ యొక్క వయస్సును నమోదు చేయండి. నామినీ వయస్సు 18 సంవత్సరాల కంటే తక్కువైతే పుట్టిన తేదీ కూడా అవసరం.",
          reason: "నామినీ నేరుగా నిధులను స్వీకరించడానికి చట్టబద్ధంగా అర్హుడా లేదా గార్డియన్‌ను నియమించాలా అని నిర్ధారిస్తుంది."
        }
      },
      nomineeDob: {
        en: {
          tip: "Provide the nominee's Date of Birth if they are a minor.",
          regional: "If the nominee is under 18, enter their date of birth in YYYY-MM-DD format.",
          reason: "Determines the minor status of the nominee and the date they will reach legal adulthood."
        },
        hinglish: {
          tip: "Provide the nominee's Date of Birth if they are a minor.",
          regional: "Agar nominee minor (18 se kam) hai, toh unki janam tithi YYYY-MM-DD format mein likhein.",
          reason: "Isse nominee ke minor hone aur unke 18 saal ke hone ki exact date pata chalti hai."
        },
        hi: {
          tip: "Provide the nominee's Date of Birth if they are a minor.",
          regional: "यदि नामांकित व्यक्ति नाबालिग है, तो उनकी जन्म तिथि YYYY-MM-DD प्रारूप में दर्ज करें।",
          reason: "नामांकित व्यक्ति के नाबालिग होने की स्थिति और कानूनी रूप से वयस्क होने की तारीख निर्धारित करता है।"
        },
        ta: {
          tip: "Provide the nominee's Date of Birth if they are a minor.",
          regional: "பரிந்துரையாளர் மைனர் எனில், அவரின் பிறந்த தேதியை YYYY-MM-DD வடிவில் உள்ளிடவும்.",
          reason: "பரிந்துரையாளர் மைனர் என்பதை உறுதிப்படுத்தவும், அவர் எப்போது மேஜர் ஆவார் என்ற தேதியை அறியவும் உதவுகிறது."
        },
        bn: {
          tip: "Provide the nominee's Date of Birth if they are a minor.",
          regional: "নমিনি নাবালক হলে তার জন্ম তারিখ YYYY-MM-DD ফরম্যাটে লিখুন।",
          reason: "নমিনি নাবালক কিনা এবং কোন তারিখে সে সাবালক হবে তা নির্ধারণ করে।"
        },
        mr: {
          tip: "Provide the nominee's Date of Birth if they are a minor.",
          regional: "वारसदार अल्पवयीन असल्यास त्याची जन्मतारीख YYYY-MM-DD स्वरूपात लिहा.",
          reason: "वारसदार अल्पवयीन आहे का आणि तो कोणत्या तारखेला सज्ञान होईल हे ठरवते."
        },
        te: {
          tip: "Provide the nominee's Date of Birth if they are a minor.",
          regional: "నామినీ మైనర్ అయితే వారి పుట్టిన తేదీని YYYY-MM-DD ఆకారంలో నమోదు చేయండి.",
          reason: "నామినీ మైనర్ అవునా కాదా మరియు అతను ఎప్పుడు వయోజనుడు అవుతాడో ఆ తేదీని నిర్ణయిస్తుంది."
        }
      },
      guardianName: {
        en: {
          tip: "Enter the appointee's name if the nominee is a minor.",
          regional: "Provide the name of the adult guardian who will receive the amount on behalf of the minor nominee.",
          reason: "Specifies the adult responsible for holding the deposit on behalf of a minor nominee."
        },
        hinglish: {
          tip: "Enter the appointee's name if the nominee is a minor.",
          regional: "Minor nominee ke case mein, unke guardian ya appointee ka poora naam likhein.",
          reason: "Minor nominee ke case mein, unke behalf par paise sambhalne wale adult appointee ka naam."
        },
        hi: {
          tip: "Enter the appointee's name if the nominee is a minor.",
          regional: "नाबालिग नामांकित व्यक्ति के लिए नियुक्त अभिभावक (अप्पॉइंटी) का पूरा नाम लिखें।",
          reason: "नाबालिग नामांकित व्यक्ति की ओर से जमा राशि प्राप्त करने के लिए जिम्मेदार वयस्क का नाम निर्दिष्ट करता है।"
        },
        ta: {
          tip: "Enter the appointee's name if the nominee is a minor.",
          regional: "பரிந்துரையாளர் மைனராக இருந்தால், பாதுகாவலரின் பெயரை உள்ளிடவும்.",
          reason: "மைனர் பரிந்துரையாளரின் சார்பாக பணத்தைப் பெற்றுக்கொள்ளும் பொறுப்புள்ள பெரியவரை நியமிக்கிறது."
        },
        bn: {
          tip: "Enter the appointee's name if the nominee is a minor.",
          regional: "নমিনি নাবালক হলে তার অভিভাবকের সম্পূর্ণ নাম লিখুন।",
          reason: "নাবালক নমিনির পক্ষে টাকা গ্রহণ করার জন্য দায়ী প্রাপ্তবয়স্ক ব্যক্তির নাম উল্লেখ করে।"
        },
        mr: {
          tip: "Enter the appointee's name if the nominee is a minor.",
          regional: "वारसदार अल्पवयीन असल्यास पालकाचे (अप्पॉइंटी) पूर्ण नाव लिहा.",
          reason: "अल्पवयीन वारसदाराच्या वतीने ठेव रक्कम सांभाळणाऱ्या सज्ञान व्यक्तीचे नाव नोंदवणे आवश्यक असते."
        },
        te: {
          tip: "Enter the appointee's name if the nominee is a minor.",
          regional: "నామినీ మైనర్ అయినట్లయితే గార్డియన్ పేరును ఇక్కడ నమోదు చేయండి.",
          reason: "మైనర్ నామినీ తరపున డిపాజిట్‌ను స్వీకరించడానికి బాధ్యత వహించే వయోజనుడి పేరును సూచిస్తుంది."
        }
      },
      guardianAddress: {
        en: {
          tip: "Enter the appointee's complete address and age.",
          regional: "Write the residential address and age of the appointed guardian.",
          reason: "Required to verify the physical location and adult status of the guardian for legal protection."
        },
        hinglish: {
          tip: "Enter the appointee's complete address and age.",
          regional: "Guardian ka poora address aur unki age likhein.",
          reason: "Legal protection ke liye guardian ka address aur age verify karna zaruri hai."
        },
        hi: {
          tip: "Enter the appointee's complete address and age.",
          regional: "नियुक्त अभिभावक का पूरा पता और उनकी आयु दर्ज करें।",
          reason: "कानूनी सुरक्षा के लिए अभिभावक के भौतिक स्थान और वयस्क स्थिति को सत्यापित करने के लिए आवश्यक है।"
        },
        ta: {
          tip: "Enter the appointee's complete address and age.",
          regional: "பாதுகாவலரின் முழு முகவரி மற்றும் அவரின் தற்போதைய வயதை உள்ளிடவும்.",
          reason: "சட்டப்பூர்வ பாதுகாப்பிற்காக பாதுகாவலரின் முகவரி மற்றும் வயது ஆகியவற்றை சரிபார்க்க தேவைப்படுகிறது."
        },
        bn: {
          tip: "Enter the appointee's complete address and age.",
          regional: "অভিভাবকের সম্পূর্ণ বাড়ির ঠিকানা এবং তার বয়স উল্লেখ করুন।",
          reason: "আইনি সুরক্ষার জন্য অভিভাবকের বাড়ির ঠিকানা এবং বয়স যাচাই করা প্রয়োজনীয়।"
        },
        mr: {
          tip: "Enter the appointee's complete address and age.",
          regional: "नियुक्त पालकांचा पूर्ण पत्ता आणि त्यांचे वय लिहा.",
          reason: "कायदेशीर संरक्षणासाठी पालकाचा राहण्याचा पत्ता आणि वय पडताळण्यासाठी आवश्यक."
        },
        te: {
          tip: "Enter the appointee's complete address and age.",
          regional: "గార్డియన్ యొక్క పూర్తి చిరునామా మరియు వయస్సును ఇక్కడ రాయండి.",
          reason: "చట్టపరమైన రక్షణ కోసం గార్డియన్ యొక్క చిరునామా మరియు వయస్సును ధృవీకరించడానికి ఇది అవసరం."
        }
      },
      printNomineeName: {
        en: {
          tip: "Select 'Yes' or 'No' to indicate if you want the nominee's name printed on your passbook.",
          regional: "Choose whether the nominee's name should be visible on your account passbook statements.",
          reason: "Gives you control over privacy and provides immediate physical proof of nomination on your passbook."
        },
        hinglish: {
          tip: "Select 'Yes' or 'No' to indicate if you want the nominee's name printed on your passbook.",
          regional: "Select karein ki kya aap nominee ka naam passbook par print karwana chahte hain — Yes ya No.",
          reason: "Isse aapki privacy bani rehti hai aur passbook par nominee ka physical proof milta hai."
        },
        hi: {
          tip: "Select 'Yes' or 'No' to indicate if you want the nominee's name printed on your passbook.",
          regional: "चुनें कि क्या आप पासबुक पर नॉमिनी का नाम प्रिंट कराना चाहते हैं — हाँ (Yes) या नहीं (No)।",
          reason: "यह आपकी गोपनीयता पर नियंत्रण देता है और आपकी पासबुक पर नामांकन का तत्काल भौतिक प्रमाण प्रदान करता है।"
        },
        ta: {
          tip: "Select 'Yes' or 'No' to indicate if you want the nominee's name printed on your passbook.",
          regional: "பரிந்துரையாளரின் பெயர் பாஸ்புக்கில் அச்சிடப்பட வேண்டுமா என்பதை ஆம் அல்லது இல்லை என தேர்வு செய்யவும்.",
          reason: "இது உங்களின் தனிப்பட்ட விவர பாதுகாப்பை உறுதி செய்வதோடு, பாஸ்புக்கில் பரிந்துரைக்கான சான்றை வழங்குகிறது."
        },
        bn: {
          tip: "Select 'Yes' or 'No' to indicate if you want the nominee's name printed on your passbook.",
          regional: "পাসবুকে নমিনির নাম প্রিন্ট করাতে চান কিনা তা 'হ্যাঁ' অথবা 'না' সিলেক্ট করে জানান।",
          reason: "এটি আপনার গোপনীয়তার নিয়ন্ত্রণ দেয় এবং আপনার পাসবুকে নমিনির নামের একটি তাত্ক্ষণিক প্রমাণ দেয়।"
        },
        mr: {
          tip: "Select 'Yes' or 'No' to indicate if you want the nominee's name printed on your passbook.",
          regional: "पासबुकवर नॉमिनीचे नाव छापायचे आहे का, ते होय (Yes) किंवा नाही (No) निवडून सांगा.",
          reason: "हे तुमच्या गोपनीयतेची खात्री देते आणि पासबुकवर वारसदाराचे नाव छापल्याने थेट पुरावा मिळतो."
        },
        te: {
          tip: "Select 'Yes' or 'No' to indicate if you want the nominee's name printed on your passbook.",
          regional: "మీ పాస్‌బుక్‌పై నామినీ పేరు ముద్రించాలో లేదో అవును లేదా కాదు అని ఎంచుకోండి.",
          reason: "ఇది మీ గోప్యతపై నియంత్రణను ఇస్తుంది మరియు మీ పాస్‌బుక్‌పై నామినేషన్ యొక్క తక్షణ భౌతిక నిరూపణను అందిస్తుంది."
        }
      }
    };

    const langData = db[fieldId]?.[formLang] || db[fieldId]?.['en'];
    const enData = db[fieldId]?.['en'];
    if (langData && enData) {
      return { tip: enData.tip, regional: langData.regional, reason: langData.reason };
    }
    const fallback = {
      tip: "Provide the requested details for this specific box as specified.",
      regional: "",
      reason: "Necessary to complete this field accurately for the bank's records."
    };
    if (formLang === 'hi') fallback.regional = 'कृपया इस विशिष्ट बॉक्स के लिए मांगे गए विवरण दर्ज करें।';
    else if (formLang === 'hinglish') fallback.regional = 'Is specific box ke liye maangi gayi details fill karein.';
    else if (formLang === 'ta') fallback.regional = 'இந்த குறிப்பிட்ட பெட்டிக்கான விவரங்களை வழங்கவும்.';
    else if (formLang === 'bn') fallback.regional = 'এই নির্দিষ্ট ঘরের জন্য প্রয়োজনীয় তথ্য দিন।';
    else if (formLang === 'mr') fallback.regional = 'या विशिष्ट चौकटीसाठी विचारलेली माहिती भरा.';
    else if (formLang === 'te') fallback.regional = 'ఈ నిర్దిష్ట పెట్టెకు సంబంధించిన వివరాలను నమోదు చేయండి.';
    else fallback.regional = "Enter the requested details for this specific field.";
    return fallback;
  };

  // Get guidance for current field (uses multilingual data)
  const getFieldGuidance = (fieldId: string): { tip: string; regional: string; reason: string } => getFieldGuidanceAll(fieldId);


  // Start guided fill simulation
  const startGuidedWalkthrough = (presetFields: Record<string, string>) => {
    if (!presetFields) return;
    setIsWalkthroughPlaying(true);
    setGuidedFieldIndex(0);
    setFormFields(prev => prev.map(f => ({ ...f, value: '', confidence: 0 })));
  };

  // Walkthrough simulation runner effect (Typing ONLY)
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

    setIsTypingComplete(false);
    setHasVoicePlayedForField(false);

    if (!targetValue) {
      setFormFields(prev => prev.map(f => f.id === currentField.id ? { ...f, value: 'N/A', confidence: 100 } : f));
      setIsTypingComplete(true);
      return;
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
        setIsTypingComplete(true);
      }
    }, 60);

    return () => {
      clearInterval(typingInterval);
    };
  }, [isWalkthroughPlaying, guidedFieldIndex, formFields.length, activeUserRecord]);

  // Track if voice starts playing during the walkthrough for the current field
  useEffect(() => {
    if (isSpeaking && isWalkthroughPlaying) {
      setHasVoicePlayedForField(true);
    }
  }, [isSpeaking, isWalkthroughPlaying]);

  // Walkthrough simulation progression effect
  useEffect(() => {
    if (!isWalkthroughPlaying || !isTypingComplete || guidedFieldIndex < 0 || guidedFieldIndex >= formFields.length) {
      return;
    }

    // If voice is currently playing, pause automatic progression
    if (isSpeaking) {
      console.log("[FormSaathi Walkthrough] Voice is active. Pausing automatic field progression.");
      return;
    }

    // Determine target delay for field transition
    let delay = 1500; // default delay if voice was played and finished

    if (!hasVoicePlayedForField) {
      // User did not play the voice: pause long enough for displayed guidance to be read.
      const currentField = formFields[guidedFieldIndex];
      const info = getFieldGuidance(currentField.id);
      const textLength = (info.tip || '').length + (info.regional || '').length + (info.reason || '').length;

      // Base timing: 35ms per character with a minimum of 5 seconds (5000ms)
      delay = Math.max(5000, textLength * 35);
      console.log(`[FormSaathi Walkthrough] No voice playback. Dynamic reading delay: ${delay}ms for ${textLength} chars.`);
    } else {
      console.log("[FormSaathi Walkthrough] Voice playback completed. Transitioning to next field in 1500ms.");
    }

    const nextTimer = setTimeout(() => {
      setGuidedFieldIndex(prev => prev + 1);
    }, delay);

    return () => clearTimeout(nextTimer);
  }, [isWalkthroughPlaying, isTypingComplete, guidedFieldIndex, isSpeaking, hasVoicePlayedForField, formFields]);

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
    setScanningStatus(t('sh_status_scanning', formLang));
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
      { progress: 20, msg: t('sh_status_scanning', formLang) },
      { progress: 50, msg: t('sh_status_detecting', formLang) },
      { progress: 80, msg: t('sh_status_preparing', formLang) },
      { progress: 100, msg: t('sh_status_mapped', formLang) },
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
    return t('field_' + fieldId, formLang);
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
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        
        {/* Section Headers */}
        <div className="text-center space-y-4 mb-10">
          <span className="font-label-caps text-xs text-secondary font-bold tracking-widest uppercase bg-rose-50 border border-rose-200 px-4 py-1.5 rounded-full inline-block">
            {t('sh_badge', formLang)}
          </span>
          <h2 className="font-headline-lg text-3xl sm:text-4xl lg:text-5xl font-extrabold text-on-surface tracking-tight">
            {t('sh_title', formLang)}
          </h2>
          <p className="text-body-md text-on-surface-variant max-w-xl mx-auto">
            {t('sh_desc', formLang)}
          </p>
          <div className="bg-primary/5 border border-primary/20 py-2.5 px-4 rounded-xl max-w-xl mx-auto text-xs font-semibold text-primary leading-relaxed shadow-sm">
            {t('sh_demo_note', formLang)}
          </div>
        </div>

        {/* Tab Controls */}
        <div className="flex justify-start sm:justify-center overflow-x-auto scrollbar-none gap-2 sm:gap-3 mb-10 max-w-xl mx-auto bg-surface-container-low p-1.5 rounded-full border border-outline-variant/30">
          <button 
            type="button"
            onClick={() => setActiveTab('photo')}
            className={`flex-1 py-2 px-2.5 rounded-full font-bold text-[10px] sm:text-xs md:text-sm transition-all flex items-center justify-center gap-1.5 cursor-pointer whitespace-nowrap ${activeTab === 'photo' ? 'bg-primary text-white shadow-md' : 'text-on-surface-variant hover:text-primary'}`}
            id="tab-photo-btn"
          >
            <Camera className="w-4 h-4" />
            {t('sh_tab_photo', formLang)}
          </button>
          <button 
            type="button"
            onClick={() => setActiveTab('voice')}
            className={`flex-1 py-2 px-2.5 rounded-full font-bold text-[10px] sm:text-xs md:text-sm transition-all flex items-center justify-center gap-1.5 cursor-pointer whitespace-nowrap ${activeTab === 'voice' ? 'bg-primary text-white shadow-md' : 'text-on-surface-variant hover:text-primary'}`}
            id="tab-voice-btn"
          >
            <Mic className="w-4 h-4" />
            {t('sh_tab_voice', formLang)}
          </button>
          <button 
            type="button"
            onClick={() => setActiveTab('search')}
            className={`flex-1 py-2 px-2.5 rounded-full font-bold text-[10px] sm:text-xs md:text-sm transition-all flex items-center justify-center gap-1.5 cursor-pointer whitespace-nowrap ${activeTab === 'search' ? 'bg-primary text-white shadow-md' : 'text-on-surface-variant hover:text-primary'}`}
            id="tab-search-btn"
          >
            <Search className="w-4 h-4" />
            {t('sh_tab_search', formLang)}
          </button>
        </div>

        {/* Split Grid: Interactive Input Area & Active Form Viewer */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 lg:gap-8 items-start">
          
          {/* LEFT PANEL: Input & Scan Area (5 columns) */}
          <div className="lg:col-span-5 space-y-4 lg:space-y-6">
            <div className="bg-white rounded-2xl sm:rounded-3xl p-4 sm:p-6 border border-outline-variant/30 shadow-md flex flex-col justify-between min-h-[400px] sm:min-h-[460px]">
              
              {/* Tab Content Header */}
              <div className="border-b border-outline-variant/20 pb-4 mb-4">
                <h3 className="text-xl font-bold text-on-surface flex items-center gap-2">
                  {activeTab === 'photo' && <><Camera className="w-5 h-5 text-primary" /> {t('sh_visual_scanner', formLang)}</>}
                  {activeTab === 'voice' && <><Mic className="w-5 h-5 text-primary" /> {t('sh_voice_assistant', formLang)}</>}
                  {activeTab === 'search' && <><Search className="w-5 h-5 text-primary" /> {t('sh_search_library', formLang)}</>}
                </h3>
                <p className="text-xs text-on-surface-variant mt-1">
                  {activeTab === 'photo' && t('sh_visual_desc', formLang)}
                  {activeTab === 'voice' && t('sh_voice_desc', formLang)}
                  {activeTab === 'search' && t('sh_search_desc', formLang)}
                </p>
              </div>

              {/* Tab Interactive State Machine */}
              <div className="flex-grow flex flex-col justify-center py-4">
                
                {/* 1. PHOTO TAB */}
                {activeTab === 'photo' && (
                  <div className="space-y-6">
                    {/* Simulated File Drop area */}
                    {!isScanning && !selectedDoc && !uploadedImageSrc && (
                      <div className="border-2 border-dashed border-outline-variant/60 rounded-2xl p-6 sm:p-8 flex flex-col items-center text-center hover:border-primary transition-colors relative cursor-pointer group">
                        <input 
                          type="file" 
                          accept="image/*" 
                          onChange={handleFileUploadSim}
                          className="absolute inset-0 opacity-0 cursor-pointer"
                        />
                        <Upload className="w-10 h-10 text-on-surface-variant/70 mb-4 group-hover:scale-110 transition-transform duration-300" />
                        <h4 className="font-bold text-sm text-on-surface mb-1">{t('sh_upload_title', formLang)}</h4>
                        <p className="text-xs text-on-surface-variant max-w-[200px] mb-3">
                          {t('sh_upload_desc', formLang)}
                        </p>
                        <button type="button" className="px-4 py-2 bg-primary text-white text-xs font-bold rounded-xl pointer-events-none shadow-sm hover:bg-primary-container transition-colors">
                          Choose Image / Camera
                        </button>
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
                          {t('sh_upload_success', formLang)}
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
                            {t('sh_proceed', formLang)}
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setUploadedImageSrc(null);
                              setPendingUploadedDoc(null);
                            }}
                            className="bg-white text-on-surface border border-outline-variant/30 hover:bg-surface-container py-2.5 px-4 rounded-xl font-bold text-xs cursor-pointer transition-colors"
                          >
                            {t('sh_cancel', formLang)}
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Preloaded Mock Documents for instant preview */}
                    {!isScanning && !selectedDoc && (
                      <div className="space-y-3">
                        <span className="text-xs font-bold text-on-surface-variant uppercase tracking-wider block">
                          {t('sh_try_sample', formLang)}
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
                                  {t('sh_blank_replica', formLang)}
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
                              {t('sh_mapping_progress', formLang)} {scanProgress}%
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
                              <h4 className="font-bold text-xs text-green-800">{t('sh_mapped_recreated', formLang)}</h4>
                              <p className="text-[10px] text-green-700/90 mt-1">
                                {t('sh_privacy_notice', formLang).split('{name}')[0]}
                                <strong>{selectedDoc.name}</strong>
                                {t('sh_privacy_notice', formLang).split('{name}')[1] || ''}
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
                        <div className="hidden lg:block bg-primary/5 border border-primary/20 rounded-2xl p-5 space-y-4 relative overflow-hidden">
                          <div className="flex justify-between items-center border-b border-primary/10 pb-2">
                            <span className="text-[10px] font-extrabold text-primary uppercase tracking-widest flex items-center gap-1.5">
                              <Sparkles className="w-3.5 h-3.5 text-secondary animate-pulse" /> {t('sh_ai_guide', formLang)}
                            </span>
                            <span className="text-[10px] font-bold text-primary bg-primary/10 px-2 py-0.5 rounded border border-primary/20">
                              {t('sh_guided_mode', formLang)}
                            </span>
                          </div>

                          {guidedFieldIndex >= 0 && guidedFieldIndex < formFields.length ? (
                            (() => {
                              const currentField = formFields[guidedFieldIndex];
                              const info = getFieldGuidance(currentField.id);
                              return (
                                <div className="space-y-3">
                                  <div>
                                    <span className="text-[10px] text-on-surface-variant font-bold uppercase">{t('sh_current_box', formLang)}</span>
                                    <h5 className="font-extrabold text-sm text-on-surface flex items-center justify-between mt-0.5">
                                      <span>{t('field_' + currentField.id, formLang)}</span>
                                      <span className="text-[9px] text-primary/80 font-bold bg-white px-2 py-0.5 rounded border">
                                        {t('sh_field_of', formLang)
                                          .replace('{current}', String(guidedFieldIndex + 1))
                                          .replace('{total}', String(formFields.length))}
                                      </span>
                                    </h5>
                                  </div>

                                  <div className="space-y-2 pt-2 border-t border-outline-variant/10 text-xs">

                                    {/* English Tip */}
                                    <div className="space-y-1">
                                      <div className="flex items-center justify-between">
                                        <span className="text-[9px] font-bold text-secondary uppercase">{t('sh_guide_tip_label', formLang)}</span>
                                        <button
                                          type="button"
                                          onClick={() => speakText(info.tip, `tip-${currentField.id}`, 'en-IN')}
                                          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold border transition-all cursor-pointer shadow-sm ${activeSpeechId === `tip-${currentField.id}` && isSpeaking ? 'bg-secondary text-white border-secondary animate-pulse' : 'bg-white text-secondary border-secondary/50 hover:bg-secondary hover:text-white'}`}
                                        >
                                          {activeSpeechId === `tip-${currentField.id}` && isSpeaking
                                            ? <><VolumeX className="w-3 h-3" /> Stop</>
                                            : <><Volume2 className="w-3 h-3" /> EN</>}
                                        </button>
                                      </div>
                                      <p className="text-on-surface leading-relaxed font-medium bg-white p-2.5 rounded-lg border border-outline-variant/20">
                                        {info.tip}
                                      </p>
                                    </div>

                                    {/* Regional */}
                                    {formLang !== 'en' && info.regional && (
                                      <div className="space-y-1 pt-1">
                                        <div className="flex items-center justify-between">
                                          <span className="text-[9px] font-bold text-primary uppercase">{t('sh_guide_reg_label', formLang)}</span>
                                          <button
                                            type="button"
                                            onClick={() => speakText(info.regional, `reg-${currentField.id}`)}
                                            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold border transition-all cursor-pointer shadow-sm ${activeSpeechId === `reg-${currentField.id}` && isSpeaking ? 'bg-primary text-white border-primary animate-pulse' : 'bg-white text-primary border-primary/50 hover:bg-primary hover:text-white'}`}
                                          >
                                            {activeSpeechId === `reg-${currentField.id}` && isSpeaking
                                            ? <><VolumeX className="w-3 h-3" /> Stop</>
                                            : <><Volume2 className="w-3 h-3" /> {formLang === 'hinglish' ? 'HI' : formLang.toUpperCase()}</>}
                                          </button>
                                        </div>
                                        <p className="text-on-surface-variant leading-relaxed font-semibold italic bg-white p-2.5 rounded-lg border border-outline-variant/20">
                                          {info.regional}
                                        </p>
                                      </div>
                                    )}

                                    {/* Why */}
                                    <div className="space-y-1 pt-1 animate-fade-in">
                                      <div className="flex items-center justify-between">
                                        <span className="text-[9px] font-bold text-on-surface-variant uppercase">{t('sh_guide_why_label', formLang)}</span>
                                        <button
                                          type="button"
                                          onClick={() => speakText(info.reason, `why-${currentField.id}`)}
                                          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold border transition-all cursor-pointer shadow-sm ${activeSpeechId === `why-${currentField.id}` && isSpeaking ? 'bg-on-surface-variant text-white border-on-surface-variant animate-pulse' : 'bg-white text-on-surface-variant border-outline-variant/50 hover:bg-surface-container'}`}
                                        >
                                          {activeSpeechId === `why-${currentField.id}` && isSpeaking
                                            ? <><VolumeX className="w-3 h-3" /> Stop</>
                                            : <><Volume2 className="w-3 h-3" /> Why</>}
                                        </button>
                                      </div>
                                      <p className="text-on-surface-variant text-[11px] leading-relaxed">
                                        {info.reason}
                                      </p>
                                    </div>

                                  </div>

                                  <div className="pt-2 flex items-center justify-between">
                                    <span className="text-[10px] text-on-surface-variant font-bold">
                                      {currentField.value ? (
                                        <span className="text-green-600 flex items-center gap-1 font-extrabold">
                                          <CheckCircle2 className="w-3.5 h-3.5" /> {t('sh_format_verified', formLang)}
                                        </span>
                                      ) : (
                                        <span className="text-amber-600 flex items-center gap-1 font-extrabold animate-pulse">
                                          ⚡ {t('sh_awaiting_input', formLang)}
                                        </span>
                                      )}
                                    </span>
                                    <div className="flex items-center gap-1.5">
                                      {/* Speech status pill */}
                                      {speechStatus === 'playing' && (
                                        <span className="flex items-center gap-1 text-[10px] font-bold text-green-700 bg-green-50 border border-green-200 px-2 py-0.5 rounded-full animate-pulse">
                                          <Volume2 className="w-3 h-3" /> Playing…
                                        </span>
                                      )}
                                      {speechStatus === 'paused' && (
                                        <span className="flex items-center gap-1 text-[10px] font-bold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">
                                          ⏸ Paused
                                        </span>
                                      )}
                                      {speechStatus === 'stopped' && (
                                        <span className="flex items-center gap-1 text-[10px] font-bold text-slate-500 bg-slate-50 border border-slate-200 px-2 py-0.5 rounded-full">
                                          ⏹ Stopped
                                        </span>
                                      )}
                                      {/* Stop button — visible while playing or paused */}
                                      {isSpeaking && (
                                        <button
                                          type="button"
                                          onClick={stopSpeech}
                                          className="flex items-center gap-1 text-[10px] font-bold text-red-500 border border-red-200 bg-red-50 px-2.5 py-1 rounded-full hover:bg-red-100 cursor-pointer transition-colors"
                                        >
                                          <VolumeX className="w-3 h-3" /> Stop
                                        </button>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              );
                            })()
                          ) : (
                            <div className="text-center py-4 space-y-2">
                              <p className="text-xs text-on-surface-variant font-medium">
                                {guidedFieldIndex >= formFields.length 
                                  ? t('sh_autofill_success', formLang) 
                                  : t('sh_status_scan_begin', formLang)}
                              </p>
                            </div>
                          )}

                          {/* Dev voice debug badge — shows which TTS voice was selected */}
                          {activeVoiceLabel && (
                            <div className="mt-1 px-2 py-1 bg-slate-100 border border-slate-200 rounded-lg">
                              <span className="text-[9px] font-mono text-slate-500">
                                🎙 Voice: <span className="font-bold text-slate-700">{activeVoiceLabel}</span>
                              </span>
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
                                  {t('sh_simulate_fill', formLang)}
                                </button>
                                <button
                                  type="button"
                                  onClick={handleInstantAutofill}
                                  className="bg-secondary text-white hover:bg-secondary-container py-2 px-2 rounded-xl font-bold text-[10px] sm:text-xs flex items-center justify-center gap-1 cursor-pointer shadow hover:scale-102 transform active:scale-95 transition-all whitespace-nowrap"
                                >
                                  <Sparkles className="w-3 h-3 animate-pulse" />
                                  {t('sh_instant_fill', formLang)}
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
                                {t('sh_pause', formLang)}
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={resetDemoState}
                              className="bg-white text-on-surface border border-outline-variant/30 hover:bg-surface-container py-2 px-2.5 rounded-xl font-bold text-[10px] sm:text-xs cursor-pointer transition-colors whitespace-nowrap"
                            >
                              {t('sh_reset', formLang)}
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
                            {t('sh_voice_session', formLang)}
                          </span>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleStartVoiceSim()}
                          className="px-6 py-3 rounded-full bg-primary hover:bg-primary-container text-white flex items-center gap-2 shadow-lg hover:shadow-xl hover:scale-102 transition-all cursor-pointer font-bold text-xs"
                        >
                          <Mic className="w-4 h-4" />
                          {t('sh_simulate_voice', formLang)}
                        </button>
                      )}

                      {!isVoiceRecording && voiceStep === 0 && (
                        <p className="text-[11px] text-on-surface-variant text-center mt-4 max-w-xs leading-relaxed">
                          {t('sh_voice_timeline_sub', formLang)}
                        </p>
                      )}
                    </div>

                    {/* Speech Dialogue Timeline */}
                    {voiceStep >= 1 && (
                      <div className="space-y-3 bg-surface-container-low border border-outline-variant/30 rounded-2xl p-4 animate-fade-in">
                        <div className="flex justify-between items-center border-b border-outline-variant/20 pb-2">
                          <span className="text-[10px] font-extrabold text-primary uppercase tracking-widest flex items-center gap-1">
                            <Sparkles className="w-3 h-3 text-secondary animate-pulse" /> {t('sh_bhashini', formLang)}
                          </span>
                          <span className="text-[10px] font-bold text-on-surface-variant bg-white px-2 py-0.5 rounded border">
                            {t('sh_voice_timeline_title', formLang)}
                          </span>
                        </div>

                        {/* Dialogue step 1: AI */}
                        <div className="space-y-1.5 text-xs">
                          <span className="text-[9px] font-extrabold text-primary uppercase tracking-wider block">{t('sh_ai_name', formLang)}</span>
                          <p className="text-on-surface font-semibold leading-relaxed bg-white p-2.5 rounded-lg border border-outline-variant/20">
                            {t('sh_ai_q_nominee', formLang)}
                          </p>
                          <p className="text-on-surface-variant italic leading-relaxed text-[11px] pl-2 border-l border-primary/20">
                            {t('sh_ai_q_nominee_reg', formLang)}
                          </p>
                        </div>

                        {/* Dialogue step 2: User */}
                        {voiceStep >= 2 && (
                          <div className="space-y-1.5 text-xs pt-3 border-t border-outline-variant/10 animate-fade-in">
                            <span className="text-[9px] font-extrabold text-secondary uppercase tracking-wider block">
                              {t('sh_customer_name', formLang).replace('{name}', activeUserRecord?.full_name.split(' ')[0] || 'Customer')}
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
                            {t('sh_timeline_processing', formLang)}
                          </div>
                        )}

                        {/* Dialogue step 4: AI success */}
                        {voiceStep === 4 && (
                          <div className="space-y-1.5 text-xs pt-3 border-t border-outline-variant/10 animate-fade-in">
                            <span className="text-[9px] font-extrabold text-green-700 uppercase tracking-wider block">{t('sh_ai_name', formLang)}</span>
                            {activeUserRecord?.nominee_name ? (
                              (() => {
                                const isSimulated = activeUserRecord.nominee_name === 'Pratik Kumar';
                                const rel = isSimulated ? 'Son' : 'Family Member';
                                const age = isSimulated ? '12 (Minor)' : '35';
                                return (
                                  <>
                                    <p className="text-green-800 font-semibold leading-relaxed bg-green-50 p-2.5 rounded-lg border border-green-200">
                                      {t('sh_timeline_success', formLang)
                                        .replace('{name}', activeUserRecord.nominee_name)
                                        .replace('{rel}', rel)
                                        .replace('{age}', age)}
                                    </p>
                                    
                                    {/* Nominee Field Values box */}
                                    <div className="bg-white border border-outline-variant/30 rounded-xl p-3 text-[11px] space-y-2 mt-2">
                                      <div className="flex justify-between border-b pb-1">
                                        <span className="text-on-surface-variant">{t('field_nomineeName', formLang)}:</span>
                                        <span className="font-bold text-on-surface">{activeUserRecord.nominee_name}</span>
                                      </div>
                                      <div className="flex justify-between border-b pb-1">
                                        <span className="text-on-surface-variant">{t('field_nomineeRelationship', formLang)}:</span>
                                        <span className="font-bold text-on-surface">{rel}</span>
                                      </div>
                                      <div className="flex justify-between">
                                        <span className="text-on-surface-variant">{t('field_nomineeAge', formLang)}:</span>
                                        <span className="font-bold text-on-surface">{age}</span>
                                      </div>
                                    </div>
                                  </>
                                );
                              })()
                            ) : (
                              <>
                                <p className="text-green-800 font-semibold leading-relaxed bg-green-50 p-2.5 rounded-lg border border-green-200">
                                  {t('sh_timeline_success', formLang)
                                    .replace('{name}', 'Pratik Kumar')
                                    .replace('{rel}', 'Son')
                                    .replace('{age}', '12')}
                                </p>
                                
                                {/* Nominee Field Values box */}
                                <div className="bg-white border border-outline-variant/30 rounded-xl p-3 text-[11px] space-y-2 mt-2">
                                  <div className="flex justify-between border-b pb-1">
                                    <span className="text-on-surface-variant">{t('field_nomineeName', formLang)}:</span>
                                    <span className="font-bold text-on-surface">Pratik Kumar</span>
                                  </div>
                                  <div className="flex justify-between border-b pb-1">
                                    <span className="text-on-surface-variant">{t('field_nomineeRelationship', formLang)}:</span>
                                    <span className="font-bold text-on-surface">Son</span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span className="text-on-surface-variant">{t('field_nomineeAge', formLang)}:</span>
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
                        placeholder={t('sh_search_placeholder', formLang)}
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
                              {t('sh_select', formLang)}
                            </span>
                          </button>
                        ))
                      ) : (
                        <div className="p-8 text-center text-xs text-on-surface-variant">
                          {t('sh_search_no_results', formLang)}
                        </div>
                      )}
                    </div>

                    <p className="text-[11px] text-on-surface-variant leading-relaxed text-center italic bg-surface-container-low p-2 rounded-xl">
                      {t('sh_search_note', formLang)}
                    </p>
                  </div>
                )}

              </div>

              {/* Verified Badges (Always Visible) */}
              <div className="border-t border-outline-variant/20 pt-4 flex gap-1.5 justify-center flex-wrap sm:flex-nowrap" id="scan-checks">
                <div className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-[9px] sm:text-[10px] font-extrabold border transition-all whitespace-nowrap ${selectedDoc || voiceStep >= 4 ? 'bg-green-50 text-green-700 border-green-200' : 'bg-surface-container-low text-on-surface-variant border-outline-variant/30'}`}>
                  <CheckCircle2 className="w-3 h-3" />
                  {t('sh_layout_mapped', formLang)}
                </div>
                <div className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-[9px] sm:text-[10px] font-extrabold border transition-all whitespace-nowrap ${selectedDoc || voiceStep >= 4 ? 'bg-green-50 text-green-700 border-green-200' : 'bg-surface-container-low text-on-surface-variant border-outline-variant/30'}`}>
                  <CheckCircle2 className="w-3 h-3" />
                  {t('sh_formats_verified', formLang)}
                </div>
              </div>

            </div>
          </div>

          {/* RIGHT PANEL: Live Banking Form Fill Area (7 columns) */}
          <div className="lg:col-span-7 space-y-4">
            
            <div className="bg-white rounded-2xl sm:rounded-3xl p-4 sm:p-6 border border-outline-variant/30 shadow-md flex flex-col min-h-[400px] sm:min-h-[460px]">
              
              {/* Form Header with Language Toggle */}
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-outline-variant/20 pb-4 gap-4">
                <div className="min-w-0 flex-1">
                  <span className="text-[10px] font-extrabold text-secondary uppercase tracking-widest block">
                    {t('sh_form_title', formLang)}
                  </span>
                  <h3 className="text-md font-bold text-on-surface truncate max-w-xs sm:max-w-md" title={selectedTemplate.title}>
                    {selectedTemplate.title}
                  </h3>
                </div>

                {/* Multilingual Pills — synced to global language */}
                <div className="flex flex-shrink-0 items-center gap-1.5 bg-surface-container-low p-1 rounded-lg border border-outline-variant/30">
                  <span className="text-[10px] font-bold text-on-surface-variant px-1.5">{t('sh_lang_label', formLang)}</span>
                  {LANGUAGES.map((l) => (
                    <button
                      key={l.code}
                      type="button"
                      onClick={() => setFormLang(l.code)}
                      className={`px-2 py-1 rounded text-xs font-bold transition-all cursor-pointer ${formLang === l.code ? 'bg-primary text-white' : 'text-on-surface-variant hover:text-primary hover:bg-white'}`}
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
                  {formFields.map((field, idx) => {
                    const label = t('field_' + field.id, formLang);
                    const placeholder = t('holder_' + field.id, formLang);
                    const isGuidedActive = guidedFieldIndex === idx;
                    const info = getFieldGuidance(field.id);
                    return (
                      <React.Fragment key={field.id}>
                        <div className="space-y-1">
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
                              <option value="">{t('sh_select', formLang)}...</option>
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

                        {/* Inline Mobile Guidance Panel */}
                        {isGuidedActive && (
                          <div className="col-span-1 sm:col-span-2 block lg:hidden bg-primary/5 border border-primary/20 rounded-2xl p-4 space-y-3 animate-fade-in my-2">
                            <div className="flex justify-between items-center border-b border-primary/10 pb-2">
                              <span className="text-[9px] font-extrabold text-primary uppercase tracking-widest flex items-center gap-1.5">
                                <Sparkles className="w-3 h-3 text-secondary animate-pulse" /> {t('sh_ai_guide', formLang)}
                              </span>
                              <span className="text-[9px] font-bold text-primary bg-primary/10 px-2 py-0.5 rounded border border-primary/20">
                                {guidedFieldIndex + 1} / {formFields.length}
                              </span>
                            </div>

                            <div className="space-y-2 text-xs">
                              {/* English Tip */}
                              <div className="space-y-1">
                                <div className="flex items-center justify-between">
                                  <span className="text-[9px] font-bold text-secondary uppercase">{t('sh_guide_tip_label', formLang)}</span>
                                  <button
                                    type="button"
                                    onClick={() => speakText(info.tip, `tip-${field.id}`, 'en-IN')}
                                    className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold border transition-all cursor-pointer ${activeSpeechId === `tip-${field.id}` && isSpeaking ? 'bg-secondary text-white border-secondary' : 'bg-white text-secondary border-secondary/50'}`}
                                  >
                                    {activeSpeechId === `tip-${field.id}` && isSpeaking ? 'Stop' : 'EN'}
                                  </button>
                                </div>
                                <p className="text-on-surface bg-white p-2 rounded-lg border border-outline-variant/20 font-medium leading-relaxed">
                                  {info.tip}
                                </p>
                              </div>

                              {/* Regional Tip */}
                              {formLang !== 'en' && info.regional && (
                                <div className="space-y-1 pt-1">
                                  <div className="flex items-center justify-between">
                                    <span className="text-[9px] font-bold text-primary uppercase">{t('sh_guide_reg_label', formLang)}</span>
                                    <button
                                      type="button"
                                      onClick={() => speakText(info.regional, `reg-${field.id}`)}
                                      className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold border transition-all cursor-pointer ${activeSpeechId === `reg-${field.id}` && isSpeaking ? 'bg-primary text-white border-primary' : 'bg-white text-primary border-primary/50'}`}
                                    >
                                      {activeSpeechId === `reg-${field.id}` && isSpeaking ? 'Stop' : (formLang === 'hinglish' ? 'HI' : formLang.toUpperCase())}
                                    </button>
                                  </div>
                                  <p className="text-on-surface-variant bg-white p-2 rounded-lg border border-outline-variant/20 font-semibold italic leading-relaxed">
                                    {info.regional}
                                  </p>
                                </div>
                              )}

                              {/* Why Explanation */}
                              <div className="space-y-1 pt-1">
                                <div className="flex items-center justify-between">
                                  <span className="text-[9px] font-bold text-on-surface-variant uppercase">{t('sh_guide_why_label', formLang)}</span>
                                  <button
                                    type="button"
                                    onClick={() => speakText(info.reason, `why-${field.id}`)}
                                    className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold border transition-all cursor-pointer ${activeSpeechId === `why-${field.id}` && isSpeaking ? 'bg-on-surface-variant text-white border-on-surface-variant' : 'bg-white text-on-surface-variant border-outline-variant/50'}`}
                                  >
                                    {activeSpeechId === `why-${field.id}` && isSpeaking ? 'Stop' : 'Why'}
                                  </button>
                                </div>
                                <p className="text-on-surface-variant text-[10px] leading-relaxed">
                                  {info.reason}
                                </p>
                              </div>
                            </div>

                            {/* Speech Status Pill */}
                            <div className="flex items-center justify-between pt-2 border-t border-outline-variant/10 text-[9px] font-bold">
                              <div className="flex items-center gap-1">
                                {speechStatus === 'playing' && <span className="text-green-700 bg-green-50 border border-green-200 px-2 py-0.5 rounded-full">Playing…</span>}
                                {speechStatus === 'paused' && <span className="text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">Paused</span>}
                                {speechStatus === 'stopped' && <span className="text-slate-500 bg-slate-50 border border-slate-200 px-2 py-0.5 rounded-full">Stopped</span>}
                              </div>
                              {isSpeaking && (
                                <button
                                  type="button"
                                  onClick={stopSpeech}
                                  className="text-red-500 border border-red-200 bg-red-50 px-2.5 py-0.5 rounded-full hover:bg-red-100 cursor-pointer"
                                >
                                  Stop Voice
                                </button>
                              )}
                            </div>
                          </div>
                        )}
                      </React.Fragment>
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
                          <CheckCircle2 className="w-3.5 h-3.5 animate-pulse" /> {t(autofillStatusMessage, formLang)}
                        </span>
                      ) : (
                        isAnyFieldFilled ? t('sh_status_ai', formLang) : t('sh_status_scan_begin', formLang)
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
                      {t('sh_autofill_btn', formLang)}
                    </button>

                    <button
                      type="submit"
                      disabled={!isAnyFieldFilled}
                      className={`w-full sm:w-auto px-4 py-2.5 rounded-full font-bold text-xs whitespace-nowrap shadow-md transition-all flex items-center justify-center gap-1.5 cursor-pointer ${isAnyFieldFilled ? 'bg-secondary text-white hover:bg-secondary-container hover:shadow-lg hover:scale-102' : 'bg-surface-container-highest text-on-surface-variant/40 cursor-not-allowed border'}`}
                    >
                      <Download className="w-3.5 h-3.5" />
                      {t('sh_download_btn', formLang)}
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
                  <h4 className="text-xl font-bold text-on-surface">{t('res_generating', formLang)}</h4>
                  <p className="text-sm text-on-surface-variant max-w-xs">
                    {t('res_formatting', formLang)}
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
                    <h3 className="text-xl font-bold text-on-surface mt-2">{t('res_success_title', formLang)}</h3>
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
                  {t('res_success_desc', formLang)}
                </p>

                {/* PDF and QR Code Layout Details */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  
                  {/* Mock Form PDF summary card */}
                  <div className="bg-surface-container-low border border-outline-variant/40 rounded-2xl p-4 space-y-3">
                    <span className="text-[10px] font-extrabold text-primary uppercase tracking-widest flex items-center gap-1.5">
                      <FileText className="w-3.5 h-3.5 text-primary" /> {t('res_pdf_title', formLang)}
                    </span>
                    
                    <div className="space-y-2 text-[11px]">
                      {formFields.slice(0, 5).map(f => (
                        <div key={f.id} className="flex justify-between border-b border-outline-variant/10 pb-1">
                          <span className="text-on-surface-variant">{t('field_' + f.id, formLang)}:</span>
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
                      {t('res_save_pdf', formLang)}
                    </button>
                  </div>

                  {/* QR Code display card */}
                  <div className="bg-surface-container-low border border-outline-variant/40 rounded-2xl p-4 flex flex-col items-center justify-between space-y-4">
                    <span className="text-[10px] font-extrabold text-secondary uppercase tracking-widest flex items-center gap-1.5">
                      <QrCode className="w-3.5 h-3.5 text-secondary" /> {t('res_qr_title', formLang)}
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
                      {t('res_print_slip', formLang)}
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
                    {t('res_close', formLang)}
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
