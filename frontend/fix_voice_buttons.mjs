import { readFileSync, writeFileSync } from 'fs';

const file = 'src/components/Showcase.tsx';
let src = readFileSync(file, 'utf8');

// ── 1. Add formLang state + sync useEffect after the TTS state block ────────
const TTS_STATE = `  // TTS Voice Assistance state
  const [activeSpeechId, setActiveSpeechId] = useState<string | null>(null);
  const [isSpeaking, setIsSpeaking] = useState<boolean>(false);`;

const TTS_STATE_REPLACEMENT = `  // TTS Voice Assistance state
  const [activeSpeechId, setActiveSpeechId] = useState<string | null>(null);
  const [isSpeaking, setIsSpeaking] = useState<boolean>(false);

  // Local form language — decoupled from global currentLang
  // Pills in the form update this; NavBar global selector syncs it via useEffect
  const [formLang, setFormLang] = useState<string>(currentLang);`;

src = src.replace(TTS_STATE, TTS_STATE_REPLACEMENT);

// ── 2. Add sync useEffect after the field-advance useEffect ─────────────────
const FIELD_EFFECT = `  // Stop any in-progress TTS when the guided field advances
  useEffect(() => {
    if (guidedFieldIndex >= 0) stopSpeech();
  }, [guidedFieldIndex]);`;

const FIELD_EFFECT_REPLACEMENT = `  // Stop any in-progress TTS when the guided field advances
  useEffect(() => {
    if (guidedFieldIndex >= 0) stopSpeech();
  }, [guidedFieldIndex]);

  // Sync formLang when global language changes (NavBar selector)
  useEffect(() => {
    setFormLang(currentLang);
  }, [currentLang]);`;

src = src.replace(FIELD_EFFECT, FIELD_EFFECT_REPLACEMENT);

// ── 3. Wire pills: click → setFormLang, active check → formLang ─────────────
src = src.replace(
  `onClick={() => onChangeLang && onChangeLang(l.code)}`,
  `onClick={() => setFormLang(l.code)}`
);

src = src.replace(
  `className={\`px-2 py-1 rounded text-xs font-bold transition-all cursor-pointer \${currentLang === l.code ? 'bg-primary text-white' : 'text-on-surface-variant hover:text-primary hover:bg-white'}\`}`,
  `className={\`px-2 py-1 rounded text-xs font-bold transition-all cursor-pointer \${formLang === l.code ? 'bg-primary text-white' : 'text-on-surface-variant hover:text-primary hover:bg-white'}\`}`
);

// ── 4. Replace all rendering uses of currentLang → formLang ─────────────────
// We replace t('...', currentLang) calls, currentLang comparisons, and
// currentLang.toUpperCase() — but NOT the prop declaration or the sync useEffect

// t() calls
src = src.replaceAll(`, currentLang)`, `, formLang)`);

// currentLang === 'x' comparisons in JSX/logic (not in prop/useEffect)
src = src.replaceAll(`currentLang === 'en' &&`, `formLang === 'en' &&`);
src = src.replaceAll(`currentLang !== 'en' &&`, `formLang !== 'en' &&`);
src = src.replaceAll(`currentLang === 'hinglish' ?`, `formLang === 'hinglish' ?`);
src = src.replaceAll(`currentLang === 'hi'`, `formLang === 'hi'`);
src = src.replaceAll(`currentLang === 'hinglish'`, `formLang === 'hinglish'`);
src = src.replaceAll(`currentLang === 'ta'`, `formLang === 'ta'`);
src = src.replaceAll(`currentLang === 'bn'`, `formLang === 'bn'`);
src = src.replaceAll(`currentLang === 'mr'`, `formLang === 'mr'`);
src = src.replaceAll(`currentLang === 'te'`, `formLang === 'te'`);
src = src.replaceAll(`currentLang.toUpperCase()`, `formLang.toUpperCase()`);

// getLangCode call (for TTS voice)
src = src.replaceAll(`getLangCode(currentLang)`, `getLangCode(formLang)`);

// ── 5. Fix: restore currentLang in prop declaration and sync useEffect ───────
// The prop destructuring must keep currentLang
src = src.replace(
  `export default function Showcase({ initialActiveTab = 'photo', formLang = 'en', onChangeLang }: ShowcaseProps)`,
  `export default function Showcase({ initialActiveTab = 'photo', currentLang = 'en', onChangeLang }: ShowcaseProps)`
);

// Restore the sync useEffect (it must reference currentLang prop, not formLang)
src = src.replace(
  `    setFormLang(formLang);
  }, [formLang]);`,
  `    setFormLang(currentLang);
  }, [currentLang]);`
);

// The useState init must use currentLang prop
src = src.replace(
  `const [formLang, setFormLang] = useState<string>(formLang);`,
  `const [formLang, setFormLang] = useState<string>(currentLang);`
);

writeFileSync(file, src, 'utf8');
console.log('Done. Verifying key changes...');

// Quick verify
const out = readFileSync(file, 'utf8');
console.log('Pill onClick has setFormLang:', out.includes('onClick={() => setFormLang(l.code)}'));
console.log('Pill active uses formLang:', out.includes('formLang === l.code'));
console.log('Sync useEffect present:', out.includes('setFormLang(currentLang)'));
console.log('formLang state declared:', out.includes('const [formLang, setFormLang]'));
console.log('t() calls use formLang sample:', out.includes(", formLang)"));
