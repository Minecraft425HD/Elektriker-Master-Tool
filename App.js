import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, ScrollView,
  StyleSheet, SafeAreaView, KeyboardAvoidingView, Platform,
} from 'react-native';
import { StatusBar as ExpoStatusBar } from 'expo-status-bar';

// ============================================================
// NORMDATEN  (DIN VDE 0298-4)
// ============================================================

// ── Belastbarkeitstabellen ──────────────────────────────────
// Einphasig = 2-adrig, Dreiphasig = 4-adrig (L1/L2/L3/N)
// Verlegeart B = Unterputz, C = Aufputz, A1 = Im Rohr, D = Erdreich
// Basis: PVC-Isolation (NYM-J / NYY-J / NAYY), 70 °C max. Leitertemperatur

const STROMDATEN = {
  kupfer: {
    querschnitte: [1.5, 2.5, 4, 6, 10, 16, 25, 35, 50, 70, 95, 120],
    einphasig: {
      unterputz: [15.5, 19.5, 26,   34,  46,  61,  80,  99,  119, 151, 182, 210],
      aufputz:   [17.5, 24,   32,   40,  54,  73,  95,  119, 145, 185, 225, 260],
      imRohr:    [13,   17.5, 23,   30,  40,  54,  70,  86,  103, 130, 156, 179],
      erdreich:  [26,   34,   44,   55,  73,  95,  121, 146, 173, 213, 252, 287],
    },
    dreiphasig: {
      unterputz: [13.5, 18,   24,   31,  42,  56,  73,  89,  108, 136, 164, 188],
      aufputz:   [15.5, 21,   28,   36,  50,  68,  89,  110, 134, 171, 207, 239],
      imRohr:    [11.5, 15,   20,   26,  36,  48,  62,  77,  94,  118, 143, 164],
      erdreich:  [22,   29,   38,   47,  63,  81,  104, 125, 148, 183, 216, 246],
    },
  },
  aluminium: {
    // Aluminium erst ab 16 mm² nach DIN VDE 0100-520 zulässig
    querschnitte: [16, 25, 35, 50, 70, 95, 120],
    einphasig: {
      unterputz: [47, 62, 77,  92,  116, 139, 160],
      aufputz:   [59, 77, 96,  117, 149, 180, 208],
      imRohr:    [41, 53, 65,  78,   98, 118, 135],
      erdreich:  [74, 95, 114, 135, 167, 197, 225],
    },
    dreiphasig: {
      unterputz: [43, 57, 70,  84,  106, 127, 146],
      aufputz:   [53, 70, 86,  104, 133, 161, 186],
      imRohr:    [36, 47, 58,  70,   88, 107, 122],
      erdreich:  [65, 83, 99,  118, 145, 170, 194],
    },
  },
};

// ── Reaktanz (induktiver Widerstandsanteil) ─────────────────
// X_L [Ω/m] für mehradrige PVC-Kabel bei 50 Hz (typische Werte)
const REAKTANZ = {
  1.5: 1.15e-4, 2.5: 1.10e-4, 4: 1.07e-4,  6: 1.00e-4,
  10:  0.94e-4, 16: 0.90e-4,  25: 0.86e-4, 35: 0.83e-4,
  50:  0.80e-4, 70: 0.75e-4,  95: 0.72e-4, 120: 0.70e-4,
};
function getReaktanz(mm2) {
  return REAKTANZ[mm2] ?? 0.80e-4;
}

// ── Spezifische Leitfähigkeit κ [m/(Ω·mm²)] ────────────────
const LEITFAEHIGKEIT = { kupfer: 56, aluminium: 34 };

// ── DIN VDE 0298-4 Tab. 17 – Häufung (einlagig) ────────────
const HAEUFUNG_TAB = [
  [1,1.00],[2,0.80],[3,0.70],[4,0.65],[5,0.60],
  [6,0.57],[7,0.54],[8,0.52],[9,0.50],[12,0.45],
  [16,0.41],[20,0.38],
];

// ── DIN VDE 0298-4 – Zusätzlicher Lagenfaktor ──────────────
// Index = Lagenanzahl-1  (1 Lage … 5 Lagen)
const LAGEN_FAKTOR = [1.00, 0.80, 0.73, 0.68, 0.64];

// ── DIN VDE 0298-4 Tab. 15 – Temperaturfaktor Luft ─────────
// PVC, 70 °C, Bezug 30 °C
const TEMP_LUFT_TAB = [
  [10,1.22],[15,1.17],[20,1.12],[25,1.06],[30,1.00],
  [35,0.94],[40,0.87],[45,0.79],[50,0.71],[55,0.61],[60,0.50],
];

// ── DIN VDE 0298-4 Tab. 14 – Temperaturfaktor Erdreich ─────
// PVC, 70 °C, Bezug 20 °C Bodentemperatur
const TEMP_BODEN_TAB = [
  [10,1.10],[15,1.05],[20,1.00],[25,0.95],[30,0.89],[35,0.84],
];

// ── Betriebsart-Korrekturfaktor ─────────────────────────────
// f_B > 1: intermittierender Betrieb → Kabel kann mehr Strom tragen
const BETRIEBSART_FAKTOREN = {
  s1:    { dauer:   1.00 },
  s2:    { 't10':   1.45, 't30': 1.20, 't60': 1.10, 't90': 1.04 },
  s3:    { 'ed15':  1.50, 'ed25': 1.35, 'ed40': 1.20, 'ed60': 1.08 },
};

// ── PE-Querschnitt nach DIN VDE 0100-540 Tab. 54.2 ─────────
const ALLE_QUERSCHNITTE = [1.5, 2.5, 4, 6, 10, 16, 25, 35, 50, 70, 95, 120];
function getPEQuerschnitt(a) {
  if (a <= 16) return a;
  if (a <= 35) return 16;
  const min = a / 2;
  return ALLE_QUERSCHNITTE.find((s) => s >= min) ?? 120;
}

// ============================================================
// HILFSFUNKTIONEN
// ============================================================

function interpoliere(tab, x) {
  if (x <= tab[0][0])           return tab[0][1];
  if (x >= tab[tab.length-1][0]) return tab[tab.length-1][1];
  for (let i = 0; i < tab.length - 1; i++) {
    const [x1,y1] = tab[i], [x2,y2] = tab[i+1];
    if (x === x1) return y1;
    if (x > x1 && x < x2) return y1 + (x-x1)/(x2-x1)*(y2-y1);
  }
  return tab[tab.length-1][1];
}

const fHaeufung    = (n)    => interpoliere(HAEUFUNG_TAB, Math.max(1, Math.min(20, n)));
const fLagen       = (l)    => LAGEN_FAKTOR[Math.max(0, Math.min(4, l-1))];
const fLuft        = (t)    => interpoliere(TEMP_LUFT_TAB,  t);
const fBoden       = (t)    => interpoliere(TEMP_BODEN_TAB, t);
const fBetriebsart = (s,d)  => BETRIEBSART_FAKTOREN[s]?.[d] ?? 1.00;

// ============================================================
// KERNBERECHNUNG
// ============================================================

function berechne({
  stromstaerke, laenge, schaltungsart, cosPhi,
  material, verlegeart, anzahlSk, anzahlLagen,
  temperatur, betriebsart, betriebsartDetail,
}) {
  const I  = parseFloat(String(stromstaerke).replace(',', '.'));
  const L  = parseFloat(String(laenge).replace(',', '.'));
  const cp = parseFloat(String(cosPhi).replace(',', '.'));

  if (isNaN(I) || I <= 0) return { fehler: 'Bitte eine gültige Stromstärke eingeben.' };
  if (isNaN(L) || L <= 0) return { fehler: 'Bitte eine gültige Leitungslänge eingeben.' };
  if (isNaN(cp) || cp < 0.5 || cp > 1.0)
    return { fehler: 'cos φ muss zwischen 0,50 und 1,00 liegen.' };

  const daten  = STROMDATEN[material];
  const qs     = daten.querschnitte;
  const istErdreich = verlegeart === 'erdreich';
  const tab    = daten[schaltungsart][verlegeart];
  const kappa  = LEITFAEHIGKEIT[material];
  const UN     = schaltungsart === 'dreiphasig' ? 400 : 230;
  const vFak   = schaltungsart === 'dreiphasig' ? Math.sqrt(3) : 2;

  // Korrekturfaktoren
  const fH = fHaeufung(anzahlSk);
  const fL = fLagen(anzahlLagen);
  const fT = istErdreich ? fBoden(temperatur) : fLuft(temperatur);
  const fB = fBetriebsart(betriebsart, betriebsartDetail);
  const fG = fH * fL * fT * fB;

  // Benötigter Tabellenstrom
  const iErf = I / fG;

  const minIdx = tab.findIndex((imax) => imax >= iErf);
  if (minIdx === -1) {
    return {
      fehler:
        `${I} A erfordert einen Tabellenstrom von ${iErf.toFixed(1)} A ` +
        `(Gesamtfaktor ${fG.toFixed(3)}). Dies übersteigt 120 mm². ` +
        `Häufung, Temperatur oder Betriebsart prüfen.`,
    };
  }

  // Spannungsfall mit Reaktanz
  const spannungsfall = (A) => {
    const R   = 1 / (kappa * A);       // Ω/m (Widerstandsbelag)
    const X   = getReaktanz(A);        // Ω/m (Reaktanzbelag)
    const sp  = Math.sqrt(Math.max(0, 1 - cp * cp));
    const dU  = vFak * L * I * (R * cp + X * sp);
    return { dUProzent: dU / UN * 100, dUVolt: dU, rAnteil: R * cp * 1000, xAnteil: X * sp * 1000 };
  };

  // Querschnitt ggf. wegen Spannungsfall erhöhen
  let empfIdx = minIdx;
  for (let i = minIdx; i < qs.length; i++) {
    empfIdx = i;
    if (spannungsfall(qs[i]).dUProzent <= 3.0) break;
  }

  const empfQ       = qs[empfIdx];
  const sfErgebnis  = spannungsfall(empfQ);
  const sfWarnung   = sfErgebnis.dUProzent > 3.0;
  const sfErhoehen  = empfIdx > minIdx;
  const korrigKap   = tab[empfIdx] * fG;
  const peQ         = getPEQuerschnitt(empfQ);

  // X-Anteil am Spannungsfall berechnen (für Hinweis)
  const sfMinQ      = spannungsfall(qs[minIdx]);
  const xSignifikant = sfMinQ.xAnteil > sfMinQ.rAnteil * 0.1; // X > 10 % von R-Anteil

  let begruendung =
    `Benötigter Tabellenstrom: ${iErf.toFixed(1)} A ` +
    `(${I} A ÷ fᵍʳˢ ${fG.toFixed(3)}). ` +
    `Mindestquerschnitt: ${qs[minIdx]} mm² (Tabelle: ${tab[minIdx]} A).`;
  if (sfErhoehen)
    begruendung += ` Auf ${empfQ} mm² erhöht wegen Spannungsfall.`;
  if (xSignifikant)
    begruendung += ` Induktiver Anteil (X_L) wurde im Spannungsfall berücksichtigt.`;
  if (sfWarnung)
    begruendung += ` ΔU = ${sfErgebnis.dUProzent.toFixed(2)} % übersteigt 3 % – Trassenführung überdenken.`;

  return {
    querschnitt: empfQ, peQuerschnitt: peQ,
    iTabelle: tab[empfIdx], korrigKap,
    sf: sfErgebnis, sfWarnung,
    fH, fL, fT, fB, fG, iErf,
    begruendung,
    xSignifikant,
  };
}

// ============================================================
// FARBPALETTE
// ============================================================
const C = {
  bg:'#0d2b5e', bgMid:'#1a3f7a', card:'#ffffff', cardHell:'#f0f4ff',
  rand:'#d1daf0', akzent:'#2563eb', text:'#0d2b5e', textHell:'#6b7fa8',
  weiss:'#ffffff', grau:'#c8d3e8',
  warnung:'#dc2626', warnungBg:'#fef2f2', warnungRand:'#fca5a5',
  ok:'#16a34a', okBg:'#f0fdf4', okRand:'#86efac',
  info:'#0369a1', infoBg:'#f0f9ff', infoRand:'#7dd3fc',
};

// ============================================================
// UI-HILFSKOMPONENTEN
// ============================================================

function Auswahlgruppe({ optionen, aktiv, onChange, kompakt }) {
  return (
    <View style={styles.btnGruppe}>
      {optionen.map((opt, idx) => {
        const an = opt.wert === aktiv;
        return (
          <TouchableOpacity key={opt.wert}
            style={[styles.auswahlBtn, an && styles.auswahlBtnAktiv,
                    kompakt && styles.auswahlBtnKompakt,
                    idx < optionen.length - 1 && { marginRight: 6 }]}
            onPress={() => onChange(opt.wert)} activeOpacity={0.75}>
            <Text style={[styles.auswahlBtnText, an && styles.auswahlBtnTextAktiv,
                          kompakt && styles.auswahlBtnTextKompakt]}
                  numberOfLines={1}>{opt.label}</Text>
            {opt.sub ? <Text style={[styles.auswahlBtnSub, an && styles.auswahlBtnSubAktiv]}
                             numberOfLines={1}>{opt.sub}</Text> : null}
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

function Stepper({ wert, onChange, min = 1, max = 20, format }) {
  return (
    <View style={styles.stepper}>
      <TouchableOpacity style={[styles.stepBtn, wert <= min && styles.stepBtnOff]}
        onPress={() => wert > min && onChange(wert - 1)} activeOpacity={0.7}>
        <Text style={styles.stepBtnText}>−</Text>
      </TouchableOpacity>
      <View style={styles.stepWert}>
        <Text style={styles.stepWertZahl}>{format ? format(wert) : wert}</Text>
      </View>
      <TouchableOpacity style={[styles.stepBtn, wert >= max && styles.stepBtnOff]}
        onPress={() => wert < max && onChange(wert + 1)} activeOpacity={0.7}>
        <Text style={styles.stepBtnText}>+</Text>
      </TouchableOpacity>
    </View>
  );
}

function LiveBadge({ label, wert, warn }) {
  return (
    <View style={[styles.liveBadge, warn && styles.liveBadgeWarn]}>
      <Text style={[styles.liveBadgeText, warn && styles.liveBadgeTextWarn]}>{label} = {wert}</Text>
    </View>
  );
}

function FeldKopf({ label, badge }) {
  return (
    <View style={styles.feldKopf}>
      <Text style={styles.label}>{label}</Text>
      {badge}
    </View>
  );
}

function Trennlinie() { return <View style={styles.trennlinie} />; }

function FaktorZeile({ label, detail, wert }) {
  return (
    <View style={styles.faktorZeile}>
      <Text style={styles.faktorLabel}>{label}</Text>
      <View style={styles.faktorRechts}>
        {detail ? <Text style={styles.faktorDetail}>{detail}</Text> : null}
        <View style={styles.faktorBadge}><Text style={styles.faktorBadgeText}>{wert}</Text></View>
      </View>
    </View>
  );
}

// ============================================================
// HAUPTKOMPONENTE
// ============================================================

const TEMP_LUFT_OPT  = [25, 30, 35, 40, 45, 50];
const TEMP_BODEN_OPT = [10, 15, 20, 25, 30];

export default function App() {
  // ── Grundparameter
  const [stromstaerke,     setStromstaerke]     = useState('');
  const [laenge,           setLaenge]           = useState('');
  const [schaltungsart,    setSchaltungsart]    = useState('einphasig');
  const [cosPhiIdx,        setCosPhiIdx]        = useState(10); // 1.00 = index 10 (0.50…1.00 in 0.05)
  const [material,         setMaterial]         = useState('kupfer');
  const [verlegeart,       setVerlegeart]       = useState('unterputz');

  // ── Korrekturfaktoren
  const [anzahlSk,         setAnzahlSk]         = useState(1);
  const [anzahlLagen,      setAnzahlLagen]      = useState(1);
  const [temperatur,       setTemperatur]       = useState(30);
  const [betriebsart,      setBetriebsart]      = useState('s1');
  const [betriebsartDetail,setBetriebsartDetail]= useState('dauer');

  // ── Ergebnis
  const [ergebnis,         setErgebnis]         = useState(null);

  const istErdreich = verlegeart === 'erdreich';

  // cos φ als Zahl
  const cosPhi = parseFloat((0.50 + cosPhiIdx * 0.05).toFixed(2));
  const sinPhi = parseFloat(Math.sqrt(Math.max(0, 1 - cosPhi * cosPhi)).toFixed(4));

  // Live-Faktoren
  const lFH = fHaeufung(anzahlSk);
  const lFL = fLagen(anzahlLagen);
  const lFT = istErdreich ? fBoden(temperatur) : fLuft(temperatur);
  const lFB = fBetriebsart(betriebsart, betriebsartDetail);
  const lFG = lFH * lFL * lFT * lFB;

  const onVerlegeartChange = (v) => {
    setVerlegeart(v);
    // Temperaturvorwahl anpassen
    setTemperatur(v === 'erdreich' ? 20 : 30);
  };

  const onBetriebsartChange = (s) => {
    setBetriebsart(s);
    const defaults = { s1: 'dauer', s2: 't30', s3: 'ed40' };
    setBetriebsartDetail(defaults[s]);
  };

  const onBerechnen = () => {
    setErgebnis(berechne({
      stromstaerke, laenge, schaltungsart, cosPhi,
      material, verlegeart, anzahlSk, anzahlLagen,
      temperatur, betriebsart, betriebsartDetail,
    }));
  };

  const onReset = () => {
    setStromstaerke(''); setLaenge('');
    setSchaltungsart('einphasig'); setCosPhiIdx(10);
    setMaterial('kupfer'); setVerlegeart('unterputz');
    setAnzahlSk(1); setAnzahlLagen(1);
    setTemperatur(30); setBetriebsart('s1'); setBetriebsartDetail('dauer');
    setErgebnis(null);
  };

  return (
    <SafeAreaView style={styles.container}>
      <ExpoStatusBar style="light" backgroundColor={C.bg} />
      <KeyboardAvoidingView style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView style={styles.scroll}
          contentContainerStyle={styles.scrollInhalt}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}>

          {/* ── Kopfzeile ── */}
          <View style={styles.kopf}>
            <Text style={styles.kopfTitel}>Kabelquerschnitt-Rechner</Text>
            <Text style={styles.kopfSub}>nach DIN VDE 0298 · vollständig</Text>
          </View>

          {/* ════════════════════════════════════════
              KARTE 1 – GRUNDPARAMETER
          ════════════════════════════════════════ */}
          <View style={styles.karte}>
            <Text style={styles.karteTitel}>Grundparameter</Text>

            {/* Stromstärke */}
            <View style={styles.feld}>
              <Text style={styles.label}>Stromstärke</Text>
              <View style={styles.inputZeile}>
                <TextInput style={styles.input} value={stromstaerke}
                  onChangeText={setStromstaerke} keyboardType="decimal-pad"
                  placeholder="z.B. 16" placeholderTextColor={C.textHell} returnKeyType="next"/>
                <View style={styles.einheit}><Text style={styles.einheitText}>A</Text></View>
              </View>
            </View>

            {/* Leitungslänge */}
            <View style={styles.feld}>
              <Text style={styles.label}>Leitungslänge</Text>
              <View style={styles.inputZeile}>
                <TextInput style={styles.input} value={laenge}
                  onChangeText={setLaenge} keyboardType="decimal-pad"
                  placeholder="z.B. 25" placeholderTextColor={C.textHell} returnKeyType="done"/>
                <View style={styles.einheit}><Text style={styles.einheitText}>m</Text></View>
              </View>
            </View>

            {/* Schaltungsart */}
            <View style={styles.feld}>
              <Text style={styles.label}>Schaltungsart</Text>
              <Auswahlgruppe aktiv={schaltungsart} onChange={setSchaltungsart}
                optionen={[
                  { wert: 'einphasig',  label: 'Einphasig',  sub: '230 V L-N' },
                  { wert: 'dreiphasig', label: 'Dreiphasig', sub: '400 V L-L' },
                ]}/>
            </View>

            {/* cos φ */}
            <View style={styles.feld}>
              <FeldKopf label="Leistungsfaktor cos φ"
                badge={<LiveBadge label="sin φ" wert={sinPhi.toFixed(3)}
                         warn={cosPhi < 0.85} />}/>
              <Stepper wert={cosPhiIdx} onChange={setCosPhiIdx} min={0} max={10}
                format={(i) => `cos φ = ${(0.50 + i * 0.05).toFixed(2)}`}/>
              {cosPhi < 0.9 && (
                <Text style={styles.hinweisUnter}>
                  Reaktanzanteil X_L wird im Spannungsfall berücksichtigt.
                </Text>
              )}
            </View>

            {/* Material */}
            <View style={styles.feld}>
              <Text style={styles.label}>Leitermaterial</Text>
              <Auswahlgruppe aktiv={material} onChange={setMaterial}
                optionen={[
                  { wert: 'kupfer',    label: 'Kupfer (Cu)',    sub: 'κ = 56' },
                  { wert: 'aluminium', label: 'Aluminium (Al)', sub: 'κ = 34' },
                ]}/>
            </View>

            {/* Verlegeart */}
            <View style={[styles.feld, { marginBottom: 0 }]}>
              <Text style={styles.label}>Verlegeart</Text>
              <Auswahlgruppe aktiv={verlegeart} onChange={onVerlegeartChange}
                optionen={[
                  { wert: 'unterputz', label: 'Unterputz', sub: 'Typ B' },
                  { wert: 'aufputz',   label: 'Aufputz',   sub: 'Typ C' },
                  { wert: 'imRohr',    label: 'Im Rohr',   sub: 'Typ A' },
                  { wert: 'erdreich',  label: 'Erdreich',  sub: 'Typ D' },
                ]}/>
            </View>
          </View>

          {/* ════════════════════════════════════════
              KARTE 2 – KORREKTURFAKTOREN
          ════════════════════════════════════════ */}
          <View style={styles.karte}>
            <Text style={styles.karteTitel}>Korrekturfaktoren  ·  DIN VDE 0298-4</Text>

            {/* Häufung – Anzahl Stromkreise */}
            <View style={styles.feld}>
              <FeldKopf label="Häufung – Stromkreise (Tab. 17)"
                badge={<LiveBadge label="fᴴ" wert={lFH.toFixed(2)} warn={lFH < 0.7}/>}/>
              <Stepper wert={anzahlSk} onChange={setAnzahlSk} min={1} max={20}
                format={(n) => `${n} Stromkreis${n > 1 ? 'e' : ''}`}/>
              <Text style={styles.hinweisUnter}>
                {anzahlSk === 1 ? 'Einzeln verlegt – kein Häufungsabzug.' : 'Einlagige Anordnung, aneinanderliegend.'}
              </Text>
            </View>

            {/* Häufung – Lagenanzahl */}
            {anzahlSk > 1 && (
              <View style={styles.feld}>
                <FeldKopf label="Anzahl Lagen (Mehrlagig)"
                  badge={<LiveBadge label="fˡ" wert={lFL.toFixed(2)} warn={lFL < 0.8}/>}/>
                <Stepper wert={anzahlLagen} onChange={setAnzahlLagen} min={1} max={5}
                  format={(n) => `${n} Lage${n > 1 ? 'n' : ''}`}/>
                {anzahlLagen > 1 && (
                  <Text style={styles.hinweisUnter}>
                    Zusätzlicher Abminderungsfaktor für mehrlagige Bündelung.
                  </Text>
                )}
              </View>
            )}

            <Trennlinie />

            {/* Temperatur */}
            <View style={styles.feld}>
              <FeldKopf
                label={istErdreich ? 'Bodentemperatur (Tab. 14)' : 'Umgebungstemperatur (Tab. 15)'}
                badge={<LiveBadge label="fᵀ" wert={lFT.toFixed(2)} warn={lFT < 0.87}/>}/>
              <View style={styles.btnGruppe}>
                {(istErdreich ? TEMP_BODEN_OPT : TEMP_LUFT_OPT).map((t, idx, arr) => {
                  const an = t === temperatur;
                  return (
                    <TouchableOpacity key={t}
                      style={[styles.tempBtn, an && styles.tempBtnAktiv,
                              idx < arr.length - 1 && { marginRight: 5 }]}
                      onPress={() => setTemperatur(t)} activeOpacity={0.75}>
                      <Text style={[styles.tempBtnText, an && styles.tempBtnTextAktiv]}>{t}°</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
              <Text style={styles.hinweisUnter}>
                {istErdreich
                  ? 'Bodentemperatur in 0,7–1,0 m Tiefe. Bezug 20 °C.'
                  : 'Lufttemperatur am Verlegungsort. Bezug 30 °C.'}
              </Text>
            </View>

            <Trennlinie />

            {/* Betriebsart */}
            <View style={[styles.feld, { marginBottom: 0 }]}>
              <FeldKopf label="Betriebsart (Duty Cycle)"
                badge={<LiveBadge label="fᴮ" wert={lFB.toFixed(2)} warn={false}/>}/>

              {/* S1 / S2 / S3 */}
              <Auswahlgruppe aktiv={betriebsart} onChange={onBetriebsartChange}
                optionen={[
                  { wert: 's1', label: 'S1', sub: 'Dauerbetrieb' },
                  { wert: 's2', label: 'S2', sub: 'Kurzzeitbetrieb' },
                  { wert: 's3', label: 'S3', sub: 'Aussetzbetrieb' },
                ]}/>

              {/* S2-Detail */}
              {betriebsart === 's2' && (
                <View style={styles.subAuswahl}>
                  <Text style={styles.subLabel}>Einschaltdauer</Text>
                  <Auswahlgruppe aktiv={betriebsartDetail}
                    onChange={setBetriebsartDetail} kompakt
                    optionen={[
                      { wert: 't10', label: '10 min' },
                      { wert: 't30', label: '30 min' },
                      { wert: 't60', label: '60 min' },
                      { wert: 't90', label: '90 min' },
                    ]}/>
                </View>
              )}

              {/* S3-Detail */}
              {betriebsart === 's3' && (
                <View style={styles.subAuswahl}>
                  <Text style={styles.subLabel}>Einschaltdauer ED</Text>
                  <Auswahlgruppe aktiv={betriebsartDetail}
                    onChange={setBetriebsartDetail} kompakt
                    optionen={[
                      { wert: 'ed15', label: '15 %' },
                      { wert: 'ed25', label: '25 %' },
                      { wert: 'ed40', label: '40 %' },
                      { wert: 'ed60', label: '60 %' },
                    ]}/>
                </View>
              )}

              {betriebsart !== 's1' && (
                <Text style={styles.hinweisUnter}>
                  Nur für Motoren/Maschinen. Heiz- und Beleuchtungslasten stets S1.
                </Text>
              )}
            </View>
          </View>

          {/* ── Gesamtfaktor-Karte ── */}
          <View style={[styles.gesamtFaktorKarte,
                        lFG < 0.5 && styles.gesamtFaktorKarteWarn]}>
            <Text style={styles.gesamtFaktorLabel}>Gesamtkorrekturfaktor</Text>
            <Text style={styles.gesamtFaktorFormel}>
              {`fᴴ ${lFH.toFixed(2)} × fˡ ${lFL.toFixed(2)} × fᵀ ${lFT.toFixed(2)} × fᴮ ${lFB.toFixed(2)}`}
            </Text>
            <Text style={styles.gesamtFaktorWert}>
              = <Text style={[styles.gesamtFaktorHervor,
                              lFG < 0.5 && styles.gesamtFaktorHervorWarn]}>
                  {lFG.toFixed(3)}
                </Text>
            </Text>
            {lFG < 0.5 && (
              <Text style={styles.gesamtFaktorHinweis}>
                ⚠  Gesamtfaktor unter 0,5 – Querschnitt wird stark erhöht!
              </Text>
            )}
          </View>

          {/* ── Schaltflächen ── */}
          <TouchableOpacity style={styles.berechnBtn} onPress={onBerechnen} activeOpacity={0.85}>
            <Text style={styles.berechnBtnText}>Berechnen</Text>
          </TouchableOpacity>
          {ergebnis && (
            <TouchableOpacity style={styles.resetBtn} onPress={onReset} activeOpacity={0.75}>
              <Text style={styles.resetBtnText}>Zurücksetzen</Text>
            </TouchableOpacity>
          )}

          {/* ════════════════════════════════════════
              KARTE 3 – ERGEBNIS
          ════════════════════════════════════════ */}
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
                    <View style={styles.bannerWertZeile}>
                      <Text style={styles.bannerWert}>{ergebnis.querschnitt}</Text>
                      <Text style={styles.bannerEinheit}> mm²</Text>
                    </View>
                    <View style={styles.bannerBadgeZeile}>
                      <View style={styles.bannerBadge}>
                        <Text style={styles.bannerBadgeText}>
                          Nennstrom {ergebnis.iTabelle} A
                        </Text>
                      </View>
                      <View style={styles.bannerBadge}>
                        <Text style={styles.bannerBadgeText}>
                          Korr. max. {ergebnis.korrigKap.toFixed(1)} A
                        </Text>
                      </View>
                    </View>
                    {/* PE-Querschnitt */}
                    <View style={styles.peBadge}>
                      <Text style={styles.peBadgeText}>
                        PE-Leiter: {ergebnis.peQuerschnitt} mm²
                      </Text>
                      <Text style={styles.peBadgeSub}>(DIN VDE 0100-540)</Text>
                    </View>
                  </View>

                  {/* Korrekturfaktor-Aufschlüsselung */}
                  <View style={styles.faktorBox}>
                    <Text style={styles.faktorBoxTitel}>Angewendete Korrekturfaktoren</Text>
                    <FaktorZeile label="Häufung, einlagig  (Tab. 17)"
                      detail={anzahlSk === 1 ? 'Einzeln verlegt' : `${anzahlSk} Stromkreise`}
                      wert={`fᴴ = ${ergebnis.fH.toFixed(2)}`}/>
                    {anzahlSk > 1 && (
                      <>
                        <View style={styles.faktorTrenn}/>
                        <FaktorZeile label="Mehrlage"
                          detail={`${anzahlLagen} Lage${anzahlLagen > 1 ? 'n' : ''}`}
                          wert={`fˡ = ${ergebnis.fL.toFixed(2)}`}/>
                      </>
                    )}
                    <View style={styles.faktorTrenn}/>
                    <FaktorZeile
                      label={istErdreich ? 'Bodentemperatur (Tab. 14)' : 'Temperatur (Tab. 15)'}
                      detail={`${temperatur} °C`}
                      wert={`fᵀ = ${ergebnis.fT.toFixed(2)}`}/>
                    <View style={styles.faktorTrenn}/>
                    <FaktorZeile label="Betriebsart"
                      detail={betriebsart === 's1' ? 'S1 Dauer' :
                              betriebsart === 's2' ? `S2 ${betriebsartDetail.replace('t','')} min` :
                              `S3 ED ${betriebsartDetail.replace('ed','')} %`}
                      wert={`fᴮ = ${ergebnis.fB.toFixed(2)}`}/>
                    <View style={[styles.faktorTrenn, { marginBottom: 4 }]}/>
                    <FaktorZeile label="Gesamtfaktor"
                      detail={`Iₘᵉʳ = ${ergebnis.iErf.toFixed(1)} A`}
                      wert={`fᵍʳˢ = ${ergebnis.fG.toFixed(3)}`}/>
                  </View>

                  {/* Spannungsfall */}
                  <View style={[styles.sfBox,
                                ergebnis.sfWarnung ? styles.sfBoxWarn : styles.sfBoxOk]}>
                    <Text style={[styles.sfTitel,
                                  ergebnis.sfWarnung ? styles.sfTitelWarn : styles.sfTitelOk]}>
                      {ergebnis.sfWarnung ? '⚠  Spannungsfall – Warnung' : '✓  Spannungsfall – in Ordnung'}
                    </Text>
                    <Text style={[styles.sfWert,
                                  ergebnis.sfWarnung ? styles.sfWertWarn : styles.sfWertOk]}>
                      {ergebnis.sf.dUProzent.toFixed(2)} %
                    </Text>
                    <Text style={styles.sfDetail}>
                      ΔU = {ergebnis.sf.dUVolt.toFixed(2)} V  ·  Grenzwert 3,00 %
                    </Text>
                    {ergebnis.xSignifikant && (
                      <View style={styles.sfReaktanzZeile}>
                        <Text style={styles.sfReaktanzText}>
                          R-Anteil: {ergebnis.sf.rAnteil.toFixed(3)} mΩ/m  ·  X-Anteil: {ergebnis.sf.xAnteil.toFixed(3)} mΩ/m
                        </Text>
                      </View>
                    )}
                    {ergebnis.sfWarnung && (
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
              DIN VDE 0298-4 · PVC-Isolation 70 °C · Einlagige Häufung Tab. 17 ·
              Temperatur Tab. 14/15 · PE nach DIN VDE 0100-540 · cos φ + X_L im Spannungsfall{'\n'}
              Keine Haftung – Installationen sind von einer Elektrofachkraft zu prüfen.
            </Text>
          </View>

        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// ============================================================
// STILE
// ============================================================
const styles = StyleSheet.create({
  container:    { flex: 1, backgroundColor: C.bg },
  scroll:       { flex: 1 },
  scrollInhalt: { paddingBottom: 48 },

  kopf:     { paddingTop: 28, paddingBottom: 22, paddingHorizontal: 20, alignItems: 'center' },
  kopfTitel:{ fontSize: 24, fontWeight: '800', color: C.weiss, textAlign: 'center' },
  kopfSub:  { fontSize: 12, color: C.grau, marginTop: 5, letterSpacing: 1.1, textTransform: 'uppercase' },

  karte: {
    backgroundColor: C.card, marginHorizontal: 16, marginBottom: 12,
    borderRadius: 16, padding: 20,
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18, shadowRadius: 8, elevation: 6,
  },
  karteTitel: {
    fontSize: 14, fontWeight: '700', color: C.bg,
    marginBottom: 18, paddingBottom: 10,
    borderBottomWidth: 2, borderBottomColor: C.rand, letterSpacing: 0.2,
  },

  feld:       { marginBottom: 18 },
  feldKopf:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  label:      { fontSize: 12, fontWeight: '700', color: C.text, textTransform: 'uppercase', letterSpacing: 0.7 },

  inputZeile: { flexDirection: 'row', alignItems: 'center' },
  input: {
    flex: 1, backgroundColor: C.cardHell, borderWidth: 1.5, borderColor: C.rand,
    borderRadius: 12, paddingHorizontal: 16, paddingVertical: 15,
    fontSize: 20, fontWeight: '600', color: C.text,
  },
  einheit: {
    marginLeft: 10, backgroundColor: C.bg, borderRadius: 10,
    paddingHorizontal: 14, paddingVertical: 10, minWidth: 48, alignItems: 'center',
  },
  einheitText: { color: C.weiss, fontSize: 16, fontWeight: '700' },

  btnGruppe: { flexDirection: 'row' },
  auswahlBtn: {
    flex: 1, paddingVertical: 12, paddingHorizontal: 4,
    borderRadius: 12, borderWidth: 1.5, borderColor: C.rand,
    backgroundColor: C.cardHell, alignItems: 'center', justifyContent: 'center',
  },
  auswahlBtnAktiv:     { backgroundColor: C.bg, borderColor: C.bg },
  auswahlBtnKompakt:   { paddingVertical: 10 },
  auswahlBtnText:      { fontSize: 14, fontWeight: '700', color: C.text, textAlign: 'center' },
  auswahlBtnTextAktiv: { color: C.weiss },
  auswahlBtnTextKompakt:{ fontSize: 13 },
  auswahlBtnSub:       { fontSize: 11, color: C.textHell, marginTop: 2, textAlign: 'center' },
  auswahlBtnSubAktiv:  { color: 'rgba(255,255,255,0.65)' },

  stepper:      { flexDirection: 'row', alignItems: 'center' },
  stepBtn: {
    width: 52, height: 52, borderRadius: 12, backgroundColor: C.bg,
    alignItems: 'center', justifyContent: 'center',
  },
  stepBtnOff:   { opacity: 0.3 },
  stepBtnText:  { color: C.weiss, fontSize: 26, fontWeight: '300', lineHeight: 30 },
  stepWert: {
    flex: 1, alignItems: 'center', backgroundColor: C.cardHell,
    marginHorizontal: 10, borderRadius: 12, paddingVertical: 12,
    borderWidth: 1.5, borderColor: C.rand,
  },
  stepWertZahl: { fontSize: 18, fontWeight: '700', color: C.text },

  liveBadge: {
    backgroundColor: C.bgMid, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4,
  },
  liveBadgeWarn:     { backgroundColor: '#b91c1c' },
  liveBadgeText:     { color: C.weiss, fontSize: 13, fontWeight: '700' },
  liveBadgeTextWarn: { color: '#fecaca' },

  tempBtn: {
    flex: 1, paddingVertical: 12, borderRadius: 10,
    borderWidth: 1.5, borderColor: C.rand, backgroundColor: C.cardHell, alignItems: 'center',
  },
  tempBtnAktiv:     { backgroundColor: C.bg, borderColor: C.bg },
  tempBtnText:      { fontSize: 14, fontWeight: '600', color: C.text },
  tempBtnTextAktiv: { color: C.weiss },

  subAuswahl: { marginTop: 10 },
  subLabel: { fontSize: 11, fontWeight: '600', color: C.textHell, marginBottom: 6,
              textTransform: 'uppercase', letterSpacing: 0.5 },

  hinweisUnter: { fontSize: 12, color: C.textHell, marginTop: 7, lineHeight: 16 },
  trennlinie:   { height: 1.5, backgroundColor: C.rand, marginVertical: 16 },

  gesamtFaktorKarte: {
    marginHorizontal: 16, marginBottom: 12, backgroundColor: C.bgMid,
    borderRadius: 14, paddingVertical: 14, paddingHorizontal: 18,
  },
  gesamtFaktorKarteWarn: { backgroundColor: '#7f1d1d' },
  gesamtFaktorLabel:     { fontSize: 11, color: C.grau, fontWeight: '700',
                            textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 4 },
  gesamtFaktorFormel:    { fontSize: 13, color: 'rgba(255,255,255,0.7)', marginBottom: 2 },
  gesamtFaktorWert:      { fontSize: 20, color: C.weiss, fontWeight: '700' },
  gesamtFaktorHervor:    { fontSize: 26, color: '#60a5fa', fontWeight: '900' },
  gesamtFaktorHervorWarn:{ color: '#fca5a5' },
  gesamtFaktorHinweis:   { fontSize: 12, color: '#fbbf24', marginTop: 6, lineHeight: 17 },

  berechnBtn: {
    marginHorizontal: 16, marginBottom: 10, backgroundColor: C.akzent,
    borderRadius: 14, paddingVertical: 17, alignItems: 'center',
    shadowColor: C.akzent, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4, shadowRadius: 8, elevation: 6,
  },
  berechnBtnText: { color: C.weiss, fontSize: 18, fontWeight: '800', letterSpacing: 0.5 },
  resetBtn: {
    marginHorizontal: 16, marginBottom: 10, borderRadius: 14, paddingVertical: 13,
    alignItems: 'center', borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.25)',
  },
  resetBtnText: { color: 'rgba(255,255,255,0.55)', fontSize: 15, fontWeight: '600' },

  banner: {
    backgroundColor: C.bg, borderRadius: 12,
    paddingVertical: 22, paddingHorizontal: 16,
    alignItems: 'center', marginBottom: 14,
  },
  bannerLabel:     { color: C.grau, fontSize: 11, fontWeight: '600',
                     letterSpacing: 1, textTransform: 'uppercase', marginBottom: 6 },
  bannerWertZeile: { flexDirection: 'row', alignItems: 'flex-end' },
  bannerWert:      { color: C.weiss, fontSize: 64, fontWeight: '900', lineHeight: 68 },
  bannerEinheit:   { color: C.grau, fontSize: 24, fontWeight: '700', marginBottom: 10 },
  bannerBadgeZeile:{ flexDirection: 'row', marginTop: 10 },
  bannerBadge:     { backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 8,
                     paddingHorizontal: 12, paddingVertical: 5, marginHorizontal: 4 },
  bannerBadgeText: { color: C.weiss, fontSize: 12, fontWeight: '600' },
  peBadge: {
    marginTop: 12, backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: 10, paddingHorizontal: 16, paddingVertical: 8, alignItems: 'center',
  },
  peBadgeText: { color: '#93c5fd', fontSize: 15, fontWeight: '700' },
  peBadgeSub:  { color: 'rgba(255,255,255,0.4)', fontSize: 11, marginTop: 2 },

  faktorBox: {
    backgroundColor: C.cardHell, borderRadius: 12, padding: 14,
    marginBottom: 12, borderWidth: 1.5, borderColor: C.rand,
  },
  faktorBoxTitel: { fontSize: 11, fontWeight: '700', color: C.bgMid,
                    textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 10 },
  faktorZeile:    { flexDirection: 'row', justifyContent: 'space-between',
                    alignItems: 'center', paddingVertical: 5 },
  faktorLabel:    { fontSize: 13, color: C.text, fontWeight: '500', flex: 1 },
  faktorRechts:   { flexDirection: 'row', alignItems: 'center' },
  faktorDetail:   { fontSize: 11, color: C.textHell, marginRight: 8 },
  faktorBadge:    { backgroundColor: C.bgMid, borderRadius: 8,
                    paddingHorizontal: 10, paddingVertical: 4 },
  faktorBadgeText:{ color: C.weiss, fontSize: 12, fontWeight: '700' },
  faktorTrenn:    { height: 1, backgroundColor: C.rand, marginVertical: 2 },

  sfBox:          { borderRadius: 12, padding: 16, marginBottom: 12, borderWidth: 1.5 },
  sfBoxOk:        { backgroundColor: C.okBg, borderColor: C.okRand },
  sfBoxWarn:      { backgroundColor: C.warnungBg, borderColor: C.warnungRand },
  sfTitel:        { fontSize: 14, fontWeight: '700', marginBottom: 6 },
  sfTitelOk:      { color: C.ok },
  sfTitelWarn:    { color: C.warnung },
  sfWert:         { fontSize: 28, fontWeight: '800', marginBottom: 2 },
  sfWertOk:       { color: C.ok },
  sfWertWarn:     { color: C.warnung },
  sfDetail:       { fontSize: 12, color: C.textHell, marginBottom: 4 },
  sfReaktanzZeile:{ marginTop: 6, padding: 8, backgroundColor: C.infoBg,
                    borderRadius: 8, borderWidth: 1, borderColor: C.infoRand },
  sfReaktanzText: { fontSize: 12, color: C.info },
  sfHinweis:      { fontSize: 13, color: C.warnung, lineHeight: 19, marginTop: 8 },

  begrBox:   { backgroundColor: C.cardHell, borderRadius: 12, padding: 14 },
  begrTitel: { fontSize: 11, fontWeight: '700', color: C.bgMid,
               textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 6 },
  begrText:  { fontSize: 14, color: C.text, lineHeight: 21 },

  fehlerBox:  { backgroundColor: C.warnungBg, borderRadius: 12, padding: 18,
                borderWidth: 1.5, borderColor: C.warnungRand, alignItems: 'center' },
  fehlerIcon: { fontSize: 28, marginBottom: 8 },
  fehlerText: { color: C.warnung, fontSize: 15, fontWeight: '600',
                textAlign: 'center', lineHeight: 22 },

  fuss:     { marginHorizontal: 16, marginTop: 4, padding: 14,
              backgroundColor: 'rgba(255,255,255,0.07)', borderRadius: 12 },
  fussText: { color: 'rgba(255,255,255,0.4)', fontSize: 11, lineHeight: 16, textAlign: 'center' },
});
