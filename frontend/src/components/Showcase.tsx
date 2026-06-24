import React, { useState, useEffect, useRef } from 'react';
import { Camera, Mic, Search, CheckCircle2, Upload, FileText, Download, QrCode, Sparkles, RefreshCw, AlertCircle, Printer } from 'lucide-react';
import { ShowcaseTab, DemoDocument, FormTemplate, FormField } from '../types';
import { DEMO_DOCUMENTS, FORM_TEMPLATES, LANGUAGES } from '../data';
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
}

export default function Showcase({ initialActiveTab = 'photo' }: ShowcaseProps) {
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

  // Multilingual state for Form Labels
  const [selectedLang, setSelectedLang] = useState<string>('en');

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
    // Clear form fields
    const cleared = selectedTemplate.fields.map(f => ({ ...f, value: '', confidence: 0 }));
    setFormFields(cleared);
  };

  // Field focus handler
  const handleFieldFocus = (fieldId: string) => {
    const index = formFields.findIndex(f => f.id === fieldId);
    if (index !== -1) {
      setGuidedFieldIndex(index);
    }
  };

  // Get guidance details for a field
  const getFieldGuidance = (fieldId: string) => {
    switch (fieldId) {
      case 'fullName':
        return {
          tip: 'Enter your full legal name as it appears on your official bank records. Do not use initials.',
          regional: 'कृपया अपना पूरा कानूनी नाम दर्ज करें जैसा कि आपके बैंक रिकॉर्ड में है। शुरुआती अक्षरों (initials) का उपयोग न करें।',
          reason: 'Required to match regulatory databases for KYC compliance checks.'
        };
      case 'fatherName':
        return {
          tip: 'Provide the full name of your father or spouse. Write legal names only.',
          regional: 'अपने पिता या जीवनसाथी का पूरा नाम दर्ज करें। केवल कानूनी नाम ही लिखें।',
          reason: 'Used for identity verification and unique profile documentation.'
        };
      case 'dob':
        return {
          tip: 'Enter your date of birth in YYYY-MM-DD format (e.g., 1985-04-12). Must match official ID proofs.',
          regional: 'अपनी जन्म तिथि YYYY-MM-DD प्रारूप (जैसे, 1985-04-12) में दर्ज करें। यह आपके आईडी प्रूफ से मेल खानी चाहिए।',
          reason: 'Needed to check age limits and fulfill banking registration policies.'
        };
      case 'gender':
        return {
          tip: 'Select your legal gender from the dropdown menu options.',
          regional: 'ड्रॉपडाउन मेनू से अपना कानूनी लिंग चुनें।',
          reason: 'Important demographical parameter required by regulatory frameworks.'
        };
      case 'panNo':
        return {
          tip: 'Enter your 10-character alphanumeric Permanent Account Number (PAN) (e.g. APXPK9281M).',
          regional: 'अपना 10-अक्षर का अल्फ़ान्यूमेरिक पैन नंबर (PAN) दर्ज करें (जैसे, APXPK9281M)।',
          reason: 'Mandatory under tax regulations for transactions and account openings.'
        };
      case 'aadhaarNo':
        return {
          tip: 'Enter your 12-digit Aadhaar number (e.g., 3847 2910 4820). Your physical card remains with you.',
          regional: 'अपना 12-अंकों का आधार नंबर दर्ज करें (जैसे, 3847 2910 4820)। आपका भौतिक कार्ड आपके पास ही सुरक्षित है।',
          reason: 'Used for statutory e-KYC validation. No documents are uploaded.'
        };
      case 'phone':
        return {
          tip: 'Enter your active 10-digit mobile number linked to your bank account and Aadhaar.',
          regional: 'अपने बैंक खाते और आधार से लिंक सक्रिय 10-अंकीय मोबाइल नंबर दर्ज करें।',
          reason: 'Required for OTP validations, alerts, and transactional communications.'
        };
      case 'address':
        return {
          tip: 'Enter your complete residential address including flat number, building, street, and locality.',
          regional: 'फ्लैट नंबर, बिल्डिंग, गली और इलाके सहित अपना पूरा आवासीय पता दर्ज करें।',
          reason: 'Necessary for mailing debit cards, checkbooks, and physical statements.'
        };
      case 'pincode':
        return {
          tip: 'Enter the 6-digit postal code (PIN) corresponding to your residential address.',
          regional: 'अपने आवासीय पते के अनुसार 6-अंकों का पोस्टल कोड (पिनकोड) दर्ज करें।',
          reason: 'Verifies geographic jurisdiction and helps in sorting logistics.'
        };
      case 'accountType':
        return {
          tip: 'Choose the specific account tier you are opening: Savings, Current, or Salary.',
          regional: 'वह खाता प्रकार चुनें जिसे आप खोल रहे हैं: बचत (Savings), चालू (Current), या वेतन (Salary) खाता।',
          reason: 'Determines the minimum balance requirements and interest rates.'
        };
      case 'monthlyIncome':
        return {
          tip: 'Enter your net monthly salary/income in Indian Rupees (INR). Do not include decimals.',
          regional: 'भारतीय रुपये (INR) में अपनी शुद्ध मासिक आय दर्ज करें। दशमलव शामिल न करें।',
          reason: 'Evaluates repayment capacity and loan eligibility limits.'
        };
      case 'employerName':
        return {
          tip: 'Enter the official registered name of your current employer (e.g., TCS Limited).',
          regional: 'अपने वर्तमान नियोक्ता का आधिकारिक पंजीकृत नाम दर्ज करें (जैसे, TCS Limited)।',
          reason: 'Used to cross-validate employment status and source of income.'
        };
      case 'loanAmount':
        return {
          tip: 'Enter the total loan amount you wish to borrow from the bank in Rupees.',
          regional: 'वह कुल ऋण राशि दर्ज करें जिसे आप बैंक से उधार लेना चाहते हैं।',
          reason: 'Basis for loan terms, EMI calculations, and credit approvals.'
        };
      case 'nomineeName':
        return {
          tip: 'Enter the full name of the person you want to nominate for this account.',
          regional: 'उस व्यक्ति का पूरा नाम दर्ज करें जिसे आप इस खाते के लिए नामांकित करना चाहते हैं।',
          reason: 'Required to ensure hassle-free transfer of funds to your legal heir/nominee in the future.'
        };
      default:
        return {
          tip: 'Provide the requested details accurately. Double-check for typing errors.',
          regional: 'अनुरोधित विवरण सटीक रूप से दर्ज करें। वर्तनी या टाइपिंग त्रुटियों की जांच करें।',
          reason: 'Ensures accurate database recording and prevents rejection.'
        };
    }
  };

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

  // Trigger Scanning & Parsing Sequence
  const triggerScanningSequence = (unusedData: Record<string, string>, source: 'document' | 'voice') => {
    setIsScanning(true);
    setScanProgress(0);
    setScanningStatus('Initializing Vision AI engine...');

    // Select or reuse the active user record from the CSV
    let currentUser = activeUserRecord;
    if (!currentUser || source !== 'voice') {
      const randomIndex = Math.floor(Math.random() * csvRecords.length);
      currentUser = csvRecords[randomIndex];
      setActiveUserRecord(currentUser);
    }

    const dataToFill: Record<string, string> = {
      fullName: currentUser.full_name || '',
      fatherName: currentUser.father_spouse_name || '',
      dob: currentUser.dob || '',
      gender: currentUser.gender || '',
      phone: currentUser.mobile || '',
      address: currentUser.address || '',
      pincode: currentUser.pincode || '',
      accountType: currentUser.account_type === 'Savings' ? 'Savings Bank Account' : currentUser.account_type === 'Current' ? 'Current Account' : currentUser.account_type || '',
      nomineeName: currentUser.nominee_name || '',
    };

    const statuses = [
      { progress: 15, msg: 'Detecting document borders and layout...' },
      { progress: 35, msg: 'Performing optical character recognition (OCR)...' },
      { progress: 55, msg: 'Parsing fields & mapping against banking standards...' },
      { progress: 75, msg: 'Validating field logic (Aadhaar/PAN structure)...' },
      { progress: 95, msg: 'Form mapped successfully!' },
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
          // Auto fill fields one by one with micro-animation
          autoFillFormFields(dataToFill, currentUser!);
        }, 500);
      }
    }, 600);
  };

  // Auto-fill form fields one by one
  const autoFillFormFields = (dataToFill: Record<string, string>, currentUser: Record<string, string>) => {
    // We clear current fields first
    setFormFields(prev => prev.map(f => ({ ...f, value: '', confidence: 0 })));

    let index = 0;
    const interval = setInterval(() => {
      if (index < selectedTemplate.fields.length) {
        const templateField = selectedTemplate.fields[index];
        const mappedValue = dataToFill[templateField.id];
        
        if (mappedValue) {
          const fieldId = templateField.id;
          setFormFields(prev => prev.map((f) => {
            if (f.id === fieldId) {
              return { 
                ...f, 
                value: mappedValue, 
                confidence: Math.floor(Math.random() * 6) + 94, // 94% to 99%
                mappedFrom: selectedDoc ? selectedDoc.name : 'Voice Input'
              };
            }
            return f;
          }));
        }
        index++;
      } else {
        clearInterval(interval);
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
    t.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
    t.bankName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Translate field label based on language selection
  const getTranslatedLabel = (fieldId: string, englishLabel: string) => {
    if (selectedLang === 'en') return englishLabel;

    const translations: Record<string, Record<string, string>> = {
      hi: {
        fullName: 'आवेदक का पूरा नाम',
        fatherName: 'पिता / जीवनसाथी का नाम',
        dob: 'जन्म तिथि',
        gender: 'लिंग',
        panNo: 'पैन कार्ड नंबर (PAN)',
        aadhaarNo: 'आधार कार्ड नंबर',
        phone: 'मोबाइल नंबर',
        address: 'आवासीय पता',
        pincode: 'पिनकोड',
        accountType: 'खाता प्रकार',
        monthlyIncome: 'मासिक आय (INR)',
        employerName: 'नियोक्ता का नाम',
        loanAmount: 'ऋण राशि',
        nomineeName: 'नामांकित व्यक्ति का नाम',
      },
      ta: {
        fullName: 'விண்ணப்பதாரரின் முழு பெயர்',
        fatherName: 'தந்தை / துணைவியார் பெயர்',
        dob: 'பிறந்த தேதி',
        gender: 'பாலினம்',
        panNo: 'பான் கார்டு எண் (PAN)',
        aadhaarNo: 'ஆதார் கார்டு எண்',
        phone: 'கைபேசி எண்',
        address: 'வீட்டு முகவரி',
        pincode: 'அஞ்சல் குறியீடு',
        accountType: 'கணக்கு வகை',
        monthlyIncome: 'மாத வருமானம்',
        employerName: 'நிறுவனத்தின் பெயர்',
        loanAmount: 'கடன் தொகை',
      },
      bn: {
        fullName: 'আবেদনকারীর পুরো নাম',
        fatherName: 'পিতা / জীবনসঙ্গীর নাম',
        dob: 'জন্ম তারিখ',
        gender: 'লিঙ্গ',
        panNo: 'প্যান কার্ড নম্বর (PAN)',
        aadhaarNo: 'আধার কার্ড নম্বর',
        phone: 'মোবাইল নম্বর',
        address: 'আবাসিক ঠিকানা',
        pincode: 'পিনকোড',
        accountType: 'অ্যাকাউন্টের ধরন',
        monthlyIncome: 'মাসিক আয়',
        employerName: 'नিয়োগকর্তার নাম',
        loanAmount: 'ঋণ পরিমাণ',
      },
      mr: {
        fullName: 'अर्जदाराचे पूर्ण नाव',
        fatherName: 'वडिलांचे / पतीचे नाव',
        dob: 'जन्म तारीख',
        gender: 'लिंग',
        panNo: 'पॅन कार्ड नंबर (PAN)',
        aadhaarNo: 'आधार कार्ड नंबर',
        phone: 'मोबाईल नंबर',
        address: 'रहवासी पत्ता',
        pincode: 'पिनकोड',
        accountType: 'खात्याचा प्रकार',
        monthlyIncome: 'मासिक उत्पन्न',
        employerName: 'कंपनीचे नाव',
        loanAmount: 'कर्जाची रक्कम',
      }
    };

    return translations[selectedLang]?.[fieldId] || englishLabel;
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

    // Helper to generate a fake PAN number
    const generatePAN = () => {
      const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
      const nums = '0123456789';
      let pan = '';
      for (let i = 0; i < 5; i++) pan += chars[Math.floor(Math.random() * chars.length)];
      for (let i = 0; i < 4; i++) pan += nums[Math.floor(Math.random() * nums.length)];
      pan += chars[Math.floor(Math.random() * chars.length)];
      return pan;
    };

    // Helper to generate a fake Aadhaar number
    const generateAadhaar = () => {
      const nums = '0123456789';
      let aadhaar = '';
      for (let i = 0; i < 12; i++) {
        if (i > 0 && i % 4 === 0) aadhaar += ' ';
        aadhaar += nums[Math.floor(Math.random() * nums.length)];
      }
      return aadhaar;
    };

    const dataToFill: Record<string, string> = {
      fullName: currentUser.full_name || '',
      fatherName: currentUser.father_spouse_name || '',
      dob: currentUser.dob || '',
      gender: currentUser.gender || '',
      phone: currentUser.mobile || '',
      address: currentUser.address || '',
      pincode: currentUser.pincode || '',
      accountType: currentUser.account_type === 'Savings' ? 'Savings Bank Account' : currentUser.account_type === 'Current' ? 'Current Account' : currentUser.account_type || '',
      nomineeName: currentUser.nominee_name || 'Kavya Kumar', // default if empty
      panNo: generatePAN(),
      aadhaarNo: generateAadhaar(),
      monthlyIncome: String(Math.floor(Math.random() * 50 + 40) * 1000), // 40k to 90k
      employerName: ['Tata Consultancy Services', 'Infosys Limited', 'Wipro Technologies', 'HDFC Bank Ltd', 'Reliance Industries'][Math.floor(Math.random() * 5)],
      loanAmount: String(Math.floor(Math.random() * 8 + 3) * 100000), // 3L to 10L
    };

    setFormFields(prev => prev.map(f => {
      const mappedValue = dataToFill[f.id];
      if (mappedValue !== undefined) {
        return {
          ...f,
          value: mappedValue,
          confidence: Math.floor(Math.random() * 6) + 94, // 94% to 99%
          mappedFrom: 'Instant Autofill'
        };
      }
      return f;
    }));
  };

  // Check if any field is filled
  const isAnyFieldFilled = formFields.some(f => f.value !== '');

  return (
    <section id="showcase" className="bg-background py-16 border-t border-outline-variant/20">
      <div className="max-w-7xl mx-auto px-6">
        
        {/* Section Headers */}
        <div className="text-center space-y-4 mb-10">
          <span className="font-label-caps text-xs text-secondary font-bold tracking-widest uppercase bg-rose-50 border border-rose-200 px-4 py-1.5 rounded-full inline-block">
            Experience FormSaathi AI
          </span>
          <h2 className="font-headline-lg text-3xl sm:text-4xl lg:text-5xl font-extrabold text-on-surface tracking-tight">
            Scan your form. We recreate it. You fill it.
          </h2>
          <p className="text-body-md text-on-surface-variant max-w-xl mx-auto">
            Choose your preferred mock interface below. Either photograph a blank form to recreate it, view a voice-guided conversation, or search our popular banking form library.
          </p>
        </div>

        {/* Tab Controls */}
        <div className="flex justify-center gap-3 mb-10 max-w-xl mx-auto bg-surface-container-low p-2 rounded-full border border-outline-variant/30">
          <button 
            onClick={() => setActiveTab('photo')}
            className={`flex-1 py-3 px-4 rounded-full font-bold text-sm transition-all flex items-center justify-center gap-2 cursor-pointer whitespace-nowrap ${activeTab === 'photo' ? 'bg-primary text-white shadow-md' : 'text-on-surface-variant hover:text-primary'}`}
            id="tab-photo-btn"
          >
            <Camera className="w-4 h-4" />
            Scan Blank Form
          </button>
          <button 
            onClick={() => setActiveTab('voice')}
            className={`flex-1 py-3 px-4 rounded-full font-bold text-sm transition-all flex items-center justify-center gap-2 cursor-pointer whitespace-nowrap ${activeTab === 'voice' ? 'bg-primary text-white shadow-md' : 'text-on-surface-variant hover:text-primary'}`}
            id="tab-voice-btn"
          >
            <Mic className="w-4 h-4" />
            Voice Guide
          </button>
          <button 
            onClick={() => setActiveTab('search')}
            className={`flex-1 py-3 px-4 rounded-full font-bold text-sm transition-all flex items-center justify-center gap-2 cursor-pointer whitespace-nowrap ${activeTab === 'search' ? 'bg-primary text-white shadow-md' : 'text-on-surface-variant hover:text-primary'}`}
            id="tab-search-btn"
          >
            <Search className="w-4 h-4" />
            Search Library
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
                  {activeTab === 'photo' && <><Camera className="w-5 h-5 text-primary" /> Visual Form Scanner</>}
                  {activeTab === 'voice' && <><Mic className="w-5 h-5 text-primary" /> Voice Guided Assistant</>}
                  {activeTab === 'search' && <><Search className="w-5 h-5 text-primary" /> Blank Forms Library</>}
                </h3>
                <p className="text-xs text-on-surface-variant mt-1">
                  {activeTab === 'photo' && 'Photograph a blank banking form to watch FormSaathi recreate its layout digitally.'}
                  {activeTab === 'voice' && 'Listen to a guided voice dialogue mapping regional spoken details to form fields.'}
                  {activeTab === 'search' && 'Load and recreate official blank forms directly from our standard registry.'}
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
                        <h4 className="font-bold text-sm text-on-surface mb-1">Upload a blank physical form</h4>
                        <p className="text-xs text-on-surface-variant max-w-[200px]">
                          Drag and drop or select file to scan and map a blank form.
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
                          Form uploaded successfully. Review and click Proceed to continue.
                        </p>
                        {/* Buttons */}
                        <div className="flex gap-3 w-full">
                          <button
                            onClick={() => {
                              if (pendingUploadedDoc) {
                                setSelectedDoc(pendingUploadedDoc);
                                triggerScanningSequence(pendingUploadedDoc.fields, 'document');
                              }
                            }}
                            className="flex-1 bg-primary text-white hover:bg-primary-container py-2.5 rounded-xl font-bold text-xs flex items-center justify-center gap-2 cursor-pointer shadow transition-all hover:scale-102 transform active:scale-95"
                          >
                            Proceed
                          </button>
                          <button
                            onClick={() => {
                              setUploadedImageSrc(null);
                              setPendingUploadedDoc(null);
                            }}
                            className="bg-white text-on-surface border border-outline-variant/30 hover:bg-surface-container py-2.5 px-4 rounded-xl font-bold text-xs cursor-pointer transition-colors"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Preloaded Mock Documents for instant preview */}
                    {!isScanning && !selectedDoc && (
                      <div className="space-y-3">
                        <span className="text-xs font-bold text-on-surface-variant uppercase tracking-wider block">
                          Try a Sample Blank Form:
                        </span>
                        <div className="grid grid-cols-2 gap-3">
                          {DEMO_DOCUMENTS.map((doc) => (
                            <button
                              key={doc.id}
                              onClick={() => handleSelectPresetDoc(doc)}
                              className={`p-4 rounded-xl border text-left transition-all flex items-center gap-3 cursor-pointer hover:border-primary hover:bg-primary/5 ${selectedDoc?.id === doc.id ? 'border-primary bg-primary/5 ring-1 ring-primary' : 'border-outline-variant/40 bg-surface'}`}
                            >
                              <span className="text-2xl">{doc.image}</span>
                              <div className="min-w-0">
                                <h5 className="font-bold text-xs truncate text-on-surface">{doc.name}</h5>
                                <span className="text-[10px] text-primary uppercase font-bold">
                                  Blank Form Replica
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
                              Mapping Progress: {scanProgress}%
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
                        <div className="bg-green-50 border border-green-200 rounded-2xl p-4 flex gap-3 items-start">
                          <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                          <div>
                            <h4 className="font-bold text-xs text-green-800">Form Structure Recreated</h4>
                            <p className="text-[10px] text-green-700/90 mt-1">
                              FormSaathi recreated <strong>{selectedDoc.name}</strong> digitally. No identity documents were uploaded—your privacy is preserved.
                            </p>
                          </div>
                        </div>

                        {/* Guided Assistant Panel */}
                        <div className="bg-primary/5 border border-primary/20 rounded-2xl p-5 space-y-4 relative overflow-hidden">
                          <div className="flex justify-between items-center border-b border-primary/10 pb-2">
                            <span className="text-[10px] font-extrabold text-primary uppercase tracking-widest flex items-center gap-1.5">
                              <Sparkles className="w-3.5 h-3.5 text-secondary animate-pulse" /> FormSaathi AI Guide
                            </span>
                            <span className="text-[10px] font-bold text-primary bg-primary/10 px-2 py-0.5 rounded border border-primary/20">
                              Guided Mode
                            </span>
                          </div>

                          {guidedFieldIndex >= 0 && guidedFieldIndex < formFields.length ? (
                            (() => {
                              const currentField = formFields[guidedFieldIndex];
                              const info = getFieldGuidance(currentField.id);
                              return (
                                <div className="space-y-3">
                                  <div>
                                    <span className="text-[10px] text-on-surface-variant font-bold uppercase">Current Box:</span>
                                    <h5 className="font-extrabold text-sm text-on-surface flex items-center justify-between">
                                      <span>{currentField.label}</span>
                                      <span className="text-[9px] text-primary/80 font-bold bg-white px-2 py-0.5 rounded border">
                                        Field {guidedFieldIndex + 1} of {formFields.length}
                                      </span>
                                    </h5>
                                  </div>

                                  <div className="space-y-2 pt-2 border-t border-outline-variant/10 text-xs">
                                    <div className="space-y-1">
                                      <span className="text-[9px] font-bold text-secondary uppercase block">💡 Guidance Tip (English):</span>
                                      <p className="text-on-surface leading-relaxed font-medium bg-white p-2.5 rounded-lg border border-outline-variant/20">
                                        {info.tip}
                                      </p>
                                    </div>
                                    
                                    <div className="space-y-1 pt-1">
                                      <span className="text-[9px] font-bold text-primary uppercase block">🗣️ Regional Translation (Hindi):</span>
                                      <p className="text-on-surface-variant leading-relaxed font-semibold italic bg-white p-2.5 rounded-lg border border-outline-variant/20">
                                        {info.regional}
                                      </p>
                                    </div>

                                    <div className="space-y-1 pt-1 animate-fade-in">
                                      <span className="text-[9px] font-bold text-on-surface-variant uppercase block">❓ Why is this required:</span>
                                      <p className="text-on-surface-variant text-[11px] leading-relaxed">
                                        {info.reason}
                                      </p>
                                    </div>
                                  </div>

                                  <div className="pt-2 flex items-center justify-between">
                                    <span className="text-[10px] text-on-surface-variant font-bold">
                                      {currentField.value ? (
                                        <span className="text-green-600 flex items-center gap-1 font-extrabold">
                                          <CheckCircle2 className="w-3.5 h-3.5" /> Format Verified ✓
                                        </span>
                                      ) : (
                                        <span className="text-amber-600 flex items-center gap-1 font-extrabold animate-pulse">
                                          ⚡ Awaiting Input
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
                                  ? "All fields completed and validated! Ready to export." 
                                  : "Focus on any input field on the right to view custom guidance here."}
                              </p>
                            </div>
                          )}

                          <div className="flex gap-2 pt-2">
                            {!isWalkthroughPlaying && guidedFieldIndex < formFields.length && (
                              <>
                                <button
                                  type="button"
                                  onClick={() => startGuidedWalkthrough(selectedDoc.fields)}
                                  className="flex-grow bg-primary text-white hover:bg-primary-container py-2.5 rounded-xl font-bold text-xs flex items-center justify-center gap-2 cursor-pointer shadow hover:scale-102 transform active:scale-95 transition-all"
                                >
                                  <Sparkles className="w-3.5 h-3.5" />
                                  Simulate Guided Fill
                                </button>
                                <button
                                  type="button"
                                  onClick={handleInstantAutofill}
                                  className="bg-secondary text-white hover:bg-secondary-container py-2.5 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-2 cursor-pointer shadow hover:scale-102 transform active:scale-95 transition-all"
                                >
                                  <Sparkles className="w-3.5 h-3.5 animate-pulse" />
                                  Instant Fill
                                </button>
                              </>
                            )}
                            {isWalkthroughPlaying && (
                              <button
                                onClick={() => setIsWalkthroughPlaying(false)}
                                className="flex-1 bg-amber-500 text-white hover:bg-amber-600 py-2.5 rounded-xl font-bold text-xs flex items-center justify-center gap-2 cursor-pointer shadow transition-all"
                              >
                                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                                Pause Walkthrough
                              </button>
                            )}
                            <button
                              onClick={resetDemoState}
                              className="bg-white text-on-surface border border-outline-variant/30 hover:bg-surface-container py-2.5 px-3.5 rounded-xl font-bold text-xs cursor-pointer transition-colors"
                            >
                              Reset
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
                            Voice guided session active...
                          </span>
                        </div>
                      ) : (
                        <button
                          onClick={handleStartVoiceSim}
                          className="px-6 py-3 rounded-full bg-primary hover:bg-primary-container text-white flex items-center gap-2 shadow-lg hover:shadow-xl hover:scale-102 transition-all cursor-pointer font-bold text-xs"
                        >
                          <Mic className="w-4 h-4" />
                          Simulate Nominee Voice Guide
                        </button>
                      )}

                      {!isVoiceRecording && voiceStep === 0 && (
                        <p className="text-[11px] text-on-surface-variant text-center mt-4 max-w-xs leading-relaxed">
                          Click to play a demo of a regional voice conversation guiding the user to fill out their nominee details.
                        </p>
                      )}
                    </div>

                    {/* Speech Dialogue Timeline */}
                    {voiceStep >= 1 && (
                      <div className="space-y-3 bg-surface-container-low border border-outline-variant/30 rounded-2xl p-4 animate-fade-in">
                        <div className="flex justify-between items-center border-b border-outline-variant/20 pb-2">
                          <span className="text-[10px] font-extrabold text-primary uppercase tracking-widest flex items-center gap-1">
                            <Sparkles className="w-3 h-3 text-secondary animate-pulse" /> Bhashini Speech Engine
                          </span>
                          <span className="text-[10px] font-bold text-on-surface-variant bg-white px-2 py-0.5 rounded border">
                            Nominee Field Guide
                          </span>
                        </div>

                        {/* Dialogue step 1: AI */}
                        <div className="space-y-1.5 text-xs">
                          <span className="text-[9px] font-extrabold text-primary uppercase tracking-wider block">FormSaathi (AI):</span>
                          <p className="text-on-surface font-semibold leading-relaxed bg-white p-2.5 rounded-lg border border-outline-variant/20">
                            "Let's fill the Nominee Details section. Who would you like to nominate for this account?"
                          </p>
                          <p className="text-on-surface-variant italic leading-relaxed text-[11px] pl-2 border-l border-primary/20">
                            (Hindi: "अब नॉमिनी का विवरण भरें। आप किसे नामांकित करना चाहेंगे?")
                          </p>
                        </div>

                        {/* Dialogue step 2: User */}
                        {voiceStep >= 2 && (
                          <div className="space-y-1.5 text-xs pt-3 border-t border-outline-variant/10 animate-fade-in">
                            <span className="text-[9px] font-extrabold text-secondary uppercase tracking-wider block">Customer ({activeUserRecord?.full_name.split(' ')[0] || 'Customer'}):</span>
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
                            🔄 Vision AI mapping nominee relationships & formatting data...
                          </div>
                        )}

                        {/* Dialogue step 4: AI success */}
                        {voiceStep === 4 && (
                          <div className="space-y-1.5 text-xs pt-3 border-t border-outline-variant/10 animate-fade-in">
                            <span className="text-[9px] font-extrabold text-green-700 uppercase tracking-wider block">FormSaathi (AI):</span>
                            {activeUserRecord?.nominee_name ? (
                              (() => {
                                const isSimulated = activeUserRecord.nominee_name === 'Pratik Kumar';
                                const rel = isSimulated ? 'Son' : 'Family Member';
                                const age = isSimulated ? '12 (Minor)' : '35';
                                return (
                                  <>
                                    <p className="text-green-800 font-semibold leading-relaxed bg-green-50 p-2.5 rounded-lg border border-green-200">
                                      "Perfect! Recreated fields: Nominee Name = <strong>{activeUserRecord.nominee_name}</strong>, Relationship = <strong>{rel}</strong>, Age = <strong>{age}</strong>. Format checks verified successfully ✓."
                                    </p>
                                    
                                    {/* Nominee Field Values box */}
                                    <div className="bg-white border border-outline-variant/30 rounded-xl p-3 text-[11px] space-y-2 mt-2">
                                      <div className="flex justify-between border-b pb-1">
                                        <span className="text-on-surface-variant">Nominee Name:</span>
                                        <span className="font-bold text-on-surface">{activeUserRecord.nominee_name}</span>
                                      </div>
                                      <div className="flex justify-between border-b pb-1">
                                        <span className="text-on-surface-variant">Relationship:</span>
                                        <span className="font-bold text-on-surface">{rel}</span>
                                      </div>
                                      <div className="flex justify-between">
                                        <span className="text-on-surface-variant">Nominee Age:</span>
                                        <span className="font-bold text-on-surface">{age}</span>
                                      </div>
                                    </div>
                                  </>
                                );
                              })()
                            ) : (
                              <>
                                <p className="text-green-800 font-semibold leading-relaxed bg-green-50 p-2.5 rounded-lg border border-green-200">
                                  "Perfect! Recreated fields: Nominee Name = <strong>Pratik Kumar</strong>, Relationship = <strong>Son</strong>, Age = <strong>12</strong> (Minor). Format checks verified successfully ✓."
                                </p>
                                
                                {/* Nominee Field Values box */}
                                <div className="bg-white border border-outline-variant/30 rounded-xl p-3 text-[11px] space-y-2 mt-2">
                                  <div className="flex justify-between border-b pb-1">
                                    <span className="text-on-surface-variant">Nominee Name:</span>
                                    <span className="font-bold text-on-surface">Pratik Kumar</span>
                                  </div>
                                  <div className="flex justify-between border-b pb-1">
                                    <span className="text-on-surface-variant">Relationship:</span>
                                    <span className="font-bold text-on-surface">Son</span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span className="text-on-surface-variant">Nominee Age:</span>
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
                        placeholder="Search standard Indian banks (SBI, HDFC...)"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full bg-surface border border-outline-variant rounded-xl pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
                      />
                    </div>

                    {/* Template Catalog */}
                    <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
                      {filteredTemplates.length > 0 ? (
                        filteredTemplates.map((t) => (
                          <button
                            key={t.id}
                            onClick={() => handleSelectTemplate(t)}
                            className={`w-full p-3 rounded-xl border text-left transition-all flex justify-between items-center cursor-pointer hover:border-primary ${selectedTemplate.id === t.id ? 'border-primary bg-primary/5' : 'border-outline-variant/30 bg-surface'}`}
                          >
                            <div>
                              <h5 className="font-bold text-xs text-on-surface">{t.title}</h5>
                              <span className="text-[10px] text-on-surface-variant">
                                {t.bankName} • {t.fields.length} Fields
                              </span>
                            </div>
                            <span className="text-[10px] font-bold text-primary bg-primary/10 px-2 py-1 rounded">
                              SELECT
                            </span>
                          </button>
                        ))
                      ) : (
                        <div className="p-8 text-center text-xs text-on-surface-variant">
                          No banking templates found matching that query.
                        </div>
                      )}
                    </div>

                    <p className="text-[11px] text-on-surface-variant leading-relaxed text-center italic bg-surface-container-low p-2 rounded-xl">
                      *Selecting a template clears any active simulation and swaps fields instantly!
                    </p>
                  </div>
                )}

              </div>

              {/* Verified Badges (Always Visible) */}
              <div className="border-t border-outline-variant/20 pt-4 flex gap-2 justify-center" id="scan-checks">
                <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-extrabold border transition-all ${selectedDoc || voiceStep >= 4 ? 'bg-green-50 text-green-700 border-green-200' : 'bg-surface-container-low text-on-surface-variant border-outline-variant/30'}`}>
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Form Layout Mapped
                </div>
                <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-extrabold border transition-all ${selectedDoc || voiceStep >= 4 ? 'bg-green-50 text-green-700 border-green-200' : 'bg-surface-container-low text-on-surface-variant border-outline-variant/30'}`}>
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Field Formats Verified
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
                    Interactive Bank Application Form
                  </span>
                  <h3 className="text-md font-bold text-on-surface truncate max-w-xs sm:max-w-md" title={selectedTemplate.title}>
                    {selectedTemplate.title}
                  </h3>
                </div>

                {/* Multilingual Pills */}
                <div className="flex flex-shrink-0 items-center gap-1.5 bg-surface-container-low p-1 rounded-lg border border-outline-variant/30">
                  <span className="text-[10px] font-bold text-on-surface-variant px-1.5">Lang:</span>
                  {LANGUAGES.slice(0, 5).map((l) => (
                    <button
                      key={l.code}
                      onClick={() => setSelectedLang(l.code)}
                      className={`px-2 py-1 rounded text-xs font-bold transition-all cursor-pointer ${selectedLang === l.code ? 'bg-primary text-white' : 'text-on-surface-variant hover:text-primary hover:bg-white'}`}
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
                    const label = getTranslatedLabel(field.id, field.label);
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
                            <option value="">Select...</option>
                            {field.options?.map((opt, i) => (
                              <option key={i} value={opt}>{opt}</option>
                            ))}
                          </select>
                        ) : (
                          <input 
                            type={field.type}
                            placeholder={field.placeholder}
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
                      {isAnyFieldFilled ? 'AI processing active' : 'Scan a blank form or search library to begin'}
                    </span>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
                    <button
                      type="button"
                      onClick={handleInstantAutofill}
                      className="w-full sm:w-auto px-5 py-3 rounded-full font-bold text-sm bg-primary/10 text-primary hover:bg-primary/20 border border-primary/20 transition-all flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <Sparkles className="w-4 h-4 text-secondary animate-pulse" />
                      Auto-fill Form
                    </button>

                    <button
                      type="submit"
                      disabled={!isAnyFieldFilled}
                      className={`w-full sm:w-auto px-6 py-3 rounded-full font-bold text-sm shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer ${isAnyFieldFilled ? 'bg-secondary text-white hover:bg-secondary-container hover:shadow-lg hover:scale-102' : 'bg-surface-container-highest text-on-surface-variant/40 cursor-not-allowed border'}`}
                    >
                      <Download className="w-4 h-4" />
                      Download Form & QR Code
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
                  <h4 className="text-xl font-bold text-on-surface">Generating Banking Dossier...</h4>
                  <p className="text-sm text-on-surface-variant max-w-xs">
                    Formatting extracted values into official regulatory standard layout (PDF-1A).
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
                    <h3 className="text-xl font-bold text-on-surface mt-2">Dossier Generated Successfully</h3>
                  </div>
                  <button 
                    onClick={() => setShowResultModal(false)}
                    className="text-on-surface-variant hover:text-on-surface text-lg font-bold bg-surface-container p-2 rounded-full cursor-pointer"
                  >
                    ✕
                  </button>
                </div>

                {/* Subheading explanation */}
                <p className="text-xs text-on-surface-variant leading-relaxed">
                  The application document has been parsed, mapped, and pre-formatted. You can now present the digital QR code at any physical bank branch teller or print the regulatory application dossier.
                </p>

                {/* PDF and QR Code Layout Details */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  
                  {/* Mock Form PDF summary card */}
                  <div className="bg-surface-container-low border border-outline-variant/40 rounded-2xl p-4 space-y-3">
                    <span className="text-[10px] font-extrabold text-primary uppercase tracking-widest flex items-center gap-1.5">
                      <FileText className="w-3.5 h-3.5 text-primary" /> Application Dossier
                    </span>
                    
                    <div className="space-y-2 text-[11px]">
                      {formFields.slice(0, 5).map(f => (
                        <div key={f.id} className="flex justify-between border-b border-outline-variant/10 pb-1">
                          <span className="text-on-surface-variant">{f.label}:</span>
                          <span className="font-bold text-on-surface truncate max-w-[120px]">{f.value || 'N/A'}</span>
                        </div>
                      ))}
                    </div>
                    
                    <button 
                      onClick={() => alert('Mock PDF Download triggered! In production, this saves the filled form directly.')}
                      className="w-full bg-white text-primary border border-primary/20 hover:bg-primary/5 py-2 rounded-xl font-bold text-xs flex items-center justify-center gap-2 cursor-pointer transition-colors"
                    >
                      <Download className="w-3.5 h-3.5" />
                      Save PDF Document
                    </button>
                  </div>

                  {/* QR Code display card */}
                  <div className="bg-surface-container-low border border-outline-variant/40 rounded-2xl p-4 flex flex-col items-center justify-between space-y-4">
                    <span className="text-[10px] font-extrabold text-secondary uppercase tracking-widest flex items-center gap-1.5">
                      <QrCode className="w-3.5 h-3.5 text-secondary" /> Teller Instant QR Code
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
                      onClick={() => alert('Simulating Teller scanner: QR contains encrypted and compressed JSON package of this banking request.')}
                      className="w-full bg-primary text-white hover:bg-primary-container py-2 rounded-xl font-bold text-xs flex items-center justify-center gap-2 cursor-pointer transition-colors"
                    >
                      <Printer className="w-3.5 h-3.5" />
                      Print Branch QR Slip
                    </button>
                  </div>

                </div>

                {/* Footer close button */}
                <div className="pt-4 border-t border-outline-variant/20 flex justify-end gap-2">
                  <button 
                    onClick={() => setShowResultModal(false)}
                    className="bg-surface-container-highest text-on-surface hover:bg-outline-variant/30 px-6 py-2.5 rounded-full font-bold text-xs cursor-pointer transition-all"
                  >
                    Close Dossier Viewer
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
