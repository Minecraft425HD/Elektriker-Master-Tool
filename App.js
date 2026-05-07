import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, ScrollView,
  StyleSheet, SafeAreaView, KeyboardAvoidingView, Platform,
} from 'react-native';
import { StatusBar as ExpoStatusBar } from 'expo-status-bar';

// ════════════════════════════════════════════════════════════
// NORMDATEN
// ════════════════════════════════════════════════════════════

// ── Belastbarkeitstabellen (DIN VDE 0298-4, Tab. 11 PVC / Tab. 12 XLPE) ──
// Struktur: STROMDATEN[material][isolierung][schaltungsart][verlegeart]
//   Verlegeart: B = Unterputz, C = Aufputz, A = Im Rohr, E = Kabelwanne, D = Erdreich
//   Einphasig = 2-adrig (L+N),  Dreiphasig = 4-adrig (L1+L2+L3+N)

const STROMDATEN = {
  kupfer: {
    querschnitte: [1.5, 2.5, 4, 6, 10, 16, 25, 35, 50, 70, 95, 120],
    pvc: {
      einphasig: {
        unterputz:  [15.5, 19.5, 26,   34,  46,  61,  80,  99,  119, 151, 182, 210],
        aufputz:    [17.5, 24,   32,   40,  54,  73,  95,  119, 145, 185, 225, 260],
        imRohr:     [13,   17.5, 23,   30,  40,  54,  70,  86,  103, 130, 156, 179],
        kabelwanne: [19.5, 27,   36,   46,  63,  85,  110, 136, 165, 211, 257, 300],
        erdreich:   [26,   34,   44,   55,  73,  95,  121, 146, 173, 213, 252, 287],
      },
      dreiphasig: {
        unterputz:  [13.5, 18,   24,   31,  42,  56,  73,  89,  108, 136, 164, 188],
        aufputz:    [15.5, 21,   28,   36,  50,  68,  89,  110, 134, 171, 207, 239],
        imRohr:     [11.5, 15,   20,   26,  36,  48,  62,  77,   94, 118, 143, 164],
        kabelwanne: [17.5, 24,   32,   41,  57,  76,  96,  119, 144, 184, 223, 259],
        erdreich:   [22,   29,   38,   47,  63,  81,  104, 125, 148, 183, 216, 246],
      },
    },
    xlpe: {
      einphasig: {
        unterputz:  [19,   26,   35,   45,  61,  81,  106, 131, 158, 200, 241, 278],
        aufputz:    [24,   33,   45,   58,  80,  107, 138, 171, 209, 269, 328, 382],
        imRohr:     [17,   23,   31,   40,  54,  73,  95,  117, 141, 179, 216, 249],
        kabelwanne: [23,   31,   42,   54,  75,  100, 127, 158, 192, 246, 298, 346],
        erdreich:   [30,   40,   51,   64,  84,  111, 141, 170, 200, 247, 292, 333],
      },
      dreiphasig: {
        unterputz:  [17,   23,   31,   40,  54,  73,  95,  117, 141, 179, 216, 249],
        aufputz:    [22,   30,   40,   51,  70,  94,  119, 147, 179, 229, 278, 322],
        imRohr:     [14.5, 19.5, 26,   34,  46,  61,  80,  99,  119, 151, 182, 210],
        kabelwanne: [22,   30,   40,   51,  70,  94,  119, 147, 179, 229, 278, 322],
        erdreich:   [26,   34,   44,   56,  73,  95,  121, 146, 173, 213, 252, 287],
      },
    },
  },
  aluminium: {
    // Aluminium erst ab 16 mm² (DIN VDE 0100-520)
    querschnitte: [16, 25, 35, 50, 70, 95, 120],
    pvc: {
      einphasig: {
        unterputz:  [47,  62,  77,  92,  116, 139, 160],
        aufputz:    [59,  77,  96,  117, 149, 180, 208],
        imRohr:     [41,  53,  65,  78,   98, 118, 135],
        kabelwanne: [66,  84,  103, 124, 158, 191, 222],
        erdreich:   [74,  95,  114, 135, 167, 197, 225],
      },
      dreiphasig: {
        unterputz:  [43,  57,  70,  84,  106, 127, 146],
        aufputz:    [53,  70,  86,  104, 133, 161, 186],
        imRohr:     [36,  47,  58,  70,   88, 107, 122],
        kabelwanne: [55,  72,  89,  108, 138, 168, 195],
        erdreich:   [65,  83,  99,  118, 145, 170, 194],
      },
    },
    xlpe: {
      einphasig: {
        unterputz:  [59,  78,  97,  118, 149, 180, 208],
        aufputz:    [75,  99,  124, 151, 194, 236, 274],
        imRohr:     [53,  69,  87,  104, 133, 161, 186],
        kabelwanne: [72,  95,  118, 144, 184, 224, 261],
        erdreich:   [89,  116, 140, 165, 204, 241, 275],
      },
      dreiphasig: {
        unterputz:  [53,  70,  88,  106, 134, 162, 187],
        aufputz:    [67,  89,  111, 134, 171, 208, 241],
        imRohr:     [47,  62,  78,  94,  120, 144, 166],
        kabelwanne: [67,  89,  111, 134, 171, 208, 241],
        erdreich:   [80,  103, 124, 147, 182, 214, 245],
      },
    },
  },
};

// ── Reaktanz X_L [Ω/m] für mehradrige PVC/XLPE-Kabel, 50 Hz ─
const REAKTANZ = {
  1.5:1.15e-4, 2.5:1.10e-4, 4:1.07e-4, 6:1.00e-4,
  10:0.94e-4, 16:0.90e-4, 25:0.86e-4, 35:0.83e-4,
  50:0.80e-4, 70:0.75e-4, 95:0.72e-4, 120:0.70e-4,
};
const getReaktanz = (mm2) => REAKTANZ[mm2] ?? 0.80e-4;

// ── Spezifische Leitfähigkeit κ [m/(Ω·mm²)] ─────────────────
const KAPPA = { kupfer: 56, aluminium: 34 };

// ── DIN VDE 0298-4 Tab. 17 – Häufung einlagig ───────────────
const TAB_HAEUFUNG = [
  [1,1.00],[2,0.80],[3,0.70],[4,0.65],[5,0.60],
  [6,0.57],[7,0.54],[8,0.52],[9,0.50],[12,0.45],[16,0.41],[20,0.38],
];

// ── Lagenfaktor (zusätzlich zu Tab. 17) ─────────────────────
const LAGEN_F = [1.00, 0.80, 0.73, 0.68, 0.64]; // Index = Lagen-1

// ── Temperaturfaktoren ───────────────────────────────────────
// PVC (70°C), Luft, Bezug 30°C  (Tab. 15)
const TAB_PVC_LUFT   = [[10,1.22],[15,1.17],[20,1.12],[25,1.06],[30,1.00],
                         [35,0.94],[40,0.87],[45,0.79],[50,0.71],[55,0.61],[60,0.50]];
// PVC (70°C), Erde, Bezug 20°C  (Tab. 14)
const TAB_PVC_BODEN  = [[10,1.10],[15,1.05],[20,1.00],[25,0.95],[30,0.89],[35,0.84]];
// XLPE (90°C), Luft, Bezug 30°C (Tab. 15)
const TAB_XLPE_LUFT  = [[10,1.15],[15,1.12],[20,1.08],[25,1.04],[30,1.00],
                         [35,0.96],[40,0.91],[45,0.87],[50,0.82],[55,0.76],[60,0.71]];
// XLPE (90°C), Erde, Bezug 20°C (Tab. 14)
const TAB_XLPE_BODEN = [[10,1.07],[15,1.04],[20,1.00],[25,0.96],[30,0.93],[35,0.89]];

// ── Bodenthermischer Widerstand ρ [K·m/W] (Tab. 14) ─────────
const TAB_BODEN_WIDERSTAND = [
  [0.7,1.08],[1.0,1.00],[1.5,0.89],[2.0,0.83],[2.5,0.77],[3.0,0.72],
];

// ── Betriebsart-Faktoren ─────────────────────────────────────
const BETRIEB_F = {
  s1:{ dauer:1.00 },
  s2:{ t10:1.45, t30:1.20, t60:1.10, t90:1.04 },
  s3:{ ed15:1.50, ed25:1.35, ed40:1.20, ed60:1.08 },
};

// ── Oberschwingungen / THD (DIN VDE 0298-4 / IEC 60364-5-52) ─
// Gilt nur für dreiphasige Systeme (3. Harmonische summiert in N)
const THD_F = { keine:1.00, mittel:0.86, stark:0.86 };
// Bei THD stark: I_N ≈ 1.45 × I_Phase (konservative Schätzung für THD > 33 %)

// ── PE-Querschnitt (DIN VDE 0100-540, Tab. 54.2) ────────────
const NORM_QS = [1.5,2.5,4,6,10,16,25,35,50,70,95,120];
function getPEQ(a) {
  if (a <= 16) return a;
  if (a <= 35) return 16;
  return NORM_QS.find(s => s >= a / 2) ?? 120;
}

// ════════════════════════════════════════════════════════════
// HILFSFUNKTIONEN
// ════════════════════════════════════════════════════════════

function ipol(tab, x) {
  if (x <= tab[0][0])            return tab[0][1];
  if (x >= tab[tab.length-1][0]) return tab[tab.length-1][1];
  for (let i = 0; i < tab.length-1; i++) {
    const [x1,y1] = tab[i], [x2,y2] = tab[i+1];
    if (x === x1) return y1;
    if (x > x1 && x < x2) return y1 + (x-x1)/(x2-x1)*(y2-y1);
  }
  return tab[tab.length-1][1];
}

const fH  = (n)          => ipol(TAB_HAEUFUNG, Math.max(1, Math.min(20, n)));
const fL  = (l)          => LAGEN_F[Math.max(0, Math.min(4, l-1))];
const fBW = (rho)        => ipol(TAB_BODEN_WIDERSTAND, rho);
const fBA = (s,d)        => BETRIEB_F[s]?.[d] ?? 1.00;
const fTHD_val = (thd)   => THD_F[thd] ?? 1.00;

function fTemp(isolierung, istErdreich, t) {
  if (isolierung === 'xlpe') return ipol(istErdreich ? TAB_XLPE_BODEN : TAB_XLPE_LUFT, t);
  return ipol(istErdreich ? TAB_PVC_BODEN : TAB_PVC_LUFT, t);
}

// ════════════════════════════════════════════════════════════
// KERNBERECHNUNG
// ════════════════════════════════════════════════════════════

function berechne({
  stromstaerke, laenge, schaltungsart, cosPhi,
  material, isolierung, verlegeart,
  anzahlSk, anzahlLagen, temperatur, bodenWiderstand,
  betriebsart, betriebsartDetail, thd,
}) {
  const I  = parseFloat(String(stromstaerke).replace(',', '.'));
  const L  = parseFloat(String(laenge).replace(',', '.'));
  const cp = parseFloat(String(cosPhi).replace(',', '.'));

  if (isNaN(I) || I <= 0)         return { fehler: 'Bitte eine gültige Stromstärke eingeben.' };
  if (isNaN(L) || L <= 0)         return { fehler: 'Bitte eine gültige Leitungslänge eingeben.' };
  if (isNaN(cp)||cp<0.5||cp>1.0)  return { fehler: 'cos φ muss zwischen 0,50 und 1,00 liegen.' };

  const istErdreich = verlegeart === 'erdreich';
  const daten = STROMDATEN[material];
  const qs    = daten.querschnitte;
  const tab   = daten[isolierung][schaltungsart][verlegeart];
  const kappa = KAPPA[material];
  const UN    = schaltungsart === 'dreiphasig' ? 400 : 230;
  const nFak  = schaltungsart === 'dreiphasig' ? Math.sqrt(3) : 2;

  // ── Korrekturfaktoren ──
  const FH   = fH(anzahlSk);
  const FL   = fL(anzahlLagen);
  const FT   = fTemp(isolierung, istErdreich, temperatur);
  const FBW  = istErdreich ? fBW(bodenWiderstand) : 1.0;
  const FBA  = fBA(betriebsart, betriebsartDetail);
  const FTHD = (schaltungsart === 'dreiphasig') ? fTHD_val(thd) : 1.0;
  const FG   = FH * FL * FT * FBW * FBA * FTHD;

  // Bei THD stark: Neutralleiter dominiert → effektiver Strom höher
  const iNeutral = (thd === 'stark' && schaltungsart === 'dreiphasig') ? I * 1.45 : I;
  const iEff     = Math.max(I, iNeutral);
  const iErf     = iEff / FG;

  const minIdx = tab.findIndex(imax => imax >= iErf);
  if (minIdx === -1) {
    return {
      fehler:
        `${I} A erfordert einen Tabellenstrom von ${iErf.toFixed(1)} A ` +
        `(Gesamtfaktor ${FG.toFixed(3)}). Übersteigt 120 mm² – ` +
        `Korrekturfaktoren oder Lasteinteilung prüfen.`,
    };
  }

  // ── Spannungsfall mit Reaktanz ──
  const sf = (A) => {
    const R  = 1 / (kappa * A);
    const X  = getReaktanz(A);
    const sp = Math.sqrt(Math.max(0, 1 - cp * cp));
    const dU = nFak * L * I * (R * cp + X * sp);
    return {
      pct: dU / UN * 100,
      V:   dU,
      mRperM: R * cp * 1e3,
      mXperM: X * sp * 1e3,
    };
  };

  // ── Querschnitt ggf. wegen Spannungsfall erhöhen ──
  let empfIdx = minIdx;
  for (let i = minIdx; i < qs.length; i++) {
    empfIdx = i;
    if (sf(qs[i]).pct <= 3.0) break;
  }

  const empfQ     = qs[empfIdx];
  const sfErg     = sf(empfQ);
  const sfWarn    = sfErg.pct > 3.0;
  const sfErhoeht = empfIdx > minIdx;
  const korrigKap = tab[empfIdx] * FG;

  // PE-Querschnitt
  const neutDominiert = thd === 'stark' && schaltungsart === 'dreiphasig';
  const peQ = neutDominiert ? empfQ : getPEQ(empfQ);
  const peHinweis = neutDominiert
    ? 'N = Außenleiter (THD > 33 %)'
    : 'nach DIN VDE 0100-540 Tab. 54.2';

  const xSignifikant = sfErg.mXperM > sfErg.mRperM * 0.08;

  let begruendung =
    `Effektiver Strombedarf: ${iEff.toFixed(1)} A / Gesamtfaktor ${FG.toFixed(3)} = ` +
    `${iErf.toFixed(1)} A Tabellenstrom. Mindestquerschnitt: ${qs[minIdx]} mm² (${tab[minIdx]} A).`;
  if (sfErhoeht)    begruendung += ` Auf ${empfQ} mm² erhöht wegen Spannungsfall.`;
  if (xSignifikant) begruendung += ` Reaktanzanteil (X_L × sin φ) berücksichtigt.`;
  if (neutDominiert)begruendung += ` Neutralleiter-Strom I_N ≈ ${iNeutral.toFixed(1)} A dominiert (THD > 33 %).`;
  if (sfWarn)       begruendung += ` ΔU ${sfErg.pct.toFixed(2)} % überschreitet 3 %.`;

  return {
    querschnitt: empfQ, iTabelle: tab[empfIdx],
    korrigKap, peQ, peHinweis, sf: sfErg, sfWarn,
    FH, FL, FT, FBW, FBA, FTHD, FG, iEff, iErf,
    xSignifikant, neutDominiert, begruendung,
  };
}

// ════════════════════════════════════════════════════════════
// FARBPALETTE
// ════════════════════════════════════════════════════════════
const C = {
  bg:'#0d2b5e', bgMid:'#1a3f7a', card:'#ffffff', cardHell:'#f0f4ff',
  rand:'#d1daf0', akzent:'#2563eb', text:'#0d2b5e', textHell:'#6b7fa8',
  weiss:'#ffffff', grau:'#c8d3e8',
  warn:'#dc2626', warnBg:'#fef2f2', warnRand:'#fca5a5',
  ok:'#16a34a', okBg:'#f0fdf4', okRand:'#86efac',
  info:'#0369a1', infoBg:'#f0f9ff', infoRand:'#7dd3fc',
  amber:'#d97706', amberBg:'#fffbeb', amberRand:'#fcd34d',
};

// ════════════════════════════════════════════════════════════
// UI-HILFSKOMPONENTEN
// ════════════════════════════════════════════════════════════

function BtnGruppe({ optionen, aktiv, onChange, kompakt, wrap }) {
  return (
    <View style={[styles.btnGruppe, wrap && { flexWrap:'wrap' }]}>
      {optionen.map((opt, idx) => {
        const an = opt.wert === aktiv;
        return (
          <TouchableOpacity key={opt.wert}
            style={[styles.auswahlBtn,
                    an && styles.auswahlBtnAn,
                    kompakt && styles.auswahlBtnKompakt,
                    wrap && { marginBottom: 6 },
                    idx < optionen.length - 1 && { marginRight: 6 }]}
            onPress={() => onChange(opt.wert)} activeOpacity={0.75}>
            <Text style={[styles.auswahlBtnText, an && styles.auswahlBtnTextAn,
                          kompakt && { fontSize: 13 }]} numberOfLines={1}>
              {opt.label}
            </Text>
            {opt.sub && (
              <Text style={[styles.auswahlBtnSub, an && { color:'rgba(255,255,255,0.6)' }]}
                    numberOfLines={1}>{opt.sub}</Text>
            )}
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

function Stepper({ wert, onChange, min=1, max=20, fmt }) {
  return (
    <View style={styles.stepper}>
      <TouchableOpacity style={[styles.stepBtn, wert<=min && styles.stepBtnOff]}
        onPress={() => wert>min && onChange(wert-1)} activeOpacity={0.7}>
        <Text style={styles.stepBtnText}>−</Text>
      </TouchableOpacity>
      <View style={styles.stepWert}>
        <Text style={styles.stepWertText}>{fmt ? fmt(wert) : wert}</Text>
      </View>
      <TouchableOpacity style={[styles.stepBtn, wert>=max && styles.stepBtnOff]}
        onPress={() => wert<max && onChange(wert+1)} activeOpacity={0.7}>
        <Text style={styles.stepBtnText}>+</Text>
      </TouchableOpacity>
    </View>
  );
}

function Pill({ label, warn, accent }) {
  return (
    <View style={[styles.pill,
                  warn   && styles.pillWarn,
                  accent && styles.pillAccent]}>
      <Text style={[styles.pillText, (warn||accent) && styles.pillTextAlt]}>{label}</Text>
    </View>
  );
}

function LabelRow({ label, pill }) {
  return (
    <View style={styles.labelRow}>
      <Text style={styles.fieldLabel}>{label}</Text>
      {pill}
    </View>
  );
}

function Sep() { return <View style={styles.sep} />; }

function FRow({ label, detail, wert }) {
  return (
    <View style={styles.fRow}>
      <Text style={styles.fRowLabel}>{label}</Text>
      <View style={styles.fRowR}>
        {detail && <Text style={styles.fRowDetail}>{detail}</Text>}
        <View style={styles.fRowBadge}><Text style={styles.fRowBadgeText}>{wert}</Text></View>
      </View>
    </View>
  );
}

// ════════════════════════════════════════════════════════════
// HAUPTKOMPONENTE
// ════════════════════════════════════════════════════════════

const LUFT_TEMP_PVC  = [25,30,35,40,45,50];
const LUFT_TEMP_XLPE = [25,30,35,40,50,60];
const BODEN_TEMP     = [10,15,20,25,30,35];
const BODEN_RHO_OPTS = [
  { wert:0.7, label:'0,7', sub:'Nasse Erde' },
  { wert:1.0, label:'1,0', sub:'Normalboden' },
  { wert:1.5, label:'1,5', sub:'Feucht. Sand' },
  { wert:2.0, label:'2,0', sub:'Normalsand' },
  { wert:2.5, label:'2,5', sub:'Trockener Sand' },
  { wert:3.0, label:'3,0', sub:'Sehr trocken' },
];

export default function App() {
  // ── Grundparameter ──
  const [strom,        setStrom]        = useState('');
  const [laenge,       setLaenge]       = useState('');
  const [schaltung,    setSchaltung]    = useState('einphasig');
  const [cosPhiIdx,    setCosPhiIdx]    = useState(10);  // 0.50+idx*0.05 → idx 10 = 1.00
  const [material,     setMaterial]     = useState('kupfer');
  const [isolierung,   setIsolierung]   = useState('pvc');
  const [verlegeart,   setVerlegeart]   = useState('unterputz');

  // ── Korrekturfaktoren ──
  const [anzahlSk,     setAnzahlSk]     = useState(1);
  const [anzahlLagen,  setAnzahlLagen]  = useState(1);
  const [temperatur,   setTemperatur]   = useState(30);
  const [bodenRho,     setBodenRho]     = useState(1.0);
  const [betriebsart,  setBetriebsart]  = useState('s1');
  const [betriebDet,   setBetriebDet]   = useState('dauer');
  const [thd,          setThd]          = useState('keine');

  // ── Ergebnis ──
  const [ergebnis,     setErgebnis]     = useState(null);

  // Abgeleitete Werte
  const istErdreich = verlegeart === 'erdreich';
  const isDrei      = schaltung  === 'dreiphasig';
  const cosPhi      = parseFloat((0.50 + cosPhiIdx * 0.05).toFixed(2));
  const sinPhi      = parseFloat(Math.sqrt(Math.max(0, 1-cosPhi*cosPhi)).toFixed(4));

  // Live-Faktoren für Gesamtfaktor-Karte
  const LFH   = fH(anzahlSk);
  const LFL   = fL(anzahlLagen);
  const LFT   = fTemp(isolierung, istErdreich, temperatur);
  const LFBW  = istErdreich ? fBW(bodenRho) : 1.0;
  const LFBA  = fBA(betriebsart, betriebDet);
  const LFTHD = isDrei ? fTHD_val(thd) : 1.0;
  const LFG   = LFH * LFL * LFT * LFBW * LFBA * LFTHD;

  const onVerlegeart = (v) => {
    setVerlegeart(v);
    setTemperatur(v === 'erdreich' ? 20 : 30);
  };
  const onBetriebsart = (s) => {
    setBetriebsart(s);
    setBetriebDet({ s1:'dauer', s2:'t30', s3:'ed40' }[s]);
  };
  const onIsolierung = (iso) => {
    setIsolierung(iso);
    // Wenn Temperatur außerhalb des neuen Bereichs liegt, zurücksetzen
    const maxT = iso === 'xlpe' ? 60 : 50;
    if (!istErdreich && temperatur > maxT) setTemperatur(maxT);
  };

  const onBerechnen = () => setErgebnis(berechne({
    stromstaerke: strom, laenge, schaltungsart: schaltung, cosPhi,
    material, isolierung, verlegeart,
    anzahlSk, anzahlLagen, temperatur, bodenWiderstand: bodenRho,
    betriebsart, betriebsartDetail: betriebDet, thd,
  }));

  const onReset = () => {
    setStrom(''); setLaenge('');
    setSchaltung('einphasig'); setCosPhiIdx(10);
    setMaterial('kupfer'); setIsolierung('pvc'); setVerlegeart('unterputz');
    setAnzahlSk(1); setAnzahlLagen(1); setTemperatur(30); setBodenRho(1.0);
    setBetriebsart('s1'); setBetriebDet('dauer'); setThd('keine');
    setErgebnis(null);
  };

  const tempOptionen = istErdreich
    ? BODEN_TEMP
    : (isolierung === 'xlpe' ? LUFT_TEMP_XLPE : LUFT_TEMP_PVC);

  return (
    <SafeAreaView style={styles.container}>
      <ExpoStatusBar style="light" backgroundColor={C.bg} />
      <KeyboardAvoidingView style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}>

          {/* ── Kopf ── */}
          <View style={styles.kopf}>
            <Text style={styles.kopfTitel}>Kabelquerschnitt-Rechner</Text>
            <Text style={styles.kopfSub}>DIN VDE 0298 · vollständig</Text>
          </View>

          {/* ══════════════════════════════════════════
              KARTE 1: GRUNDPARAMETER
          ══════════════════════════════════════════ */}
          <View style={styles.karte}>
            <Text style={styles.karteTitel}>Grundparameter</Text>

            {/* Stromstärke */}
            <View style={styles.feld}>
              <Text style={styles.fieldLabel}>Stromstärke</Text>
              <View style={styles.inputRow}>
                <TextInput style={styles.input} value={strom}
                  onChangeText={setStrom} keyboardType="decimal-pad"
                  placeholder="z.B. 16" placeholderTextColor={C.textHell} returnKeyType="next"/>
                <View style={styles.badge}><Text style={styles.badgeText}>A</Text></View>
              </View>
            </View>

            {/* Leitungslänge */}
            <View style={styles.feld}>
              <Text style={styles.fieldLabel}>Leitungslänge</Text>
              <View style={styles.inputRow}>
                <TextInput style={styles.input} value={laenge}
                  onChangeText={setLaenge} keyboardType="decimal-pad"
                  placeholder="z.B. 25" placeholderTextColor={C.textHell} returnKeyType="done"/>
                <View style={styles.badge}><Text style={styles.badgeText}>m</Text></View>
              </View>
            </View>

            {/* Schaltungsart */}
            <View style={styles.feld}>
              <Text style={styles.fieldLabel}>Schaltungsart</Text>
              <BtnGruppe aktiv={schaltung} onChange={setSchaltung} optionen={[
                { wert:'einphasig',  label:'Einphasig',  sub:'230 V · L-N' },
                { wert:'dreiphasig', label:'Dreiphasig', sub:'400 V · L-L' },
              ]}/>
            </View>

            {/* cos φ */}
            <View style={styles.feld}>
              <LabelRow label="Leistungsfaktor cos φ"
                pill={<Pill label={`sin φ = ${sinPhi.toFixed(3)}`} warn={cosPhi < 0.85}/>}/>
              <Stepper wert={cosPhiIdx} onChange={setCosPhiIdx} min={0} max={10}
                fmt={(i) => `cos φ = ${(0.50 + i * 0.05).toFixed(2)}`}/>
              {cosPhi < 0.9 && (
                <Text style={styles.hint}>Reaktanzanteil (X_L · sin φ) wird berücksichtigt.</Text>
              )}
            </View>

            {/* Material */}
            <View style={styles.feld}>
              <Text style={styles.fieldLabel}>Leitermaterial</Text>
              <BtnGruppe aktiv={material} onChange={setMaterial} optionen={[
                { wert:'kupfer',    label:'Kupfer (Cu)',    sub:'κ = 56 m/(Ω·mm²)' },
                { wert:'aluminium', label:'Aluminium (Al)', sub:'κ = 34 m/(Ω·mm²)' },
              ]}/>
            </View>

            {/* Isolierung */}
            <View style={styles.feld}>
              <Text style={styles.fieldLabel}>Isolierstoff / Kabeltyp</Text>
              <BtnGruppe aktiv={isolierung} onChange={onIsolierung} optionen={[
                { wert:'pvc',  label:'PVC',  sub:'70 °C · NYM/NYY' },
                { wert:'xlpe', label:'XLPE / EPR', sub:'90 °C · N2XH/NYY-O' },
              ]}/>
            </View>

            {/* Verlegeart – 2-zeilig für 5 Optionen */}
            <View style={[styles.feld, { marginBottom: 0 }]}>
              <Text style={styles.fieldLabel}>Verlegeart</Text>
              <View style={styles.btnGruppe}>
                {[
                  { wert:'unterputz', label:'Unterputz', sub:'Typ B' },
                  { wert:'aufputz',   label:'Aufputz',   sub:'Typ C' },
                  { wert:'imRohr',    label:'Im Rohr',   sub:'Typ A' },
                ].map((o, idx) => {
                  const an = o.wert === verlegeart;
                  return (
                    <TouchableOpacity key={o.wert}
                      style={[styles.auswahlBtn, an && styles.auswahlBtnAn,
                              idx < 2 && { marginRight: 6 }]}
                      onPress={() => onVerlegeart(o.wert)} activeOpacity={0.75}>
                      <Text style={[styles.auswahlBtnText, an && styles.auswahlBtnTextAn]}>{o.label}</Text>
                      <Text style={[styles.auswahlBtnSub, an && { color:'rgba(255,255,255,0.6)' }]}>{o.sub}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
              <View style={[styles.btnGruppe, { marginTop: 6 }]}>
                {[
                  { wert:'kabelwanne', label:'Kabelwanne / -pritsche', sub:'Typ E' },
                  { wert:'erdreich',   label:'Erdreich',                sub:'Typ D' },
                ].map((o, idx) => {
                  const an = o.wert === verlegeart;
                  return (
                    <TouchableOpacity key={o.wert}
                      style={[styles.auswahlBtn, an && styles.auswahlBtnAn,
                              idx === 0 && { marginRight: 6 }]}
                      onPress={() => onVerlegeart(o.wert)} activeOpacity={0.75}>
                      <Text style={[styles.auswahlBtnText, an && styles.auswahlBtnTextAn]}>{o.label}</Text>
                      <Text style={[styles.auswahlBtnSub, an && { color:'rgba(255,255,255,0.6)' }]}>{o.sub}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          </View>

          {/* ══════════════════════════════════════════
              KARTE 2: KORREKTURFAKTOREN
          ══════════════════════════════════════════ */}
          <View style={styles.karte}>
            <Text style={styles.karteTitel}>Korrekturfaktoren · DIN VDE 0298-4</Text>

            {/* Häufung */}
            <View style={styles.feld}>
              <LabelRow label="Häufung – Stromkreise (Tab. 17)"
                pill={<Pill label={`fᴴ = ${LFH.toFixed(2)}`} warn={LFH < 0.7}/>}/>
              <Stepper wert={anzahlSk} onChange={setAnzahlSk} min={1} max={20}
                fmt={(n) => `${n} Stromkreis${n > 1 ? 'e' : ''}`}/>
              <Text style={styles.hint}>
                {anzahlSk === 1 ? 'Einzeln verlegt – kein Häufungsabzug.' : 'Einlagige Anordnung, aneinanderliegend.'}
              </Text>
            </View>

            {/* Lagenanzahl – nur bei Häufung > 1 */}
            {anzahlSk > 1 && (
              <View style={styles.feld}>
                <LabelRow label="Lagen (mehrlagige Häufung)"
                  pill={<Pill label={`fˡ = ${LFL.toFixed(2)}`} warn={LFL < 1.0}/>}/>
                <Stepper wert={anzahlLagen} onChange={setAnzahlLagen} min={1} max={5}
                  fmt={(n) => `${n} Lage${n > 1 ? 'n' : ''}`}/>
                {anzahlLagen > 1 && <Text style={styles.hint}>Zusätzlicher Abminderungsfaktor für mehrlagige Bündelung.</Text>}
              </View>
            )}

            <Sep/>

            {/* Temperatur */}
            <View style={styles.feld}>
              <LabelRow
                label={istErdreich ? 'Bodentemperatur (Tab. 14)' : `Umgebungstemperatur (Tab. 15 · ${isolierung.toUpperCase()})`}
                pill={<Pill label={`fᵀ = ${LFT.toFixed(2)}`} warn={LFT < 0.87}/>}/>
              <View style={styles.btnGruppe}>
                {tempOptionen.map((t, idx) => {
                  const an = t === temperatur;
                  return (
                    <TouchableOpacity key={t}
                      style={[styles.tempBtn, an && styles.tempBtnAn,
                              idx < tempOptionen.length - 1 && { marginRight: 5 }]}
                      onPress={() => setTemperatur(t)} activeOpacity={0.75}>
                      <Text style={[styles.tempBtnText, an && styles.tempBtnTextAn]}>{t}°</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
              <Text style={styles.hint}>
                {istErdreich
                  ? 'Bodentemperatur in 0,7–1,0 m Tiefe. Bezug 20 °C.'
                  : `Bezug 30 °C. ${isolierung === 'xlpe' ? 'XLPE-Kabel bis 60 °C möglich.' : 'PVC-Kabel bis 50 °C.'}`}
              </Text>
            </View>

            {/* Bodenthermischer Widerstand – nur bei Erdreich */}
            {istErdreich && (
              <View style={styles.feld}>
                <LabelRow label="Boden-Wärmewiderstand ρ [K·m/W] (Tab. 14)"
                  pill={<Pill label={`fᵨ = ${LFBW.toFixed(2)}`} warn={LFBW < 0.85}/>}/>
                <View style={[styles.btnGruppe, { flexWrap:'wrap' }]}>
                  {BODEN_RHO_OPTS.map((o, idx) => {
                    const an = o.wert === bodenRho;
                    return (
                      <TouchableOpacity key={o.wert}
                        style={[styles.rhoBtn, an && styles.rhoBtnAn,
                                idx % 3 !== 2 && { marginRight: 6 },
                                idx < 3 && { marginBottom: 6 }]}
                        onPress={() => setBodenRho(o.wert)} activeOpacity={0.75}>
                        <Text style={[styles.rhoBtnOben, an && styles.rhoBtnTextAn]}>{o.label}</Text>
                        <Text style={[styles.rhoBtnUnten, an && { color:'rgba(255,255,255,0.65)' }]}>{o.sub}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
                <Text style={styles.hint}>
                  Normwert 1,0 K·m/W. Trockener Boden bis 3,0 halbiert die Belastbarkeit.
                </Text>
              </View>
            )}

            <Sep/>

            {/* Betriebsart */}
            <View style={styles.feld}>
              <LabelRow label="Betriebsart (Duty Cycle)"
                pill={<Pill label={`fᴮ = ${LFBA.toFixed(2)}`}/>}/>
              <BtnGruppe aktiv={betriebsart} onChange={onBetriebsart} optionen={[
                { wert:'s1', label:'S1', sub:'Dauerbetrieb' },
                { wert:'s2', label:'S2', sub:'Kurzzeitbetrieb' },
                { wert:'s3', label:'S3', sub:'Aussetzbetrieb' },
              ]}/>
              {betriebsart === 's2' && (
                <View style={styles.subSek}>
                  <Text style={styles.subLabel}>Einschaltdauer</Text>
                  <BtnGruppe aktiv={betriebDet} onChange={setBetriebDet} kompakt optionen={[
                    { wert:'t10', label:'10 min' },{ wert:'t30', label:'30 min' },
                    { wert:'t60', label:'60 min' },{ wert:'t90', label:'90 min' },
                  ]}/>
                </View>
              )}
              {betriebsart === 's3' && (
                <View style={styles.subSek}>
                  <Text style={styles.subLabel}>Einschaltdauer ED</Text>
                  <BtnGruppe aktiv={betriebDet} onChange={setBetriebDet} kompakt optionen={[
                    { wert:'ed15', label:'ED 15 %' },{ wert:'ed25', label:'ED 25 %' },
                    { wert:'ed40', label:'ED 40 %' },{ wert:'ed60', label:'ED 60 %' },
                  ]}/>
                </View>
              )}
              {betriebsart !== 's1' && (
                <Text style={styles.hint}>Nur für Motoren/Maschinen. Heiz-/Beleuchtungslasten stets S1.</Text>
              )}
            </View>

            {/* Oberschwingungen / THD – nur dreiphasig */}
            {isDrei && (
              <>
                <Sep/>
                <View style={[styles.feld, { marginBottom: 0 }]}>
                  <LabelRow label="Oberschwingungen / THD (IEC 60364-5-52)"
                    pill={<Pill label={`fᵀᴴᴰ = ${LFTHD.toFixed(2)}`} warn={LFTHD < 1.0}/>}/>
                  <BtnGruppe aktiv={thd} onChange={setThd} optionen={[
                    { wert:'keine',  label:'Keine',   sub:'THD ≤ 15 %' },
                    { wert:'mittel', label:'Mittel',  sub:'THD 15–33 %' },
                    { wert:'stark',  label:'Stark',   sub:'THD > 33 %' },
                  ]}/>
                  {thd === 'mittel' && (
                    <Text style={styles.hint}>Typisch: Bürogeräte, gemischte Lasten. Abminderung auf 86 %.</Text>
                  )}
                  {thd === 'stark' && (
                    <View style={styles.thdWarnBox}>
                      <Text style={styles.thdWarnText}>
                        ⚠  EDV-Lasten, FU-Antriebe, LED-Netzteile. Neutralleiter-Strom kann
                        Außenleiter-Strom übersteigen (I_N ≈ 1,45 × I). Abminderung + Neutralleiter
                        auf Außenleiterquerschnitt ausgelegt!
                      </Text>
                    </View>
                  )}
                  {thd === 'keine' && (
                    <Text style={styles.hint}>Ohmsche Lasten, Motoren mit Nennbetrieb. Kein THD-Abzug.</Text>
                  )}
                </View>
              </>
            )}
          </View>

          {/* ── Gesamtfaktor-Karte ── */}
          <View style={[styles.gesamtKarte, LFG < 0.45 && { backgroundColor:'#7f1d1d' }]}>
            <Text style={styles.gesamtLabel}>Gesamtkorrekturfaktor f_ges</Text>
            <Text style={styles.gesamtFormel}>
              {`fᴴ${LFH.toFixed(2)} × fˡ${LFL.toFixed(2)} × fᵀ${LFT.toFixed(2)} × fᵨ${LFBW.toFixed(2)} × fᴮ${LFBA.toFixed(2)} × fᵀᴴᴰ${LFTHD.toFixed(2)}`}
            </Text>
            <Text style={styles.gesamtWert}>
              {'= '}
              <Text style={[styles.gesamtHervor, LFG < 0.5 && { color:'#fca5a5' }]}>
                {LFG.toFixed(3)}
              </Text>
            </Text>
            {LFG < 0.5 && (
              <Text style={styles.gesamtWarnText}>
                ⚠  Gesamtfaktor unter 0,5 – Querschnitt wird stark erhöht!
              </Text>
            )}
          </View>

          {/* ── Buttons ── */}
          <TouchableOpacity style={styles.berechnBtn} onPress={onBerechnen} activeOpacity={0.85}>
            <Text style={styles.berechnText}>Berechnen</Text>
          </TouchableOpacity>
          {ergebnis && (
            <TouchableOpacity style={styles.resetBtn} onPress={onReset} activeOpacity={0.75}>
              <Text style={styles.resetText}>Zurücksetzen</Text>
            </TouchableOpacity>
          )}

          {/* ══════════════════════════════════════════
              KARTE 3: ERGEBNIS
          ══════════════════════════════════════════ */}
          {ergebnis && (
            <View style={styles.karte}>
              <Text style={styles.karteTitel}>Ergebnis</Text>

              {ergebnis.fehler ? (
                <View style={styles.fehlerBox}>
                  <Text style={styles.fehlerIcon}>⚠</Text>
                  <Text style={styles.fehlerText}>{ergebnis.fehler}</Text>
                </View>
              ) : (
                <>
                  {/* Hauptbanner */}
                  <View style={styles.banner}>
                    <Text style={styles.bannerLabel}>Empfohlener Querschnitt</Text>
                    <View style={styles.bannerWertRow}>
                      <Text style={styles.bannerWert}>{ergebnis.querschnitt}</Text>
                      <Text style={styles.bannerEinh}> mm²</Text>
                    </View>
                    <View style={styles.bannerBadgeRow}>
                      <View style={styles.bannerBadge}>
                        <Text style={styles.bannerBadgeText}>Nennstrom {ergebnis.iTabelle} A</Text>
                      </View>
                      <View style={styles.bannerBadge}>
                        <Text style={styles.bannerBadgeText}>Korr. max. {ergebnis.korrigKap.toFixed(1)} A</Text>
                      </View>
                      <View style={styles.bannerBadge}>
                        <Text style={styles.bannerBadgeText}>{isolierung.toUpperCase()}</Text>
                      </View>
                    </View>
                    <View style={styles.peBadge}>
                      <Text style={styles.peText}>
                        PE / N-Leiter: {ergebnis.peQ} mm²
                      </Text>
                      <Text style={[styles.peSub,
                                    ergebnis.neutDominiert && { color:'#fca5a5' }]}>
                        {ergebnis.peHinweis}
                      </Text>
                    </View>
                    {ergebnis.neutDominiert && (
                      <View style={styles.thdWarnBox}>
                        <Text style={styles.thdWarnText}>
                          ⚠  Neutralleiter auf Außenleiterquerschnitt ausführen!
                          I_N ≈ {(ergebnis.iEff).toFixed(1)} A übersteigt Phasenstrom.
                        </Text>
                      </View>
                    )}
                  </View>

                  {/* Korrekturfaktor-Aufschlüsselung */}
                  <View style={styles.faktorBox}>
                    <Text style={styles.faktorBoxTitel}>Angewendete Korrekturfaktoren</Text>
                    <FRow label="Häufung einlagig (Tab. 17)"
                      detail={anzahlSk === 1 ? 'Einzeln verlegt' : `${anzahlSk} Stromkreise`}
                      wert={`fᴴ = ${ergebnis.FH.toFixed(2)}`}/>
                    {anzahlSk > 1 && <>
                      <View style={styles.fSep}/>
                      <FRow label="Lagenanzahl"
                        detail={`${anzahlLagen} Lage${anzahlLagen>1?'n':''}`}
                        wert={`fˡ = ${ergebnis.FL.toFixed(2)}`}/>
                    </>}
                    <View style={styles.fSep}/>
                    <FRow
                      label={istErdreich ? 'Bodentemperatur (Tab. 14)' : `Temperatur (Tab. 15 ${isolierung.toUpperCase()})`}
                      detail={`${temperatur} °C`}
                      wert={`fᵀ = ${ergebnis.FT.toFixed(2)}`}/>
                    {istErdreich && <>
                      <View style={styles.fSep}/>
                      <FRow label="Boden-Wärmewiderstand (Tab. 14)"
                        detail={`ρ = ${bodenRho} K·m/W`}
                        wert={`fᵨ = ${ergebnis.FBW.toFixed(2)}`}/>
                    </>}
                    <View style={styles.fSep}/>
                    <FRow label="Betriebsart"
                      detail={betriebsart==='s1'?'S1 Dauerbetrieb':
                              betriebsart==='s2'?`S2 ${betriebDet.replace('t','')} min`:
                              `S3 ED ${betriebDet.replace('ed','')} %`}
                      wert={`fᴮ = ${ergebnis.FBA.toFixed(2)}`}/>
                    {isDrei && <>
                      <View style={styles.fSep}/>
                      <FRow label="Oberschwingungen / THD"
                        detail={thd==='keine'?'≤ 15 %':thd==='mittel'?'15–33 %':'>33 %'}
                        wert={`fᵀᴴᴰ = ${ergebnis.FTHD.toFixed(2)}`}/>
                    </>}
                    <View style={[styles.fSep, { marginBottom: 4 }]}/>
                    <FRow label="Gesamtfaktor"
                      detail={`I_erf = ${ergebnis.iErf.toFixed(1)} A`}
                      wert={`f_ges = ${ergebnis.FG.toFixed(3)}`}/>
                  </View>

                  {/* Spannungsfall */}
                  <View style={[styles.sfBox,
                                ergebnis.sfWarn ? styles.sfBoxWarn : styles.sfBoxOk]}>
                    <Text style={[styles.sfTitel,
                                  ergebnis.sfWarn ? { color:C.warn } : { color:C.ok }]}>
                      {ergebnis.sfWarn
                        ? '⚠  Spannungsfall überschreitet 3 %'
                        : '✓  Spannungsfall – in Ordnung'}
                    </Text>
                    <Text style={[styles.sfWert,
                                  ergebnis.sfWarn ? { color:C.warn } : { color:C.ok }]}>
                      {ergebnis.sf.pct.toFixed(2)} %
                    </Text>
                    <Text style={styles.sfDetail}>
                      ΔU = {ergebnis.sf.V.toFixed(2)} V  ·  Grenzwert 3,00 %
                    </Text>
                    {ergebnis.xSignifikant && (
                      <View style={styles.reactBox}>
                        <Text style={styles.reactText}>
                          R·cosφ: {ergebnis.sf.mRperM.toFixed(3)} mΩ/m  ·  X·sinφ: {ergebnis.sf.mXperM.toFixed(3)} mΩ/m
                        </Text>
                      </View>
                    )}
                    {ergebnis.sfWarn && (
                      <Text style={styles.sfHinweis}>
                        Leitungslänge reduzieren, Querschnitt erhöhen oder
                        weiteren Verteilerpunkt einplanen.
                      </Text>
                    )}
                  </View>

                  {/* Begründung */}
                  <View style={styles.begrBox}>
                    <Text style={styles.begrTitel}>Begründung</Text>
                    <Text style={styles.begrText}>{ergebnis.begruendung}</Text>
                  </View>
                </>
              )}
            </View>
          )}

          {/* ── Fußnote ── */}
          <View style={styles.fuss}>
            <Text style={styles.fussText}>
              DIN VDE 0298-4 Tab. 11/12 (PVC/XLPE) · Tab. 13 (Erdreich) · Tab. 14 (Bodentemperatur/ρ) ·
              Tab. 15 (Lufttemperatur) · Tab. 17 (Häufung) · IEC 60364-5-52 (THD) ·
              DIN VDE 0100-540 (PE){'\n'}
              Keine Haftung – Planung und Ausführung durch Elektrofachkraft prüfen lassen.
            </Text>
          </View>

        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// ════════════════════════════════════════════════════════════
// STILE
// ════════════════════════════════════════════════════════════
const styles = StyleSheet.create({
  container:    { flex:1, backgroundColor:C.bg },
  scroll:       { flex:1 },
  scrollContent:{ paddingBottom:48 },

  kopf:     { paddingTop:28, paddingBottom:22, paddingHorizontal:20, alignItems:'center' },
  kopfTitel:{ fontSize:24, fontWeight:'800', color:C.weiss, textAlign:'center' },
  kopfSub:  { fontSize:12, color:C.grau, marginTop:5, letterSpacing:1.1, textTransform:'uppercase' },

  karte: {
    backgroundColor:C.card, marginHorizontal:16, marginBottom:12,
    borderRadius:16, padding:20,
    shadowColor:'#000', shadowOffset:{width:0,height:4},
    shadowOpacity:0.18, shadowRadius:8, elevation:6,
  },
  karteTitel: {
    fontSize:14, fontWeight:'700', color:C.bg, marginBottom:18,
    paddingBottom:10, borderBottomWidth:2, borderBottomColor:C.rand,
  },

  feld:       { marginBottom:18 },
  labelRow:   { flexDirection:'row', justifyContent:'space-between', alignItems:'center', marginBottom:8 },
  fieldLabel: { fontSize:12, fontWeight:'700', color:C.text, textTransform:'uppercase', letterSpacing:0.7 },

  inputRow:   { flexDirection:'row', alignItems:'center' },
  input: {
    flex:1, backgroundColor:C.cardHell, borderWidth:1.5, borderColor:C.rand,
    borderRadius:12, paddingHorizontal:16, paddingVertical:15,
    fontSize:20, fontWeight:'600', color:C.text,
  },
  badge: {
    marginLeft:10, backgroundColor:C.bg, borderRadius:10,
    paddingHorizontal:14, paddingVertical:10, minWidth:48, alignItems:'center',
  },
  badgeText: { color:C.weiss, fontSize:16, fontWeight:'700' },

  btnGruppe: { flexDirection:'row' },
  auswahlBtn: {
    flex:1, paddingVertical:12, paddingHorizontal:4,
    borderRadius:12, borderWidth:1.5, borderColor:C.rand,
    backgroundColor:C.cardHell, alignItems:'center', justifyContent:'center',
  },
  auswahlBtnAn:     { backgroundColor:C.bg, borderColor:C.bg },
  auswahlBtnKompakt:{ paddingVertical:10 },
  auswahlBtnText:   { fontSize:14, fontWeight:'700', color:C.text, textAlign:'center' },
  auswahlBtnTextAn: { color:C.weiss },
  auswahlBtnSub:    { fontSize:11, color:C.textHell, marginTop:2, textAlign:'center' },

  stepper:     { flexDirection:'row', alignItems:'center' },
  stepBtn: {
    width:52, height:52, borderRadius:12, backgroundColor:C.bg,
    alignItems:'center', justifyContent:'center',
  },
  stepBtnOff:  { opacity:0.3 },
  stepBtnText: { color:C.weiss, fontSize:26, fontWeight:'300', lineHeight:30 },
  stepWert: {
    flex:1, alignItems:'center', backgroundColor:C.cardHell,
    marginHorizontal:10, borderRadius:12, paddingVertical:12,
    borderWidth:1.5, borderColor:C.rand,
  },
  stepWertText: { fontSize:17, fontWeight:'700', color:C.text },

  pill: {
    backgroundColor:C.bgMid, borderRadius:8, paddingHorizontal:10, paddingVertical:4,
  },
  pillWarn:    { backgroundColor:'#b91c1c' },
  pillAccent:  { backgroundColor:C.akzent },
  pillText:    { color:C.weiss, fontSize:12, fontWeight:'700' },
  pillTextAlt: { color:'#fecaca' },

  tempBtn: {
    flex:1, paddingVertical:12, borderRadius:10,
    borderWidth:1.5, borderColor:C.rand, backgroundColor:C.cardHell, alignItems:'center',
  },
  tempBtnAn:     { backgroundColor:C.bg, borderColor:C.bg },
  tempBtnText:   { fontSize:14, fontWeight:'600', color:C.text },
  tempBtnTextAn: { color:C.weiss },

  // Bodenthermischer Widerstand – 3×2 Raster
  rhoBtn: {
    width:'30%', paddingVertical:10, borderRadius:10,
    borderWidth:1.5, borderColor:C.rand, backgroundColor:C.cardHell, alignItems:'center',
  },
  rhoBtnAn:     { backgroundColor:C.bg, borderColor:C.bg },
  rhoBtnOben:   { fontSize:16, fontWeight:'700', color:C.text },
  rhoBtnUnten:  { fontSize:10, color:C.textHell, marginTop:2, textAlign:'center' },
  rhoBtnTextAn: { color:C.weiss },

  subSek:  { marginTop:10 },
  subLabel:{ fontSize:11, fontWeight:'600', color:C.textHell, marginBottom:6,
             textTransform:'uppercase', letterSpacing:0.5 },
  hint:    { fontSize:12, color:C.textHell, marginTop:7, lineHeight:16 },
  sep:     { height:1.5, backgroundColor:C.rand, marginVertical:16 },

  // THD-Warnung
  thdWarnBox: {
    marginTop:10, backgroundColor:C.amberBg, borderRadius:10, padding:12,
    borderWidth:1.5, borderColor:C.amberRand,
  },
  thdWarnText: { fontSize:13, color:C.amber, lineHeight:19 },

  // Gesamtfaktor
  gesamtKarte: {
    marginHorizontal:16, marginBottom:12, backgroundColor:C.bgMid,
    borderRadius:14, paddingVertical:14, paddingHorizontal:18,
  },
  gesamtLabel:   { fontSize:11, color:C.grau, fontWeight:'700',
                   textTransform:'uppercase', letterSpacing:0.8, marginBottom:4 },
  gesamtFormel:  { fontSize:12, color:'rgba(255,255,255,0.65)', marginBottom:3 },
  gesamtWert:    { fontSize:18, color:C.weiss, fontWeight:'700' },
  gesamtHervor:  { fontSize:26, color:'#60a5fa', fontWeight:'900' },
  gesamtWarnText:{ fontSize:12, color:'#fbbf24', marginTop:6, lineHeight:17 },

  berechnBtn: {
    marginHorizontal:16, marginBottom:10, backgroundColor:C.akzent,
    borderRadius:14, paddingVertical:17, alignItems:'center',
    shadowColor:C.akzent, shadowOffset:{width:0,height:4},
    shadowOpacity:0.4, shadowRadius:8, elevation:6,
  },
  berechnText: { color:C.weiss, fontSize:18, fontWeight:'800', letterSpacing:0.5 },
  resetBtn: {
    marginHorizontal:16, marginBottom:10, borderRadius:14, paddingVertical:13,
    alignItems:'center', borderWidth:1.5, borderColor:'rgba(255,255,255,0.25)',
  },
  resetText: { color:'rgba(255,255,255,0.55)', fontSize:15, fontWeight:'600' },

  // Ergebnis-Banner
  banner: {
    backgroundColor:C.bg, borderRadius:12,
    paddingVertical:22, paddingHorizontal:16,
    alignItems:'center', marginBottom:14,
  },
  bannerLabel:    { color:C.grau, fontSize:11, fontWeight:'600',
                    letterSpacing:1, textTransform:'uppercase', marginBottom:6 },
  bannerWertRow:  { flexDirection:'row', alignItems:'flex-end' },
  bannerWert:     { color:C.weiss, fontSize:64, fontWeight:'900', lineHeight:68 },
  bannerEinh:     { color:C.grau, fontSize:24, fontWeight:'700', marginBottom:10 },
  bannerBadgeRow: { flexDirection:'row', flexWrap:'wrap', justifyContent:'center', marginTop:10 },
  bannerBadge:    { backgroundColor:'rgba(255,255,255,0.15)', borderRadius:8,
                    paddingHorizontal:12, paddingVertical:5, margin:3 },
  bannerBadgeText:{ color:C.weiss, fontSize:12, fontWeight:'600' },
  peBadge: {
    marginTop:12, backgroundColor:'rgba(255,255,255,0.1)',
    borderRadius:10, paddingHorizontal:16, paddingVertical:8, alignItems:'center',
  },
  peText:  { color:'#93c5fd', fontSize:15, fontWeight:'700' },
  peSub:   { color:'rgba(255,255,255,0.45)', fontSize:11, marginTop:2 },

  // Faktor-Aufschlüsselung
  faktorBox: {
    backgroundColor:C.cardHell, borderRadius:12, padding:14,
    marginBottom:12, borderWidth:1.5, borderColor:C.rand,
  },
  faktorBoxTitel:{ fontSize:11, fontWeight:'700', color:C.bgMid,
                   textTransform:'uppercase', letterSpacing:0.8, marginBottom:10 },
  fRow:          { flexDirection:'row', justifyContent:'space-between',
                   alignItems:'center', paddingVertical:5 },
  fRowLabel:     { fontSize:13, color:C.text, fontWeight:'500', flex:1 },
  fRowR:         { flexDirection:'row', alignItems:'center' },
  fRowDetail:    { fontSize:11, color:C.textHell, marginRight:8 },
  fRowBadge:     { backgroundColor:C.bgMid, borderRadius:8,
                   paddingHorizontal:10, paddingVertical:4 },
  fRowBadgeText: { color:C.weiss, fontSize:12, fontWeight:'700' },
  fSep:          { height:1, backgroundColor:C.rand, marginVertical:2 },

  // Spannungsfall
  sfBox:    { borderRadius:12, padding:16, marginBottom:12, borderWidth:1.5 },
  sfBoxOk:  { backgroundColor:C.okBg,  borderColor:C.okRand },
  sfBoxWarn:{ backgroundColor:C.warnBg, borderColor:C.warnRand },
  sfTitel:  { fontSize:14, fontWeight:'700', marginBottom:6 },
  sfWert:   { fontSize:28, fontWeight:'800', marginBottom:2 },
  sfDetail: { fontSize:12, color:C.textHell, marginBottom:4 },
  reactBox: { marginTop:6, padding:8, backgroundColor:C.infoBg,
              borderRadius:8, borderWidth:1, borderColor:C.infoRand },
  reactText:{ fontSize:12, color:C.info },
  sfHinweis:{ fontSize:13, color:C.warn, lineHeight:19, marginTop:8 },

  // Begründung
  begrBox:  { backgroundColor:C.cardHell, borderRadius:12, padding:14 },
  begrTitel:{ fontSize:11, fontWeight:'700', color:C.bgMid,
              textTransform:'uppercase', letterSpacing:0.8, marginBottom:6 },
  begrText: { fontSize:14, color:C.text, lineHeight:21 },

  // Fehler
  fehlerBox:  { backgroundColor:C.warnBg, borderRadius:12, padding:18,
                borderWidth:1.5, borderColor:C.warnRand, alignItems:'center' },
  fehlerIcon: { fontSize:28, marginBottom:8 },
  fehlerText: { color:C.warn, fontSize:15, fontWeight:'600',
                textAlign:'center', lineHeight:22 },

  fuss:     { marginHorizontal:16, marginTop:4, padding:14,
              backgroundColor:'rgba(255,255,255,0.07)', borderRadius:12 },
  fussText: { color:'rgba(255,255,255,0.4)', fontSize:11, lineHeight:16, textAlign:'center' },
});
