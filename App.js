import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, ScrollView,
  StyleSheet, SafeAreaView, KeyboardAvoidingView, Platform,
} from 'react-native';
import { StatusBar as ExpoStatusBar } from 'expo-status-bar';

// ════════════════════════════════════════════════════════════
// NORMDATEN
// ════════════════════════════════════════════════════════════

const STROMDATEN = {
  kupfer: {
    querschnitte: [1.5, 2.5, 4, 6, 10, 16, 25, 35, 50, 70, 95, 120],
    pvc: {
      einphasig: {
        unterputz:  [15.5,19.5,26,  34, 46, 61, 80,  99, 119,151,182,210],
        aufputz:    [17.5,24,  32,  40, 54, 73, 95, 119, 145,185,225,260],
        imRohr:     [13,  17.5,23,  30, 40, 54, 70,  86, 103,130,156,179],
        kabelwanne: [19.5,27,  36,  46, 63, 85,110, 136, 165,211,257,300],
        erdreich:   [26,  34,  44,  55, 73, 95,121, 146, 173,213,252,287],
      },
      dreiphasig: {
        unterputz:  [13.5,18,  24,  31, 42, 56, 73,  89, 108,136,164,188],
        aufputz:    [15.5,21,  28,  36, 50, 68, 89, 110, 134,171,207,239],
        imRohr:     [11.5,15,  20,  26, 36, 48, 62,  77,  94,118,143,164],
        kabelwanne: [17.5,24,  32,  41, 57, 76, 96, 119, 144,184,223,259],
        erdreich:   [22,  29,  38,  47, 63, 81,104, 125, 148,183,216,246],
      },
    },
    xlpe: {
      einphasig: {
        unterputz:  [19,  26,  35,  45, 61, 81,106, 131, 158,200,241,278],
        aufputz:    [24,  33,  45,  58, 80,107,138, 171, 209,269,328,382],
        imRohr:     [17,  23,  31,  40, 54, 73, 95, 117, 141,179,216,249],
        kabelwanne: [23,  31,  42,  54, 75,100,127, 158, 192,246,298,346],
        erdreich:   [30,  40,  51,  64, 84,111,141, 170, 200,247,292,333],
      },
      dreiphasig: {
        unterputz:  [17,  23,  31,  40, 54, 73, 95, 117, 141,179,216,249],
        aufputz:    [22,  30,  40,  51, 70, 94,119, 147, 179,229,278,322],
        imRohr:     [14.5,19.5,26,  34, 46, 61, 80,  99, 119,151,182,210],
        kabelwanne: [22,  30,  40,  51, 70, 94,119, 147, 179,229,278,322],
        erdreich:   [26,  34,  44,  56, 73, 95,121, 146, 173,213,252,287],
      },
    },
  },
  aluminium: {
    querschnitte: [16, 25, 35, 50, 70, 95, 120],
    pvc: {
      einphasig: {
        unterputz:  [47, 62, 77,  92,116,139,160],
        aufputz:    [59, 77, 96, 117,149,180,208],
        imRohr:     [41, 53, 65,  78, 98,118,135],
        kabelwanne: [66, 84,103, 124,158,191,222],
        erdreich:   [74, 95,114, 135,167,197,225],
      },
      dreiphasig: {
        unterputz:  [43, 57, 70,  84,106,127,146],
        aufputz:    [53, 70, 86, 104,133,161,186],
        imRohr:     [36, 47, 58,  70, 88,107,122],
        kabelwanne: [55, 72, 89, 108,138,168,195],
        erdreich:   [65, 83, 99, 118,145,170,194],
      },
    },
    xlpe: {
      einphasig: {
        unterputz:  [59, 78, 97, 118,149,180,208],
        aufputz:    [75, 99,124, 151,194,236,274],
        imRohr:     [53, 69, 87, 104,133,161,186],
        kabelwanne: [72, 95,118, 144,184,224,261],
        erdreich:   [89,116,140, 165,204,241,275],
      },
      dreiphasig: {
        unterputz:  [53, 70, 88, 106,134,162,187],
        aufputz:    [67, 89,111, 134,171,208,241],
        imRohr:     [47, 62, 78,  94,120,144,166],
        kabelwanne: [67, 89,111, 134,171,208,241],
        erdreich:   [80,103,124, 147,182,214,245],
      },
    },
  },
};

const REAKTANZ = {
  1.5:1.15e-4, 2.5:1.10e-4, 4:1.07e-4, 6:1.00e-4,
  10:0.94e-4, 16:0.90e-4, 25:0.86e-4, 35:0.83e-4,
  50:0.80e-4, 70:0.75e-4, 95:0.72e-4, 120:0.70e-4,
};
const getX = (mm2) => REAKTANZ[mm2] ?? 0.80e-4;
const KAPPA = { kupfer: 56, aluminium: 34 };
const TAB_H   = [[1,1.00],[2,0.80],[3,0.70],[4,0.65],[5,0.60],
                  [6,0.57],[7,0.54],[8,0.52],[9,0.50],[12,0.45],[16,0.41],[20,0.38]];
const LAGEN_F = [1.00, 0.80, 0.73, 0.68, 0.64];
const TAB_PVC_LUFT   = [[10,1.22],[15,1.17],[20,1.12],[25,1.06],[30,1.00],
                         [35,0.94],[40,0.87],[45,0.79],[50,0.71],[55,0.61],[60,0.50]];
const TAB_PVC_BODEN  = [[10,1.10],[15,1.05],[20,1.00],[25,0.95],[30,0.89],[35,0.84]];
const TAB_XLPE_LUFT  = [[10,1.15],[15,1.12],[20,1.08],[25,1.04],[30,1.00],
                         [35,0.96],[40,0.91],[45,0.87],[50,0.82],[55,0.76],[60,0.71]];
const TAB_XLPE_BODEN = [[10,1.07],[15,1.04],[20,1.00],[25,0.96],[30,0.93],[35,0.89]];
const TAB_RHO = [[0.7,1.08],[1.0,1.00],[1.5,0.89],[2.0,0.83],[2.5,0.77],[3.0,0.72]];
const RHO_OPTS = [
  {wert:0.7, label:'0,7', sub:'Nasse Erde'},
  {wert:1.0, label:'1,0', sub:'Normalboden'},
  {wert:1.5, label:'1,5', sub:'Feuchter Sand'},
  {wert:2.0, label:'2,0', sub:'Normalsand'},
  {wert:2.5, label:'2,5', sub:'Trockener Sand'},
  {wert:3.0, label:'3,0', sub:'Sehr trocken'},
];
const BA_F = {
  s1:{dauer:1.00},
  s2:{t10:1.45,t30:1.20,t60:1.10,t90:1.04},
  s3:{ed15:1.50,ed25:1.35,ed40:1.20,ed60:1.08},
};
const THD_F = {keine:1.00, mittel:0.86, stark:0.86};
const KS_K = { kupfer:{pvc:115,xlpe:143}, aluminium:{pvc:76,xlpe:94} };
const T_FAULT_OPTS = [0.1, 0.2, 0.4, 1.0];
const ALLE_QS = [1.5,2.5,4,6,10,16,25,35,50,70,95,120];
const getPEQ  = (a) => a<=16 ? a : a<=35 ? 16 : (ALLE_QS.find(s=>s>=a/2) ?? 120);

// ════════════════════════════════════════════════════════════
// KOMPENDIUM-DATEN
// ════════════════════════════════════════════════════════════

const KOMPENDIUM = [
  {
    id: 'sicherheit',
    titel: '5 Sicherheitsregeln (VDE 0105-100)',
    icon: '🛡',
    inhalt: [
      { typ:'hinweis', text:'Reihenfolge zwingend einhalten! Rückschalten in umgekehrter Reihenfolge (5→1).' },
      { typ:'regel', nr:1, titel:'Freischalten', text:'Anlage vollständig spannungsfrei schalten – alle Pole, alle Leiter (L1, L2, L3, N). Bei Drehstrom alle drei Außenleiter trennen.' },
      { typ:'regel', nr:2, titel:'Gegen Wiedereinschalten sichern', text:'Sicherungen herausschrauben, Leistungsschalter sperren (Schloss/Vorhängeschloss), Warnschild "Nicht einschalten – Wartungsarbeiten" anbringen.' },
      { typ:'regel', nr:3, titel:'Spannungsfreiheit feststellen', text:'Mit zweipoligem, geprüftem Spannungsprüfer (VDE 0682-401) an allen Leitern gegeneinander und gegen PE messen. Prüfer davor und danach an bekannter Spannung testen.' },
      { typ:'regel', nr:4, titel:'Erden und Kurzschließen', text:'Bei Hochspannung (HS) immer Pflicht. Bei Niederspannung (NS) empfohlen, wenn Einspeisung aus mehreren Richtungen möglich oder bei Freileitungen. Erdungsgarnitur nahe der Arbeitsstelle anbringen.' },
      { typ:'regel', nr:5, titel:'Benachbarte Teile abdecken', text:'Unter Spannung stehende benachbarte Anlagenteile mit isolierenden Abdeckungen, Schranken oder Absperrungen sichern. Sicherheitsabstand einhalten.' },
    ],
  },
  {
    id: 'formeln_dc',
    titel: 'Grundformeln Gleichstrom / Ohmsches Gesetz',
    icon: '⚡',
    inhalt: [
      { typ:'abschnitt', text:"Ohm'sches Gesetz" },
      { typ:'formel', zeilen:[
        'U = R × I         [V] = [Ω] × [A]',
        'I = U / R         [A] = [V] / [Ω]',
        'R = U / I         [Ω] = [V] / [A]',
      ]},
      { typ:'abschnitt', text:'Elektrische Leistung (DC / ohmscher AC)' },
      { typ:'formel', zeilen:[
        'P = U × I         [W] = [V] × [A]',
        'P = I² × R        [W] = [A²] × [Ω]',
        'P = U² / R        [W] = [V²] / [Ω]',
        '─────────────────────────────────',
        'I = P / U',
        'U = P / I',
        'R = U² / P',
        'R = P / I²',
      ]},
      { typ:'abschnitt', text:'Elektrische Energie & Kosten' },
      { typ:'formel', zeilen:[
        'W = P × t              [Wh] = [W] × [h]',
        'W [kWh] = P [kW] × t [h]',
        'P = W / t',
        't = W / P',
        'Kosten [€] = W [kWh] × Preis [€/kWh]',
      ]},
      { typ:'abschnitt', text:'Leitungswiderstand' },
      { typ:'formel', zeilen:[
        'R = ρ × l / A',
        'l = R × A / ρ',
        'A = ρ × l / R',
        '─────────────────────────────────',
        'ρ_Cu = 0,01786 Ω·mm²/m   (κ=56)',
        'ρ_Al = 0,02857 Ω·mm²/m   (κ=34)',
        '─────────────────────────────────',
        'R_Hin+Rück (1-ph.) = 2 × ρ × l / A',
        'R_Leitung  (3-ph.) = ρ × l / A',
      ]},
    ],
  },
  {
    id: 'formeln_ac',
    titel: 'Wechselstrom & Drehstrom',
    icon: '〜',
    inhalt: [
      { typ:'abschnitt', text:'Leistungsdreieck (Wechselstrom)' },
      { typ:'formel', zeilen:[
        'S = U × I             Scheinleistung [VA]',
        'P = S × cos φ         Wirkleistung   [W]',
        'Q = S × sin φ         Blindleistung  [var]',
        'S² = P² + Q²',
        '─────────────────────────────────',
        'cos φ = P / S',
        'sin φ = Q / S',
        'tan φ = Q / P',
      ]},
      { typ:'abschnitt', text:'Drehstrom (3-Phasen, symmetrische Last)' },
      { typ:'formel', zeilen:[
        'U_L = 400 V  (Leiterspannung L-L)',
        'U_str = U_L / √3 ≈ 230,9 V  (Strangspannung)',
        '─────────────────────────────────',
        'S = √3 × U_L × I     [VA]',
        'P = √3 × U_L × I × cos φ  [W]',
        'Q = √3 × U_L × I × sin φ  [var]',
        '─────────────────────────────────',
        'I = P / (√3 × U_L × cos φ)',
        'I = S / (√3 × U_L)',
      ]},
      { typ:'abschnitt', text:'Spannungsfall' },
      { typ:'formel', zeilen:[
        'Einphasig:  ΔU = 2 × I × l × (R·cosφ + X·sinφ) / A',
        'Dreiphasig: ΔU = √3 × I × l × (R·cosφ + X·sinφ) / A',
        'ΔU% = ΔU / U_N × 100',
        '─────────────────────────────────',
        'R = 1 / (κ × A)   [Ω/m]',
        'X_L ≈ 0,08...0,10 mΩ/m  (Kabel)',
      ]},
      { typ:'grenzwerte', eintraege:[
        { lbl:'ΔU Endstromkreis (VDE 0100-520)', val:'≤ 3 %', ok:true },
        { lbl:'ΔU Verteilungsleitung', val:'≤ 5 %', ok:true },
        { lbl:'ΔU gesamt (Gesamt-Installation)', val:'≤ 8 %', ok:true },
      ]},
      { typ:'abschnitt', text:'Kurzschluss (Experte)' },
      { typ:'formel', zeilen:[
        'I_k = U_0 / Z_S               (einpolig)',
        'Z_S = Schleifenimpedanz [Ω]',
        'U_0 = 230 V  (Nennspannung L-PE)',
        '─────────────────────────────────',
        'A_min = I_k × √t / k    (therm. Festigkeit)',
        'k_Cu_PVC=115  k_Cu_XLPE=143',
        'k_Al_PVC=76   k_Al_XLPE=94',
      ]},
    ],
  },
  {
    id: 'zonen_bad',
    titel: 'Installationszonen Bad (DIN VDE 0100-701)',
    icon: '🚿',
    inhalt: [
      { typ:'hinweis', text:'RCD-Pflicht: Alle Stromkreise im Bad müssen über FI ≤ 30 mA abgesichert sein (seit VDE 0100-701:2002).' },
      { typ:'abschnitt', text:'Zone 0 – Im Inneren von Wanne/Dusche' },
      { typ:'grenzwerte', eintraege:[
        { lbl:'Schutzart', val:'≥ IP X7', ok:true },
        { lbl:'Versorgung', val:'SELV ≤ 12 V AC / 30 V DC', ok:true },
        { lbl:'Erlaubt', val:'Leuchten für Wanne (IP X7), Whirlpool-Pumpe', ok:true },
        { lbl:'Verboten', val:'Steckdosen, alle Netzgeräte', ok:false },
      ]},
      { typ:'abschnitt', text:'Zone 1 – Über Zone 0 bis 2,25 m Höhe / 60 cm seitlich' },
      { typ:'grenzwerte', eintraege:[
        { lbl:'Schutzart', val:'≥ IP X4 (spritzwassergeschützt)', ok:true },
        { lbl:'Versorgung', val:'SELV oder Schutzklasse II', ok:true },
        { lbl:'Erlaubt', val:'Leuchten (IP X4), Ventilatoren (IP X4), Durchlauferhitzer (fest), Heizstrahler (fest)', ok:true },
        { lbl:'Verboten', val:'Steckdosen, Schalter (außer SELV)', ok:false },
      ]},
      { typ:'abschnitt', text:'Außerhalb der Zonen (> 60 cm von Wanne/Dusche)' },
      { typ:'grenzwerte', eintraege:[
        { lbl:'Schutzart', val:'IP X1 (tropfwassergeschützt) ausreichend', ok:true },
        { lbl:'Steckdosen', val:'Erlaubt, aber RCD ≤ 30 mA Pflicht', ok:true },
        { lbl:'Schalter', val:'Erlaubt (≥ 60 cm von Wanne/Dusche)', ok:true },
      ]},
      { typ:'abschnitt', text:'Abmessungen Zone 1 (Wanne)' },
      { typ:'tabelle', zeilen:[
        ['Breite', 'Gesamte Wannenbreite + 60 cm je Seite'],
        ['Tiefe',  '0,75 m über Wannenrand (Typ 1)'],
        ['Höhe',   '2,25 m ab OK Fertigboden'],
      ]},
      { typ:'abschnitt', text:'Abmessungen Zone 1 (Dusche ohne Trennwand)' },
      { typ:'tabelle', zeilen:[
        ['Radius', '1,20 m um Duschkopf-Mittelpunkt'],
        ['Höhe',   '2,25 m ab OK Fertigboden'],
      ]},
    ],
  },
  {
    id: 'zonen_raum',
    titel: 'Installationszonen Normalräume (DIN 18015-3)',
    icon: '🏠',
    inhalt: [
      { typ:'hinweis', text:'Leitungen immer waagerecht oder senkrecht verlegen – nur so können Installationszonen eingehalten und Leitungen später sicher geortet werden.' },
      { typ:'abschnitt', text:'Installationszonen nach DIN 18015-3' },
      { typ:'tabelle', zeilen:[
        ['Zone I',  '0–30 cm unter Decke (waagerecht), 0–30 cm von Ecken/Türen (senkrecht)'],
        ['Zone II', '±30 cm waagerecht von Schaltern/Steckdosen (senkrecht)'],
        ['Zone III','Direkt senkrecht über/unter Steckdosen und Schaltern'],
      ]},
      { typ:'abschnitt', text:'Sonderzonen' },
      { typ:'tabelle', zeilen:[
        ['Küche',      '30 cm über Arbeitsplatte (waagerecht)'],
        ['Außenwand',  'Leitungen nur in Hohlwandinstallation oder Schutzrohr'],
        ['Garage',     'Alle Stromkreise über RCD ≤ 30 mA'],
        ['Außenbereich','Min. IP 44, alle Stromkreise über RCD ≤ 30 mA'],
      ]},
      { typ:'abschnitt', text:'Schutzarten IP (IEC 60529)' },
      { typ:'tabelle', zeilen:[
        ['IP 20','Schutz gegen Finger – Innenräume'],
        ['IP 44','Spritzwasser von allen Seiten – Außen, Garagen'],
        ['IP 54','Staubgeschützt + Spritzwasser – Industrie, Außen'],
        ['IP 65','Staubdicht + Strahlwasser – Außen, Kfz-Waschanlage'],
        ['IP 67','Staubdicht + Untertauchen 1m/30min'],
        ['IP X4','Spritzwasser – Bad Zone 1'],
        ['IP X7','Tauchen – Bad Zone 0'],
      ]},
      { typ:'abschnitt', text:'Schutzklassen (VDE 0140-1)' },
      { typ:'tabelle', zeilen:[
        ['SK I',  'Mit Schutzleiteranschluss (PE). Gehäuse geerdet.'],
        ['SK II', 'Schutzisoliert. Doppelte/verstärkte Isolierung. Kein PE.'],
        ['SK III','Schutzkleinspannung SELV ≤ 50 V AC / 120 V DC.'],
      ]},
    ],
  },
  {
    id: 'schaltungen',
    titel: 'Grundschaltungen',
    icon: '🔌',
    inhalt: [
      { typ:'abschnitt', text:'Einfachschalter (Einpoliger Schalter)' },
      { typ:'formel', zeilen:[
        'L  →  [Sicherung]  →  Schalter(1→2)  →  Verbraucher  →  N',
        'PE direkt an Verbraucher (wenn SK I)',
        'Klemmen: 1=Eingang (vom Netz), 2=Ausgang (zum Verbraucher)',
      ]},
      { typ:'abschnitt', text:'Wechselschaltung (2 Schaltstellen)' },
      { typ:'formel', zeilen:[
        'L  →  [Sich.]  →  S1(1)  →  S1(2,4)  ─  S2(2,4)  →  S2(1)  →  Verbraucher  →  N',
        'Klemmen je Schalter: 1=Eingang/Ausgang, 2+4=Wechselklemmen',
        'Brückenleiter (Wechselleiter): 2 Adern zwischen S1 und S2',
      ]},
      { typ:'abschnitt', text:'Kreuzschaltung (3+ Schaltstellen)' },
      { typ:'formel', zeilen:[
        'Wechsel-S1  →  Kreuz-S2  →  (weitere Kreuz)  →  Wechsel-Sn  →  Verbraucher',
        'Kreuzschalter-Klemmen: 1,2 (oben) und 3,4 (unten)',
        'Gerade Stellung: 1→3, 2→4  /  Gekreuzt: 1→4, 2→3',
      ]},
      { typ:'abschnitt', text:'Steckdosen-Stromkreis (Unterverteilung)' },
      { typ:'formel', zeilen:[
        'UV: L1  →  LS-Schalter B16  →  Klemme Steckdose (L)',
        'UV: N   →  Neutralleiterklemme  →  Steckdose (N)',
        'UV: PE  →  PE-Schiene  →  Steckdose (PE)',
        'Max. 8 Steckdosen/Stromkreis (DIN 18015-2 empfohlen)',
      ]},
      { typ:'abschnitt', text:'Stern-Dreieck-Anlauf (Motor, Experte)' },
      { typ:'formel', zeilen:[
        'STERN (Anlauf):',
        '  U1-L1, V1-L2, W1-L3 (Netzanschluss)',
        '  U2-V2-W2 gebrückt   (Sternpunkt)',
        '',
        'DREIECK (Betrieb):',
        '  U1-L1, V1-L2, W1-L3',
        '  U2-W1, V2-U1, W2-V1 (Verschaltung)',
        '',
        'Stern: I_anlauf = I_direkt / 3  (Anlaufmoment 1/3)',
        'Umschaltverzögerung: typ. 3–8 Sekunden',
        'Voraussetzung: Motor für Dreieck-Betrieb ausgelegt (Typenschild)',
      ]},
    ],
  },
  {
    id: 'messungen',
    titel: 'Messungen & Prüfungen (VDE 0100-600)',
    icon: '📏',
    inhalt: [
      { typ:'hinweis', text:'Reihenfolge der Prüfungen nach DIN VDE 0100-600 zwingend einhalten! Isolationsmessung immer VOR Einschalten der Anlage.' },
      { typ:'abschnitt', text:'Prüfreihenfolge (Erstprüfung / Wiederholungsprüfung)' },
      { typ:'schritte', items:[
        { nr:1, text:'Sichtprüfung – Vollständigkeit, Beschriftung, Kennzeichnung, mechanische Beschädigungen, Brandschutz' },
        { nr:2, text:'Durchgangsprüfung Schutzleiter – alle PE-Leiter auf Kontinuität prüfen (Anlage spannungsfrei!)' },
        { nr:3, text:'Isolationswiderstandsmessung – L+N gegen PE mit 500V DC (Anlage spannungsfrei!)' },
        { nr:4, text:'Schutz durch SELV/PELV und Schutztrennung prüfen (falls vorhanden)' },
        { nr:5, text:'Polaritätsprüfung – Phase auf Phasenklemme, N auf N-Klemme, PE korrekt' },
        { nr:6, text:'Spannungsprüfung / Drehfeldprüfung – Netzspannung korrekt, Drehfeld bei Drehstrom prüfen' },
        { nr:7, text:'Schleifenimpedanz Z_S messen – Abschaltstrom I_k = U_0/Z_S ≥ Mindestauslösestrom' },
        { nr:8, text:'FI/RCD-Schutzschalter prüfen – Auslösestrom, Auslösezeit, TEST-Taste' },
        { nr:9, text:'Funktionsprüfung – alle Schalter, Schütze, Verriegelungen, Schutzeinrichtungen' },
      ]},
      { typ:'abschnitt', text:'Grenzwerte (Übersicht)' },
      { typ:'grenzwerte', eintraege:[
        { lbl:'Schutzleiterwiderstand R_PE', val:'≤ 1 Ω', ok:true },
        { lbl:'Isolationswiderstand R_iso (500V DC)', val:'≥ 1 MΩ', ok:true },
        { lbl:'Isolationswiderstand SELV (250V DC)', val:'≥ 0,5 MΩ', ok:true },
        { lbl:'Berührungsspannung U_B', val:'≤ 50 V AC / 120 V DC', ok:true },
        { lbl:'FI-Auslösestrom (30 mA RCD)', val:'≤ 30 mA', ok:true },
        { lbl:'FI-Auslösezeit (30 mA RCD)', val:'≤ 300 ms', ok:true },
        { lbl:'FI-Auslösezeit (5×I_Δn)', val:'≤ 40 ms', ok:true },
        { lbl:'FI – halber Fehlerstrom (½ I_Δn)', val:'Kein Auslösen!', ok:false },
        { lbl:'Erdübergangswiderstand (TT-Netz)', val:'≤ 1.667 Ω (30mA RCD)', ok:true },
      ]},
      { typ:'abschnitt', text:'Durchgangsprüfung Schutzleiter (Detail)' },
      { typ:'schritte', items:[
        { nr:1, text:'Anlage vollständig spannungsfrei schalten (5 Sicherheitsregeln!)' },
        { nr:2, text:'Messgerät: Durchgangsprüfer oder Ohmmeter (Prüfstrom ≥ 200 mA, Leerlaufspannung 4–24 V DC)' },
        { nr:3, text:'Einen Prüfling an PE-Schiene im Verteiler anlegen, zweiten Prüfling an PE-Klemme des Verbrauchers/Steckdose' },
        { nr:4, text:'Messwert ablesen: ≤ 1 Ω → bestanden. Bei längeren Leitungen Leitungswiderstand beachten: R = 2×ρ×l/A' },
        { nr:5, text:'Alle PE-Leiter einzeln prüfen, Messergebnisse protokollieren' },
      ]},
      { typ:'abschnitt', text:'Isolationsmessung (Detail)' },
      { typ:'schritte', items:[
        { nr:1, text:'Anlage spannungsfrei schalten. Alle Verbraucher abklemmen oder Schalter auf EIN stellen (damit Leitung durchgehend geprüft wird)' },
        { nr:2, text:'Prüfspannung: 500 V DC (Nennspannung ≤ 500 V AC). Spannungsempfindliche Geräte (Dimmer, FU, EDV) abklemmen!' },
        { nr:3, text:'N und L miteinander verbinden (bei mehrphasig: L1, L2, L3, N gemeinsam)' },
        { nr:4, text:'Messung L+N gemeinsam gegen PE. Mindesthaltedauer: 1 Minute (Wert darf nicht abfallen)' },
        { nr:5, text:'Grenzwert: ≥ 1 MΩ → bestanden. Wert < 1 MΩ → Fehler suchen (Feuchtigkeit, Isolationsdefekt, vergessener Verbraucher)' },
      ]},
      { typ:'abschnitt', text:'Schleifenimpedanz Z_S (Detail)' },
      { typ:'schritte', items:[
        { nr:1, text:'Anlage einschalten (Netzspannung anlegen). Sicherungen müssen eingesetzt sein.' },
        { nr:2, text:'Messgerät (z.B. Fluke 1663) an Steckdose oder Klemme L–PE anschließen' },
        { nr:3, text:'Messung durchführen: Gerät legt kurzzeitig Prüfstrom an (< 30 ms, keine RCD-Auslösung)' },
        { nr:4, text:'Kurzschlussstrom berechnen: I_k = U_0 / Z_S  (U_0 = 230 V)' },
        { nr:5, text:'Vergleich: I_k ≥ I_a (Mindestauslösestrom des Schutzorgans). Für B16: I_a = 5×16 = 80 A → I_k ≥ 80 A (Z_S ≤ 2,875 Ω)' },
      ]},
      { typ:'abschnitt', text:'FI/RCD-Prüfung (Detail)' },
      { typ:'schritte', items:[
        { nr:1, text:'TEST-Taste am RCD drücken → muss sofort auslösen (Funktion OK). RCD wieder einschalten.' },
        { nr:2, text:'Prüfgerät: ½ × I_Δn (z.B. 15 mA bei 30-mA-RCD) anlegen → RCD darf NICHT auslösen' },
        { nr:3, text:'Prüfgerät: 1 × I_Δn (30 mA) anlegen → RCD muss auslösen, Zeit messen: ≤ 300 ms' },
        { nr:4, text:'Prüfgerät: 5 × I_Δn (150 mA) anlegen → RCD muss auslösen, Zeit: ≤ 40 ms' },
        { nr:5, text:'Prüfung mit positiver UND negativer Halbwelle (0° und 180°) durchführen' },
        { nr:6, text:'Bei Typ S/G (selektiver RCD): Auslösezeiten gemäß Datenblatt prüfen (länger als Typ A)' },
      ]},
    ],
  },
];

// ════════════════════════════════════════════════════════════
// HILFSFUNKTIONEN
// ════════════════════════════════════════════════════════════

function ipol(tab, x) {
  if (x <= tab[0][0])             return tab[0][1];
  if (x >= tab[tab.length-1][0])  return tab[tab.length-1][1];
  for (let i = 0; i < tab.length-1; i++) {
    const [x1,y1] = tab[i], [x2,y2] = tab[i+1];
    if (x === x1) return y1;
    if (x > x1 && x < x2) return y1 + (x-x1)/(x2-x1)*(y2-y1);
  }
  return tab[tab.length-1][1];
}
const fH   = (n) => ipol(TAB_H, Math.max(1,Math.min(20,n)));
const fL   = (l) => LAGEN_F[Math.max(0,Math.min(4,l-1))];
const fRho = (r) => ipol(TAB_RHO, r);
const fBA  = (s,d) => BA_F[s]?.[d] ?? 1.00;
const fTHD = (t) => THD_F[t] ?? 1.00;
function fTemp(iso, isErd, t) {
  return ipol(isErd ? (iso==='xlpe'?TAB_XLPE_BODEN:TAB_PVC_BODEN)
                    : (iso==='xlpe'?TAB_XLPE_LUFT :TAB_PVC_LUFT), t);
}

// ════════════════════════════════════════════════════════════
// KERNBERECHNUNG
// ════════════════════════════════════════════════════════════

function berechne(p) {
  const {
    stromstaerke, laenge, schaltungsart, cosPhi,
    material, isolierung, verlegeart,
    anzahlSk, anzahlLagen, temperatur, bodenRho,
    betriebsart, betriebDet, thd,
    duGrenzwert,
    parallelModus, anzahlParallel,
    ikA, tFault,
  } = p;

  const I  = parseFloat(String(stromstaerke).replace(',','.'));
  const L  = parseFloat(String(laenge).replace(',','.'));
  const cp = parseFloat(String(cosPhi).replace(',','.'));

  if (isNaN(I)||I<=0)          return {fehler:'Bitte eine gültige Stromstärke eingeben.'};
  if (isNaN(L)||L<=0)          return {fehler:'Bitte eine gültige Leitungslänge eingeben.'};
  if (isNaN(cp)||cp<0.5||cp>1) return {fehler:'cos φ muss zwischen 0,50 und 1,00 liegen.'};

  const nP     = (parallelModus && anzahlParallel>=2) ? anzahlParallel : 1;
  const iKabel = I / nP;
  const isErd  = verlegeart === 'erdreich';
  const isDrei = schaltungsart === 'dreiphasig';
  const daten  = STROMDATEN[material];
  const qs     = daten.querschnitte;
  const tab    = daten[isolierung][schaltungsart][verlegeart];
  const kappa  = KAPPA[material];
  const UN     = isDrei ? 400 : 230;
  const nFak   = isDrei ? Math.sqrt(3) : 2;

  const FH   = fH(anzahlSk);
  const FL   = fL(anzahlLagen);
  const FT   = fTemp(isolierung, isErd, temperatur);
  const FRho = isErd ? fRho(bodenRho) : 1.0;
  const FBA  = fBA(betriebsart, betriebDet);
  const FTHD = isDrei ? fTHD(thd) : 1.0;
  const FG   = FH * FL * FT * FRho * FBA * FTHD;

  const neutStark = (thd==='stark' && isDrei);
  const iEff  = neutStark ? Math.max(iKabel, iKabel*1.45) : iKabel;
  const iErf  = iEff / FG;

  const minIdxStrom = tab.findIndex(im => im >= iErf);
  if (minIdxStrom === -1) {
    return {
      fehler: `${I} A erfordert Tabellenstrom ${iErf.toFixed(1)} A – übersteigt 120 mm². `+
              `${nP===1?'Parallelverlegung aktivieren oder':'Mehr Parallelkabel oder'} Korrekturfaktoren prüfen.`,
    };
  }

  const sp = Math.sqrt(Math.max(0, 1-cp*cp));
  const sfOf = (A) => {
    const R  = 1/(kappa*A);
    const X  = getX(A);
    const dU = nFak * L * iKabel * (R*cp + X*sp);
    return { pct: dU/UN*100, V:dU, mR:R*cp*1e3, mX:X*sp*1e3 };
  };

  let empfIdxSF = minIdxStrom;
  for (let i = minIdxStrom; i < qs.length; i++) {
    empfIdxSF = i;
    if (sfOf(qs[i]).pct <= duGrenzwert) break;
  }

  const kKS = KS_K[material][isolierung];
  let aMinKSexact = null, aMinKSrounded = null, ksIdx = -1;
  const IkNum = parseFloat(String(ikA||'').replace(',','.'));
  if (!isNaN(IkNum) && IkNum > 0) {
    const IkProKabel = IkNum * 1000 / nP;
    aMinKSexact = IkProKabel * Math.sqrt(tFault) / kKS;
    const found = qs.findIndex(q => q >= aMinKSexact);
    if (found === -1) {
      return {
        fehler: `Kurzschluss: A_min = ${aMinKSexact.toFixed(1)} mm² > 120 mm². `+
                `${nP===1?'Parallelverlegung aktivieren.':'Weitere Parallelkabel nötig.'}`,
      };
    }
    aMinKSrounded = qs[found];
    ksIdx = found;
  }

  let finalIdx  = empfIdxSF;
  let kriterium = empfIdxSF > minIdxStrom ? 'sf' : 'strom';
  if (ksIdx > finalIdx) { finalIdx = ksIdx; kriterium = 'kurzschluss'; }

  const empfQ     = qs[finalIdx];
  const sfErg     = sfOf(empfQ);
  const sfWarn    = sfErg.pct > duGrenzwert;
  const korrigKap = tab[finalIdx] * FG;
  const neutDom   = neutStark;
  const peQ       = neutDom ? empfQ : getPEQ(empfQ);
  const peHinw    = neutDom ? 'N = Außenleiter (THD > 33 %)' : 'DIN VDE 0100-540 Tab. 54.2';
  const xRel      = sfErg.mX > sfErg.mR * 0.08;

  let beg = nP > 1 ? `${I} A auf ${nP} × ${empfQ} mm² verteilt (${iKabel.toFixed(1)} A/Kabel). ` : '';
  beg += `Tabellenstrom ≥ ${iErf.toFixed(1)} A → ${qs[minIdxStrom]} mm² (${tab[minIdxStrom]} A).`;
  if (empfIdxSF > minIdxStrom) beg += ` Auf ${qs[empfIdxSF]} mm² erhöht wegen ΔU ≤ ${duGrenzwert} %.`;
  if (ksIdx >= 0) beg += ` KS: A_min = ${aMinKSexact?.toFixed(1)} mm² → ${aMinKSrounded} mm².`;
  if (kriterium==='kurzschluss') beg += ` Kurzschluss ist maßgebend.`;
  if (xRel) beg += ` Reaktanzanteil berücksichtigt.`;
  if (sfWarn) beg += ` ΔU überschreitet ${duGrenzwert} %!`;
  if (neutDom) beg += ` N-Leiter auf Außenleiterquerschnitt (THD > 33 %).`;

  return {
    querschnitt:empfQ, iTabelle:tab[finalIdx], korrigKap,
    peQ, peHinw, sf:sfErg, sfWarn, xRel,
    qMinStrom: qs[minIdxStrom], qMinSF: qs[empfIdxSF], qMinKS: aMinKSrounded, aMinKSexact,
    kriterium, neutDom, FH,FL,FT,FRho,FBA,FTHD,FG, iEff, iErf, nP, iKabel, beg,
  };
}

// ════════════════════════════════════════════════════════════
// FARBPALETTE
// ════════════════════════════════════════════════════════════
const C = {
  bg:'#0d2b5e', bgMid:'#1a3f7a', card:'#ffffff', hell:'#f0f4ff',
  rand:'#d1daf0', ak:'#2563eb', text:'#0d2b5e', soft:'#6b7fa8',
  w:'#ffffff', grau:'#c8d3e8',
  warn:'#dc2626', warnBg:'#fef2f2', warnRand:'#fca5a5',
  ok:'#16a34a', okBg:'#f0fdf4', okRand:'#86efac',
  info:'#0369a1', infoBg:'#f0f9ff', infoRand:'#7dd3fc',
  amber:'#d97706', amberBg:'#fffbeb', amberRand:'#fcd34d',
  lila:'#7c3aed', lilaBg:'#f5f3ff', lilaRand:'#c4b5fd',
};

// ════════════════════════════════════════════════════════════
// MODUS-KONFIGURATION
// ════════════════════════════════════════════════════════════
const MODUS_CFG = [
  { wert:'basis',           label:'Basis',          badge:'Schnellschätzung', color:'#16a34a' },
  { wert:'fortgeschritten', label:'Fortgeschritten', badge:'Profianwender',   color:'#0284c7' },
  { wert:'experte',         label:'Experte',         badge:'Vollnormativ',    color:'#d97706' },
];

// ════════════════════════════════════════════════════════════
// UI-HILFSKOMPONENTEN
// ════════════════════════════════════════════════════════════

function ModusSelector({ modus, onModusChange }) {
  return (
    <View style={styles.modusWrap}>
      {MODUS_CFG.map((m) => {
        const on = m.wert === modus;
        return (
          <TouchableOpacity key={m.wert}
            style={[styles.modusBtn, on && { backgroundColor: m.color }]}
            onPress={() => onModusChange(m.wert)} activeOpacity={0.8}>
            <Text style={[styles.modusLabel, on && styles.modusLabelOn]}>{m.label}</Text>
            <Text style={[styles.modusBadge, { color: on ? 'rgba(255,255,255,0.75)' : 'rgba(255,255,255,0.25)' }]}>
              {m.badge}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

function AnsichtSelector({ ansicht, setAnsicht, modusColor }) {
  return (
    <View style={styles.ansichtWrap}>
      {[
        { wert:'rechner',    label:'⚙  Rechner' },
        { wert:'kompendium', label:'📚  Kompendium' },
      ].map((a) => {
        const on = a.wert === ansicht;
        return (
          <TouchableOpacity key={a.wert}
            style={[styles.ansichtBtn, on && { backgroundColor: modusColor }]}
            onPress={() => setAnsicht(a.wert)} activeOpacity={0.8}>
            <Text style={[styles.ansichtTxt, on && styles.ansichtTxtOn]}>{a.label}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

// ── Kompendium-Komponenten ──

function KompFormel({ zeilen }) {
  return (
    <View style={styles.formelBox}>
      {zeilen.map((z, i) => (
        <Text key={i} style={z === '' ? {height:6} : styles.formelTxt}>{z}</Text>
      ))}
    </View>
  );
}

function KompSchritte({ items }) {
  return (
    <View style={{marginTop:6}}>
      {items.map((s) => (
        <View key={s.nr} style={styles.schrittRow}>
          <View style={styles.schrittNr}>
            <Text style={styles.schrittNrTxt}>{s.nr}</Text>
          </View>
          <Text style={styles.schrittTxt}>{s.text}</Text>
        </View>
      ))}
    </View>
  );
}

function KompRegeln({ items }) {
  return (
    <View style={{marginTop:6}}>
      {items.map((r) => (
        <View key={r.nr} style={styles.regelRow}>
          <View style={styles.regelNr}>
            <Text style={styles.regelNrTxt}>{r.nr}</Text>
          </View>
          <View style={{flex:1}}>
            <Text style={styles.regelTitelTxt}>{r.titel}</Text>
            <Text style={styles.schrittTxt}>{r.text}</Text>
          </View>
        </View>
      ))}
    </View>
  );
}

function KompGrenzwerte({ eintraege }) {
  return (
    <View style={styles.grenzwertBox}>
      {eintraege.map((e, i) => (
        <View key={i} style={[styles.grenzwertRow, i===eintraege.length-1&&{borderBottomWidth:0}]}>
          <Text style={styles.grenzwertLbl}>{e.lbl}</Text>
          <Text style={[styles.grenzwertVal, !e.ok&&{color:C.warn}]}>{e.val}</Text>
        </View>
      ))}
    </View>
  );
}

function KompTabelle({ zeilen }) {
  return (
    <View style={styles.grenzwertBox}>
      {zeilen.map((z, i) => (
        <View key={i} style={[styles.grenzwertRow, i===zeilen.length-1&&{borderBottomWidth:0}]}>
          <Text style={[styles.grenzwertLbl, {fontWeight:'700', minWidth:100}]}>{z[0]}</Text>
          <Text style={[styles.grenzwertVal, {color:C.text, fontWeight:'400', flex:1, textAlign:'right'}]}>{z[1]}</Text>
        </View>
      ))}
    </View>
  );
}

function KompSektion({ sektion, offen, onToggle }) {
  return (
    <View style={styles.kompSekt}>
      <TouchableOpacity style={styles.kompSektHead} onPress={onToggle} activeOpacity={0.75}>
        <Text style={styles.kompSektIcon}>{sektion.icon}</Text>
        <Text style={styles.kompSektTitel}>{sektion.titel}</Text>
        <Text style={styles.kompSektPfeil}>{offen ? '▲' : '▼'}</Text>
      </TouchableOpacity>
      {offen && (
        <View style={styles.kompBody}>
          {sektion.inhalt.map((block, i) => {
            if (block.typ === 'abschnitt') return (
              <Text key={i} style={styles.kompAbschnitt}>{block.text}</Text>
            );
            if (block.typ === 'formel') return (
              <KompFormel key={i} zeilen={block.zeilen}/>
            );
            if (block.typ === 'regel') return null; // handled via 'regeln' parent
            if (block.typ === 'schritte') return (
              <KompSchritte key={i} items={block.items}/>
            );
            if (block.typ === 'grenzwerte') return (
              <KompGrenzwerte key={i} eintraege={block.eintraege}/>
            );
            if (block.typ === 'tabelle') return (
              <KompTabelle key={i} zeilen={block.zeilen}/>
            );
            if (block.typ === 'hinweis') return (
              <View key={i} style={styles.amberBox}>
                <Text style={styles.amberTxt}>{block.text}</Text>
              </View>
            );
            if (block.typ === 'text') return (
              <Text key={i} style={[styles.hint, {marginTop:4}]}>{block.text}</Text>
            );
            return null;
          })}
          {/* Render Regelblöcke als Gruppe */}
          {sektion.inhalt.some(b => b.typ === 'regel') && (
            <KompRegeln items={sektion.inhalt.filter(b => b.typ === 'regel')}/>
          )}
        </View>
      )}
    </View>
  );
}

function KompendiumScreen({ modus }) {
  const [offenSet, setOffenSet] = useState(new Set(['sicherheit']));
  const toggle = (id) => setOffenSet(prev => {
    const next = new Set(prev);
    next.has(id) ? next.delete(id) : next.add(id);
    return next;
  });

  const experte = modus === 'experte';
  const sektionen = KOMPENDIUM.filter(s => {
    if (s.id === 'formeln_ac' && !experte) {
      // Fortgeschritten sieht Wechselstrom-Abschnitt, aber ohne Kurzschluss-Block
      return true;
    }
    return true;
  });

  return (
    <View>
      {sektionen.map((s) => (
        <KompSektion key={s.id} sektion={s} offen={offenSet.has(s.id)} onToggle={() => toggle(s.id)}/>
      ))}
      <View style={[styles.fuss, {marginTop:8}]}>
        <Text style={styles.fussTxt}>
          VDE 0105-100 · DIN VDE 0100-600 · DIN VDE 0100-701 · DIN 18015-3{'\n'}
          IEC 60529 (IP-Schutzarten) · DIN VDE 0140-1 (Schutzklassen){'\n'}
          Kein Ersatz für Normtexte – immer aktuelle Ausgabe heranziehen.
        </Text>
      </View>
    </View>
  );
}

function Btns({ opts, val, set, sm, mt }) {
  return (
    <View style={[styles.row, mt&&{marginTop:mt}]}>
      {opts.map((o,i) => {
        const on = o.wert===val;
        return (
          <TouchableOpacity key={o.wert}
            style={[styles.btn, on&&styles.btnOn, sm&&styles.btnSm, i<opts.length-1&&{marginRight:6}]}
            onPress={()=>set(o.wert)} activeOpacity={0.75}>
            <Text style={[styles.btnTxt, on&&styles.btnTxtOn, sm&&{fontSize:13}]} numberOfLines={1}>{o.label}</Text>
            {o.sub&&<Text style={[styles.btnSub, on&&{color:'rgba(255,255,255,0.6)'}]} numberOfLines={1}>{o.sub}</Text>}
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

function Stepper({v, set, min=1, max=20, fmt}) {
  return (
    <View style={styles.row}>
      <TouchableOpacity style={[styles.stepBtn, v<=min&&{opacity:0.3}]} onPress={()=>v>min&&set(v-1)} activeOpacity={0.7}>
        <Text style={styles.stepTxt}>−</Text>
      </TouchableOpacity>
      <View style={styles.stepVal}>
        <Text style={styles.stepValTxt}>{fmt?fmt(v):v}</Text>
      </View>
      <TouchableOpacity style={[styles.stepBtn, v>=max&&{opacity:0.3}]} onPress={()=>v<max&&set(v+1)} activeOpacity={0.7}>
        <Text style={styles.stepTxt}>+</Text>
      </TouchableOpacity>
    </View>
  );
}

function Pill({txt, warn, ok, lila}) {
  return (
    <View style={[styles.pill, warn&&{backgroundColor:'#b91c1c'}, ok&&{backgroundColor:C.ok}, lila&&{backgroundColor:C.lila}]}>
      <Text style={styles.pillTxt}>{txt}</Text>
    </View>
  );
}

function FieldHead({label, pill}) {
  return <View style={styles.fhead}><Text style={styles.flabel}>{label}</Text>{pill}</View>;
}

function Sep() { return <View style={styles.sep}/>; }

function FaktorRow({label, detail, wert}) {
  return (
    <View style={styles.frow}>
      <Text style={styles.frowL}>{label}</Text>
      <View style={styles.frowR}>
        {detail&&<Text style={styles.frowD}>{detail}</Text>}
        <View style={styles.frowBadge}><Text style={styles.frowBadgeTxt}>{wert}</Text></View>
      </View>
    </View>
  );
}

function KritRow({label, qMin, maßgebend, ok}) {
  return (
    <View style={styles.kritRow}>
      <View style={{flex:1}}>
        <Text style={styles.kritLabel}>{label}</Text>
        <Text style={styles.kritMin}>mind. {qMin} mm²</Text>
      </View>
      <View style={styles.kritRechts}>
        {maßgebend&&<View style={styles.kritMaßBadge}><Text style={styles.kritMaßTxt}>MASSGEBEND</Text></View>}
        <View style={[styles.kritStatusBadge, ok?styles.kritOk:styles.kritWarn]}>
          <Text style={styles.kritStatusTxt}>{ok?'✓':'⚠'}</Text>
        </View>
      </View>
    </View>
  );
}

// ════════════════════════════════════════════════════════════
// HAUPTKOMPONENTE
// ════════════════════════════════════════════════════════════

const TEMP_PVC  = [25,30,35,40,45,50];
const TEMP_XLPE = [25,30,35,40,50,60];
const TEMP_ERD  = [10,15,20,25,30,35];
const DU_OPTS   = [1.0,2.0,3.0,4.0,5.0];

export default function App() {
  const [strom,       setStrom]       = useState('');
  const [laenge,      setLaenge]      = useState('');
  const [schaltung,   setSchaltung]   = useState('einphasig');
  const [cpIdx,       setCpIdx]       = useState(10);
  const [material,    setMaterial]    = useState('kupfer');
  const [iso,         setIso]         = useState('pvc');
  const [verlegeart,  setVerlegeart]  = useState('unterputz');
  const [parallelOn,  setParallelOn]  = useState(false);
  const [anzParallel, setAnzParallel] = useState(2);
  const [anzSk,       setAnzSk]      = useState(1);
  const [anzLagen,    setAnzLagen]   = useState(1);
  const [temp,        setTemp]       = useState(30);
  const [rho,         setRho]        = useState(1.0);
  const [ba,          setBa]         = useState('s1');
  const [baDet,       setBaDet]      = useState('dauer');
  const [thd,         setThd]        = useState('keine');
  const [duGrenz,     setDuGrenz]    = useState(3.0);
  const [ikA,         setIkA]        = useState('');
  const [tFaultIdx,   setTFaultIdx]  = useState(1);
  const [ergebnis,    setErgebnis]   = useState(null);
  const [modus,       setModus]      = useState('basis');
  const [ansicht,     setAnsicht]    = useState('rechner');

  const isErd  = verlegeart === 'erdreich';
  const isDrei = schaltung  === 'dreiphasig';
  const cosPhi = parseFloat((0.50 + cpIdx*0.05).toFixed(2));
  const sinPhi = parseFloat(Math.sqrt(Math.max(0,1-cosPhi*cosPhi)).toFixed(4));
  const tFault = T_FAULT_OPTS[tFaultIdx];

  const LFH   = fH(anzSk);
  const LFL   = fL(anzLagen);
  const LFT   = fTemp(iso, isErd, temp);
  const LFRho = isErd ? fRho(rho) : 1.0;
  const LFBA  = fBA(ba, baDet);
  const LFTHD = isDrei ? fTHD(thd) : 1.0;
  const LFG   = LFH * LFL * LFT * LFRho * LFBA * LFTHD;
  const kKSAkt = KS_K[material][iso];

  const modusColor   = MODUS_CFG.find(m=>m.wert===modus)?.color ?? C.ak;
  const modusSubtitel = {
    basis:          'DIN VDE 0298 · Schnellschätzung',
    fortgeschritten:'DIN VDE 0298 · Profirechner',
    experte:        'DIN VDE 0298 · Vollnormativ',
  }[modus];

  const onVerleg = (v) => { setVerlegeart(v); setTemp(v==='erdreich'?20:30); };
  const onBa     = (s) => { setBa(s); setBaDet({s1:'dauer',s2:'t30',s3:'ed40'}[s]); };
  const onIso    = (i) => {
    setIso(i);
    const maxT = i==='xlpe' ? 60 : 50;
    if (!isErd && temp > maxT) setTemp(maxT);
  };

  const onBerechnen = () => {
    const params = {
      stromstaerke:   strom,
      laenge,
      schaltungsart:  schaltung,
      cosPhi:         modus === 'basis' ? 1.0 : cosPhi,
      material:       modus === 'basis' ? 'kupfer' : material,
      isolierung:     modus === 'basis' ? 'pvc' : iso,
      verlegeart,
      anzahlSk:       modus === 'basis' ? 1 : anzSk,
      anzahlLagen:    modus === 'experte' ? anzLagen : 1,
      temperatur:     modus === 'basis' ? (isErd ? 20 : 30) : temp,
      bodenRho:       modus === 'basis' ? 1.0 : rho,
      betriebsart:    modus === 'experte' ? ba : 's1',
      betriebDet:     modus === 'experte' ? baDet : 'dauer',
      thd:            modus === 'experte' ? thd : 'keine',
      duGrenzwert:    modus === 'basis' ? 3.0 : duGrenz,
      parallelModus:  modus === 'experte' ? parallelOn : false,
      anzahlParallel: modus === 'experte' ? anzParallel : 1,
      ikA:            modus === 'experte' ? ikA : '',
      tFault,
    };
    setErgebnis(berechne(params));
  };

  const onReset = () => {
    setStrom(''); setLaenge('');
    setSchaltung('einphasig'); setCpIdx(10);
    setMaterial('kupfer'); setIso('pvc'); setVerlegeart('unterputz');
    setParallelOn(false); setAnzParallel(2);
    setAnzSk(1); setAnzLagen(1); setTemp(30); setRho(1.0);
    setBa('s1'); setBaDet('dauer'); setThd('keine');
    setDuGrenz(3.0); setIkA(''); setTFaultIdx(1);
    setErgebnis(null);
  };

  const onModusChange = (neuerModus) => {
    setModus(neuerModus);
    setErgebnis(null);
    if (neuerModus === 'basis') {
      setAnsicht('rechner');
      setMaterial('kupfer'); setIso('pvc'); setCpIdx(10);
      setTemp(isErd ? 20 : 30);
      setAnzSk(1); setAnzLagen(1); setRho(1.0);
      setBa('s1'); setBaDet('dauer'); setThd('keine');
      setDuGrenz(3.0); setParallelOn(false); setAnzParallel(2);
      setIkA(''); setTFaultIdx(1);
    } else if (neuerModus === 'fortgeschritten') {
      setAnzLagen(1);
      setBa('s1'); setBaDet('dauer'); setThd('keine');
      setParallelOn(false); setAnzParallel(2);
      setIkA(''); setTFaultIdx(1);
    }
  };

  const tempOpts = isErd ? TEMP_ERD : (iso==='xlpe' ? TEMP_XLPE : TEMP_PVC);

  return (
    <SafeAreaView style={styles.container}>
      <ExpoStatusBar style="light" backgroundColor={C.bg}/>
      <KeyboardAvoidingView style={{flex:1}} behavior={Platform.OS==='ios'?'padding':'height'}>
        <ScrollView style={styles.scroll} contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>

          {/* ── Kopf ── */}
          <View style={styles.kopf}>
            <Text style={styles.kopfT}>Elektriker Master Tool</Text>
            <Text style={styles.kopfS}>{modusSubtitel}</Text>
          </View>

          <ModusSelector modus={modus} onModusChange={onModusChange}/>

          {modus !== 'basis' && (
            <AnsichtSelector ansicht={ansicht} setAnsicht={setAnsicht} modusColor={modusColor}/>
          )}

          {/* ══════════════════════════════════════════
              KOMPENDIUM-ANSICHT
          ══════════════════════════════════════════ */}
          {modus !== 'basis' && ansicht === 'kompendium' && (
            <KompendiumScreen modus={modus}/>
          )}

          {/* ══════════════════════════════════════════
              RECHNER-ANSICHT
          ══════════════════════════════════════════ */}
          {ansicht === 'rechner' && (
          <>

          {/* KARTE 1: GRUNDPARAMETER */}
          <View style={styles.card}>
            <Text style={[styles.cardT, { borderBottomColor: modusColor }]}>Grundparameter</Text>

            <View style={styles.field}>
              <Text style={styles.flabel}>Stromstärke</Text>
              <View style={styles.inputRow}>
                <TextInput style={styles.input} value={strom} onChangeText={setStrom}
                  keyboardType="decimal-pad" placeholder="z.B. 16" placeholderTextColor={C.soft} returnKeyType="next"/>
                <View style={styles.unit}><Text style={styles.unitTxt}>A</Text></View>
              </View>
            </View>

            <View style={styles.field}>
              <Text style={styles.flabel}>Leitungslänge</Text>
              <View style={styles.inputRow}>
                <TextInput style={styles.input} value={laenge} onChangeText={setLaenge}
                  keyboardType="decimal-pad" placeholder="z.B. 25" placeholderTextColor={C.soft} returnKeyType="done"/>
                <View style={styles.unit}><Text style={styles.unitTxt}>m</Text></View>
              </View>
            </View>

            <View style={styles.field}>
              <Text style={styles.flabel}>Schaltungsart</Text>
              <Btns val={schaltung} set={setSchaltung} opts={[
                {wert:'einphasig',  label:'Einphasig',  sub:'230 V · L-N'},
                {wert:'dreiphasig', label:'Dreiphasig', sub:'400 V · L-L'},
              ]}/>
            </View>

            {modus !== 'basis' && (
            <View style={styles.field}>
              <FieldHead label="Leistungsfaktor cos φ"
                pill={<Pill txt={`sin φ = ${sinPhi.toFixed(3)}`} warn={cosPhi<0.85}/>}/>
              <Stepper v={cpIdx} set={setCpIdx} min={0} max={10}
                fmt={(i)=>`cos φ = ${(0.50+i*0.05).toFixed(2)}`}/>
              {cosPhi<0.9&&<Text style={styles.hint}>Reaktanzanteil (X_L · sin φ) wird berücksichtigt.</Text>}
            </View>
            )}

            {modus !== 'basis' && (
            <View style={styles.field}>
              <Text style={styles.flabel}>Leitermaterial</Text>
              <Btns val={material} set={setMaterial} opts={[
                {wert:'kupfer',    label:'Kupfer (Cu)',    sub:'κ = 56 m/(Ω·mm²)'},
                {wert:'aluminium', label:'Aluminium (Al)', sub:'κ = 34 m/(Ω·mm²)'},
              ]}/>
            </View>
            )}

            {modus !== 'basis' && (
            <View style={styles.field}>
              <Text style={styles.flabel}>Isolierstoff / Kabeltyp</Text>
              <Btns val={iso} set={onIso} opts={[
                {wert:'pvc',  label:'PVC',       sub:'70 °C · NYM / NYY'},
                {wert:'xlpe', label:'XLPE / EPR', sub:'90 °C · N2XH / NYY-O'},
              ]}/>
            </View>
            )}

            <View style={styles.field}>
              <Text style={styles.flabel}>Verlegeart</Text>
              <View style={styles.row}>
                {[{wert:'unterputz',label:'Unterputz',sub:'Typ B'},
                  {wert:'aufputz',  label:'Aufputz',  sub:'Typ C'},
                  {wert:'imRohr',   label:'Im Rohr',  sub:'Typ A'}].map((o,i)=>{
                  const on=o.wert===verlegeart;
                  return(
                    <TouchableOpacity key={o.wert} style={[styles.btn,on&&styles.btnOn,i<2&&{marginRight:6}]}
                      onPress={()=>onVerleg(o.wert)} activeOpacity={0.75}>
                      <Text style={[styles.btnTxt,on&&styles.btnTxtOn]}>{o.label}</Text>
                      <Text style={[styles.btnSub,on&&{color:'rgba(255,255,255,0.6)'}]}>{o.sub}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
              <View style={[styles.row,{marginTop:6}]}>
                {[{wert:'kabelwanne',label:'Kabelwanne / -pritsche',sub:'Typ E'},
                  {wert:'erdreich',  label:'Erdreich',               sub:'Typ D'}].map((o,i)=>{
                  const on=o.wert===verlegeart;
                  return(
                    <TouchableOpacity key={o.wert} style={[styles.btn,on&&styles.btnOn,i===0&&{marginRight:6}]}
                      onPress={()=>onVerleg(o.wert)} activeOpacity={0.75}>
                      <Text style={[styles.btnTxt,on&&styles.btnTxtOn]}>{o.label}</Text>
                      <Text style={[styles.btnSub,on&&{color:'rgba(255,255,255,0.6)'}]}>{o.sub}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {modus === 'experte' && (
            <View style={[styles.field,{marginBottom:0}]}>
              <FieldHead label="Parallelverlegung"
                pill={parallelOn ? <Pill txt={`${anzParallel} × Kabel`} lila/> : null}/>
              <Btns val={parallelOn?'ja':'nein'} set={v=>setParallelOn(v==='ja')} opts={[
                {wert:'nein', label:'Einzelkabel',       sub:'Standard'},
                {wert:'ja',   label:'Parallelverlegung', sub:'n Kabel gleich'},
              ]}/>
              {parallelOn&&(
                <>
                  <View style={{marginTop:10}}>
                    <Stepper v={anzParallel} set={setAnzParallel} min={2} max={6} fmt={(n)=>`${n} Parallelkabel`}/>
                  </View>
                  <Text style={styles.hint}>
                    Alle Kabel: gleiche Länge, Querschnitt, Verlegeart.{'\n'}
                    Häufungsanzahl ggf. um {anzParallel-1} erhöhen.
                  </Text>
                </>
              )}
            </View>
            )}

            {modus === 'basis' && (
              <View style={styles.basisInfo}>
                <Text style={styles.basisInfoTxt}>
                  {'Feste Annahmen: Kupfer · PVC 70°C · cos φ = 1,0 · Temp. 30°C · ΔU ≤ 3%'}
                </Text>
              </View>
            )}
          </View>

          {/* KARTE 2: KORREKTURFAKTOREN */}
          {modus !== 'basis' && (
          <View style={styles.card}>
            <Text style={[styles.cardT, { borderBottomColor: modusColor }]}>Korrekturfaktoren · DIN VDE 0298-4</Text>

            <View style={styles.field}>
              <FieldHead label="Häufung – Stromkreise (Tab. 17)"
                pill={<Pill txt={`fᴴ = ${LFH.toFixed(2)}`} warn={LFH<0.7}/>}/>
              <Stepper v={anzSk} set={setAnzSk} min={1} max={20} fmt={(n)=>`${n} Stromkreis${n>1?'e':''}`}/>
              <Text style={styles.hint}>{anzSk===1?'Einzeln verlegt.':'Einlagig, aneinanderliegend.'}</Text>
            </View>

            {modus === 'experte' && anzSk>1&&(
              <View style={styles.field}>
                <FieldHead label="Lagen (mehrlagige Häufung)"
                  pill={<Pill txt={`fˡ = ${LFL.toFixed(2)}`} warn={LFL<1.0}/>}/>
                <Stepper v={anzLagen} set={setAnzLagen} min={1} max={5} fmt={(n)=>`${n} Lage${n>1?'n':''}`}/>
              </View>
            )}

            <Sep/>

            <View style={styles.field}>
              <FieldHead
                label={isErd?'Bodentemperatur (Tab. 14)':`Umgebungstemperatur (Tab. 15 · ${iso.toUpperCase()})`}
                pill={<Pill txt={`fᵀ = ${LFT.toFixed(2)}`} warn={LFT<0.87}/>}/>
              <View style={styles.row}>
                {tempOpts.map((t,i)=>{
                  const on=t===temp;
                  return(
                    <TouchableOpacity key={t}
                      style={[styles.tBtn,on&&styles.tBtnOn,i<tempOpts.length-1&&{marginRight:5}]}
                      onPress={()=>setTemp(t)} activeOpacity={0.75}>
                      <Text style={[styles.tBtnTxt,on&&{color:C.w}]}>{t}°</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
              <Text style={styles.hint}>
                {isErd?'Bodentemperatur ca. 0,7–1,0 m Tiefe. Bezug 20 °C.':`Bezug 30 °C. ${iso==='xlpe'?'XLPE bis 60 °C.':'PVC bis 50 °C.'}`}
              </Text>
            </View>

            {isErd&&(
              <View style={styles.field}>
                <FieldHead label="Boden-Wärmewiderstand ρ [K·m/W] (Tab. 14)"
                  pill={<Pill txt={`fᵨ = ${LFRho.toFixed(2)}`} warn={LFRho<0.85}/>}/>
                <View style={[styles.row,{flexWrap:'wrap'}]}>
                  {RHO_OPTS.map((o,i)=>{
                    const on=o.wert===rho;
                    return(
                      <TouchableOpacity key={o.wert}
                        style={[styles.rhoBtn,on&&styles.rhoBtnOn,i%3!==2&&{marginRight:6},i<3&&{marginBottom:6}]}
                        onPress={()=>setRho(o.wert)} activeOpacity={0.75}>
                        <Text style={[styles.rhoBig,on&&{color:C.w}]}>{o.label}</Text>
                        <Text style={[styles.rhoSm,on&&{color:'rgba(255,255,255,0.65)'}]}>{o.sub}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
                <Text style={styles.hint}>Normwert 1,0 K·m/W. Trockener Sand ≈ 2,5.</Text>
              </View>
            )}

            {modus === 'experte' && (
            <>
              <Sep/>
              <View style={styles.field}>
                <FieldHead label="Betriebsart" pill={<Pill txt={`fᴮ = ${LFBA.toFixed(2)}`}/>}/>
                <Btns val={ba} set={onBa} opts={[
                  {wert:'s1',label:'S1',sub:'Dauerbetrieb'},
                  {wert:'s2',label:'S2',sub:'Kurzzeitbetrieb'},
                  {wert:'s3',label:'S3',sub:'Aussetzbetrieb'},
                ]}/>
                {ba==='s2'&&(
                  <View style={{marginTop:10}}>
                    <Text style={styles.subLbl}>Einschaltdauer</Text>
                    <Btns val={baDet} set={setBaDet} sm opts={[
                      {wert:'t10',label:'10 min'},{wert:'t30',label:'30 min'},
                      {wert:'t60',label:'60 min'},{wert:'t90',label:'90 min'},
                    ]}/>
                  </View>
                )}
                {ba==='s3'&&(
                  <View style={{marginTop:10}}>
                    <Text style={styles.subLbl}>Einschaltdauer ED</Text>
                    <Btns val={baDet} set={setBaDet} sm opts={[
                      {wert:'ed15',label:'ED 15 %'},{wert:'ed25',label:'ED 25 %'},
                      {wert:'ed40',label:'ED 40 %'},{wert:'ed60',label:'ED 60 %'},
                    ]}/>
                  </View>
                )}
                {ba!=='s1'&&<Text style={styles.hint}>Nur für Motoren/Maschinen. Heiz-/Beleuchtungslasten stets S1.</Text>}
              </View>
            </>
            )}

            {modus === 'experte' && isDrei&&(
              <>
                <Sep/>
                <View style={[styles.field,{marginBottom:0}]}>
                  <FieldHead label="Oberschwingungen / THD (IEC 60364-5-52)"
                    pill={<Pill txt={`fᵀᴴᴰ = ${LFTHD.toFixed(2)}`} warn={LFTHD<1.0}/>}/>
                  <Btns val={thd} set={setThd} opts={[
                    {wert:'keine', label:'Keine',  sub:'THD ≤ 15 %'},
                    {wert:'mittel',label:'Mittel', sub:'THD 15–33 %'},
                    {wert:'stark', label:'Stark',  sub:'THD > 33 %'},
                  ]}/>
                  {thd==='stark'&&(
                    <View style={styles.amberBox}>
                      <Text style={styles.amberTxt}>⚠  I_N ≈ 1,45 × I_Phase – Neutralleiter auf Außenleiterquerschnitt!</Text>
                    </View>
                  )}
                  {thd==='mittel'&&<Text style={styles.hint}>Abminderung auf 86 %. Typisch: Bürogeräte, EDV.</Text>}
                </View>
              </>
            )}
          </View>
          )}

          {/* KARTE 3: GRENZWERTE & KURZSCHLUSS */}
          {modus !== 'basis' && (
          <View style={styles.card}>
            <Text style={[styles.cardT, { borderBottomColor: modusColor }]}>Grenzwerte & Kurzschlussprüfung</Text>

            <View style={styles.field}>
              <Text style={styles.flabel}>Zulässiger Spannungsfall ΔU [%]</Text>
              <View style={styles.row}>
                {DU_OPTS.map((d,i)=>{
                  const on=d===duGrenz;
                  return(
                    <TouchableOpacity key={d}
                      style={[styles.btn,on&&styles.btnOn,i<DU_OPTS.length-1&&{marginRight:6}]}
                      onPress={()=>setDuGrenz(d)} activeOpacity={0.75}>
                      <Text style={[styles.btnTxt,on&&styles.btnTxtOn]}>{d} %</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
              <Text style={styles.hint}>Endstromkreise: 3 % · Verteilungsleitung: bis 5 % (DIN VDE 0100-520).</Text>
            </View>

            {modus === 'experte' && (
            <>
              <Sep/>
              <View style={[styles.field,{marginBottom:0}]}>
                <Text style={styles.flabel}>Kurzschluss-Thermische Festigkeit (optional)</Text>
                <Text style={styles.hint}>
                  {`${iso.toUpperCase()} ${material==='kupfer'?'Cu':'Al'} → k = ${kKSAkt}  ·  A_min = I_k / ${parallelOn?anzParallel:1} × √t / k`}
                </Text>
                <Text style={[styles.flabel,{marginTop:12}]}>Kurzschlussstrom I_k</Text>
                <View style={styles.inputRow}>
                  <TextInput style={styles.input} value={ikA} onChangeText={setIkA}
                    keyboardType="decimal-pad" placeholder="z.B. 3,5 (leer = überspringen)"
                    placeholderTextColor={C.soft}/>
                  <View style={styles.unit}><Text style={styles.unitTxt}>kA</Text></View>
                </View>
                <Text style={[styles.flabel,{marginTop:12}]}>Abschaltzeit Schutzorgan</Text>
                <Btns val={tFaultIdx} set={setTFaultIdx} opts={[
                  {wert:0,label:'0,1 s',sub:'MCB inst.'},
                  {wert:1,label:'0,2 s',sub:'MCB'},
                  {wert:2,label:'0,4 s',sub:'Sicherung'},
                  {wert:3,label:'1,0 s',sub:'Träge'},
                ]}/>
                {(()=>{
                  const Ikn = parseFloat(String(ikA||'').replace(',','.'));
                  if (!isNaN(Ikn)&&Ikn>0) {
                    const IkKabel = Ikn*1000/(parallelOn?anzParallel:1);
                    const aMin = IkKabel*Math.sqrt(tFault)/kKSAkt;
                    const aRound = ALLE_QS.find(q=>q>=aMin);
                    return(
                      <View style={styles.ksPreview}>
                        <Text style={styles.ksPreviewTxt}>
                          {`I_k/Kabel = ${IkKabel.toFixed(0)} A  →  A_min = ${aMin.toFixed(1)} mm²${aRound?`  →  ${aRound} mm²`:'  →  > 120 mm²!'}`}
                        </Text>
                      </View>
                    );
                  }
                  return null;
                })()}
              </View>
            </>
            )}
          </View>
          )}

          {/* Gesamtfaktor */}
          {modus !== 'basis' && (
          <View style={[styles.gesamtCard, LFG<0.45&&{backgroundColor:'#7f1d1d'}]}>
            <Text style={styles.gesamtLbl}>Gesamtkorrekturfaktor f_ges</Text>
            <Text style={styles.gesamtForm}>
              {`fᴴ${LFH.toFixed(2)} × fˡ${LFL.toFixed(2)} × fᵀ${LFT.toFixed(2)} × fᵨ${LFRho.toFixed(2)} × fᴮ${LFBA.toFixed(2)} × fᵀᴴᴰ${LFTHD.toFixed(2)}`}
            </Text>
            <Text style={styles.gesamtWert}>
              {'= '}<Text style={[styles.gesamtH, LFG<0.5&&{color:'#fca5a5'}]}>{LFG.toFixed(3)}</Text>
            </Text>
            {LFG<0.5&&<Text style={styles.gesamtWarn}>⚠  Gesamtfaktor unter 0,5!</Text>}
          </View>
          )}

          {/* Buttons */}
          <TouchableOpacity style={styles.calcBtn} onPress={onBerechnen} activeOpacity={0.85}>
            <Text style={styles.calcBtnTxt}>Berechnen</Text>
          </TouchableOpacity>
          {ergebnis&&(
            <TouchableOpacity style={styles.resetBtn} onPress={onReset} activeOpacity={0.75}>
              <Text style={styles.resetBtnTxt}>Zurücksetzen</Text>
            </TouchableOpacity>
          )}

          {/* KARTE 4: ERGEBNIS */}
          {ergebnis&&(
            <View style={styles.card}>
              <Text style={[styles.cardT, { borderBottomColor: modusColor }]}>Ergebnis</Text>
              {ergebnis.fehler ? (
                <View style={styles.errBox}>
                  <Text style={styles.errIcon}>⚠</Text>
                  <Text style={styles.errTxt}>{ergebnis.fehler}</Text>
                </View>
              ) : (
                <>
                  <View style={styles.banner}>
                    <Text style={styles.bannerLbl}>
                      {ergebnis.nP>1 ? `${ergebnis.nP} × Parallelkabel` : 'Empfohlener Querschnitt'}
                    </Text>
                    <View style={styles.bannerRow}>
                      {ergebnis.nP>1&&<Text style={styles.bannerN}>{ergebnis.nP} ×</Text>}
                      <Text style={styles.bannerQ}>{ergebnis.querschnitt}</Text>
                      <Text style={styles.bannerEinh}> mm²</Text>
                    </View>
                    <View style={styles.bannerBadges}>
                      <View style={styles.bBadge}><Text style={styles.bBadgeTxt}>Nennstrom {ergebnis.iTabelle} A</Text></View>
                      {ergebnis.nP>1&&<View style={styles.bBadge}><Text style={styles.bBadgeTxt}>{ergebnis.iKabel.toFixed(1)} A/Kabel</Text></View>}
                      <View style={styles.bBadge}><Text style={styles.bBadgeTxt}>Korr. {ergebnis.korrigKap.toFixed(1)} A</Text></View>
                      <View style={styles.bBadge}><Text style={styles.bBadgeTxt}>{modus==='basis'?'PVC · Kupfer':iso.toUpperCase()}</Text></View>
                    </View>
                    <View style={styles.peBadge}>
                      <Text style={styles.peTxt}>{ergebnis.nP>1?`${ergebnis.nP} × PE: ${ergebnis.peQ} mm² (je Kabel)`:`PE / N: ${ergebnis.peQ} mm²`}</Text>
                      <Text style={[styles.peSub, ergebnis.neutDom&&{color:'#fca5a5'}]}>{ergebnis.peHinw}</Text>
                    </View>
                    {ergebnis.neutDom&&(
                      <View style={[styles.amberBox,{marginTop:10,marginHorizontal:0}]}>
                        <Text style={styles.amberTxt}>⚠  N-Leiter auf Außenleiterquerschnitt! I_N ≈ {ergebnis.iEff.toFixed(1)} A.</Text>
                      </View>
                    )}
                  </View>

                  {modus === 'experte' && (
                  <View style={styles.kritBox}>
                    <Text style={styles.kritBoxTitel}>Dimensionierungskriterien</Text>
                    <KritRow label="Strombelastbarkeit (mit f_ges)" qMin={ergebnis.qMinStrom} maßgebend={ergebnis.kriterium==='strom'} ok={true}/>
                    <View style={styles.kritSep}/>
                    <KritRow label={`Spannungsfall ΔU ≤ ${duGrenz} %`} qMin={ergebnis.qMinSF} maßgebend={ergebnis.kriterium==='sf'} ok={!ergebnis.sfWarn}/>
                    {ergebnis.qMinKS!=null&&(
                      <>
                        <View style={styles.kritSep}/>
                        <KritRow label={`Kurzschluss-Festigkeit (k=${kKSAkt}, t=${tFault} s)`} qMin={ergebnis.qMinKS} maßgebend={ergebnis.kriterium==='kurzschluss'} ok={true}/>
                        {ergebnis.aMinKSexact!=null&&<Text style={[styles.hint,{marginTop:4}]}>A_min (exakt) = {ergebnis.aMinKSexact.toFixed(2)} mm²</Text>}
                      </>
                    )}
                  </View>
                  )}

                  {modus !== 'basis' && (
                  <View style={styles.fBox}>
                    <Text style={styles.fBoxTitel}>Korrekturfaktoren</Text>
                    <FaktorRow label="Häufung einlagig (Tab. 17)" detail={anzSk===1?'Einzeln':`${anzSk} Stromkreise`} wert={`fᴴ = ${ergebnis.FH.toFixed(2)}`}/>
                    {modus==='experte'&&anzSk>1&&<><View style={styles.fsep}/><FaktorRow label="Lagenanzahl" detail={`${anzLagen} Lage${anzLagen>1?'n':''}`} wert={`fˡ = ${ergebnis.FL.toFixed(2)}`}/></>}
                    <View style={styles.fsep}/>
                    <FaktorRow label={isErd?`Bodentemp. (Tab.14 ${iso.toUpperCase()})`:`Temperatur (Tab.15 ${iso.toUpperCase()})`} detail={`${temp} °C`} wert={`fᵀ = ${ergebnis.FT.toFixed(2)}`}/>
                    {isErd&&<><View style={styles.fsep}/><FaktorRow label="Boden-Wärmewiderstand (Tab.14)" detail={`ρ = ${rho} K·m/W`} wert={`fᵨ = ${ergebnis.FRho.toFixed(2)}`}/></>}
                    {modus==='experte'&&<><View style={styles.fsep}/><FaktorRow label="Betriebsart" detail={ba==='s1'?'S1 Dauer':ba==='s2'?`S2 ${baDet.replace('t','')} min`:`S3 ED ${baDet.replace('ed','')} %`} wert={`fᴮ = ${ergebnis.FBA.toFixed(2)}`}/></>}
                    {modus==='experte'&&isDrei&&<><View style={styles.fsep}/><FaktorRow label="Oberschwingungen / THD" detail={thd==='keine'?'≤15 %':thd==='mittel'?'15–33 %':'>33 %'} wert={`fᵀᴴᴰ = ${ergebnis.FTHD.toFixed(2)}`}/></>}
                    <View style={[styles.fsep,{marginBottom:4}]}/>
                    <FaktorRow label="Gesamtfaktor" detail={`I_erf = ${ergebnis.iErf.toFixed(1)} A`} wert={`f_ges = ${ergebnis.FG.toFixed(3)}`}/>
                  </View>
                  )}

                  {modus !== 'basis' && (
                  <View style={[styles.sfBox, ergebnis.sfWarn?styles.sfWarn:styles.sfOk]}>
                    <Text style={[styles.sfTitel,{color:ergebnis.sfWarn?C.warn:C.ok}]}>
                      {ergebnis.sfWarn?`⚠  Spannungsfall > ${duGrenz} %`:`✓  Spannungsfall ≤ ${duGrenz} %`}
                    </Text>
                    <Text style={[styles.sfWert,{color:ergebnis.sfWarn?C.warn:C.ok}]}>{ergebnis.sf.pct.toFixed(2)} %</Text>
                    <Text style={styles.sfDet}>ΔU = {ergebnis.sf.V.toFixed(2)} V  ·  Grenzwert {duGrenz} %</Text>
                    {modus==='experte'&&ergebnis.xRel&&(
                      <View style={styles.reactBox}>
                        <Text style={styles.reactTxt}>R·cosφ: {ergebnis.sf.mR.toFixed(3)} mΩ/m  ·  X·sinφ: {ergebnis.sf.mX.toFixed(3)} mΩ/m</Text>
                      </View>
                    )}
                    {ergebnis.sfWarn&&<Text style={styles.sfHint}>Leitungslänge reduzieren, Querschnitt erhöhen oder Verteilerpunkt vorziehen.</Text>}
                  </View>
                  )}

                  {modus === 'basis' && (
                  <View style={[styles.sfBox, ergebnis.sfWarn?styles.sfWarn:styles.sfOk]}>
                    <Text style={[styles.sfTitel,{color:ergebnis.sfWarn?C.warn:C.ok}]}>
                      {ergebnis.sfWarn?'⚠  Spannungsfall > 3 %':'✓  Spannungsfall ≤ 3 %'}
                    </Text>
                    <Text style={[styles.sfWert,{color:ergebnis.sfWarn?C.warn:C.ok}]}>{ergebnis.sf.pct.toFixed(2)} %</Text>
                    <Text style={styles.sfDet}>ΔU = {ergebnis.sf.V.toFixed(2)} V</Text>
                    {ergebnis.sfWarn&&<Text style={styles.sfHint}>Leitungslänge reduzieren oder größeren Querschnitt wählen.</Text>}
                  </View>
                  )}

                  {modus === 'experte' && (
                  <View style={styles.begrBox}>
                    <Text style={styles.begrT}>Begründung</Text>
                    <Text style={styles.begrTxt}>{ergebnis.beg}</Text>
                  </View>
                  )}
                </>
              )}
            </View>
          )}

          {/* Fußnote */}
          <View style={styles.fuss}>
            <Text style={styles.fussTxt}>
              DIN VDE 0298-4 Tab.11/12/14/15/17 · IEC 60364-5-52 · DIN VDE 0100-434/540{'\n'}
              Keine Haftung – Planung durch Elektrofachkraft prüfen lassen.
            </Text>
          </View>

          </>
          )}

        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// ════════════════════════════════════════════════════════════
// STILE
// ════════════════════════════════════════════════════════════
const styles = StyleSheet.create({
  container:{ flex:1, backgroundColor:C.bg },
  scroll:   { flex:1 },
  content:  { paddingBottom:48 },

  kopf: { paddingTop:28, paddingBottom:16, paddingHorizontal:20, alignItems:'center' },
  kopfT:{ fontSize:24, fontWeight:'800', color:C.w, textAlign:'center' },
  kopfS:{ fontSize:12, color:C.grau, marginTop:5, letterSpacing:1.1, textTransform:'uppercase' },

  modusWrap:    { marginHorizontal:16, marginBottom:8, backgroundColor:'rgba(255,255,255,0.08)', borderRadius:14, padding:6, flexDirection:'row' },
  modusBtn:     { flex:1, paddingVertical:12, borderRadius:10, alignItems:'center', justifyContent:'center' },
  modusLabel:   { fontSize:13, fontWeight:'700', color:'rgba(255,255,255,0.45)', textAlign:'center' },
  modusLabelOn: { color:'#ffffff' },
  modusBadge:   { fontSize:10, fontWeight:'800', textTransform:'uppercase', letterSpacing:0.5, marginTop:2, textAlign:'center' },

  ansichtWrap:  { marginHorizontal:16, marginBottom:12, flexDirection:'row', gap:8 },
  ansichtBtn:   { flex:1, paddingVertical:11, borderRadius:12, alignItems:'center', backgroundColor:'rgba(255,255,255,0.1)', borderWidth:1.5, borderColor:'rgba(255,255,255,0.15)' },
  ansichtTxt:   { fontSize:14, fontWeight:'700', color:'rgba(255,255,255,0.5)' },
  ansichtTxtOn: { color:'#ffffff' },

  card: {
    backgroundColor:C.card, marginHorizontal:16, marginBottom:12,
    borderRadius:16, padding:20,
    shadowColor:'#000', shadowOffset:{width:0,height:4}, shadowOpacity:0.18, shadowRadius:8, elevation:6,
  },
  cardT: { fontSize:14, fontWeight:'700', color:C.bg, marginBottom:18, paddingBottom:10, borderBottomWidth:2, borderBottomColor:C.rand },

  field:   { marginBottom:18 },
  fhead:   { flexDirection:'row', justifyContent:'space-between', alignItems:'center', marginBottom:8 },
  flabel:  { fontSize:12, fontWeight:'700', color:C.text, textTransform:'uppercase', letterSpacing:0.7 },
  inputRow:{ flexDirection:'row', alignItems:'center' },
  input:   { flex:1, backgroundColor:C.hell, borderWidth:1.5, borderColor:C.rand, borderRadius:12, paddingHorizontal:16, paddingVertical:15, fontSize:20, fontWeight:'600', color:C.text },
  unit:    { marginLeft:10, backgroundColor:C.bg, borderRadius:10, paddingHorizontal:14, paddingVertical:10, minWidth:48, alignItems:'center' },
  unitTxt: { color:C.w, fontSize:16, fontWeight:'700' },

  row:    { flexDirection:'row' },
  btn:    { flex:1, paddingVertical:12, paddingHorizontal:4, borderRadius:12, borderWidth:1.5, borderColor:C.rand, backgroundColor:C.hell, alignItems:'center', justifyContent:'center' },
  btnOn:  { backgroundColor:C.bg, borderColor:C.bg },
  btnSm:  { paddingVertical:10 },
  btnTxt: { fontSize:14, fontWeight:'700', color:C.text, textAlign:'center' },
  btnTxtOn:{ color:C.w },
  btnSub: { fontSize:11, color:C.soft, marginTop:2, textAlign:'center' },

  stepBtn:    { width:52, height:52, borderRadius:12, backgroundColor:C.bg, alignItems:'center', justifyContent:'center' },
  stepTxt:    { color:C.w, fontSize:26, fontWeight:'300', lineHeight:30 },
  stepVal:    { flex:1, alignItems:'center', backgroundColor:C.hell, marginHorizontal:10, borderRadius:12, paddingVertical:12, borderWidth:1.5, borderColor:C.rand },
  stepValTxt: { fontSize:17, fontWeight:'700', color:C.text },

  pill:    { backgroundColor:C.bgMid, borderRadius:8, paddingHorizontal:10, paddingVertical:4 },
  pillTxt: { color:C.w, fontSize:12, fontWeight:'700' },

  tBtn:    { flex:1, paddingVertical:12, borderRadius:10, borderWidth:1.5, borderColor:C.rand, backgroundColor:C.hell, alignItems:'center' },
  tBtnOn:  { backgroundColor:C.bg, borderColor:C.bg },
  tBtnTxt: { fontSize:14, fontWeight:'600', color:C.text },

  rhoBtn:  { width:'30%', paddingVertical:10, borderRadius:10, borderWidth:1.5, borderColor:C.rand, backgroundColor:C.hell, alignItems:'center' },
  rhoBtnOn:{ backgroundColor:C.bg, borderColor:C.bg },
  rhoBig:  { fontSize:16, fontWeight:'700', color:C.text },
  rhoSm:   { fontSize:10, color:C.soft, marginTop:2, textAlign:'center' },

  subLbl:  { fontSize:11, fontWeight:'600', color:C.soft, marginBottom:6, textTransform:'uppercase', letterSpacing:0.5 },
  hint:    { fontSize:12, color:C.soft, marginTop:7, lineHeight:16 },
  sep:     { height:1.5, backgroundColor:C.rand, marginVertical:16 },

  amberBox:{ marginTop:10, backgroundColor:C.amberBg, borderRadius:10, padding:12, borderWidth:1.5, borderColor:C.amberRand },
  amberTxt:{ fontSize:13, color:C.amber, lineHeight:19 },

  ksPreview:   { marginTop:10, backgroundColor:C.infoBg, borderRadius:10, padding:12, borderWidth:1.5, borderColor:C.infoRand },
  ksPreviewTxt:{ fontSize:13, color:C.info, fontWeight:'600' },

  gesamtCard:{ marginHorizontal:16, marginBottom:12, backgroundColor:C.bgMid, borderRadius:14, paddingVertical:14, paddingHorizontal:18 },
  gesamtLbl: { fontSize:11, color:C.grau, fontWeight:'700', textTransform:'uppercase', letterSpacing:0.8, marginBottom:4 },
  gesamtForm:{ fontSize:12, color:'rgba(255,255,255,0.65)', marginBottom:3 },
  gesamtWert:{ fontSize:18, color:C.w, fontWeight:'700' },
  gesamtH:   { fontSize:26, color:'#60a5fa', fontWeight:'900' },
  gesamtWarn:{ fontSize:12, color:'#fbbf24', marginTop:6 },

  calcBtn:    { marginHorizontal:16, marginBottom:10, backgroundColor:C.ak, borderRadius:14, paddingVertical:17, alignItems:'center', shadowColor:C.ak, shadowOffset:{width:0,height:4}, shadowOpacity:0.4, shadowRadius:8, elevation:6 },
  calcBtnTxt: { color:C.w, fontSize:18, fontWeight:'800', letterSpacing:0.5 },
  resetBtn:   { marginHorizontal:16, marginBottom:10, borderRadius:14, paddingVertical:13, alignItems:'center', borderWidth:1.5, borderColor:'rgba(255,255,255,0.25)' },
  resetBtnTxt:{ color:'rgba(255,255,255,0.55)', fontSize:15, fontWeight:'600' },

  banner:      { backgroundColor:C.bg, borderRadius:12, paddingVertical:22, paddingHorizontal:16, alignItems:'center', marginBottom:14 },
  bannerLbl:   { color:C.grau, fontSize:11, fontWeight:'600', letterSpacing:1, textTransform:'uppercase', marginBottom:6 },
  bannerRow:   { flexDirection:'row', alignItems:'flex-end' },
  bannerN:     { color:'rgba(255,255,255,0.5)', fontSize:36, fontWeight:'900', lineHeight:68, marginRight:6 },
  bannerQ:     { color:C.w, fontSize:64, fontWeight:'900', lineHeight:68 },
  bannerEinh:  { color:C.grau, fontSize:24, fontWeight:'700', marginBottom:10 },
  bannerBadges:{ flexDirection:'row', flexWrap:'wrap', justifyContent:'center', marginTop:10 },
  bBadge:      { backgroundColor:'rgba(255,255,255,0.15)', borderRadius:8, paddingHorizontal:12, paddingVertical:5, margin:3 },
  bBadgeTxt:   { color:C.w, fontSize:12, fontWeight:'600' },
  peBadge:     { marginTop:12, backgroundColor:'rgba(255,255,255,0.1)', borderRadius:10, paddingHorizontal:16, paddingVertical:8, alignItems:'center' },
  peTxt:       { color:'#93c5fd', fontSize:15, fontWeight:'700' },
  peSub:       { color:'rgba(255,255,255,0.45)', fontSize:11, marginTop:2 },

  kritBox:     { backgroundColor:C.hell, borderRadius:12, padding:14, marginBottom:12, borderWidth:1.5, borderColor:C.rand },
  kritBoxTitel:{ fontSize:11, fontWeight:'700', color:C.bgMid, textTransform:'uppercase', letterSpacing:0.8, marginBottom:10 },
  kritRow:     { flexDirection:'row', alignItems:'center', paddingVertical:6 },
  kritLabel:   { fontSize:13, color:C.text, fontWeight:'600' },
  kritMin:     { fontSize:12, color:C.soft, marginTop:1 },
  kritRechts:  { flexDirection:'row', alignItems:'center' },
  kritMaßBadge:{ backgroundColor:C.lila, borderRadius:6, paddingHorizontal:8, paddingVertical:3, marginRight:6 },
  kritMaßTxt:  { color:C.w, fontSize:10, fontWeight:'800' },
  kritStatusBadge:{ width:28, height:28, borderRadius:14, alignItems:'center', justifyContent:'center' },
  kritOk:      { backgroundColor:C.ok },
  kritWarn:    { backgroundColor:C.warn },
  kritStatusTxt:{ color:C.w, fontSize:14, fontWeight:'700' },
  kritSep:     { height:1, backgroundColor:C.rand, marginVertical:2 },

  fBox:        { backgroundColor:C.hell, borderRadius:12, padding:14, marginBottom:12, borderWidth:1.5, borderColor:C.rand },
  fBoxTitel:   { fontSize:11, fontWeight:'700', color:C.bgMid, textTransform:'uppercase', letterSpacing:0.8, marginBottom:10 },
  frow:        { flexDirection:'row', justifyContent:'space-between', alignItems:'center', paddingVertical:5 },
  frowL:       { fontSize:13, color:C.text, fontWeight:'500', flex:1 },
  frowR:       { flexDirection:'row', alignItems:'center' },
  frowD:       { fontSize:11, color:C.soft, marginRight:8 },
  frowBadge:   { backgroundColor:C.bgMid, borderRadius:8, paddingHorizontal:10, paddingVertical:4 },
  frowBadgeTxt:{ color:C.w, fontSize:12, fontWeight:'700' },
  fsep:        { height:1, backgroundColor:C.rand, marginVertical:2 },

  sfBox:  { borderRadius:12, padding:16, marginBottom:12, borderWidth:1.5 },
  sfOk:   { backgroundColor:C.okBg,   borderColor:C.okRand },
  sfWarn: { backgroundColor:C.warnBg, borderColor:C.warnRand },
  sfTitel:{ fontSize:14, fontWeight:'700', marginBottom:6 },
  sfWert: { fontSize:28, fontWeight:'800', marginBottom:2 },
  sfDet:  { fontSize:12, color:C.soft, marginBottom:4 },
  reactBox:{ marginTop:6, padding:8, backgroundColor:C.infoBg, borderRadius:8, borderWidth:1, borderColor:C.infoRand },
  reactTxt:{ fontSize:12, color:C.info },
  sfHint: { fontSize:13, color:C.warn, lineHeight:19, marginTop:8 },

  begrBox:{ backgroundColor:C.hell, borderRadius:12, padding:14 },
  begrT:  { fontSize:11, fontWeight:'700', color:C.bgMid, textTransform:'uppercase', letterSpacing:0.8, marginBottom:6 },
  begrTxt:{ fontSize:14, color:C.text, lineHeight:21 },

  errBox: { backgroundColor:C.warnBg, borderRadius:12, padding:18, borderWidth:1.5, borderColor:C.warnRand, alignItems:'center' },
  errIcon:{ fontSize:28, marginBottom:8 },
  errTxt: { color:C.warn, fontSize:15, fontWeight:'600', textAlign:'center', lineHeight:22 },

  basisInfo:    { marginTop:4, backgroundColor:C.infoBg, borderRadius:10, padding:10, borderWidth:1, borderColor:C.infoRand },
  basisInfoTxt: { fontSize:12, color:C.soft, textAlign:'center', lineHeight:17 },

  // Kompendium-Stile
  kompSekt:     { backgroundColor:C.card, marginHorizontal:16, marginBottom:8, borderRadius:16, overflow:'hidden', shadowColor:'#000', shadowOffset:{width:0,height:2}, shadowOpacity:0.12, shadowRadius:6, elevation:4 },
  kompSektHead: { flexDirection:'row', padding:16, alignItems:'center', backgroundColor:C.card },
  kompSektIcon: { fontSize:20, marginRight:10 },
  kompSektTitel:{ flex:1, fontWeight:'700', color:C.text, fontSize:14 },
  kompSektPfeil:{ color:C.soft, fontSize:14, fontWeight:'700' },
  kompBody:     { paddingHorizontal:16, paddingBottom:16 },
  kompAbschnitt:{ fontSize:12, fontWeight:'800', color:C.bgMid, textTransform:'uppercase', letterSpacing:0.8, marginTop:14, marginBottom:4 },

  formelBox:    { backgroundColor:'#0d2b5e', borderRadius:10, padding:14, marginVertical:6 },
  formelTxt:    { color:'#93c5fd', fontSize:13, fontFamily: Platform.OS==='ios'?'Courier':'monospace', lineHeight:22 },

  schrittRow:   { flexDirection:'row', alignItems:'flex-start', marginBottom:10, marginTop:4 },
  schrittNr:    { width:26, height:26, borderRadius:13, backgroundColor:C.ak, alignItems:'center', justifyContent:'center', marginRight:10, marginTop:1 },
  schrittNrTxt: { color:C.w, fontSize:12, fontWeight:'800' },
  schrittTxt:   { flex:1, fontSize:13, color:C.text, lineHeight:20 },

  regelRow:     { flexDirection:'row', alignItems:'flex-start', marginBottom:12, marginTop:4 },
  regelNr:      { width:26, height:26, borderRadius:13, backgroundColor:C.warn, alignItems:'center', justifyContent:'center', marginRight:10, marginTop:1 },
  regelNrTxt:   { color:C.w, fontSize:12, fontWeight:'800' },
  regelTitelTxt:{ fontSize:13, fontWeight:'700', color:C.text, marginBottom:2 },

  grenzwertBox: { backgroundColor:C.hell, borderRadius:10, borderWidth:1.5, borderColor:C.rand, marginVertical:6, overflow:'hidden' },
  grenzwertRow: { flexDirection:'row', justifyContent:'space-between', alignItems:'center', paddingHorizontal:12, paddingVertical:9, borderBottomWidth:1, borderBottomColor:C.rand },
  grenzwertLbl: { fontSize:12, color:C.text, flex:1, lineHeight:17 },
  grenzwertVal: { fontSize:12, fontWeight:'800', color:C.ok, marginLeft:8, textAlign:'right' },

  fuss:   { marginHorizontal:16, marginTop:4, padding:14, backgroundColor:'rgba(255,255,255,0.07)', borderRadius:12 },
  fussTxt:{ color:'rgba(255,255,255,0.4)', fontSize:11, lineHeight:16, textAlign:'center' },
});
