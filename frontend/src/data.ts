import { Language, Bank, DemoDocument, FormTemplate, FeatureItem, StepItem, ImpactStat } from './types';

export const LANGUAGES: Language[] = [
  { code: 'en', name: 'English', nativeName: 'English' },
  { code: 'hinglish', name: 'Hinglish', nativeName: 'Hinglish' },
  { code: 'hi', name: 'Hindi', nativeName: 'हिंदी' },
  { code: 'ta', name: 'Tamil', nativeName: 'தமிழ்' },
  { code: 'bn', name: 'Bengali', nativeName: 'বাংলা' },
  { code: 'mr', name: 'Marathi', nativeName: 'मराठी' },
  { code: 'te', name: 'Telugu', nativeName: 'తెలుగు' },
];

export const BANKS: Bank[] = [
  { id: 'sbi', name: 'State Bank of India', logo: '🏛️' },
  { id: 'hdfc', name: 'HDFC Bank', logo: '💳' },
  { id: 'icici', name: 'ICICI Bank', logo: '🛡️' },
  { id: 'axis', name: 'Axis Bank', logo: '📈' },
  { id: 'bob', name: 'Bank of Baroda', logo: '🔔' },
];

export const DEMO_DOCUMENTS: DemoDocument[] = [
  {
    id: 'blank_sbi_savings',
    name: 'Blank SBI Savings Form',
    type: 'form',
    image: '📝',
    fields: {},
  },
  {
    id: 'blank_hdfc_loan',
    name: 'Blank HDFC Loan Form',
    type: 'form',
    image: '📝',
    fields: {},
  },
];

export const FORM_TEMPLATES: FormTemplate[] = [
  {
    id: 'sbi_savings',
    title: 'SBI Savings Account Opening Form (Form 1A)',
    bankName: 'State Bank of India',
    fields: [
      { id: 'fullName', label: 'Full Name of Applicant', value: '', placeholder: 'Full legal name', type: 'text', confidence: 0 },
      { id: 'fatherName', label: 'Father\'s / Spouse\'s Name', value: '', placeholder: 'Full legal name', type: 'text', confidence: 0 },
      { id: 'dob', label: 'Date of Birth', value: '', placeholder: 'YYYY-MM-DD', type: 'date', confidence: 0 },
      { id: 'gender', label: 'Gender', value: '', placeholder: 'Select Gender', type: 'select', options: ['Male', 'Female', 'Other'], confidence: 0 },
      { id: 'panNo', label: 'Permanent Account Number (PAN)', value: '', placeholder: '10-character PAN', type: 'text', confidence: 0 },
      { id: 'aadhaarNo', label: 'Aadhaar Card Number', value: '', placeholder: '12-digit Aadhaar', type: 'text', confidence: 0 },
      { id: 'phone', label: 'Mobile Number', value: '', placeholder: '10-digit number', type: 'tel', confidence: 0 },
      { id: 'address', label: 'Residential Address', value: '', placeholder: 'Full address details', type: 'text', confidence: 0 },
      { id: 'pincode', label: 'Pincode', value: '', placeholder: '6-digit code', type: 'text', confidence: 0 },
      { id: 'accountType', label: 'Account Type', value: '', placeholder: 'Select Account Type', type: 'select', options: ['Savings Bank Account', 'Current Account', 'Salary Account'], confidence: 0 },
      { id: 'nomineeName', label: 'Nominee Name', value: '', placeholder: 'Name of nominee', type: 'text', confidence: 0 },
    ],
  },
  {
    id: 'hdfc_personal_loan',
    title: 'HDFC Personal Loan Application Form',
    bankName: 'HDFC Bank',
    fields: [
      { id: 'fullName', label: 'Applicant\'s Full Name', value: '', placeholder: 'Full legal name', type: 'text', confidence: 0 },
      { id: 'dob', label: 'Date of Birth', value: '', placeholder: 'YYYY-MM-DD', type: 'date', confidence: 0 },
      { id: 'panNo', label: 'PAN Card Number', value: '', placeholder: '10-digit PAN', type: 'text', confidence: 0 },
      { id: 'phone', label: 'Registered Mobile', value: '', placeholder: '10-digit number', type: 'tel', confidence: 0 },
      { id: 'monthlyIncome', label: 'Net Monthly Salary (INR)', value: '', placeholder: 'e.g., 75000', type: 'text', confidence: 0 },
      { id: 'employerName', label: 'Current Employer Name', value: '', placeholder: 'As listed in EPFO', type: 'text', confidence: 0 },
      { id: 'address', label: 'Current Address', value: '', placeholder: 'Full residential address', type: 'text', confidence: 0 },
      { id: 'pincode', label: 'Pincode', value: '', placeholder: '6-digit pin', type: 'text', confidence: 0 },
      { id: 'loanAmount', label: 'Requested Loan Amount (INR)', value: '', placeholder: 'Enter amount', type: 'text', confidence: 0 },
      { id: 'nomineeName', label: 'Nominee Name', value: '', placeholder: 'Name of nominee (Optional)', type: 'text', confidence: 0 },
    ],
  },
  {
    id: 'icici_kyc',
    title: 'ICICI Re-KYC Compliance Form',
    bankName: 'ICICI Bank',
    fields: [
      { id: 'fullName', label: 'Customer Name', value: '', placeholder: 'Enter legal name', type: 'text', confidence: 0 },
      { id: 'aadhaarNo', label: 'Aadhaar Number', value: '', placeholder: '12-digit number', type: 'text', confidence: 0 },
      { id: 'panNo', label: 'PAN Number', value: '', placeholder: '10-character PAN', type: 'text', confidence: 0 },
      { id: 'dob', label: 'Date of Birth', value: '', placeholder: 'YYYY-MM-DD', type: 'date', confidence: 0 },
      { id: 'phone', label: 'Mobile Number', value: '', placeholder: '10-digit number', type: 'tel', confidence: 0 },
      { id: 'address', label: 'Communication Address', value: '', placeholder: 'Full address details', type: 'text', confidence: 0 },
      { id: 'nomineeName', label: 'Nominee Name', value: '', placeholder: 'Name of nominee (Optional)', type: 'text', confidence: 0 },
    ],
  },
  {
    id: 'sbi_da1',
    title: 'SBI Nomination Form (Form DA-1)',
    bankName: 'State Bank of India',
    fields: [
      { id: 'fullName', label: 'Depositor Name(s) & Address(es)', value: '', placeholder: 'Name(s) and address(es) of depositor(s)', type: 'text', confidence: 0 },
      { id: 'branchName', label: 'Branch Name', value: '', placeholder: 'Name and address of branch/office where deposit is held', type: 'text', confidence: 0 },
      { id: 'depositNature', label: 'Nature of Deposit', value: '', placeholder: 'e.g., Savings Bank / Current / Fixed Deposit', type: 'text', confidence: 0 },
      { id: 'depositDistNo', label: 'Distinguishing Number', value: '', placeholder: 'e.g., Account Number / Receipt Number', type: 'text', confidence: 0 },
      { id: 'depositDetails', label: 'Additional Details (If any)', value: '', placeholder: 'e.g., FD duration, interest payout', type: 'text', confidence: 0 },
      { id: 'nomineeName', label: 'Nominee Name', value: '', placeholder: 'Name of nominee', type: 'text', confidence: 0 },
      { id: 'nomineeAddress', label: 'Nominee Address & Mobile No', value: '', placeholder: 'Address and mobile number of nominee', type: 'text', confidence: 0 },
      { id: 'nomineeRelationship', label: 'Relationship with Depositor', value: '', placeholder: 'Relationship, if any (e.g. Spouse, Son)', type: 'text', confidence: 0 },
      { id: 'nomineeAge', label: 'Nominee Age', value: '', placeholder: 'Age of nominee', type: 'text', confidence: 0 },
      { id: 'nomineeDob', label: 'Nominee Date of Birth (If Minor)', value: '', placeholder: 'YYYY-MM-DD', type: 'date', confidence: 0 },
      { id: 'guardianName', label: 'Appointee Name (If Nominee is Minor)', value: '', placeholder: 'Name of person to receive deposit on behalf of minor', type: 'text', confidence: 0 },
      { id: 'guardianAddress', label: 'Appointee Address & Age', value: '', placeholder: 'Address and age of the appointee', type: 'text', confidence: 0 },
      { id: 'printNomineeName', label: 'Print Nominee Name on Passbook', value: '', placeholder: 'Select option', type: 'select', options: ['Yes', 'No'], confidence: 0 },
    ],
  },
];

export const STEPS: StepItem[] = [
  {
    num: 1,
    title: '1. Scan',
    description: 'Photograph your blank physical form (or pick it from our library). Our Vision AI instantly maps every input box and boundary.',
    imageUrl: 'https://lh3.googleusercontent.com/aida-public/AB6AXuB1zpqeVbTdb5OrCtelIzpvXwoDGJ6ZAg58mtsPrBntejlQgzO0iPetyKoFhTQ-aCaIfZkVvrThmMQM3roCw3nxrBtl6Y067o-Ns1Ag62qsoyNm-fgUcW63nnRuTvjonkQKJYmbR4IuXH1428nOCpck1EAowtvREzmAYoPAEgKwbN8P_lgxCgtA_nzzcvVXDROVqGC37sMoKWljtGZ9BrHIZ-RJ-Lvtrm-xZaye8gc3zNBDe-FxlqCLxvbidGG_s2Et1D7ediC4iME',
  },
  {
    num: 2,
    title: '2. Recreate',
    description: 'The AI rebuilds an exact, high-fidelity digital replica of your specific form on your screen—no generic templates.',
    imageUrl: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDX_LLZ_1fvkn9yksCmyL0WCaoXDLujZoaVuuCRc0q3Pviz8QdK3yZ_YZ_kLV4_sWRnQKcp-2SHCB7B6biJLanZYWfsiJZ7tsIGrBeIObf5cS44dU-Xx6csYDCbLiUTRBPlRBNtd0Dgk95wIjJyPjeXxf01sDVQLvZ0JNtbnZdXRCJXGSwHQ7fR5zNAC9LgwBgcitXTvuUjS7rbgPqIiy_o-gskVWhtyz53FZeK_054MtUGsBAgRKdxBc-hawZpv9R63eb-4_GmGX4',
  },
  {
    num: 3,
    title: '3. Guide',
    description: 'FormSaathi walks you through every single box. It explains what is required and how to avoid mistakes, in plain language or regional voice.',
    icon: '⚡',
  },
  {
    num: 4,
    title: '4. Verify & Export',
    description: 'AI validates inputs (like IFSC codes or signatures) in real-time. Export a perfect, verified PDF and QR code for the branch teller.',
    icon: '🔄',
  },
];

export const FEATURES: FeatureItem[] = [
  {
    id: 'f1',
    title: 'Live Field Validation',
    description: 'Checks format, structural integrity (like PAN/IFSC patterns), and flags common mistakes as you fill in real-time, no documents required.',
    icon: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDV_eQxkpwtM7lxmnz9oHxugI00bJWdPR5VrO73VEQ2h-vfh-6lMk1rq4OM4K1FnODtPQTVapnBffafdAEEfQzfi8cPlC_sz6cUnV9BV0s4kI9fUgAJ8aj_kmsAcD8DDXiKf30c3dT7PAPE_3UWm3lCR-wOrTr9NO8WI6VetDBODtpoZEJhrrAGx4NTFDAQybqpKI9LNdAl74Ff5XTUKkqNia_iupHhyzU0SaBux-3h5NjnykHes-VKNxWV1iBQ6bSaq0wN4wtmrhI',
  },
  {
    id: 'f2',
    title: 'Your Documents Stay With You',
    description: 'Privacy first. We never ask you to upload Aadhaar, PAN, or passbooks. We only see and process the blank form.',
    icon: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDV_eQxkpwtM7lxmnz9oHxugI00bJWdPR5VrO73VEQ2h-vfh-6lMk1rq4OM4K1FnODtPQTVapnBffafdAEEfQzfi8cPlC_sz6cUnV9BV0s4kI9fUgAJ8aj_kmsAcD8DDXiKf30c3dT7PAPE_3UWm3lCR-wOrTr9NO8WI6VetDBODtpoZEJhrrAGx4NTFDAQybqpKI9LNdAl74Ff5XTUKkqNia_iupHhyzU0SaBux-3h5NjnykHes-VKNxWV1iBQ6bSaq0wN4wtmrhI',
  },
  {
    id: 'f3',
    title: 'Regional Language Support',
    description: 'Speak or type in Marathi, Tamil, Bengali, or Hindi. The assistant understands your query and guides you in your native tongue.',
    icon: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDV_eQxkpwtM7lxmnz9oHxugI00bJWdPR5VrO73VEQ2h-vfh-6lMk1rq4OM4K1FnODtPQTVapnBffafdAEEfQzfi8cPlC_sz6cUnV9BV0s4kI9fUgAJ8aj_kmsAcD8DDXiKf30c3dT7PAPE_3UWm3lCR-wOrTr9NO8WI6VetDBODtpoZEJhrrAGx4NTFDAQybqpKI9LNdAl74Ff5XTUKkqNia_iupHhyzU0SaBux-3h5NjnykHes-VKNxWV1iBQ6bSaq0wN4wtmrhI',
  },
  {
    id: 'f4',
    title: 'Instant PDF + QR',
    description: 'Download the completed form as an official PDF or generate a compressed QR code for the bank teller to scan instantly.',
    icon: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDV_eQxkpwtM7lxmnz9oHxugI00bJWdPR5VrO73VEQ2h-vfh-6lMk1rq4OM4K1FnODtPQTVapnBffafdAEEfQzfi8cPlC_sz6cUnV9BV0s4kI9fUgAJ8aj_kmsAcD8DDXiKf30c3dT7PAPE_3UWm3lCR-wOrTr9NO8WI6VetDBODtpoZEJhrrAGx4NTFDAQybqpKI9LNdAl74Ff5XTUKkqNia_iupHhyzU0SaBux-3h5NjnykHes-VKNxWV1iBQ6bSaq0wN4wtmrhI',
  },
  {
    id: 'f5',
    title: 'Remembers Your Forms',
    description: 'Your filled forms are saved securely on your local device for future reuse, but we never store your identity proofs or raw documents.',
    icon: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDV_eQxkpwtM7lxmnz9oHxugI00bJWdPR5VrO73VEQ2h-vfh-6lMk1rq4OM4K1FnODtPQTVapnBffafdAEEfQzfi8cPlC_sz6cUnV9BV0s4kI9fUgAJ8aj_kmsAcD8DDXiKf30c3dT7PAPE_3UWm3lCR-wOrTr9NO8WI6VetDBODtpoZEJhrrAGx4NTFDAQybqpKI9LNdAl74Ff5XTUKkqNia_iupHhyzU0SaBux-3h5NjnykHes-VKNxWV1iBQ6bSaq0wN4wtmrhI',
  },
];

export const IMPACT_STATS: ImpactStat[] = [
  { id: 's1', value: '90%', label: 'Faster Processing', sub: 'vs manual data entry queues', pct: 90, tag: 'EXCELLENT', icon: 'timer' },
  { id: 's2', value: '65%', label: 'Conversion Lift', sub: 'with immediate error resolution', pct: 65, tag: 'GROWING', icon: 'trending_up' },
  { id: 's3', value: '100%', label: 'Error Reduction', sub: 'validating each key format in real-time', pct: 100, tag: 'PERFECT', icon: 'verified_user' },
  { id: 's4', value: '4.2M', label: 'Users Reached', sub: 'across semi-urban and rural areas', pct: 85, tag: 'SCALING', icon: 'groups' },
];
