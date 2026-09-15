// Q7-ERP Artikel-Import — Excel-Daten (D2_Artikelnummer_Doku_D2.ods)
// Speicherort: D:\Projekt2027\ERP System\scripts\artikel-import.js
//
// Enthaelt 149 Artikel aus 4 Excel-Blaettern (Artikel VM, Artikel Holz Band,
// Artikel Kantenband, Artikel Werkzeuge). "Artikelstamm" (Index) und
// "Artikel mdf teile" (Zuschnittliste) wurden bewusst NICHT importiert.
//
// grundpreis ist Platzhalter 0 (Beschluss 4B, Grill-Me-Session) — echte Preise
// kommen spaeter separat ueber den Einkauf (ArtikelLieferant), nicht hier.
//
// Ablauf:
//   1. Login (POST /auth/login)
//   2. VORSCHAU aller 149 Artikel in der Konsole (kein Schreibzugriff)
//   3. Rueckfrage "wirklich anlegen? (j/N)"
//   4. Erst nach "j" werden die Artikel per POST /artikel angelegt
//   5. Ergebnis-Report: wie viele erfolgreich, welche Fehler bei welcher Zeile
//
// Ausfuehren mit:  node artikel-import.js

const readline = require('readline');

const API_BASE = 'http://localhost:3000';
const LOGIN = { email: 'mbgroupeuro@gmail.com', passwort: 'Tanger2030#' };

const ARTIKEL = [{"artikelnummer": "1", "name": "Scharniere 2 D", "beschreibung": "Metall", "einheit": "Stk.", "grundpreis": 0, "kategorie": "VM"}, {"artikelnummer": "2", "name": "Scharniere kodi", "beschreibung": "Metall", "einheit": "Stk.", "grundpreis": 0, "kategorie": "VM"}, {"artikelnummer": "58", "name": "Visagra Scharniere normal", "beschreibung": null, "einheit": "Stk.", "grundpreis": 0, "kategorie": "VM"}, {"artikelnummer": "59", "name": "Visagra Spezial Kodi", "beschreibung": null, "einheit": "Stk.", "grundpreis": 0, "kategorie": "VM"}, {"artikelnummer": "60", "name": "Visagra 90 Grad für Ecken", "beschreibung": null, "einheit": "Stk.", "grundpreis": 0, "kategorie": "VM"}, {"artikelnummer": "61", "name": "Visagra Kodi Noir", "beschreibung": null, "einheit": "Stk.", "grundpreis": 0, "kategorie": "VM"}, {"artikelnummer": "62", "name": "Visagra Normal Noir", "beschreibung": null, "einheit": "Stk.", "grundpreis": 0, "kategorie": "VM"}, {"artikelnummer": "63", "name": "Touch Lasch", "beschreibung": null, "einheit": "Stk.", "grundpreis": 0, "kategorie": "VM"}, {"artikelnummer": "64", "name": "Pumpa Hydraulik", "beschreibung": null, "einheit": "Stk.", "grundpreis": 0, "kategorie": "VM"}, {"artikelnummer": "65", "name": "Tandembox Scar 8cm", "beschreibung": null, "einheit": "Stk.", "grundpreis": 0, "kategorie": "VM"}, {"artikelnummer": "66", "name": "Tandembox 14cm", "beschreibung": null, "einheit": "Stk.", "grundpreis": 0, "kategorie": "VM"}, {"artikelnummer": "67", "name": "Schublade Rücken 6,8cm", "beschreibung": null, "einheit": "Stk.", "grundpreis": 0, "kategorie": "VM"}, {"artikelnummer": "68", "name": "Schublade Rücken 12,8cm", "beschreibung": null, "einheit": "Stk.", "grundpreis": 0, "kategorie": "VM"}, {"artikelnummer": "69", "name": "Vies 4x16 Chrome", "beschreibung": null, "einheit": "Stk.", "grundpreis": 0, "kategorie": "VM"}, {"artikelnummer": "70", "name": "Vies 4x20 Chrome", "beschreibung": null, "einheit": "Stk.", "grundpreis": 0, "kategorie": "VM"}, {"artikelnummer": "71", "name": "Vies 4x20 Noir", "beschreibung": null, "einheit": "Stk.", "grundpreis": 0, "kategorie": "VM"}, {"artikelnummer": "72", "name": "Cache Vies", "beschreibung": null, "einheit": "Stk.", "grundpreis": 0, "kategorie": "VM"}, {"artikelnummer": "73", "name": "Vies 4x30", "beschreibung": null, "einheit": "Stk.", "grundpreis": 0, "kategorie": "VM"}, {"artikelnummer": "74", "name": "Vies 4x50", "beschreibung": null, "einheit": "Stk.", "grundpreis": 0, "kategorie": "VM"}, {"artikelnummer": "75", "name": "Vies 6x50", "beschreibung": null, "einheit": "Stk.", "grundpreis": 0, "kategorie": "VM"}, {"artikelnummer": "76", "name": "Dübel 10mm", "beschreibung": null, "einheit": "Stk.", "grundpreis": 0, "kategorie": "VM"}, {"artikelnummer": "77", "name": "Winkel Weiss Plastik", "beschreibung": null, "einheit": "Stk.", "grundpreis": 0, "kategorie": "VM"}, {"artikelnummer": "78", "name": "Winkel 2-Loch", "beschreibung": null, "einheit": "Stk.", "grundpreis": 0, "kategorie": "VM"}, {"artikelnummer": "79", "name": "Winkel 4-Loch", "beschreibung": null, "einheit": "Stk.", "grundpreis": 0, "kategorie": "VM"}, {"artikelnummer": "80", "name": "Oberschrank Träger", "beschreibung": null, "einheit": "Stk.", "grundpreis": 0, "kategorie": "VM"}, {"artikelnummer": "81", "name": "ZW Träger Tasso", "beschreibung": null, "einheit": "Stk.", "grundpreis": 0, "kategorie": "VM"}, {"artikelnummer": "82", "name": "Plinta Noyee L31 71cm x 7cm", "beschreibung": null, "einheit": "Stk.", "grundpreis": 0, "kategorie": "VM"}, {"artikelnummer": "83", "name": "Plinta Blanche 71cm x 7cm Banda", "beschreibung": null, "einheit": "Stk.", "grundpreis": 0, "kategorie": "VM"}, {"artikelnummer": "84", "name": "Plinta Bianco 71cm x 7cm Banda", "beschreibung": null, "einheit": "Stk.", "grundpreis": 0, "kategorie": "VM"}, {"artikelnummer": "85", "name": "Plinta Bianco 80cm x 7cm Banda", "beschreibung": null, "einheit": "Stk.", "grundpreis": 0, "kategorie": "VM"}, {"artikelnummer": "86", "name": "Plinta Noir 5cm x 60cm Banda", "beschreibung": null, "einheit": "Stk.", "grundpreis": 0, "kategorie": "VM"}, {"artikelnummer": "87", "name": "Plinta 14cm Blanche Banda", "beschreibung": null, "einheit": "Stk.", "grundpreis": 0, "kategorie": "VM"}, {"artikelnummer": "88", "name": "Plinta 25cm x 5cm no Banda", "beschreibung": null, "einheit": "Stk.", "grundpreis": 0, "kategorie": "VM"}, {"artikelnummer": "89", "name": "Profil LED", "beschreibung": null, "einheit": "Stk.", "grundpreis": 0, "kategorie": "VM"}, {"artikelnummer": "90", "name": "Profil Alu", "beschreibung": null, "einheit": "Stk.", "grundpreis": 0, "kategorie": "VM"}, {"artikelnummer": "91", "name": "Profil Alu Gola Folk", "beschreibung": null, "einheit": "Stk.", "grundpreis": 0, "kategorie": "VM"}, {"artikelnummer": "92", "name": "Profil Alu Gola Tacht", "beschreibung": null, "einheit": "Stk.", "grundpreis": 0, "kategorie": "VM"}, {"artikelnummer": "93", "name": "Profil Alu Gola Frigo", "beschreibung": null, "einheit": "Stk.", "grundpreis": 0, "kategorie": "VM"}, {"artikelnummer": "94", "name": "Profil Alu Gola 2 Biban", "beschreibung": null, "einheit": "Stk.", "grundpreis": 0, "kategorie": "VM"}, {"artikelnummer": "95", "name": "Mastic Blanche", "beschreibung": null, "einheit": "Stk.", "grundpreis": 0, "kategorie": "VM"}, {"artikelnummer": "96", "name": "Silikon Dämpfer", "beschreibung": null, "einheit": "Stk.", "grundpreis": 0, "kategorie": "VM"}, {"artikelnummer": "97", "name": "Silikon Transparent", "beschreibung": null, "einheit": "Stk.", "grundpreis": 0, "kategorie": "VM"}, {"artikelnummer": "98", "name": "Silikon Weiss", "beschreibung": null, "einheit": "Stk.", "grundpreis": 0, "kategorie": "VM"}, {"artikelnummer": "99", "name": "Silikon Braun", "beschreibung": null, "einheit": "Stk.", "grundpreis": 0, "kategorie": "VM"}, {"artikelnummer": "100", "name": "Silikon Schwarz", "beschreibung": null, "einheit": "Stk.", "grundpreis": 0, "kategorie": "VM"}, {"artikelnummer": "101", "name": "Silikon Grau", "beschreibung": null, "einheit": "Stk.", "grundpreis": 0, "kategorie": "VM"}, {"artikelnummer": "102", "name": "Santofer Coller", "beschreibung": null, "einheit": "Stk.", "grundpreis": 0, "kategorie": "VM"}, {"artikelnummer": "103", "name": "Montage Fix Coller", "beschreibung": null, "einheit": "Stk.", "grundpreis": 0, "kategorie": "VM"}, {"artikelnummer": "104", "name": "Glashalterung mit Saugknopf", "beschreibung": null, "einheit": "Stk.", "grundpreis": 0, "kategorie": "VM"}, {"artikelnummer": "105", "name": "Plastikfüsse 15cm", "beschreibung": null, "einheit": "Stk.", "grundpreis": 0, "kategorie": "VM"}, {"artikelnummer": "106", "name": "Mdf 5mm für Sockel", "beschreibung": null, "einheit": "Stk.", "grundpreis": 0, "kategorie": "VM"}, {"artikelnummer": "107", "name": "Bois Rouge 3cm für Konstruktion Arbeitsplatte", "beschreibung": null, "einheit": "Stk.", "grundpreis": 0, "kategorie": "VM"}, {"artikelnummer": "108", "name": "Schubladen 45cm 5cm", "beschreibung": null, "einheit": "Stk.", "grundpreis": 0, "kategorie": "VM"}, {"artikelnummer": "109", "name": "Silikon Pistole", "beschreibung": null, "einheit": "Stk.", "grundpreis": 0, "kategorie": "VM"}, {"artikelnummer": "110", "name": "Metallsäge", "beschreibung": null, "einheit": "Stk.", "grundpreis": 0, "kategorie": "VM"}, {"artikelnummer": "111", "name": "Holzsäge", "beschreibung": null, "einheit": "Stk.", "grundpreis": 0, "kategorie": "VM"}, {"artikelnummer": "112", "name": "Bohrer 3mm", "beschreibung": null, "einheit": "Stk.", "grundpreis": 0, "kategorie": "VM"}, {"artikelnummer": "113", "name": "Bohrer 4mm", "beschreibung": null, "einheit": "Stk.", "grundpreis": 0, "kategorie": "VM"}, {"artikelnummer": "114", "name": "Bohrer 4,5mm", "beschreibung": null, "einheit": "Stk.", "grundpreis": 0, "kategorie": "VM"}, {"artikelnummer": "115", "name": "Bohrer 8mm", "beschreibung": null, "einheit": "Stk.", "grundpreis": 0, "kategorie": "VM"}, {"artikelnummer": "3", "name": "MDF Matt 5mm", "beschreibung": "MDF, Matt, 5mm, 2800×2100mm", "einheit": "Platte", "grundpreis": 0, "kategorie": "Holz Band"}, {"artikelnummer": "4", "name": "MDF Matt 8mm", "beschreibung": "MDF, Matt, 8mm, 2800×2100mm", "einheit": "Platte", "grundpreis": 0, "kategorie": "Holz Band"}, {"artikelnummer": "5", "name": "MDF Matt 18mm", "beschreibung": "MDF, Matt, 18mm, 2800×2100mm", "einheit": "Platte", "grundpreis": 0, "kategorie": "Holz Band"}, {"artikelnummer": "7", "name": "MDF Hochglanz 5mm", "beschreibung": "MDF, Hochglanz, 5mm, 2800×2100mm", "einheit": "Platte", "grundpreis": 0, "kategorie": "Holz Band"}, {"artikelnummer": "8", "name": "MDF Hochglanz 8mm", "beschreibung": "MDF, Hochglanz, 8mm, 2800×2100mm", "einheit": "Platte", "grundpreis": 0, "kategorie": "Holz Band"}, {"artikelnummer": "9", "name": "MDF Hochglanz 18mm", "beschreibung": "MDF, Hochglanz, 18mm, 2800×2100mm", "einheit": "Platte", "grundpreis": 0, "kategorie": "Holz Band"}, {"artikelnummer": "11", "name": "MDF Nussbaum Matt 8mm", "beschreibung": "MDF Dekor, Matt+Maserung, 8mm, 2800×2100mm, WICHTIG: Mit Maserung – L31", "einheit": "Platte", "grundpreis": 0, "kategorie": "Holz Band"}, {"artikelnummer": "12", "name": "MDF Nussbaum Matt 18mm", "beschreibung": "MDF Dekor, Matt+Maserung, 18mm, 2800×2100mm, WICHTIG: Mit Maserung – L31", "einheit": "Platte", "grundpreis": 0, "kategorie": "Holz Band"}, {"artikelnummer": "14", "name": "PET Folie Hochglanz Weiss 18mm", "beschreibung": "PET/Mica, Hochglanz, 18mm, 2800×1220mm, Rückseite Weiß", "einheit": "Platte", "grundpreis": 0, "kategorie": "Holz Band"}, {"artikelnummer": "16", "name": "PET Folie Hochglanz Bianco 18mm", "beschreibung": "PET/Mica, Hochglanz, 18mm, 2800×1220mm, Rückseite Weiß", "einheit": "Platte", "grundpreis": 0, "kategorie": "Holz Band"}, {"artikelnummer": "18", "name": "PET Folie Hochglanz Creme 18mm", "beschreibung": "PET/Mica, Hochglanz, 18mm, 2800×1220mm, Rückseite Weiß", "einheit": "Platte", "grundpreis": 0, "kategorie": "Holz Band"}, {"artikelnummer": "20", "name": "PET Folie Hochglanz Kaschmir 18mm", "beschreibung": "PET/Mica, Hochglanz, 18mm, 2800×1220mm, Rückseite Weiß", "einheit": "Platte", "grundpreis": 0, "kategorie": "Holz Band"}, {"artikelnummer": "22", "name": "PET Folie Hochglanz Cappuccino 18mm", "beschreibung": "PET/Mica, Hochglanz, 18mm, 2800×1220mm, Rückseite Weiß", "einheit": "Platte", "grundpreis": 0, "kategorie": "Holz Band"}, {"artikelnummer": "24", "name": "PET Folie Hochglanz Rot 18mm", "beschreibung": "PET/Mica, Hochglanz, 18mm, 2800×1220mm, Rückseite Weiß", "einheit": "Platte", "grundpreis": 0, "kategorie": "Holz Band"}, {"artikelnummer": "26", "name": "PET Folie Hochglanz Grey 18mm", "beschreibung": "PET/Mica, Hochglanz, 18mm, 2800×1220mm, Rückseite Weiß", "einheit": "Platte", "grundpreis": 0, "kategorie": "Holz Band"}, {"artikelnummer": "28", "name": "PET Folie Hochglanz Anthrazit 18mm", "beschreibung": "PET/Mica, Hochglanz, 18mm, 2800×1220mm, Rückseite Weiß", "einheit": "Platte", "grundpreis": 0, "kategorie": "Holz Band"}, {"artikelnummer": "30", "name": "PET Folie Hochglanz Anthrazit Galaxy 18mm", "beschreibung": "PET/Mica, Hochglanz, 18mm, 2800×1220mm, Rückseite Weiß – Sterneffekt", "einheit": "Platte", "grundpreis": 0, "kategorie": "Holz Band"}, {"artikelnummer": "32", "name": "PET Folie Hochglanz Schwarz 18mm", "beschreibung": "PET/Mica, Hochglanz, 18mm, 2800×1220mm, Rückseite Weiß", "einheit": "Platte", "grundpreis": 0, "kategorie": "Holz Band"}, {"artikelnummer": "34", "name": "PET Folie Matt Weiss 18mm", "beschreibung": "PET/Mica, Matt, 18mm, 2800×1220mm, Rückseite Weiß", "einheit": "Platte", "grundpreis": 0, "kategorie": "Holz Band"}, {"artikelnummer": "36", "name": "PET Folie Matt Bianco 18mm", "beschreibung": "PET/Mica, Matt, 18mm, 2800×1220mm, Rückseite Weiß", "einheit": "Platte", "grundpreis": 0, "kategorie": "Holz Band"}, {"artikelnummer": "38", "name": "PET Folie Matt Creme 18mm", "beschreibung": "PET/Mica, Matt, 18mm, 2800×1220mm, Rückseite Weiß", "einheit": "Platte", "grundpreis": 0, "kategorie": "Holz Band"}, {"artikelnummer": "40", "name": "PET Folie Matt Kaschmir 18mm", "beschreibung": "PET/Mica, Matt, 18mm, 2800×1220mm, Rückseite Weiß", "einheit": "Platte", "grundpreis": 0, "kategorie": "Holz Band"}, {"artikelnummer": "42", "name": "PET Folie Matt Cappuccino 18mm", "beschreibung": "PET/Mica, Matt, 18mm, 2800×1220mm, Rückseite Weiß", "einheit": "Platte", "grundpreis": 0, "kategorie": "Holz Band"}, {"artikelnummer": "44", "name": "PET Folie Matt Rot 18mm", "beschreibung": "PET/Mica, Matt, 18mm, 2800×1220mm, Rückseite Weiß", "einheit": "Platte", "grundpreis": 0, "kategorie": "Holz Band"}, {"artikelnummer": "46", "name": "PET Folie Matt Grey 18mm", "beschreibung": "PET/Mica, Matt, 18mm, 2800×1220mm, Rückseite Weiß", "einheit": "Platte", "grundpreis": 0, "kategorie": "Holz Band"}, {"artikelnummer": "48", "name": "PET Folie Matt Anthrazit 18mm", "beschreibung": "PET/Mica, Matt, 18mm, 2800×1220mm, Rückseite Weiß", "einheit": "Platte", "grundpreis": 0, "kategorie": "Holz Band"}, {"artikelnummer": "50", "name": "PET Folie Matt Anthrazit Galaxy 18mm", "beschreibung": "PET/Mica, Matt, 18mm, 2800×1220mm, Rückseite Weiß", "einheit": "Platte", "grundpreis": 0, "kategorie": "Holz Band"}, {"artikelnummer": "52", "name": "PET Folie Matt Schwarz 18mm", "beschreibung": "PET/Mica, Matt, 18mm, 2800×1220mm, Rückseite Weiß", "einheit": "Platte", "grundpreis": 0, "kategorie": "Holz Band"}, {"artikelnummer": "54", "name": "Strati Latte 18mm", "beschreibung": "MDF/Vollholz/MDF, 18mm, 2440×1220mm, 4mm MDF hydrophob + Vollholzkern + 4mm MDF | Wasserabweisend", "einheit": "Platte", "grundpreis": 0, "kategorie": "Holz Band"}, {"artikelnummer": "55", "name": "MDF Hydrowhich Hochglanz 5mm", "beschreibung": "MDF Hydrowhich, Hochglanz, 5mm, 2800×2100mm, Wasserabweisend", "einheit": "Platte", "grundpreis": 0, "kategorie": "Holz Band"}, {"artikelnummer": "56", "name": "MDF Hydrowhich Hochglanz 8mm", "beschreibung": "MDF Hydrowhich, Hochglanz, 8mm, 2800×2100mm, Wasserabweisend", "einheit": "Platte", "grundpreis": 0, "kategorie": "Holz Band"}, {"artikelnummer": "57", "name": "MDF Hydrowhich Hochglanz 18mm", "beschreibung": "MDF Hydrowhich, Hochglanz, 18mm, 2800×2100mm, Wasserabweisend", "einheit": "Platte", "grundpreis": 0, "kategorie": "Holz Band"}, {"artikelnummer": "6", "name": "Kantenanleimer Glanz Matt 23mm", "beschreibung": "ABS, Matt, 0.8mm, 23mm / 150m Rolle, Breite 23mm", "einheit": "Rolle", "grundpreis": 0, "kategorie": "Kantenband"}, {"artikelnummer": "10", "name": "Kantenanleimer Glanz Hochglanz 23mm", "beschreibung": "ABS, Hochglanz, 0.8mm, 23mm / 150m Rolle, Breite 23mm", "einheit": "Rolle", "grundpreis": 0, "kategorie": "Kantenband"}, {"artikelnummer": "13", "name": "Kantenanleimer Nussbaum Matt 23mm L31", "beschreibung": "ABS Dekor, Matt+Maserung, 0.8mm, 23mm / 150m Rolle, Mit Maserung – L31", "einheit": "Rolle", "grundpreis": 0, "kategorie": "Kantenband"}, {"artikelnummer": "15", "name": "Kantenanleimer PET Hochglanz Weiss 23mm", "beschreibung": "ABS, Hochglanz, 0.8mm, 23mm / 150m Rolle, Breite 23mm", "einheit": "Rolle", "grundpreis": 0, "kategorie": "Kantenband"}, {"artikelnummer": "17", "name": "Kantenanleimer PET Hochglanz Bianco 23mm", "beschreibung": "ABS, Hochglanz, 0.8mm, 23mm / 150m Rolle, Breite 23mm", "einheit": "Rolle", "grundpreis": 0, "kategorie": "Kantenband"}, {"artikelnummer": "19", "name": "Kantenanleimer PET Hochglanz Creme 23mm", "beschreibung": "ABS, Hochglanz, 0.8mm, 23mm / 150m Rolle, Breite 23mm", "einheit": "Rolle", "grundpreis": 0, "kategorie": "Kantenband"}, {"artikelnummer": "21", "name": "Kantenanleimer PET Hochglanz Kaschmir 23mm", "beschreibung": "ABS, Hochglanz, 0.8mm, 23mm / 150m Rolle, Breite 23mm", "einheit": "Rolle", "grundpreis": 0, "kategorie": "Kantenband"}, {"artikelnummer": "23", "name": "Kantenanleimer PET Hochglanz Cappuccino 23mm", "beschreibung": "ABS, Hochglanz, 0.8mm, 23mm / 150m Rolle, Breite 23mm", "einheit": "Rolle", "grundpreis": 0, "kategorie": "Kantenband"}, {"artikelnummer": "25", "name": "Kantenanleimer PET Hochglanz Rot 23mm", "beschreibung": "ABS, Hochglanz, 0.8mm, 23mm / 150m Rolle, Breite 23mm", "einheit": "Rolle", "grundpreis": 0, "kategorie": "Kantenband"}, {"artikelnummer": "27", "name": "Kantenanleimer PET Hochglanz Grey 23mm", "beschreibung": "ABS, Hochglanz, 0.8mm, 23mm / 150m Rolle, Breite 23mm", "einheit": "Rolle", "grundpreis": 0, "kategorie": "Kantenband"}, {"artikelnummer": "29", "name": "Kantenanleimer PET Hochglanz Anthrazit 23mm", "beschreibung": "ABS, Hochglanz, 0.8mm, 23mm / 150m Rolle, Breite 23mm", "einheit": "Rolle", "grundpreis": 0, "kategorie": "Kantenband"}, {"artikelnummer": "31", "name": "Kantenanleimer PET Hochglanz Anthrazit Galaxy 23mm", "beschreibung": "ABS, Hochglanz, 0.8mm, 23mm / 150m Rolle, Breite 23mm", "einheit": "Rolle", "grundpreis": 0, "kategorie": "Kantenband"}, {"artikelnummer": "33", "name": "Kantenanleimer PET Hochglanz Schwarz 23mm", "beschreibung": "ABS, Hochglanz, 0.8mm, 23mm / 150m Rolle, Breite 23mm", "einheit": "Rolle", "grundpreis": 0, "kategorie": "Kantenband"}, {"artikelnummer": "35", "name": "Kantenanleimer PET Matt Weiss 23mm", "beschreibung": "ABS, Matt, 0.8mm, 23mm / 150m Rolle, Breite 23mm", "einheit": "Rolle", "grundpreis": 0, "kategorie": "Kantenband"}, {"artikelnummer": "37", "name": "Kantenanleimer PET Matt Bianco 23mm", "beschreibung": "ABS, Matt, 0.8mm, 23mm / 150m Rolle, Breite 23mm", "einheit": "Rolle", "grundpreis": 0, "kategorie": "Kantenband"}, {"artikelnummer": "39", "name": "Kantenanleimer PET Matt Creme 23mm", "beschreibung": "ABS, Matt, 0.8mm, 23mm / 150m Rolle, Breite 23mm", "einheit": "Rolle", "grundpreis": 0, "kategorie": "Kantenband"}, {"artikelnummer": "41", "name": "Kantenanleimer PET Matt Kaschmir 23mm", "beschreibung": "ABS, Matt, 0.8mm, 23mm / 150m Rolle, Breite 23mm", "einheit": "Rolle", "grundpreis": 0, "kategorie": "Kantenband"}, {"artikelnummer": "43", "name": "Kantenanleimer PET Matt Cappuccino 23mm", "beschreibung": "ABS, Matt, 0.8mm, 23mm / 150m Rolle, Breite 23mm", "einheit": "Rolle", "grundpreis": 0, "kategorie": "Kantenband"}, {"artikelnummer": "45", "name": "Kantenanleimer PET Matt Rot 23mm", "beschreibung": "ABS, Matt, 0.8mm, 23mm / 150m Rolle, Breite 23mm", "einheit": "Rolle", "grundpreis": 0, "kategorie": "Kantenband"}, {"artikelnummer": "47", "name": "Kantenanleimer PET Matt Grey 23mm", "beschreibung": "ABS, Matt, 0.8mm, 23mm / 150m Rolle, Breite 23mm", "einheit": "Rolle", "grundpreis": 0, "kategorie": "Kantenband"}, {"artikelnummer": "49", "name": "Kantenanleimer PET Matt Anthrazit 23mm", "beschreibung": "ABS, Matt, 0.8mm, 23mm / 150m Rolle, Breite 23mm", "einheit": "Rolle", "grundpreis": 0, "kategorie": "Kantenband"}, {"artikelnummer": "51", "name": "Kantenanleimer PET Matt Anthrazit Galaxy 23mm", "beschreibung": "ABS, Matt, 0.8mm, 23mm / 150m Rolle, Breite 23mm", "einheit": "Rolle", "grundpreis": 0, "kategorie": "Kantenband"}, {"artikelnummer": "53", "name": "Kantenanleimer PET Matt Schwarz 23mm", "beschreibung": "ABS, Matt, 0.8mm, 23mm / 150m Rolle, Breite 23mm", "einheit": "Rolle", "grundpreis": 0, "kategorie": "Kantenband"}, {"artikelnummer": "116", "name": "Hilti Bohrer 8mm", "beschreibung": null, "einheit": "Stk.", "grundpreis": 0, "kategorie": "Werkzeuge"}, {"artikelnummer": "117", "name": "Hilti Bohrer 10mm", "beschreibung": null, "einheit": "Stk.", "grundpreis": 0, "kategorie": "Werkzeuge"}, {"artikelnummer": "118", "name": "Akkuschrauber 1", "beschreibung": null, "einheit": "Stk.", "grundpreis": 0, "kategorie": "Werkzeuge"}, {"artikelnummer": "119", "name": "Akkuschrauber 2", "beschreibung": null, "einheit": "Stk.", "grundpreis": 0, "kategorie": "Werkzeuge"}, {"artikelnummer": "120", "name": "Akkuschrauber 3", "beschreibung": null, "einheit": "Stk.", "grundpreis": 0, "kategorie": "Werkzeuge"}, {"artikelnummer": "121", "name": "Akkuschrauber 4", "beschreibung": null, "einheit": "Stk.", "grundpreis": 0, "kategorie": "Werkzeuge"}, {"artikelnummer": "122", "name": "Akkuschrauber 5", "beschreibung": null, "einheit": "Stk.", "grundpreis": 0, "kategorie": "Werkzeuge"}, {"artikelnummer": "123", "name": "Oberfräse 1 Grey Klein", "beschreibung": null, "einheit": "Stk.", "grundpreis": 0, "kategorie": "Werkzeuge"}, {"artikelnummer": "124", "name": "Oberfräse 2 Grey Small", "beschreibung": null, "einheit": "Stk.", "grundpreis": 0, "kategorie": "Werkzeuge"}, {"artikelnummer": "125", "name": "Oberfräse 3 Grün Bosch", "beschreibung": null, "einheit": "Stk.", "grundpreis": 0, "kategorie": "Werkzeuge"}, {"artikelnummer": "126", "name": "Oberfräse 4 Gelb Inco", "beschreibung": null, "einheit": "Stk.", "grundpreis": 0, "kategorie": "Werkzeuge"}, {"artikelnummer": "127", "name": "Oberfräse 5 Klein Schwarz", "beschreibung": null, "einheit": "Stk.", "grundpreis": 0, "kategorie": "Werkzeuge"}, {"artikelnummer": "128", "name": "Oberfräse 6 Total Klein", "beschreibung": null, "einheit": "Stk.", "grundpreis": 0, "kategorie": "Werkzeuge"}, {"artikelnummer": "129", "name": "Stichsäge 1 Bosch", "beschreibung": null, "einheit": "Stk.", "grundpreis": 0, "kategorie": "Werkzeuge"}, {"artikelnummer": "130", "name": "Stichsäge 2 Bosch", "beschreibung": null, "einheit": "Stk.", "grundpreis": 0, "kategorie": "Werkzeuge"}, {"artikelnummer": "131", "name": "Stichsäge 3 Makute", "beschreibung": null, "einheit": "Stk.", "grundpreis": 0, "kategorie": "Werkzeuge"}, {"artikelnummer": "132", "name": "Stichsäge Akku", "beschreibung": null, "einheit": "Stk.", "grundpreis": 0, "kategorie": "Werkzeuge"}, {"artikelnummer": "133", "name": "Flex Lamon 1 Makute", "beschreibung": null, "einheit": "Stk.", "grundpreis": 0, "kategorie": "Werkzeuge"}, {"artikelnummer": "134", "name": "Flex Lamon 2 Bosch", "beschreibung": null, "einheit": "Stk.", "grundpreis": 0, "kategorie": "Werkzeuge"}, {"artikelnummer": "135", "name": "Flex Lamon 3 Makute", "beschreibung": null, "einheit": "Stk.", "grundpreis": 0, "kategorie": "Werkzeuge"}, {"artikelnummer": "136", "name": "Verlängerungskabel 1", "beschreibung": null, "einheit": "Stk.", "grundpreis": 0, "kategorie": "Werkzeuge"}, {"artikelnummer": "137", "name": "Verlängerungskabel 2", "beschreibung": null, "einheit": "Stk.", "grundpreis": 0, "kategorie": "Werkzeuge"}, {"artikelnummer": "138", "name": "Verlängerungskabel 3", "beschreibung": null, "einheit": "Stk.", "grundpreis": 0, "kategorie": "Werkzeuge"}, {"artikelnummer": "139", "name": "Steckdosenverteiler 1", "beschreibung": null, "einheit": "Stk.", "grundpreis": 0, "kategorie": "Werkzeuge"}, {"artikelnummer": "140", "name": "Steckdosenverteiler 2", "beschreibung": null, "einheit": "Stk.", "grundpreis": 0, "kategorie": "Werkzeuge"}, {"artikelnummer": "141", "name": "Steckdosenverteiler 3", "beschreibung": null, "einheit": "Stk.", "grundpreis": 0, "kategorie": "Werkzeuge"}, {"artikelnummer": "142", "name": "Tischkreissäge 1", "beschreibung": null, "einheit": "Stk.", "grundpreis": 0, "kategorie": "Werkzeuge"}, {"artikelnummer": "143", "name": "Tischkreissäge 2", "beschreibung": null, "einheit": "Stk.", "grundpreis": 0, "kategorie": "Werkzeuge"}, {"artikelnummer": "144", "name": "Arbeitsböcke 1", "beschreibung": null, "einheit": "Stk.", "grundpreis": 0, "kategorie": "Werkzeuge"}, {"artikelnummer": "145", "name": "Arbeitsböcke 2", "beschreibung": null, "einheit": "Stk.", "grundpreis": 0, "kategorie": "Werkzeuge"}, {"artikelnummer": "146", "name": "Arbeitsböcke 3", "beschreibung": null, "einheit": "Stk.", "grundpreis": 0, "kategorie": "Werkzeuge"}, {"artikelnummer": "147", "name": "Planer Grau", "beschreibung": null, "einheit": "Stk.", "grundpreis": 0, "kategorie": "Werkzeuge"}, {"artikelnummer": "148", "name": "Multimachine Säge", "beschreibung": null, "einheit": "Stk.", "grundpreis": 0, "kategorie": "Werkzeuge"}, {"artikelnummer": "149", "name": "Bohrmaschine Bosch 1", "beschreibung": null, "einheit": "Stk.", "grundpreis": 0, "kategorie": "Werkzeuge"}];

function frage(text) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => rl.question(text, (antwort) => { rl.close(); resolve(antwort); }));
}

function extrahiereToken(loginAntwort) {
  // Wir kennen das genaue Antwortformat von /auth/login nicht sicher,
  // deshalb probieren wir die ueblichen Feldnamen der Reihe nach durch.
  const kandidaten = ['access_token', 'accessToken', 'token', 'jwt'];
  for (const k of kandidaten) {
    if (loginAntwort && loginAntwort[k]) return loginAntwort[k];
  }
  return null;
}

async function main() {
  console.log('=== Q7-ERP Artikel-Import ===\n');
  console.log('Ziel: ' + API_BASE);
  console.log('Anzahl Artikel in dieser Datei: ' + ARTIKEL.length + '\n');

  // --- 1. Login ---
  console.log('Logge ein als ' + LOGIN.email + ' ...');
  let loginRes;
  try {
    const res = await fetch(API_BASE + '/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(LOGIN),
    });
    loginRes = await res.json();
    if (!res.ok) {
      console.error('FEHLER beim Login (HTTP ' + res.status + '):');
      console.error(JSON.stringify(loginRes, null, 2));
      process.exit(1);
    }
  } catch (e) {
    console.error('Konnte ' + API_BASE + ' nicht erreichen. Laeuft das Backend? Fehler: ' + e.message);
    process.exit(1);
  }

  const token = extrahiereToken(loginRes);
  if (!token) {
    console.error('Login war erfolgreich, aber ich konnte kein Token im Antwortformat finden.');
    console.error('Rohantwort vom Server:');
    console.error(JSON.stringify(loginRes, null, 2));
    console.error('\n=> Bitte das passende Feld im Skript in extrahiereToken() ergaenzen.');
    process.exit(1);
  }
  console.log('Login erfolgreich.\n');

  // --- 2. Vorschau ---
  console.log('--- VORSCHAU (es wird noch NICHTS in die Datenbank geschrieben) ---\n');
  const nachKategorie = {};
  for (const a of ARTIKEL) {
    nachKategorie[a.kategorie] = (nachKategorie[a.kategorie] || 0) + 1;
  }
  console.log('Aufteilung nach Kategorie:');
  for (const [kat, anz] of Object.entries(nachKategorie)) {
    console.log('  - ' + kat + ': ' + anz + ' Artikel');
  }
  console.log('');
  console.log('Beispiele (erste 5):');
  ARTIKEL.slice(0, 5).forEach((a, i) => {
    console.log('  ' + (i + 1) + '. [' + a.artikelnummer + '] ' + a.name +
      ' | Einheit: ' + a.einheit +
      ' | Beschreibung: ' + (a.beschreibung || '(keine)') +
      ' | Grundpreis: ' + a.grundpreis + ' (Platzhalter)');
  });
  console.log('  ... und ' + (ARTIKEL.length - 5) + ' weitere.\n');

  // --- 3. Bestaetigung ---
  const antwort = await frage('Wirklich alle ' + ARTIKEL.length + ' Artikel jetzt anlegen? (j/N): ');
  if (antwort.trim().toLowerCase() !== 'j') {
    console.log('Abgebrochen. Es wurde nichts veraendert.');
    process.exit(0);
  }

  // --- 4. Import ---
  console.log('\nLege Artikel an ...\n');
  const erfolge = [];
  const fehler = [];

  for (const a of ARTIKEL) {
    const payload = {
      artikelnummer: a.artikelnummer,
      name: a.name,
      beschreibung: a.beschreibung,
      einheit: a.einheit,
      grundpreis: a.grundpreis,
    };
    try {
      const res = await fetch(API_BASE + '/artikel', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ' + token,
        },
        body: JSON.stringify(payload),
      });
      const body = await res.json().catch(() => ({}));
      if (res.ok) {
        erfolge.push(a.artikelnummer);
        console.log('OK   [' + a.artikelnummer + '] ' + a.name);
      } else {
        fehler.push({ artikelnummer: a.artikelnummer, name: a.name, status: res.status, body });
        console.log('FEHLER [' + a.artikelnummer + '] ' + a.name + ' -> HTTP ' + res.status + ': ' + JSON.stringify(body));
      }
    } catch (e) {
      fehler.push({ artikelnummer: a.artikelnummer, name: a.name, status: 'NETZWERK', body: e.message });
      console.log('FEHLER [' + a.artikelnummer + '] ' + a.name + ' -> ' + e.message);
    }
  }

  // --- 5. Report ---
  console.log('\n=== ERGEBNIS ===');
  console.log('Erfolgreich angelegt: ' + erfolge.length + ' / ' + ARTIKEL.length);
  console.log('Fehlgeschlagen: ' + fehler.length);
  if (fehler.length > 0) {
    console.log('\nFehlerliste (zum Sammeln/Beheben):');
    fehler.forEach((f) => {
      console.log('  [' + f.artikelnummer + '] ' + f.name + ' -> ' + f.status + ' ' + JSON.stringify(f.body));
    });
  }
}

main();
