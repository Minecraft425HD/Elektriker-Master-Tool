import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { StatusBar as ExpoStatusBar } from 'expo-status-bar';

// ---------------------------------------------------------------------------
// DIN VDE 0298-4 Belastbarkeitstabellen (einphasig, PVC-isolierte Leitungen)
// Verlegeart A = im Rohr (in Wärmedämmung), B = Unterputz, C = Aufputz
// ---------------------------------------------------------------------------
const STROMDATEN = {
  kupfer: {
    querschnitte: [1.5, 2.5, 4, 6, 10, 16, 25, 35, 50, 70, 95, 120],
    unterputz:    [15.5, 19.5, 26, 34, 46, 61, 80, 99, 119, 151, 182, 210],
    aufputz:      [17.5, 24,   32, 40, 54, 73, 95, 119, 145, 185, 225, 260],
    imRohr:       [13,   17.5, 23, 30, 40, 54, 70, 86,  103, 130, 156, 179],
  },
  aluminium: {
    // Aluminium erst ab 16 mm² zulässig (DIN VDE 0100-520)
    querschnitte: [16, 25, 35, 50, 70, 95, 120],
    unterputz:    [47, 62, 77, 92, 116, 139, 160],
    aufputz:      [59, 77, 96, 117, 149, 180, 208],
    imRohr:       [41, 53, 65, 78,  98, 118, 135],
  },
};

// Spezifische Leitfähigkeit κ in m/(Ω·mm²)
const LEITFAEHIGKEIT = { kupfer: 56, aluminium: 34 };
const NENNSPANNUNG = 230; // Volt

// ---------------------------------------------------------------------------
// Berechnungslogik
// ---------------------------------------------------------------------------
function berechneKabelquerschnitt(stromstaerke, laenge, material, verlegeart) {
  const I = parseFloat(stromstaerke.replace(',', '.'));
  const L = parseFloat(laenge.replace(',', '.'));

  if (isNaN(I) || I <= 0)
    return { fehler: 'Bitte eine gültige Stromstärke eingeben (z.B. 16).' };
  if (isNaN(L) || L <= 0)
    return { fehler: 'Bitte eine gültige Leitungslänge eingeben (z.B. 25).' };

  const daten = STROMDATEN[material];
  const kapazitaeten = daten[verlegeart];
  const querschnitte = daten.querschnitte;
  const kappa = LEITFAEHIGKEIT[material];

  // ΔU% = (2 × L × I) / (κ × A × Un) × 100
  const spannungsfall = (A) =>
    (2 * L * I) / (kappa * A * NENNSPANNUNG) * 100;

  // 1. Mindestquerschnitt nach Strombelastbarkeit
  const minIndexStrom = kapazitaeten.findIndex((imax) => imax >= I);
  if (minIndexStrom === -1) {
    return {
      fehler: `${I} A übersteigt die Kapazität aller verfügbaren Querschnitte bis 120 mm². Bitte Lastplanung prüfen.`,
    };
  }

  const minQ = querschnitte[minIndexStrom];

  // 2. Querschnitt ggf. wegen Spannungsfall erhöhen
  let empfohlenIndex = minIndexStrom;
  for (let i = minIndexStrom; i < querschnitte.length; i++) {
    empfohlenIndex = i;
    if (spannungsfall(querschnitte[i]) <= 3.0) break;
  }

  const empfohlenQ = querschnitte[empfohlenIndex];
  const finalSf = spannungsfall(empfohlenQ);
  const warnungSpannungsfall = finalSf > 3.0;
  const wurdeSfErhoehen = empfohlenIndex > minIndexStrom;

  let begruendung =
    `Für ${I} A bei gewählter Verlegeart ist ${minQ} mm² der Mindestquerschnitt` +
    ` (Belastbarkeit ${kapazitaeten[minIndexStrom]} A nach DIN VDE 0298-4).`;

  if (wurdeSfErhoehen) {
    begruendung +=
      ` Der Querschnitt wurde auf ${empfohlenQ} mm² erhöht, um den Spannungsfall zu minimieren.`;
  }

  if (warnungSpannungsfall) {
    begruendung +=
      ` Trotz maximalem Querschnitt (120 mm²) liegt der Spannungsfall bei ${finalSf.toFixed(2)} % – bitte Leitungslänge oder Abzweigpunkte prüfen.`;
  }

  return {
    querschnitt: empfohlenQ,
    maxStrom: kapazitaeten[empfohlenIndex],
    spannungsfall: finalSf,
    warnungSpannungsfall,
    begruendung,
  };
}

// ---------------------------------------------------------------------------
// Farbpalette
// ---------------------------------------------------------------------------
const C = {
  bg:           '#0d2b5e',
  bgMid:        '#1a3f7a',
  card:         '#ffffff',
  cardHell:     '#f0f4ff',
  rand:         '#d1daf0',
  akzent:       '#2563eb',
  akzentHell:   '#3b82f6',
  text:         '#0d2b5e',
  textHell:     '#6b7fa8',
  weiss:        '#ffffff',
  grau:         '#c8d3e8',
  warnung:      '#dc2626',
  warnungBg:    '#fef2f2',
  warnungRand:  '#fca5a5',
  ok:           '#16a34a',
  okBg:         '#f0fdf4',
  okRand:       '#86efac',
};

// ---------------------------------------------------------------------------
// Hilfskomponente: Auswahlgruppe
// ---------------------------------------------------------------------------
function Auswahlgruppe({ optionen, aktiv, onChange }) {
  return (
    <View style={styles.buttonGruppe}>
      {optionen.map((opt, idx) => {
        const istAktiv = opt.wert === aktiv;
        return (
          <TouchableOpacity
            key={opt.wert}
            style={[
              styles.auswahlBtn,
              istAktiv && styles.auswahlBtnAktiv,
              idx < optionen.length - 1 && { marginRight: 8 },
            ]}
            onPress={() => onChange(opt.wert)}
            activeOpacity={0.75}
          >
            <Text
              style={[styles.auswahlBtnText, istAktiv && styles.auswahlBtnTextAktiv]}
              numberOfLines={1}
            >
              {opt.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

// ---------------------------------------------------------------------------
// Hauptkomponente
// ---------------------------------------------------------------------------
export default function App() {
  const [stromstaerke, setStromstaerke] = useState('');
  const [laenge, setLaenge] = useState('');
  const [material, setMaterial] = useState('kupfer');
  const [verlegeart, setVerlegeart] = useState('unterputz');
  const [ergebnis, setErgebnis] = useState(null);
  const [berechnetMit, setBerechnetMit] = useState(null);

  const berechnen = () => {
    const res = berechneKabelquerschnitt(stromstaerke, laenge, material, verlegeart);
    setErgebnis(res);
    if (!res.fehler) {
      setBerechnetMit({ stromstaerke, laenge, material, verlegeart });
    }
  };

  const zuruecksetzen = () => {
    setStromstaerke('');
    setLaenge('');
    setMaterial('kupfer');
    setVerlegeart('unterputz');
    setErgebnis(null);
    setBerechnetMit(null);
  };

  const MATERIAL_OPTIONEN = [
    { wert: 'kupfer',    label: 'Kupfer (Cu)' },
    { wert: 'aluminium', label: 'Aluminium (Al)' },
  ];

  const VERLEGEART_OPTIONEN = [
    { wert: 'unterputz', label: 'Unterputz' },
    { wert: 'aufputz',   label: 'Aufputz' },
    { wert: 'imRohr',    label: 'Im Rohr' },
  ];

  return (
    <SafeAreaView style={styles.container}>
      <ExpoStatusBar style="light" backgroundColor={C.bg} />
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollInhalt}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* ── Kopfzeile ── */}
          <View style={styles.kopfzeile}>
            <Text style={styles.kopfTitel}>Kabelquerschnitt-Rechner</Text>
            <Text style={styles.kopfUntertitel}>nach DIN VDE 0298</Text>
          </View>

          {/* ── Eingabekarte ── */}
          <View style={styles.karte}>
            <Text style={styles.kartenTitel}>Eingabeparameter</Text>

            {/* Stromstärke */}
            <View style={styles.feldGruppe}>
              <Text style={styles.feldLabel}>Stromstärke</Text>
              <View style={styles.inputZeile}>
                <TextInput
                  style={styles.input}
                  value={stromstaerke}
                  onChangeText={setStromstaerke}
                  keyboardType="decimal-pad"
                  placeholder="z.B. 16"
                  placeholderTextColor={C.textHell}
                  returnKeyType="next"
                />
                <View style={styles.einheitBadge}>
                  <Text style={styles.einheitText}>A</Text>
                </View>
              </View>
            </View>

            {/* Leitungslänge */}
            <View style={styles.feldGruppe}>
              <Text style={styles.feldLabel}>Leitungslänge</Text>
              <View style={styles.inputZeile}>
                <TextInput
                  style={styles.input}
                  value={laenge}
                  onChangeText={setLaenge}
                  keyboardType="decimal-pad"
                  placeholder="z.B. 25"
                  placeholderTextColor={C.textHell}
                  returnKeyType="done"
                />
                <View style={styles.einheitBadge}>
                  <Text style={styles.einheitText}>m</Text>
                </View>
              </View>
            </View>

            {/* Material */}
            <View style={styles.feldGruppe}>
              <Text style={styles.feldLabel}>Leitermaterial</Text>
              <Auswahlgruppe
                optionen={MATERIAL_OPTIONEN}
                aktiv={material}
                onChange={setMaterial}
              />
            </View>

            {/* Verlegeart */}
            <View style={[styles.feldGruppe, { marginBottom: 0 }]}>
              <Text style={styles.feldLabel}>Verlegeart</Text>
              <Auswahlgruppe
                optionen={VERLEGEART_OPTIONEN}
                aktiv={verlegeart}
                onChange={setVerlegeart}
              />
            </View>
          </View>

          {/* ── Schaltflächen ── */}
          <TouchableOpacity
            style={styles.berechnungsBtn}
            onPress={berechnen}
            activeOpacity={0.85}
          >
            <Text style={styles.berechnungsBtnText}>Berechnen</Text>
          </TouchableOpacity>

          {ergebnis && (
            <TouchableOpacity
              style={styles.resetBtn}
              onPress={zuruecksetzen}
              activeOpacity={0.75}
            >
              <Text style={styles.resetBtnText}>Zurücksetzen</Text>
            </TouchableOpacity>
          )}

          {/* ── Ergebniskarte ── */}
          {ergebnis && (
            <View style={styles.karte}>
              <Text style={styles.kartenTitel}>Ergebnis</Text>

              {ergebnis.fehler ? (
                <View style={styles.fehlerBox}>
                  <Text style={styles.fehlerIcon}>⚠</Text>
                  <Text style={styles.fehlerText}>{ergebnis.fehler}</Text>
                </View>
              ) : (
                <>
                  {/* Hauptergebnis-Banner */}
                  <View style={styles.ergebnisBanner}>
                    <Text style={styles.ergebnisLabel}>Empfohlener Querschnitt</Text>
                    <View style={styles.ergebnisWertZeile}>
                      <Text style={styles.ergebnisWert}>{ergebnis.querschnitt}</Text>
                      <Text style={styles.ergebnisEinheit}> mm²</Text>
                    </View>
                    <View style={styles.ergebnisBadgeZeile}>
                      <View style={styles.ergebnisBadge}>
                        <Text style={styles.ergebnisBadgeText}>
                          max. {ergebnis.maxStrom} A
                        </Text>
                      </View>
                      <View style={styles.ergebnisBadge}>
                        <Text style={styles.ergebnisBadgeText}>
                          {berechnetMit?.material === 'kupfer' ? 'Kupfer' : 'Aluminium'}
                        </Text>
                      </View>
                    </View>
                  </View>

                  {/* Spannungsfall */}
                  <View
                    style={[
                      styles.sfBox,
                      ergebnis.warnungSpannungsfall ? styles.sfBoxWarnung : styles.sfBoxOk,
                    ]}
                  >
                    <View style={styles.sfKopfzeile}>
                      <Text
                        style={[
                          styles.sfTitel,
                          ergebnis.warnungSpannungsfall ? styles.sfTitelWarnung : styles.sfTitelOk,
                        ]}
                      >
                        {ergebnis.warnungSpannungsfall
                          ? '⚠  Spannungsfall – Warnung'
                          : '✓  Spannungsfall – in Ordnung'}
                      </Text>
                    </View>
                    <Text
                      style={[
                        styles.sfWert,
                        ergebnis.warnungSpannungsfall ? styles.sfWertWarnung : styles.sfWertOk,
                      ]}
                    >
                      {ergebnis.spannungsfall.toFixed(2)} %
                    </Text>
                    <Text style={styles.sfGrenzwert}>Grenzwert: 3,00 %</Text>
                    {ergebnis.warnungSpannungsfall && (
                      <Text style={styles.sfHinweis}>
                        Der Spannungsfall überschreitet den nach DIN VDE 0298 zulässigen Grenzwert von 3 %. Bitte einen größeren Querschnitt wählen, die Leitungslänge reduzieren oder einen weiteren Verteilerpunkt einplanen.
                      </Text>
                    )}
                  </View>

                  {/* Begründung */}
                  <View style={styles.begruendungBox}>
                    <Text style={styles.begruendungTitel}>Begründung</Text>
                    <Text style={styles.begruendungText}>{ergebnis.begruendung}</Text>
                  </View>
                </>
              )}
            </View>
          )}

          {/* ── Fußnote ── */}
          <View style={styles.fussnote}>
            <Text style={styles.fussnoteText}>
              Berechnung nach DIN VDE 0298-4 für einphasige 230-V-Stromkreise mit
              PVC-isolierten Leitungen (NYM-J / NYY-J). Cos φ = 1 angenommen.{'\n'}
              Keine Haftung – alle Installationen sind von einer Elektrofachkraft zu prüfen.
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
  container: {
    flex: 1,
    backgroundColor: C.bg,
  },
  scroll: {
    flex: 1,
  },
  scrollInhalt: {
    paddingBottom: 48,
  },

  // Kopfzeile
  kopfzeile: {
    paddingTop: 28,
    paddingBottom: 24,
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  kopfTitel: {
    fontSize: 26,
    fontWeight: '800',
    color: C.weiss,
    textAlign: 'center',
    letterSpacing: 0.3,
  },
  kopfUntertitel: {
    fontSize: 13,
    color: C.grau,
    marginTop: 5,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },

  // Karte
  karte: {
    backgroundColor: C.card,
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18,
    shadowRadius: 8,
    elevation: 6,
  },
  kartenTitel: {
    fontSize: 15,
    fontWeight: '700',
    color: C.bg,
    marginBottom: 18,
    paddingBottom: 10,
    borderBottomWidth: 2,
    borderBottomColor: C.rand,
    letterSpacing: 0.2,
  },

  // Eingabefelder
  feldGruppe: {
    marginBottom: 18,
  },
  feldLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: C.text,
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  inputZeile: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  input: {
    flex: 1,
    backgroundColor: C.cardHell,
    borderWidth: 1.5,
    borderColor: C.rand,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 15,
    fontSize: 20,
    fontWeight: '600',
    color: C.text,
  },
  einheitBadge: {
    marginLeft: 10,
    backgroundColor: C.bg,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    minWidth: 48,
    alignItems: 'center',
  },
  einheitText: {
    color: C.weiss,
    fontSize: 16,
    fontWeight: '700',
  },

  // Auswahlgruppe
  buttonGruppe: {
    flexDirection: 'row',
  },
  auswahlBtn: {
    flex: 1,
    paddingVertical: 14,
    paddingHorizontal: 6,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: C.rand,
    backgroundColor: C.cardHell,
    alignItems: 'center',
    justifyContent: 'center',
  },
  auswahlBtnAktiv: {
    backgroundColor: C.bg,
    borderColor: C.bg,
  },
  auswahlBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: C.text,
    textAlign: 'center',
  },
  auswahlBtnTextAktiv: {
    color: C.weiss,
  },

  // Schaltflächen
  berechnungsBtn: {
    marginHorizontal: 16,
    marginBottom: 10,
    backgroundColor: C.akzent,
    borderRadius: 14,
    paddingVertical: 17,
    alignItems: 'center',
    shadowColor: C.akzent,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 6,
  },
  berechnungsBtnText: {
    color: C.weiss,
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  resetBtn: {
    marginHorizontal: 16,
    marginBottom: 10,
    borderRadius: 14,
    paddingVertical: 13,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.25)',
  },
  resetBtnText: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 15,
    fontWeight: '600',
  },

  // Ergebnis-Banner
  ergebnisBanner: {
    backgroundColor: C.bg,
    borderRadius: 12,
    paddingVertical: 22,
    paddingHorizontal: 16,
    alignItems: 'center',
    marginBottom: 14,
  },
  ergebnisLabel: {
    color: C.grau,
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  ergebnisWertZeile: {
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
  ergebnisWert: {
    color: C.weiss,
    fontSize: 64,
    fontWeight: '900',
    lineHeight: 68,
  },
  ergebnisEinheit: {
    color: C.grau,
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 10,
  },
  ergebnisBadgeZeile: {
    flexDirection: 'row',
    marginTop: 10,
  },
  ergebnisBadge: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 5,
    marginHorizontal: 4,
  },
  ergebnisBadgeText: {
    color: C.weiss,
    fontSize: 13,
    fontWeight: '600',
  },

  // Spannungsfall-Box
  sfBox: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1.5,
  },
  sfBoxOk: {
    backgroundColor: C.okBg,
    borderColor: C.okRand,
  },
  sfBoxWarnung: {
    backgroundColor: C.warnungBg,
    borderColor: C.warnungRand,
  },
  sfKopfzeile: {
    marginBottom: 6,
  },
  sfTitel: {
    fontSize: 14,
    fontWeight: '700',
  },
  sfTitelOk:      { color: C.ok },
  sfTitelWarnung: { color: C.warnung },
  sfWert: {
    fontSize: 28,
    fontWeight: '800',
    marginBottom: 2,
  },
  sfWertOk:      { color: C.ok },
  sfWertWarnung: { color: C.warnung },
  sfGrenzwert: {
    fontSize: 12,
    color: C.textHell,
    marginBottom: 4,
  },
  sfHinweis: {
    fontSize: 13,
    color: C.warnung,
    lineHeight: 19,
    marginTop: 8,
  },

  // Begründung
  begruendungBox: {
    backgroundColor: C.cardHell,
    borderRadius: 12,
    padding: 14,
  },
  begruendungTitel: {
    fontSize: 11,
    fontWeight: '700',
    color: C.bgMid,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 6,
  },
  begruendungText: {
    fontSize: 14,
    color: C.text,
    lineHeight: 21,
  },

  // Fehler
  fehlerBox: {
    backgroundColor: C.warnungBg,
    borderRadius: 12,
    padding: 18,
    borderWidth: 1.5,
    borderColor: C.warnungRand,
    alignItems: 'center',
  },
  fehlerIcon: {
    fontSize: 28,
    marginBottom: 8,
  },
  fehlerText: {
    color: C.warnung,
    fontSize: 15,
    fontWeight: '600',
    textAlign: 'center',
    lineHeight: 22,
  },

  // Fußnote
  fussnote: {
    marginHorizontal: 16,
    marginTop: 4,
    padding: 14,
    backgroundColor: 'rgba(255,255,255,0.07)',
    borderRadius: 12,
  },
  fussnoteText: {
    color: 'rgba(255,255,255,0.45)',
    fontSize: 11,
    lineHeight: 16,
    textAlign: 'center',
  },
});
