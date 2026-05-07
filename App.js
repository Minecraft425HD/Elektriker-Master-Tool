import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { StatusBar as ExpoStatusBar } from 'expo-status-bar';

// ---------------------------------------------------------------------------
// DIN VDE 0298-4 Belastbarkeitstabellen
// Einphasig, PVC-Isolation, NYM-J / NYY-J
// Verlegeart A = im Rohr,  B = Unterputz,  C = Aufputz
// ---------------------------------------------------------------------------
const STROMDATEN = {
  kupfer: {
    querschnitte: [1.5, 2.5, 4, 6, 10, 16, 25, 35, 50, 70, 95, 120],
    unterputz:    [15.5, 19.5, 26, 34, 46, 61, 80, 99,  119, 151, 182, 210],
    aufputz:      [17.5, 24,   32, 40, 54, 73, 95, 119, 145, 185, 225, 260],
    imRohr:       [13,   17.5, 23, 30, 40, 54, 70, 86,  103, 130, 156, 179],
  },
  aluminium: {
    // Aluminium erst ab 16 mm² nach DIN VDE 0100-520 zulässig
    querschnitte: [16, 25, 35, 50, 70, 95, 120],
    unterputz:    [47, 62, 77, 92,  116, 139, 160],
    aufputz:      [59, 77, 96, 117, 149, 180, 208],
    imRohr:       [41, 53, 65, 78,   98, 118, 135],
  },
};

// Spezifische Leitfähigkeit κ [m/(Ω·mm²)]
const LEITFAEHIGKEIT = { kupfer: 56, aluminium: 34 };
const NENNSPANNUNG = 230; // V

// ---------------------------------------------------------------------------
// DIN VDE 0298-4 Tabelle 17 – Häufungsfaktoren
// (einlagige Anordnung, aneinanderliegend, alle Verlegearten)
// ---------------------------------------------------------------------------
const HAEUFUNG_TABELLE = [
  [1, 1.00], [2, 0.80], [3, 0.70], [4, 0.65], [5, 0.60],
  [6, 0.57], [7, 0.54], [8, 0.52], [9, 0.50], [12, 0.45],
  [16, 0.41], [20, 0.38],
];

// ---------------------------------------------------------------------------
// DIN VDE 0298-4 Tabelle 15 – Temperaturfaktoren
// PVC-Isolation (max. Leitertemperatur 70 °C), Bezugstemperatur 30 °C
// ---------------------------------------------------------------------------
const TEMPERATUR_TABELLE = [
  [10, 1.22], [15, 1.17], [20, 1.12], [25, 1.06], [30, 1.00],
  [35, 0.94], [40, 0.87], [45, 0.79], [50, 0.71], [55, 0.61], [60, 0.50],
];

// Lineare Interpolation zwischen Tabellenstützpunkten
function interpoliere(tabelle, wert) {
  if (wert <= tabelle[0][0]) return tabelle[0][1];
  if (wert >= tabelle[tabelle.length - 1][0]) return tabelle[tabelle.length - 1][1];
  for (let i = 0; i < tabelle.length - 1; i++) {
    const [x1, y1] = tabelle[i];
    const [x2, y2] = tabelle[i + 1];
    if (wert === x1) return y1;
    if (wert > x1 && wert < x2) return y1 + ((wert - x1) / (x2 - x1)) * (y2 - y1);
  }
  return tabelle[tabelle.length - 1][1];
}

function getHaeufungsFaktor(anzahl) {
  return interpoliere(HAEUFUNG_TABELLE, Math.max(1, Math.min(20, anzahl)));
}

function getTemperaturFaktor(temp) {
  return interpoliere(TEMPERATUR_TABELLE, Math.max(10, Math.min(60, temp)));
}

// ---------------------------------------------------------------------------
// Kernberechnung
// ---------------------------------------------------------------------------
function berechne(stromstaerke, laenge, material, verlegeart, anzahlSk, temperatur) {
  const I = parseFloat(String(stromstaerke).replace(',', '.'));
  const L = parseFloat(String(laenge).replace(',', '.'));

  if (isNaN(I) || I <= 0)
    return { fehler: 'Bitte eine gültige Stromstärke eingeben (z.B. 16).' };
  if (isNaN(L) || L <= 0)
    return { fehler: 'Bitte eine gültige Leitungslänge eingeben (z.B. 25).' };

  const daten      = STROMDATEN[material];
  const kapwerte   = daten[verlegeart];
  const qs         = daten.querschnitte;
  const kappa      = LEITFAEHIGKEIT[material];

  const fH = getHaeufungsFaktor(anzahlSk);
  const fT = getTemperaturFaktor(temperatur);
  const fG = fH * fT;

  // Benötigter Tabellenmindeststrom nach Korrekturfaktoren:
  // I_tab ≥ I_ist / f_gesamt
  const iErforderlich = I / fG;

  const minIdx = kapwerte.findIndex((imax) => imax >= iErforderlich);
  if (minIdx === -1) {
    return {
      fehler:
        `${I} A erfordert nach Korrekturfaktoren einen Tabellenstrom von ` +
        `${iErforderlich.toFixed(1)} A, der alle verfügbaren Querschnitte bis ` +
        `120 mm² übersteigt. Bitte Last, Häufung oder Temperatur prüfen.`,
    };
  }

  const minQ = qs[minIdx];

  // Spannungsfall ΔU% = (2 × L × I) / (κ × A × Un) × 100
  const spannungsfall = (A) => (2 * L * I) / (kappa * A * NENNSPANNUNG) * 100;

  // Ggf. Querschnitt wegen Spannungsfall erhöhen
  let empfIdx = minIdx;
  for (let i = minIdx; i < qs.length; i++) {
    empfIdx = i;
    if (spannungsfall(qs[i]) <= 3.0) break;
  }

  const empfQ       = qs[empfIdx];
  const finalSf     = spannungsfall(empfQ);
  const sfWarnung   = finalSf > 3.0;
  const sfErhoehen  = empfIdx > minIdx;

  // Tatsächliche korrigierte Belastbarkeit des empfohlenen Querschnitts
  const korrigierteKap = kapwerte[empfIdx] * fG;

  let begruendung =
    `Benötigter Tabellenstrom: ${iErforderlich.toFixed(1)} A ` +
    `(${I} A ÷ Gesamtfaktor ${fG.toFixed(3)}). ` +
    `Mindestquerschnitt nach Tabelle: ${minQ} mm² (${kapwerte[minIdx]} A Nennwert).`;

  if (sfErhoehen) {
    begruendung +=
      ` Wegen Spannungsfall auf ${empfQ} mm² erhöht.`;
  }

  if (sfWarnung) {
    begruendung +=
      ` Trotz 120 mm² liegt ΔU bei ${finalSf.toFixed(2)} % – ` +
      `Leitungslänge reduzieren oder Verteilerpunkt vorziehen.`;
  }

  return {
    querschnitt: empfQ,
    iTabelle:    kapwerte[empfIdx],
    korrigierteKap,
    spannungsfall: finalSf,
    sfWarnung,
    fH, fT, fG,
    iErforderlich,
    begruendung,
  };
}

// ---------------------------------------------------------------------------
// Farbpalette
// ---------------------------------------------------------------------------
const C = {
  bg:         '#0d2b5e',
  bgMid:      '#1a3f7a',
  card:       '#ffffff',
  cardHell:   '#f0f4ff',
  rand:       '#d1daf0',
  akzent:     '#2563eb',
  text:       '#0d2b5e',
  textHell:   '#6b7fa8',
  weiss:      '#ffffff',
  grau:       '#c8d3e8',
  warnung:    '#dc2626',
  warnungBg:  '#fef2f2',
  warnungRand:'#fca5a5',
  ok:         '#16a34a',
  okBg:       '#f0fdf4',
  okRand:     '#86efac',
};

// ---------------------------------------------------------------------------
// Hilfskomponente: Schaltgruppe (Toggle-Buttons)
// ---------------------------------------------------------------------------
function Auswahlgruppe({ optionen, aktiv, onChange }) {
  return (
    <View style={styles.btnGruppe}>
      {optionen.map((opt, idx) => {
        const an = opt.wert === aktiv;
        return (
          <TouchableOpacity
            key={opt.wert}
            style={[styles.auswahlBtn, an && styles.auswahlBtnAktiv,
                    idx < optionen.length - 1 && { marginRight: 8 }]}
            onPress={() => onChange(opt.wert)}
            activeOpacity={0.75}
          >
            <Text style={[styles.auswahlBtnText, an && styles.auswahlBtnTextAktiv]}
                  numberOfLines={1}>
              {opt.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

// ---------------------------------------------------------------------------
// Hilfskomponente: Stepper
// ---------------------------------------------------------------------------
function Stepper({ wert, onChange, min = 1, max = 20, einheit }) {
  return (
    <View style={styles.stepper}>
      <TouchableOpacity
        style={[styles.stepBtn, wert <= min && styles.stepBtnOff]}
        onPress={() => wert > min && onChange(wert - 1)}
        activeOpacity={0.7}
      >
        <Text style={styles.stepBtnText}>−</Text>
      </TouchableOpacity>
      <View style={styles.stepWert}>
        <Text style={styles.stepWertZahl}>{wert}</Text>
        {einheit ? <Text style={styles.stepWertEinheit}>{einheit}</Text> : null}
      </View>
      <TouchableOpacity
        style={[styles.stepBtn, wert >= max && styles.stepBtnOff]}
        onPress={() => wert < max && onChange(wert + 1)}
        activeOpacity={0.7}
      >
        <Text style={styles.stepBtnText}>+</Text>
      </TouchableOpacity>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Hilfskomponente: Faktor-Badge
// ---------------------------------------------------------------------------
function FaktorZeile({ label, faktor, detail }) {
  return (
    <View style={styles.faktorZeile}>
      <Text style={styles.faktorLabel}>{label}</Text>
      <View style={styles.faktorRechts}>
        {detail ? <Text style={styles.faktorDetail}>{detail}</Text> : null}
        <View style={styles.faktorBadge}>
          <Text style={styles.faktorBadgeText}>{faktor}</Text>
        </View>
      </View>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Hauptkomponente
// ---------------------------------------------------------------------------
const TEMP_OPTIONEN = [25, 30, 35, 40, 45, 50];

export default function App() {
  const [stromstaerke,  setStromstaerke]  = useState('');
  const [laenge,        setLaenge]        = useState('');
  const [material,      setMaterial]      = useState('kupfer');
  const [verlegeart,    setVerlegeart]    = useState('unterputz');
  const [anzahlSk,      setAnzahlSk]      = useState(1);
  const [temperatur,    setTemperatur]    = useState(30);
  const [ergebnis,      setErgebnis]      = useState(null);

  const onBerechnen = () => {
    setErgebnis(berechne(stromstaerke, laenge, material, verlegeart, anzahlSk, temperatur));
  };

  const onReset = () => {
    setStromstaerke(''); setLaenge('');
    setMaterial('kupfer'); setVerlegeart('unterputz');
    setAnzahlSk(1); setTemperatur(30); setErgebnis(null);
  };

  const fH = getHaeufungsFaktor(anzahlSk);
  const fT = getTemperaturFaktor(temperatur);
  const fG = fH * fT;

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
            <Text style={styles.kopfSub}>nach DIN VDE 0298</Text>
          </View>

          {/* ── Eingaben ── */}
          <View style={styles.karte}>
            <Text style={styles.karteTitel}>Eingabeparameter</Text>

            {/* Stromstärke */}
            <View style={styles.feld}>
              <Text style={styles.label}>Stromstärke</Text>
              <View style={styles.inputZeile}>
                <TextInput style={styles.input}
                  value={stromstaerke} onChangeText={setStromstaerke}
                  keyboardType="decimal-pad" placeholder="z.B. 16"
                  placeholderTextColor={C.textHell} returnKeyType="next" />
                <View style={styles.einheit}><Text style={styles.einheitText}>A</Text></View>
              </View>
            </View>

            {/* Leitungslänge */}
            <View style={styles.feld}>
              <Text style={styles.label}>Leitungslänge</Text>
              <View style={styles.inputZeile}>
                <TextInput style={styles.input}
                  value={laenge} onChangeText={setLaenge}
                  keyboardType="decimal-pad" placeholder="z.B. 25"
                  placeholderTextColor={C.textHell} returnKeyType="done" />
                <View style={styles.einheit}><Text style={styles.einheitText}>m</Text></View>
              </View>
            </View>

            {/* Material */}
            <View style={styles.feld}>
              <Text style={styles.label}>Leitermaterial</Text>
              <Auswahlgruppe
                optionen={[
                  { wert: 'kupfer',    label: 'Kupfer (Cu)' },
                  { wert: 'aluminium', label: 'Aluminium (Al)' },
                ]}
                aktiv={material} onChange={setMaterial} />
            </View>

            {/* Verlegeart */}
            <View style={styles.feld}>
              <Text style={styles.label}>Verlegeart</Text>
              <Auswahlgruppe
                optionen={[
                  { wert: 'unterputz', label: 'Unterputz' },
                  { wert: 'aufputz',   label: 'Aufputz' },
                  { wert: 'imRohr',    label: 'Im Rohr' },
                ]}
                aktiv={verlegeart} onChange={setVerlegeart} />
            </View>

            {/* Trennlinie */}
            <View style={styles.trennlinie} />

            {/* ── Korrekturfaktoren ── */}
            <Text style={styles.abschnittLabel}>Korrekturfaktoren (DIN VDE 0298-4)</Text>

            {/* Häufung */}
            <View style={styles.feld}>
              <View style={styles.labelZeile}>
                <Text style={styles.label}>Häufung – Anzahl Stromkreise</Text>
                <View style={styles.fBadgeKlein}>
                  <Text style={styles.fBadgeKleinText}>
                    f<Text style={styles.fTiefgestellt}>H</Text> = {fH.toFixed(2)}
                  </Text>
                </View>
              </View>
              <Stepper wert={anzahlSk} onChange={setAnzahlSk} min={1} max={20}
                       einheit={anzahlSk === 1 ? 'Stromkreis' : 'Stromkreise'} />
              {anzahlSk === 1 && (
                <Text style={styles.hinweisUnter}>
                  Einzeln verlegt – kein Häufungsabzug notwendig.
                </Text>
              )}
              {anzahlSk > 1 && (
                <Text style={styles.hinweisUnter}>
                  Einlagige Bündelung, aneinanderliegend (Tab. 17).
                </Text>
              )}
            </View>

            {/* Umgebungstemperatur */}
            <View style={[styles.feld, { marginBottom: 0 }]}>
              <View style={styles.labelZeile}>
                <Text style={styles.label}>Umgebungstemperatur</Text>
                <View style={styles.fBadgeKlein}>
                  <Text style={styles.fBadgeKleinText}>
                    f<Text style={styles.fTiefgestellt}>T</Text> = {fT.toFixed(2)}
                  </Text>
                </View>
              </View>
              <View style={styles.btnGruppe}>
                {TEMP_OPTIONEN.map((t, idx) => {
                  const an = t === temperatur;
                  return (
                    <TouchableOpacity key={t}
                      style={[styles.tempBtn, an && styles.tempBtnAktiv,
                              idx < TEMP_OPTIONEN.length - 1 && { marginRight: 6 }]}
                      onPress={() => setTemperatur(t)} activeOpacity={0.75}>
                      <Text style={[styles.tempBtnText, an && styles.tempBtnTextAktiv]}>
                        {t}°
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
              <Text style={styles.hinweisUnter}>
                Bezugstemperatur 30 °C (Normwert). PVC-Isolation (Tab. 15).
              </Text>
            </View>
          </View>

          {/* Gesamtfaktor-Anzeige */}
          {(fG < 1.0 || fG > 1.0) && (
            <View style={styles.gesamtFaktorKarte}>
              <Text style={styles.gesamtFaktorLabel}>Gesamtkorrekturfaktor</Text>
              <Text style={styles.gesamtFaktorWert}>
                f<Text style={{ fontSize: 13 }}>ges</Text> = {fH.toFixed(2)} × {fT.toFixed(2)} ={' '}
                <Text style={styles.gesamtFaktorHervor}>{fG.toFixed(3)}</Text>
              </Text>
              {fG < 0.5 && (
                <Text style={styles.gesamtFaktorWarnung}>
                  ⚠  Gesamtfaktor unter 0,5 – Querschnitt wird stark erhöht.
                </Text>
              )}
            </View>
          )}

          {/* ── Schaltflächen ── */}
          <TouchableOpacity style={styles.berechnBtn} onPress={onBerechnen} activeOpacity={0.85}>
            <Text style={styles.berechnBtnText}>Berechnen</Text>
          </TouchableOpacity>

          {ergebnis && (
            <TouchableOpacity style={styles.resetBtn} onPress={onReset} activeOpacity={0.75}>
              <Text style={styles.resetBtnText}>Zurücksetzen</Text>
            </TouchableOpacity>
          )}

          {/* ── Ergebnis ── */}
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
                          Korrigiert ≤ {ergebnis.korrigierteKap.toFixed(1)} A
                        </Text>
                      </View>
                    </View>
                  </View>

                  {/* Korrekturfaktor-Aufschlüsselung */}
                  <View style={styles.faktorBox}>
                    <Text style={styles.faktorBoxTitel}>Angewendete Korrekturfaktoren</Text>
                    <FaktorZeile
                      label="Häufung (Tab. 17)"
                      detail={anzahlSk === 1 ? 'Einzeln verlegt' : `${anzahlSk} Stromkreise`}
                      faktor={`fₕ = ${ergebnis.fH.toFixed(2)}`}
                    />
                    <View style={styles.faktorTrenn} />
                    <FaktorZeile
                      label="Temperatur (Tab. 15)"
                      detail={`${temperatur} °C Umgebung`}
                      faktor={`fᵀ = ${ergebnis.fT.toFixed(2)}`}
                    />
                    <View style={styles.faktorTrenn} />
                    <FaktorZeile
                      label="Gesamtfaktor"
                      detail={`${ergebnis.iErforderlich.toFixed(1)} A Tabellenbedarf`}
                      faktor={`fᵍ = ${ergebnis.fG.toFixed(3)}`}
                    />
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
                      {ergebnis.spannungsfall.toFixed(2)} %
                    </Text>
                    <Text style={styles.sfGrenz}>Grenzwert nach DIN VDE: 3,00 %</Text>
                    {ergebnis.sfWarnung && (
                      <Text style={styles.sfHinweis}>
                        Der Spannungsfall überschreitet 3 %. Leitungslänge reduzieren,
                        Querschnitt weiter erhöhen oder einen zusätzlichen Verteilerpunkt einplanen.
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
              DIN VDE 0298-4 · Einphasig 230 V · PVC-Isolation · cos φ = 1 · Einlagige Häufung{'\n'}
              Keine Haftung – Installationen sind von einer Elektrofachkraft zu prüfen.
            </Text>
          </View>

        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// ---------------------------------------------------------------------------
// Stile
// ---------------------------------------------------------------------------
const styles = StyleSheet.create({
  container:      { flex: 1, backgroundColor: C.bg },
  scroll:         { flex: 1 },
  scrollInhalt:   { paddingBottom: 48 },

  // Kopf
  kopf:     { paddingTop: 28, paddingBottom: 22, paddingHorizontal: 20, alignItems: 'center' },
  kopfTitel:{ fontSize: 25, fontWeight: '800', color: C.weiss, textAlign: 'center', letterSpacing: 0.2 },
  kopfSub:  { fontSize: 13, color: C.grau, marginTop: 5, letterSpacing: 1.2, textTransform: 'uppercase' },

  // Karte
  karte: {
    backgroundColor: C.card, marginHorizontal: 16, marginBottom: 12,
    borderRadius: 16, padding: 20,
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18, shadowRadius: 8, elevation: 6,
  },
  karteTitel: {
    fontSize: 15, fontWeight: '700', color: C.bg,
    marginBottom: 18, paddingBottom: 10,
    borderBottomWidth: 2, borderBottomColor: C.rand, letterSpacing: 0.2,
  },

  // Felder
  feld:       { marginBottom: 18 },
  labelZeile: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  label:      { fontSize: 13, fontWeight: '600', color: C.text, textTransform: 'uppercase', letterSpacing: 0.6 },
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

  // Auswahlgruppe
  btnGruppe:       { flexDirection: 'row' },
  auswahlBtn: {
    flex: 1, paddingVertical: 14, paddingHorizontal: 6,
    borderRadius: 12, borderWidth: 1.5, borderColor: C.rand,
    backgroundColor: C.cardHell, alignItems: 'center', justifyContent: 'center',
  },
  auswahlBtnAktiv: { backgroundColor: C.bg, borderColor: C.bg },
  auswahlBtnText:  { fontSize: 14, fontWeight: '600', color: C.text, textAlign: 'center' },
  auswahlBtnTextAktiv: { color: C.weiss },

  // Trennlinie & Abschnittsüberschrift
  trennlinie:    { height: 1.5, backgroundColor: C.rand, marginVertical: 18 },
  abschnittLabel:{ fontSize: 12, fontWeight: '700', color: C.bgMid, textTransform: 'uppercase',
                   letterSpacing: 0.8, marginBottom: 16 },

  // Faktor-Badge neben dem Label
  fBadgeKlein: {
    backgroundColor: C.bgMid, borderRadius: 8,
    paddingHorizontal: 10, paddingVertical: 4,
  },
  fBadgeKleinText: { color: C.weiss, fontSize: 13, fontWeight: '700' },
  fTiefgestellt:   { fontSize: 10 },

  // Stepper
  stepper:     { flexDirection: 'row', alignItems: 'center' },
  stepBtn: {
    width: 52, height: 52, borderRadius: 12, backgroundColor: C.bg,
    alignItems: 'center', justifyContent: 'center',
  },
  stepBtnOff:  { opacity: 0.35 },
  stepBtnText: { color: C.weiss, fontSize: 26, fontWeight: '300', lineHeight: 30 },
  stepWert: {
    flex: 1, alignItems: 'center', backgroundColor: C.cardHell,
    marginHorizontal: 10, borderRadius: 12, paddingVertical: 10,
    borderWidth: 1.5, borderColor: C.rand,
  },
  stepWertZahl:    { fontSize: 26, fontWeight: '800', color: C.text },
  stepWertEinheit: { fontSize: 12, color: C.textHell, marginTop: 1 },

  // Temperatur-Buttons
  tempBtn: {
    flex: 1, paddingVertical: 12, borderRadius: 10,
    borderWidth: 1.5, borderColor: C.rand, backgroundColor: C.cardHell,
    alignItems: 'center',
  },
  tempBtnAktiv:     { backgroundColor: C.bg, borderColor: C.bg },
  tempBtnText:      { fontSize: 14, fontWeight: '600', color: C.text },
  tempBtnTextAktiv: { color: C.weiss },

  hinweisUnter: { fontSize: 12, color: C.textHell, marginTop: 7, lineHeight: 16 },

  // Gesamtfaktor-Karte
  gesamtFaktorKarte: {
    marginHorizontal: 16, marginBottom: 12, backgroundColor: C.bgMid,
    borderRadius: 14, paddingVertical: 14, paddingHorizontal: 18,
  },
  gesamtFaktorLabel:   { fontSize: 11, color: C.grau, fontWeight: '600',
                          textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 4 },
  gesamtFaktorWert:    { fontSize: 17, color: C.weiss, fontWeight: '700' },
  gesamtFaktorHervor:  { fontSize: 22, color: '#60a5fa', fontWeight: '900' },
  gesamtFaktorWarnung: { fontSize: 12, color: '#fbbf24', marginTop: 6, lineHeight: 17 },

  // Schaltflächen
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

  // Ergebnis-Banner
  banner: {
    backgroundColor: C.bg, borderRadius: 12, paddingVertical: 22,
    paddingHorizontal: 16, alignItems: 'center', marginBottom: 14,
  },
  bannerLabel:     { color: C.grau, fontSize: 12, fontWeight: '600',
                     letterSpacing: 1, textTransform: 'uppercase', marginBottom: 6 },
  bannerWertZeile: { flexDirection: 'row', alignItems: 'flex-end' },
  bannerWert:      { color: C.weiss, fontSize: 64, fontWeight: '900', lineHeight: 68 },
  bannerEinheit:   { color: C.grau, fontSize: 24, fontWeight: '700', marginBottom: 10 },
  bannerBadgeZeile:{ flexDirection: 'row', marginTop: 10 },
  bannerBadge:     { backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 8,
                     paddingHorizontal: 12, paddingVertical: 5, marginHorizontal: 4 },
  bannerBadgeText: { color: C.weiss, fontSize: 13, fontWeight: '600' },

  // Korrekturfaktor-Aufschlüsselung
  faktorBox: {
    backgroundColor: C.cardHell, borderRadius: 12, padding: 14,
    marginBottom: 12, borderWidth: 1.5, borderColor: C.rand,
  },
  faktorBoxTitel:  { fontSize: 11, fontWeight: '700', color: C.bgMid,
                     textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 10 },
  faktorZeile:     { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
                     paddingVertical: 6 },
  faktorLabel:     { fontSize: 14, color: C.text, fontWeight: '500', flex: 1 },
  faktorRechts:    { flexDirection: 'row', alignItems: 'center' },
  faktorDetail:    { fontSize: 12, color: C.textHell, marginRight: 8 },
  faktorBadge:     { backgroundColor: C.bgMid, borderRadius: 8,
                     paddingHorizontal: 10, paddingVertical: 4 },
  faktorBadgeText: { color: C.weiss, fontSize: 13, fontWeight: '700' },
  faktorTrenn:     { height: 1, backgroundColor: C.rand, marginVertical: 2 },

  // Spannungsfall
  sfBox:      { borderRadius: 12, padding: 16, marginBottom: 12, borderWidth: 1.5 },
  sfBoxOk:    { backgroundColor: C.okBg,      borderColor: C.okRand },
  sfBoxWarn:  { backgroundColor: C.warnungBg, borderColor: C.warnungRand },
  sfTitel:    { fontSize: 14, fontWeight: '700', marginBottom: 6 },
  sfTitelOk:  { color: C.ok },
  sfTitelWarn:{ color: C.warnung },
  sfWert:     { fontSize: 28, fontWeight: '800', marginBottom: 2 },
  sfWertOk:   { color: C.ok },
  sfWertWarn: { color: C.warnung },
  sfGrenz:    { fontSize: 12, color: C.textHell, marginBottom: 4 },
  sfHinweis:  { fontSize: 13, color: C.warnung, lineHeight: 19, marginTop: 8 },

  // Begründung
  begrBox:   { backgroundColor: C.cardHell, borderRadius: 12, padding: 14 },
  begrTitel: { fontSize: 11, fontWeight: '700', color: C.bgMid,
               textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 6 },
  begrText:  { fontSize: 14, color: C.text, lineHeight: 21 },

  // Fehler
  fehlerBox:  { backgroundColor: C.warnungBg, borderRadius: 12, padding: 18,
                borderWidth: 1.5, borderColor: C.warnungRand, alignItems: 'center' },
  fehlerIcon: { fontSize: 28, marginBottom: 8 },
  fehlerText: { color: C.warnung, fontSize: 15, fontWeight: '600',
                textAlign: 'center', lineHeight: 22 },

  // Fußnote
  fuss:     { marginHorizontal: 16, marginTop: 4, padding: 14,
              backgroundColor: 'rgba(255,255,255,0.07)', borderRadius: 12 },
  fussText: { color: 'rgba(255,255,255,0.4)', fontSize: 11, lineHeight: 16, textAlign: 'center' },
});
