// Seed: Der 9. November in der deutschen Geschichte (Quellenvergleich)
// Vier "Schicksalstage": 1918 (Republik), 1923 (Hitler-Putsch), 1938 (Pogromnacht), 1989 (Mauerfall)
import { getDb } from '../db.js';
import { setDbInstance, run, flushSaveDb } from '../dbHelper.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function seed() {
  const db = await getDb();
  setDbInstance(db);

  // Migrationen sicherstellen
  const migrationsDir = path.join(__dirname, '..', 'migrations');
  db.run(`CREATE TABLE IF NOT EXISTS _migrations (name TEXT PRIMARY KEY, applied_at TEXT NOT NULL DEFAULT (datetime('now')))`);
  const stmt = db.prepare('SELECT name FROM _migrations');
  const applied = new Set<string>();
  while (stmt.step()) applied.add(stmt.getAsObject().name as string);
  stmt.free();
  const files = fs.readdirSync(migrationsDir).filter(f => f.endsWith('.sql')).sort();
  for (const file of files) {
    if (applied.has(file)) continue;
    try {
      db.exec(fs.readFileSync(path.join(migrationsDir, file), 'utf-8'));
      db.run('INSERT INTO _migrations (name) VALUES (?)', [file]);
    } catch (err: any) {
      console.warn(`  Migration ${file} skipped: ${err.message}`);
    }
  }

  // === Modul ===
  const modId = '00000000-0000-0000-0000-000000000002';
  run('INSERT OR REPLACE INTO content_module (id, title, description, author_name, version, license) VALUES (?, ?, ?, ?, ?, ?)', [
    modId,
    'Der 9. November – ein deutsches Schicksalsdatum',
    'Vier zentrale Ereignisse fielen auf den 9. November und prägten die deutsche Geschichte des 20. Jahrhunderts. Das Modul lädt zum Quellenvergleich ein: Wie wird dasselbe Datum in unterschiedlichen Quellen, von unterschiedlichen Akteuren und aus unterschiedlichen Perspektiven gedeutet?',
    'Chronotop-Team',
    '0.2.0',
    'CC-BY-SA 4.0',
  ]);

  // === Orte ===
  const places = [
    { id: 'p9-01', name: 'Berlin – Reichstagsgebäude', lat: 52.5186, lng: 13.3762, wd: 'Q151424',
      desc: 'Sitz des Deutschen Reichstags; Schauplatz von Scheidemanns Republiks-Ausrufung 1918 vom Westbalkon.' },
    { id: 'p9-02', name: 'Berlin – Stadtschloss', lat: 52.5172, lng: 13.4022, wd: 'Q156851',
      desc: 'Karl Liebknecht ruft hier am selben Tag die "freie sozialistische Republik" aus.' },
    { id: 'p9-03', name: 'München – Bürgerbräukeller', lat: 48.1336, lng: 11.5856, wd: 'Q820568',
      desc: 'Bierkeller, in dem Hitler 1923 den Putschversuch beginnt.' },
    { id: 'p9-04', name: 'München – Feldherrnhalle', lat: 48.1414, lng: 11.5775, wd: 'Q325409',
      desc: 'Ort des Schusswechsels mit der Polizei am 9. November 1923; später NS-„Heiligtum".' },
    { id: 'p9-05', name: 'Berlin – Synagoge Fasanenstraße', lat: 52.5046, lng: 13.3247, wd: 'Q461457',
      desc: 'Eine von vielen brennenden Synagogen in der Pogromnacht 1938.' },
    { id: 'p9-06', name: 'Berlin – Bornholmer Straße', lat: 52.5547, lng: 13.3961, wd: 'Q446335',
      desc: 'Erster Grenzübergang, der in der Nacht zum 10. November 1989 geöffnet wurde.' },
    { id: 'p9-07', name: 'Ost-Berlin – Pressekonferenz', lat: 52.5163, lng: 13.4116, wd: 'Q1428',
      desc: 'Internationales Pressezentrum der DDR in der Mohrenstraße 36/37. Schabowski verliest hier gegen Ende der Pressekonferenz die neue Reiseregelung.' },
  ];
  for (const p of places) {
    run('INSERT OR REPLACE INTO place (id, module_id, wikidata_id, lat, lng, name, description) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [p.id, modId, p.wd, p.lat, p.lng, p.name, p.desc]);
  }

  // === Zeitobjekte ===
  const times = [
    { id: 't9-01', type: 'instant', date: '1918-11-09', label: '9. November 1918, ca. 14 Uhr', certainty: 'certain' },
    { id: 't9-02', type: 'instant', date: '1918-11-09', label: '9. November 1918, ca. 16 Uhr', certainty: 'certain' },
    { id: 't9-03', type: 'span', start: '1923-11-08', end: '1923-11-09', label: '8.–9. November 1923', certainty: 'certain' },
    { id: 't9-04', type: 'instant', date: '1923-11-09', label: '9. November 1923, gegen 12:30 Uhr', certainty: 'certain' },
    { id: 't9-05', type: 'span', start: '1938-11-09', end: '1938-11-10', label: 'Nacht vom 9. auf 10. November 1938', certainty: 'certain' },
    { id: 't9-06', type: 'instant', date: '1989-11-09', label: '9. November 1989, 18:53 Uhr', certainty: 'certain' },
    { id: 't9-07', type: 'instant', date: '1989-11-09', label: '9. November 1989, 23:30 Uhr', certainty: 'certain' },
  ];
  for (const tm of times) {
    run(
      'INSERT OR REPLACE INTO time_object (id, module_id, type, date, start_date, end_date, certainty, label) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [tm.id, modId, tm.type, tm.type === 'instant' ? tm.date : null,
       tm.type === 'span' ? (tm as any).start : null,
       tm.type === 'span' ? (tm as any).end : null,
       tm.certainty, tm.label]
    );
  }

  // === Akteure ===
  const actors = [
    { id: 'a9-01', type: 'person', name: 'Philipp Scheidemann', wd: 'Q57084',
      birth: '1865-07-26', death: '1939-11-29',
      desc: 'SPD-Politiker, Reichstagsabgeordneter; rief am 9.11.1918 vom Reichstagsbalkon die Republik aus.' },
    { id: 'a9-02', type: 'person', name: 'Karl Liebknecht', wd: 'Q57294',
      birth: '1871-08-13', death: '1919-01-15',
      desc: 'Mitbegründer des Spartakusbunds; rief am 9.11.1918 vom Stadtschloss die "freie sozialistische Republik" aus.' },
    { id: 'a9-03', type: 'person', name: 'Adolf Hitler', wd: 'Q352',
      birth: '1889-04-20', death: '1945-04-30',
      desc: 'Anführer des gescheiterten Putschversuchs vom 9. November 1923 in München.' },
    { id: 'a9-04', type: 'person', name: 'Erich Ludendorff', wd: 'Q57096',
      birth: '1865-04-09', death: '1937-12-20',
      desc: 'General; marschierte mit Hitler am 9.11.1923 zur Feldherrnhalle.' },
    { id: 'a9-05', type: 'person', name: 'Joseph Goebbels', wd: 'Q2685',
      birth: '1897-10-29', death: '1945-05-01',
      desc: 'Reichspropagandaminister; gab am Abend des 9.11.1938 die Anweisungen zu den "spontanen" Ausschreitungen.' },
    { id: 'a9-06', type: 'person', name: 'Günter Schabowski', wd: 'Q57387',
      birth: '1929-01-04', death: '2015-11-01',
      desc: 'SED-Politbüromitglied; verlas am 9.11.1989 die neue Reiseregelung in einer Pressekonferenz – missverständlich, „sofort, unverzüglich".' },
    { id: 'a9-07', type: 'person', name: 'Harald Jäger', wd: 'Q63989',
      birth: '1943-01-13',
      desc: 'Leiter der Passkontrolle Bornholmer Straße; entschied gegen 23:30 Uhr eigenmächtig, den Schlagbaum zu öffnen.' },
    { id: 'a9-08', type: 'institution', name: 'SA (Sturmabteilung)', wd: 'Q156844',
      desc: 'NS-Kampforganisation; führender Akteur der Pogromnacht 1938.' },
    { id: 'a9-09', type: 'group', name: 'Sozialdemokratische Partei (MSPD)', wd: 'Q49760',
      desc: 'Mehrheitsflügel der SPD; trug 1918 die Republiks-Ausrufung Scheidemanns.' },
  ];
  for (const a of actors) {
    run(
      'INSERT OR REPLACE INTO actor (id, module_id, type, name, wikidata_id, description, birth_date, death_date) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [a.id, modId, a.type, a.name, a.wd, a.desc, (a as any).birth ?? null, (a as any).death ?? null]
    );
  }

  // === Begriffe ===
  const concepts = [
    { id: 'c9-01', kind: 'analytical', label: 'Revolution',
      desc: 'Grundlegender, oft gewaltsamer Umsturz politischer und gesellschaftlicher Ordnungen. Analytische Kategorie der Geschichtswissenschaft.' },
    { id: 'c9-02', kind: 'analytical', label: 'Putsch',
      desc: 'Gewaltsame Machtübernahme durch eine kleine Gruppe gegen die bestehende Staatsführung – im Unterschied zur Revolution ohne breite Mobilisierung.' },
    { id: 'c9-03', kind: 'analytical', label: 'Pogrom',
      desc: 'Organisierte, oft staatlich tolerierte oder angestiftete gewaltsame Verfolgung einer Minderheit. Historiographische Kategorie.' },
    { id: 'c9-04', kind: 'narrative', label: 'Reichskristallnacht',
      desc: 'Zeitgenössisch-NS-verschleiernde und später von der Nachkriegsöffentlichkeit übernommene Bezeichnung für die Pogromnacht 1938. In der heutigen Forschung kritisch betrachtet, weil sie das Geschehen verharmlost.' },
    { id: 'c9-05', kind: 'narrative', label: 'Schicksalstag der Deutschen',
      desc: 'Nach 1989 prägende Erinnerungsfigur, die die vier Ereignisse zu einer übergreifenden Deutung verbindet – mit der impliziten These, deutsche Geschichte verdichte sich an einem einzigen Datum.' },
    { id: 'c9-06', kind: 'source', label: 'Volksgemeinschaft',
      desc: 'Zentraler Quellen-Begriff der NS-Propaganda zur Konstruktion einer rassisch homogenen Gemeinschaft – verwendet zur Legitimation der Pogromnacht.' },
    { id: 'c9-07', kind: 'source', label: 'Aktueller Tagesbefehl',
      desc: 'Bezeichnung der NS-Diktion für Goebbels Anweisung an die Gauleiter am Abend des 9.11.1938.' },
    { id: 'c9-08', kind: 'analytical', label: 'Friedliche Revolution',
      desc: 'Etablierte Bezeichnung für die DDR-Umwälzungen 1989/90; betont die weitgehende Gewaltfreiheit im Unterschied zu klassischen Revolutionsbegriffen.' },
  ];
  for (const c of concepts) {
    run('INSERT OR REPLACE INTO concept (id, module_id, kind, label, description) VALUES (?, ?, ?, ?, ?)',
      [c.id, modId, c.kind, c.label, c.desc]);
  }

  // === Quellen ===
  // Keine Wikimedia-IIIF-Links: der alte Demo-Endpunkt ist nicht stabil genug für eine Pages-Demo.
  const sources = [
    { id: 'sq9-01', type: 'object', title: 'Bundesarchiv: „Alles für das Volk, alles durch das Volk!"',
      url: 'https://weimar.bundesarchiv.de/WEIMAR/DE/Content/Dokumente-zur-Zeitgeschichte/1918-11-09_ausrufung-der-republik.html',
      desc: 'Bundesarchiv-Dokumentenseite zur Ausrufung der Republik mit Scheidemanns Schreiben an Gustav Noske. Belegt zugleich die Konkurrenz zwischen Scheidemann und Liebknecht am 9. November 1918.', license: 'Bundesarchiv / Bildungsnutzung' },
    { id: 'sq9-02', type: 'text', title: 'LeMO: Revolution 1918/19',
      url: 'https://www.dhm.de/lemo/html/weimar/revolution/',
      desc: 'Überblick des Deutschen Historischen Museums zur Novemberrevolution. Geeignet, um Scheidemanns Ausrufung als Moment in einem offenen Macht- und Ordnungsbruch zu kontextualisieren.', license: 'DHM LeMO, CC BY-NC-SA 4.0' },
    { id: 'sq9-03', type: 'text', title: 'Bundesarchiv: Liebknechts konkurrierende Republik-Ausrufung',
      url: 'https://weimar.bundesarchiv.de/WEIMAR/DE/Content/Dokumente-zur-Zeitgeschichte/1918-11-09_ausrufung-der-republik.html',
      desc: 'Die Bundesarchiv-Seite hält fest, dass Liebknecht am Abend vom Schloss die „Freie Sozialistische Republik Deutschlands" proklamierte. Als Quelle für den Vergleich der konkurrierenden Deutungen nutzbar.', license: 'Bundesarchiv / Bildungsnutzung' },
    { id: 'sq9-04', type: 'image', title: 'Beerdigungszug der Putsch-Toten, München 1923',
      url: 'https://commons.wikimedia.org/wiki/File:Bundesarchiv_Bild_119-1486,_Hitler-Putsch,_M%C3%BCnchen,_Marienplatz.jpg',
      desc: 'Bundesarchiv-Foto auf Wikimedia Commons. Das Bild zeigt NS-Anhänger in München und eignet sich zur Analyse der späteren Märtyrer-Inszenierung des gescheiterten Putschs.', license: 'CC-BY-SA 3.0 DE (Bundesarchiv)' },
    { id: 'sq9-05', type: 'text', title: 'LeMO: NSDAP, Inflation und Hitler-Putsch',
      url: 'https://www.dhm.de/lemo/kapitel/weimarer-republik/innenpolitik/nsdap',
      desc: 'DHM-Überblick zur NSDAP in der Weimarer Republik. Der Abschnitt zu Inflation und Hitler-Putsch ordnet Ablauf, Tote, Verbot der NSDAP und Hitlers Verurteilung ein.', license: 'DHM LeMO, CC BY-NC-SA 4.0' },
    { id: 'sq9-06', type: 'image', title: 'Brennende Synagoge in der Pogromnacht (Wikimedia Commons)',
      url: 'https://commons.wikimedia.org/wiki/File:B%C3%B6rnerplatz_synagogue_burning_-_Kristallnacht_1938-11-10.png',
      desc: 'Aufnahme der brennenden Frankfurter Börneplatzsynagoge. Sie ist ein starkes Bildzeugnis, muss aber als Ortsbeispiel gelesen werden, nicht als Foto des Berliner Ereignisortes im Modul.', license: 'gemeinfrei / Wikimedia Commons' },
    { id: 'sq9-07', type: 'text', title: '„Fernschreiben" Heydrichs, 10. November 1938, 1:20 Uhr',
      url: 'https://www.ns-archiv.de/verfolgung/pogrom/heydrich.php',
      desc: 'Behördliche Quelle: Anweisungen an die Stapo-Stellen. Zeigt die behördliche Steuerung der "spontanen" Aktionen.', license: 'gemeinfrei' },
    { id: 'sq9-08', type: 'video', title: 'Schabowski-Pressekonferenz, 9.11.1989',
      url: 'https://www.bundesregierung.de/breg-de/schwerpunkte/deutsche-einheit/ausschnitt-aus-der-pressekonferenz-von-sed-politbuero-mitglied-guenter-schabowski-am-9-november-1989-in-berlin-403860',
      desc: 'Ausschnitt der Bundesregierung zur Pressekonferenz. Die Quelle zeigt, wie eine unpräzise öffentliche Auskunft durch Medienübertragung unmittelbare politische Wirkung entfaltet.', license: 'Bundesregierung / urheberrechtlich geschützt' },
    { id: 'sq9-09', type: 'image', title: 'Mauerfall am Grenzübergang Bornholmer Straße',
      url: 'https://www.bundesregierung.de/breg-de/schwerpunkte/deutsche-einheit/die-mauer-ist-offen--403858',
      desc: 'Chronik der Bundesregierung mit Foto vom Andrang an der Bornholmer Straße. Damit ist die Quelle präziser als Brandenburger-Tor-Symbolbilder.', license: 'Bundesregierung / urheberrechtlich geschützt' },
    { id: 'sq9-10', type: 'text', title: 'bpb: Als die Mauer fiel – der 9. November 1989',
      url: 'https://www.bpb.de/kurz-knapp/hintergrund-aktuell/194561/als-die-mauer-fiel-der-9-november-1989/',
      desc: 'Hintergrund der Bundeszentrale für politische Bildung zur Dynamik zwischen Pressekonferenz, Medienberichten und Grenzöffnung; nennt Bornholmer Straße und die vollständige Öffnung gegen 23:30 Uhr.', license: 'bpb / Bildungsangebot' },
    { id: 'sq9-11', type: 'map', title: 'historical-basemaps: Deutsches Reich / Europa 1938', url: 'https://github.com/aourednik/historical-basemaps', desc: 'Kuratierte historische Referenzgeometrie fuer den Pogromraum 1938. Die Flaeche macht die reichsweite Dimension der Gewalt sichtbar, bleibt aber eine generalisierte historische Kartengrundlage.', license: 'MIT / Andreas Ourednik historical-basemaps' },
    { id: 'sq9-12', type: 'map', title: 'OpenStreetMap: Berliner Mauer / wall=berlin_wall', url: 'https://wiki.openstreetmap.org/wiki/Tag:wall%3Dberlin_wall', desc: 'OSM-Tagging und Overpass-Quelle fuer rekonstruierte Linien der Berliner Mauer. Im lokalen Seed bleibt eine Fallback-Geometrie erhalten, wenn die Live-Abfrage nicht erreichbar ist.', license: '(c) OpenStreetMap contributors, ODbL 1.0' },
  ];
  for (const s of sources) {
    run(
      'INSERT OR REPLACE INTO source (id, module_id, type, title, iiif_image_url, url, license, description) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [s.id, modId, s.type, s.title, (s as any).iiif ?? null, (s as any).url ?? null, s.license, s.desc]
    );
  }

  // === Ereignisse ===
  const events = [
    {
      id: 'e9-01',
      title: 'Scheidemann ruft die Republik aus',
      desc: 'Vom Reichstagsgebäude verkündet Philipp Scheidemann die deutsche Republik. Der Moment ist kein geplanter Verfassungsakt, sondern eine politische Intervention in einer revolutionären Lage: Scheidemann will der radikaleren Ausrufung einer Räterepublik zuvorkommen. Gerade deshalb ist die Szene für Quellenkritik ergiebig: spätere Erinnerungen, Tondokumente und zeitgenössische Berichte setzen unterschiedliche Akzente.',
      place: 'p9-01', time: 't9-01',
      sources: ['sq9-01', 'sq9-02'],
      actors: [
        { id: 'a9-01', role: 'Ausrufender' },
        { id: 'a9-09', role: 'politische Trägergruppe' },
      ],
      concepts: ['c9-01'],
    },
    {
      id: 'e9-02',
      title: 'Liebknecht ruft die freie sozialistische Republik aus',
      desc: 'Am selben Tag proklamiert Karl Liebknecht vom Berliner Schloss die „freie sozialistische Republik". Die konkurrierende Ausrufung zeigt, dass am 9. November 1918 nicht einfach eine fertige Demokratie entsteht, sondern mehrere Zukunftsentwürfe miteinander ringen: parlamentarische Republik, Rätebewegung und revolutionärer Sozialismus.',
      place: 'p9-02', time: 't9-02',
      sources: ['sq9-03'],
      actors: [{ id: 'a9-02', role: 'Ausrufender' }],
      concepts: ['c9-01'],
      follows: 'e9-01',
    },
    {
      id: 'e9-03',
      title: 'Hitler-Ludendorff-Putsch (Beginn)',
      desc: 'Im Münchener Bürgerbräukeller stürmt Hitler am Abend des 8. November 1923 eine Versammlung und zwingt bayerische Spitzenpolitiker unter Waffengewalt zur scheinbaren Zustimmung. Der geplante „Marsch auf Berlin" scheitert schon in München. Das Ereignis zeigt, wie antidemokratische Gewalt, Krisenerfahrung und politische Inszenierung zusammenwirken.',
      place: 'p9-03', time: 't9-03',
      sources: ['sq9-05'],
      actors: [
        { id: 'a9-03', role: 'Anführer' },
        { id: 'a9-04', role: 'Mit-Anführer' },
      ],
      concepts: ['c9-02'],
    },
    {
      id: 'e9-04',
      title: 'Schusswechsel an der Feldherrnhalle',
      desc: 'Der Marsch der Putschisten wird an der Feldherrnhalle von der bayerischen Landespolizei gestoppt. Beim Schusswechsel sterben vier Polizisten und 14 bis 16 Putschisten; die Zahlen variieren je nach Zählweise und späterer NS-Propaganda. Entscheidend ist die erinnerungspolitische Folge: Die NSDAP macht aus der Niederlage einen Märtyrerkult.',
      place: 'p9-04', time: 't9-04',
      sources: ['sq9-04'],
      actors: [
        { id: 'a9-03', role: 'beteiligt' },
        { id: 'a9-04', role: 'beteiligt' },
      ],
      concepts: ['c9-02'],
      follows: 'e9-03',
    },
    {
      id: 'e9-05',
      title: 'Pogromnacht ("Reichskristallnacht")',
      desc: 'In der Nacht vom 9. auf den 10. November 1938 brennen im Deutschen Reich Synagogen, jüdische Geschäfte und Wohnungen werden zerstört, etwa 100 Jüdinnen und Juden ermordet und rund 30.000 jüdische Männer in Konzentrationslager verschleppt. Die NS-Führung inszeniert die Gewalt als „spontanen Volkszorn"; Heydrichs Fernschreiben und das Verhalten von Polizei und Feuerwehr zeigen jedoch behördliche Steuerung und Duldung.',
      place: 'p9-05', time: 't9-05',
      sources: ['sq9-06', 'sq9-07'],
      actors: [
        { id: 'a9-05', role: 'Anstifter (Tagesbefehl)' },
        { id: 'a9-08', role: 'Ausführende' },
      ],
      concepts: ['c9-03', 'c9-04', 'c9-06', 'c9-07'],
    },
    {
      id: 'e9-06',
      title: 'Schabowskis Pressekonferenz',
      desc: 'Im Internationalen Pressezentrum der DDR verliest Günter Schabowski eine neue Reiseregelung. Auf Nachfragen erklärt er, sie gelte „sofort, unverzüglich". Diese Aussage ist weniger ein geplanter Öffnungsbefehl als ein medialer Auslöser: Fernsehen, Radio und Nachrichtenagenturen übersetzen die unklare Regelung in die Erwartung offener Grenzen.',
      place: 'p9-07', time: 't9-06',
      sources: ['sq9-08'],
      actors: [{ id: 'a9-06', role: 'Sprecher' }],
      concepts: ['c9-08'],
    },
    {
      id: 'e9-07',
      title: 'Grenzöffnung an der Bornholmer Straße',
      desc: 'Am Grenzübergang Bornholmer Straße wächst der Druck der wartenden Menschen über Stunden. Gegen 23:30 Uhr werden die Kontrollen vollständig eingestellt und die Grenze geöffnet. Die Entscheidung vor Ort folgt nicht einem klaren Befehl, sondern einer kollabierenden Befehlskette. Hier wird der Mauerfall als Zusammenspiel von Öffentlichkeit, Erwartungsdruck und lokaler Entscheidung sichtbar.',
      place: 'p9-06', time: 't9-07',
      sources: ['sq9-09', 'sq9-10'],
      actors: [{ id: 'a9-07', role: 'Entscheider vor Ort' }],
      concepts: ['c9-08', 'c9-05'],
      follows: 'e9-06',
    },
  ];

  for (const e of events) {
    run(
      'INSERT OR REPLACE INTO event (id, module_id, title, description, place_id, time_object_id, follows_id, part_of_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [e.id, modId, e.title, e.desc, e.place, e.time, (e as any).follows ?? null, null]
    );
    run('DELETE FROM event_source WHERE event_id = ?', [e.id]);
    for (const sid of e.sources) {
      run('INSERT OR REPLACE INTO event_source (event_id, source_id) VALUES (?, ?)', [e.id, sid]);
    }
    run('DELETE FROM event_actor WHERE event_id = ?', [e.id]);
    for (const al of e.actors) {
      run('INSERT OR REPLACE INTO event_actor (event_id, actor_id, role) VALUES (?, ?, ?)', [e.id, al.id, al.role]);
    }
    run('DELETE FROM event_concept WHERE event_id = ?', [e.id]);
    for (const cid of e.concepts) {
      run('INSERT OR REPLACE INTO event_concept (event_id, concept_id) VALUES (?, ?)', [e.id, cid]);
    }
  }

  flushSaveDb();
  console.log(`Seed "9. November" complete: ${events.length} Ereignisse, ${actors.length} Akteure, ${concepts.length} Begriffe, ${sources.length} Quellen.`);
}

seed().catch(console.error);
