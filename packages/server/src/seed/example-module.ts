// Seed: Reformation in Europa (Beispielmodul)
import { getDb } from '../db.js';
import { setDbInstance, run, flushSaveDb } from '../dbHelper.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function seed() {
  const db = await getDb();
  setDbInstance(db);

  // Run migrations first
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

  // Module
  const modId = '00000000-0000-0000-0000-000000000001';
  run('INSERT OR REPLACE INTO content_module (id, title, description, author_name) VALUES (?, ?, ?, ?)', [
    modId,
    'Die Reformation in Europa',
    'Ein kuratiertes Einstiegsmodul zu den Anfängen, Konflikten und Folgen der Reformation im 16. Jahrhundert. Es verbindet Orte, Akteure, Reichspolitik und Quellenkritik: Wo sind Ereignisse gut belegt, wo handelt es sich um spätere Erinnerung und protestantische Meistererzählung?',
    'Chronotop-Team',
  ]);

  // Places
  const places = [
    { id: 'p01', name: 'Wittenberg', lat: 51.8667, lng: 12.6472, wikidata: 'Q3955' },
    { id: 'p02', name: 'Worms', lat: 49.6322, lng: 8.3509, wikidata: 'Q3852' },
    { id: 'p03', name: 'Zürich', lat: 47.3769, lng: 8.5417, wikidata: 'Q72' },
    { id: 'p04', name: 'Genf', lat: 46.2044, lng: 6.1432, wikidata: 'Q71' },
    { id: 'p05', name: 'Rom', lat: 41.9028, lng: 12.4964, wikidata: 'Q220' },
    { id: 'p06', name: 'Augsburg', lat: 48.3705, lng: 10.8978, wikidata: 'Q2749' },
    { id: 'p07', name: 'Marburg', lat: 50.8110, lng: 8.7710, wikidata: 'Q3869' },
    { id: 'p08', name: 'Wartburg', lat: 50.9667, lng: 10.3069, wikidata: 'Q157571' },
    { id: 'p09', name: 'Straßburg', lat: 48.5734, lng: 7.7521, wikidata: 'Q6602' },
    { id: 'p10', name: 'Münster', lat: 52.0, lng: 7.6256, wikidata: 'Q2742' },
  ];

  for (const p of places) {
    run('INSERT OR REPLACE INTO place (id, module_id, wikidata_id, lat, lng, name) VALUES (?, ?, ?, ?, ?, ?)', [
      p.id, modId, p.wikidata, p.lat, p.lng, p.name,
    ]);
  }

  // Time objects
  const times = [
    { id: 't01', type: 'instant', date: '1517-10-31', label: '31. Oktober 1517' },
    { id: 't02', type: 'instant', date: '1521-04-17', label: '17. April 1521' },
    { id: 't03', type: 'span', start: '1521-05-04', end: '1522-03-06', label: 'Mai 1521 – März 1522' },
    { id: 't04', type: 'instant', date: '1522-01-29', label: '29. Januar 1522' },
    { id: 't05', type: 'instant', date: '1523-01-29', label: '29. Januar 1523' },
    { id: 't06', type: 'instant', date: '1529-10-01', label: '1.–4. Oktober 1529' },
    { id: 't07', type: 'instant', date: '1530-06-25', label: '25. Juni 1530' },
    { id: 't08', type: 'instant', date: '1536-05-21', label: '21. Mai 1536' },
    { id: 't09', type: 'instant', date: '1555-09-25', label: '25. September 1555' },
    { id: 't10', type: 'span', start: '1534-01-01', end: '1535-06-25', label: '1534–1535' },
  ];

  for (const t of times) {
    run(
      'INSERT OR REPLACE INTO time_object (id, module_id, type, date, start_date, end_date, certainty, label) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [t.id, modId, t.type, t.type === 'instant' ? t.date : null, t.type === 'span' ? t.start! : null, t.type === 'span' ? t.end! : null, 'certain', t.label]
    );
  }

  // Sources
  const sources = [
    { id: 's01', type: 'text', title: 'Martin Luther: 95 Thesen / Disputatio pro declaratione virtutis indulgentiarum', url: 'https://de.wikisource.org/wiki/95_Thesen', desc: 'Wikisource-Edition des lateinischen Thesentextes mit deutscher Übertragung. Für die Arbeit im Unterricht wichtig: Die Thesen kritisieren vor allem Ablasspraxis und kirchliche Autorität, nicht sofort eine neue Kirche.', license: 'gemeinfrei / Wikisource' },
    { id: 's02', type: 'text', title: 'Wormser Edikt (1521) und Reichstag zu Worms', url: 'https://tueditions.ulb.tu-darmstadt.de/v/pa000008-0107', desc: 'Digitale Edition zum Wormser Edikt. Sie belegt die Reichsacht gegen Luther, das Verbot seiner Schriften und die Verbindung von theologischer Kontroverse und Reichsrecht.', license: 'Digitale Deutsche Editionen' },
    { id: 's03', type: 'text', title: 'Confessio Augustana (Augsburger Bekenntnis), lateinische Fassung', url: 'https://la.wikisource.org/wiki/Confessio_Augustana', desc: 'Wikisource-Edition der Confessio Augustana. Der Text zeigt, wie die lutherischen Reichsstände ihre Lehre 1530 als rechtgläubig und reichspolitisch verantwortbar darstellen wollten.', license: 'gemeinfrei / Wikisource' },
    { id: 's04', type: 'text', title: 'Augsburger Religionsfrieden 1555 (Quellenauszug)', url: 'https://germanhistorydocs.org/en/from-the-reformations-to-the-thirty-years-war-1500-1648/the-religious-peace-of-augsburg-september-25-1555.pdf', desc: 'Quellenauszug bei German History in Documents and Images. Der Religionsfriede stabilisierte das Reich kurzfristig, schloss reformierte und täuferische Gruppen aber weiterhin aus.', license: 'GHDI / Quellenedition' },
    { id: 's05', type: 'image', title: 'Lucas Cranach d. Ä.: Porträt Martin Luthers, 1529', url: 'https://commons.wikimedia.org/wiki/File:Lucas_Cranach_the_Elder,_Martin_Luther,_1529,_Deutsches_Historisches_Museum,_Berlin_(26330512698).jpg', desc: 'Cranach-Porträt Luthers. Solche Bilder sind keine neutralen Abbilder, sondern Teil protestantischer Öffentlichkeitsarbeit und Wiedererkennbarkeit.', license: 'gemeinfrei / Wikimedia Commons' },
    { id: 's06', type: 'text', title: 'Huldrych Zwingli: 67 Artikel / Schlussreden (1523)', url: 'https://www.worldhistory.org/article/1925/zwinglis-67-articles/', desc: 'Englische Edition der 67 Artikel. Für den Unterricht als Vergleichsquelle geeignet: Zwinglis Reformation verschiebt den Konflikt stärker in Richtung städtischer Ratspolitik und Abendmahlsfrage.', license: 'World History Encyclopedia / CC BY-NC-SA' },
    { id: 's07', type: 'text', title: 'Johannes Calvin: Institutio Christianae Religionis', url: 'https://www.ccel.org/ccel/calvin/institutes.html', desc: 'Englische Online-Ausgabe der Institutio. Die Quelle macht sichtbar, dass Calvin nicht nur Genfer Kirchenordnung, sondern eine systematische reformierte Theologie prägt.', license: 'CCEL / gemeinfreie Textgrundlage' },
    { id: 's08', type: 'text', title: 'Täuferreich Münster: Überblick und Quellenhinweise', url: 'https://www.lwl.org/westfaelische-geschichte/portal/Internet/input_felder/langDatensatz_ebene4.php?urlID=433&url_tabelle=tab_websegmente', desc: 'Regionalhistorischer Überblick des LWL. Das Ereignis eignet sich für die Frage, wie radikale Reformation, städtische Krise und spätere Gegnerpropaganda ineinandergreifen.', license: 'LWL / Bildungsangebot' },
    { id: 's09', type: 'text', title: 'Martin Bucer und die oberdeutsche Reformation', url: 'https://www.deutsche-biographie.de/sfz5895.html', desc: 'Biografischer Überblick der Deutschen Biographie. Bucer steht für Vermittlungsversuche zwischen lutherischer und schweizerischer Reformation und für Straßburg als europäisches Reformzentrum.', license: 'Deutsche Biographie' },
    { id: 's10', type: 'map', title: 'historical-basemaps: Heiliges Roemisches Reich um 1530', url: 'https://github.com/aourednik/historical-basemaps', desc: 'Kuratierte historische Referenzgeometrie nach Andreas Ouredniks historical-basemaps. Im Modul wird sie als generalisierte Kontextflaeche genutzt, nicht als parzellenscharfe Reichsgrenze.', license: 'MIT / Andreas Ourednik historical-basemaps' },
  ];

  for (const s of sources) {
    run(
      'INSERT OR REPLACE INTO source (id, module_id, type, title, url, license, description) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [s.id, modId, s.type, s.title, (s as any).url ?? null, s.license, (s as any).desc ?? null]
    );
  }

  // Events
  const events = [
    { id: 'e01', title: 'Luthers Thesen werden öffentlich', desc: 'Martin Luther formuliert 95 Thesen gegen Ablasspraxis und kirchliche Autoritätsansprüche. Der berühmte Thesenanschlag an der Schlosskirche ist als Bild stark, historisch aber nicht sicher belegt. Für die Quellenarbeit ist deshalb wichtiger: Der Text zirkuliert rasch im Druck und verwandelt einen akademischen Streit in einen öffentlichen Konflikt.', place: 'p01', time: 't01', sources: ['s01', 's05'] },
    { id: 'e02', title: 'Reichstag zu Worms', desc: 'Luther wird vor Kaiser Karl V. und die Reichsstände geladen. Seine Weigerung, zentrale Schriften zu widerrufen, führt zur Reichsacht. Die berühmte Formel „Hier stehe ich" ist wahrscheinlich spätere Verdichtung; das Ereignis bleibt dennoch ein Schlüsselpunkt im Verhältnis von Gewissen, Reichsrecht und Autorität.', place: 'p02', time: 't02', sources: ['s02'], follows: 'e01' },
    { id: 'e03', title: 'Luthers Aufenthalt auf der Wartburg', desc: 'Friedrich der Weise lässt Luther nach Worms in Sicherheit bringen. Auf der Wartburg übersetzt Luther das Neue Testament ins Deutsche. Damit verschiebt sich die Reformation von der gelehrten Kontroverse zur breiteren religiösen Öffentlichkeit.', place: 'p08', time: 't03', sources: ['s02'], follows: 'e02' },
    { id: 'e04', title: 'Erste Zürcher Disputation', desc: 'Huldrych Zwingli verteidigt seine 67 Artikel vor dem Zürcher Rat. Der städtische Rat wird damit zum Motor der Reformation: Nicht allein Theologen entscheiden, sondern politische Institutionen ordnen Predigt, Bilder, Klöster und Gemeindeleben neu.', place: 'p03', time: 't05', sources: ['s06'] },
    { id: 'e05', title: 'Marburger Religionsgespräch', desc: 'Luther und Zwingli suchen eine gemeinsame reformatorische Linie, scheitern aber am Abendmahlsverständnis. Die Szene zeigt, dass „die Reformation" keine einheitliche Bewegung ist, sondern sich früh in lutherische, reformierte und radikalreformatorische Richtungen ausdifferenziert.', place: 'p07', time: 't06', sources: ['s06'] },
    { id: 'e06', title: 'Confessio Augustana', desc: 'Auf dem Augsburger Reichstag legen die lutherischen Stände ihr Bekenntnis vor. Die Confessio Augustana ist zugleich Glaubenstext und politisches Dokument: Sie soll gegenüber Kaiser und Reich zeigen, dass die lutherische Reformation keine Auflösung von Ordnung bedeutet.', place: 'p06', time: 't07', sources: ['s03'], follows: 'e02' },
    { id: 'e07', title: 'Calvins Institutio', desc: 'Johannes Calvin veröffentlicht die erste Fassung seiner Institutio. Das Werk macht aus reformatorischen Einzelkonflikten eine systematische Theologie und wird zur Grundlage einer reformierten Tradition, die von Genf aus international ausstrahlt.', place: 'p04', time: 't08', sources: ['s07'] },
    { id: 'e08', title: 'Täuferreich in Münster', desc: 'In Münster errichten radikale Täufer 1534/35 eine apokalyptisch geprägte Herrschaft. Belagerung, Gewalt und Niederschlagung werden später von Gegnern genutzt, um die gesamte Täuferbewegung als gefährlich zu diskreditieren. Das Ereignis braucht deshalb besonders sorgfältige Quellenkritik.', place: 'p10', time: 't10', sources: ['s08'] },
    { id: 'e09', title: 'Augsburger Religionsfrieden', desc: 'Der Religionsfrieden von 1555 erkennt lutherische Reichsstände rechtlich an und stabilisiert das Reich vorläufig. Er löst den Konflikt aber nur begrenzt: Untertanen erhalten keine moderne Religionsfreiheit, reformierte und täuferische Gruppen bleiben ausgeschlossen.', place: 'p06', time: 't09', sources: ['s04'], follows: 'e06' },
    { id: 'e10', title: 'Bucer in Straßburg', desc: 'Martin Bucer prägt Straßburg als oberdeutsches Reformzentrum. Seine Bedeutung liegt weniger in einem einzelnen Ereignis als in Vermittlung, Kirchenordnung und internationaler Vernetzung zwischen Wittenberg, Zürich, Basel und später England.', place: 'p09', time: 't04', sources: ['s09'] },
  ];

  for (const e of events) {
    run(
      'INSERT OR REPLACE INTO event (id, module_id, title, description, place_id, time_object_id, follows_id, part_of_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [e.id, modId, e.title, e.desc, e.place, e.time, e.follows ?? null, null]
    );
    // Link sources
    run('DELETE FROM event_source WHERE event_id = ?', [e.id]);
    for (const sid of e.sources) {
      run('INSERT OR REPLACE INTO event_source (event_id, source_id) VALUES (?, ?)', [e.id, sid]);
    }
  }

  flushSaveDb();
  console.log('Seed complete: "Die Reformation in Europa" with 10 events.');
}

seed().catch(console.error);
