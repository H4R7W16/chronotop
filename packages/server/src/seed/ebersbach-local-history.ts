// Seed: Ebersbach an der Fils - Stadtentwicklung am Geschichtspfad
//
// Lokalgeschichtliches MVP-Modul fuer Sek I 8-10.
// Leitfrage: Wie wurde aus einem Marktort an Strasse, Bach und Fils
// eine Industriestadt und heutige Stadtlandschaft?

import { getDb } from '../db.js';
import { setDbInstance, run, flushSaveDb } from '../dbHelper.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

type Certainty = 'certain' | 'probable' | 'contested' | 'reconstructed';
type SourceType = 'text' | 'image' | 'map' | 'statistics' | 'law' | 'speech' | 'object' | 'audio' | 'video';

type PlaceSeed = {
  id: string;
  station?: number;
  name: string;
  lat: number;
  lng: number;
  wd?: string | null;
  desc: string;
  geometry?: unknown;
  validFrom?: string;
  validTo?: string;
  certainty?: Certainty;
  source?: string;
};

type EventSeed = {
  id: string;
  title: string;
  desc: string;
  place: string;
  time: string;
  sources: string[];
  actors: { id: string; role: string }[];
  concepts: string[];
  follows?: string | null;
};

const geschichtspfadUrl = 'https://www.ebersbach.de/resources/02%20Datenobjekte/PDF-Dateien/Stadtarchiv/Geschichtspfad%20Ebersbach%20an%20der%20Fils_web.pdf';
const geschichtspfadLicense = 'Stadt Ebersbach an der Fils / Stadtarchiv; Texte und Bildauswahl: Uwe Geiger; Rechtehinweis beim Herausgeber beachten';

function stationSource(station: number) {
  return `eb-gp-${String(station).padStart(2, '0')}`;
}

function geschichtspfadSource(id: string, title: string, pages: string, desc: string) {
  return {
    id,
    type: 'text' as SourceType,
    title: `Geschichtspfad Ebersbach: ${title}`,
    url: geschichtspfadUrl,
    license: geschichtspfadLicense,
    desc: `${pages}; ${desc}`,
  };
}

async function ensureMigrations() {
  const db = await getDb();
  setDbInstance(db);

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
}

async function seed() {
  await ensureMigrations();

  const modId = '00000000-0000-0000-0000-000000000005';

  run(
    'INSERT OR REPLACE INTO content_module (id, title, description, author_name, version, license) VALUES (?, ?, ?, ?, ?, ?)',
    [
      modId,
      'Ebersbach an der Fils: Stadtentwicklung am Geschichtspfad',
      'Lokalgeschichtliches Kartenmodul für Sek I 8-10: Lernende untersuchen, wie Topografie, Reichsstraße, Markt, Fils, Mühlen, Eisenbahn, Industrie, NS-Zwangsarbeit, Nachkriegswachstum und Stadtsanierung die Entwicklung Ebersbachs prägten. Alle 33 Stationen des städtischen Geschichtspfads sind als Stations- und Quellenlayer sichtbar; die Karte zeichnet aber nur historisch relevante Achsen, Linien und Räume. Rekonstruierte historische Räume werden ausdrücklich als unsicher gekennzeichnet.',
      'Kreismedienzentrum Esslingen',
      '1.0.0-mvp',
      'Quellenabhängig; eigene didaktische Redaktion CC-BY-SA 4.0',
    ],
  );

  run('DELETE FROM event_source WHERE event_id IN (SELECT id FROM event WHERE module_id = ?)', [modId]);
  run('DELETE FROM event_actor WHERE event_id IN (SELECT id FROM event WHERE module_id = ?)', [modId]);
  run('DELETE FROM event_concept WHERE event_id IN (SELECT id FROM event WHERE module_id = ?)', [modId]);
  run('DELETE FROM task WHERE module_id = ?', [modId]);
  run('DELETE FROM movement WHERE module_id = ?', [modId]);
  run('DELETE FROM event WHERE module_id = ?', [modId]);
  run('DELETE FROM place WHERE module_id = ?', [modId]);
  run('DELETE FROM time_object WHERE module_id = ?', [modId]);
  run('DELETE FROM actor WHERE module_id = ?', [modId]);
  run('DELETE FROM concept WHERE module_id = ?', [modId]);
  run('DELETE FROM source WHERE module_id = ?', [modId]);

  const pointGeometry = (lng: number, lat: number) => ({
    type: 'Point',
    coordinates: [lng, lat],
  });

  const polygon = (coords: [number, number][]) => ({
    type: 'Polygon',
    coordinates: [[...coords, coords[0]]],
  });

  const ebersbachFils = {
    type: 'LineString',
    coordinates: [
      [9.578976, 48.705365], [9.577631, 48.706431], [9.575532, 48.707602],
      [9.573076, 48.708709], [9.569654, 48.710050], [9.564912, 48.711866],
      [9.560267, 48.713457], [9.557164, 48.715314], [9.553286, 48.716076],
      [9.550908, 48.716778], [9.547982, 48.716469], [9.544460, 48.715999],
      [9.540786, 48.715438], [9.537685, 48.715072], [9.534912, 48.714692],
      [9.531613, 48.714167], [9.529148, 48.713698], [9.526406, 48.712912],
      [9.523537, 48.712790], [9.521551, 48.712810], [9.518459, 48.712893],
      [9.515572, 48.712784], [9.512180, 48.712202], [9.508684, 48.712251],
      [9.503315, 48.712120], [9.497412, 48.712255],
    ],
  };

  const ebersbachRail = {
    type: 'LineString',
    coordinates: [
      [9.466547, 48.707965], [9.471226, 48.707965], [9.476271, 48.708291],
      [9.485443, 48.711174], [9.489843, 48.712780], [9.493527, 48.713519],
      [9.499220, 48.713734], [9.505401, 48.713940], [9.510760, 48.714118],
      [9.515019, 48.714253], [9.518479, 48.714395], [9.522306, 48.714983],
      [9.526000, 48.715939], [9.529867, 48.716932], [9.534053, 48.717804],
      [9.538096, 48.718240], [9.543920, 48.718275], [9.551869, 48.718038],
      [9.558665, 48.717455], [9.564682, 48.715950], [9.569375, 48.713899],
    ],
  };

  const ebersbachStream = {
    type: 'LineString',
    coordinates: [
      [9.520294, 48.722682], [9.520015, 48.721434], [9.519710, 48.720323],
      [9.519467, 48.719767], [9.519761, 48.718758], [9.520008, 48.717658],
      [9.520671, 48.717180], [9.521013, 48.716655], [9.521887, 48.716333],
      [9.522722, 48.715979], [9.523203, 48.715522], [9.523545, 48.715092],
      [9.523720, 48.714840], [9.523608, 48.714691], [9.523343, 48.714322],
      [9.523288, 48.714064], [9.522823, 48.713664], [9.521551, 48.712810],
    ],
  };

  const reichsstrasseB10 = {
    type: 'LineString',
    coordinates: [
      [9.509571, 48.713725], [9.513408, 48.713829], [9.515149, 48.714160],
      [9.519716, 48.714405], [9.523109, 48.714235], [9.524522, 48.714072],
      [9.526855, 48.714246], [9.529801, 48.715254], [9.531871, 48.716297],
      [9.534814, 48.717304], [9.537674, 48.717671], [9.540805, 48.717879],
      [9.543079, 48.717890],
    ],
  };

  const kirchbergArea = polygon([
    [9.51990, 48.71518], [9.52078, 48.71584], [9.52205, 48.71566],
    [9.52215, 48.71505], [9.52128, 48.71472], [9.52015, 48.71482],
  ]);

  const filsLowlandArea = polygon([
    [9.52055, 48.71225], [9.52475, 48.71210], [9.52810, 48.71292],
    [9.52720, 48.71372], [9.52325, 48.71383], [9.52095, 48.71343],
  ]);

  const industrialBeltArea = polygon([
    [9.51610, 48.71335], [9.52065, 48.71372], [9.52820, 48.71410],
    [9.53760, 48.71505], [9.53880, 48.71635], [9.53450, 48.71835],
    [9.52700, 48.71675], [9.51820, 48.71485],
  ]);

  const kaiserzeitExpansionArea = polygon([
    [9.52600, 48.71515], [9.53135, 48.71635], [9.53210, 48.71735],
    [9.52735, 48.71655], [9.52595, 48.71585],
  ]);

  const forcedLaborArea = polygon([
    [9.52980, 48.71420], [9.53610, 48.71525], [9.53725, 48.71715],
    [9.53200, 48.71775], [9.52820, 48.71620],
  ]);

  const geschichtspfadStationSources = [
    geschichtspfadSource('eb-gp-overview', 'Geschichtlicher Überblick', 'PDF S. 4-5', 'Überblick zu Frühspuren, Hochmittelalter, Württemberg-Bezug, Markt, Krisen, Eisenbahn, Industrialisierung, NS-Zeit, Nachkriegswachstum und Stadtsanierung.'),
    geschichtspfadSource('eb-gp-arnolf', 'Arnolf von Ebersbach und Ersterwähnung', 'PDF S. 6', 'Beleg zur ersten schriftlichen Nennung, zur Datierungsunsicherheit um 1160/1170 und zum Ursberger Traditionsbuch.'),
    geschichtspfadSource('eb-gp-volknand', 'Volknand von Ebersbach und Adelberg', 'PDF S. 7', 'Einordnung Volknands, der Adelberger Bezüge und der späteren Quellenbezeichnung als von Ebersbach.'),
    geschichtspfadSource('eb-gp-kieser-1685', 'Ebersbach im Forstlagerbuch 1685', 'PDF S. 8', 'Historische Ortsansicht mit Rathaus, Schwane, Filsbezug, Dorfzaun und Kirchenraum.'),
    geschichtspfadSource('eb-gp-kauffmann-literatur', 'Fritz Alexander Kauffmann und Leonhard', 'PDF S. 9', 'Literatur- und Erinnerungskontext zum KAUFFMANN-Areal und zur autobiografisch geprägten Kindheitserzählung.'),
    geschichtspfadSource(stationSource(1), 'Rathaus', 'PDF S. 10', 'Rathausneubau 1886/1887, Nutzung, Denkmalschutz und Erweiterung.'),
    geschichtspfadSource(stationSource(2), 'Badrain / Georg-Weingardt-Straße', 'PDF S. 11', 'Mühlkanal, Badstube, Sägerei, Gerberei, Zement- und Gewerbenutzung.'),
    geschichtspfadSource(stationSource(3), 'Burggarten / Fritz-Kauffmann-Straße', 'PDF S. 12', 'Flurname Burggarten, mögliche Niederungsburg, Burggarten-Restfläche und spätere Nutzungen.'),
    geschichtspfadSource(stationSource(4), 'Historisches Viertel Kirchberg', 'PDF S. 13', 'Kirchberg als mittelalterlicher Kern, hochwassersichere Lage, Reichsstraße und Burgtradition.'),
    geschichtspfadSource(stationSource(5), 'Siedlung, Herz-Jesu-Kirche und Luftschutzstollen', 'PDF S. 14-15', 'Arbeiterwohnen, katholische Gemeinde, Kirchenbau, Villen und Luftschutzstollen 1943.'),
    geschichtspfadSource(stationSource(6), 'Evangelische Veitskirche', 'PDF S. 16-17', 'Kirchen-, Patronats-, Bau- und Erinnerungsgeschichte einschließlich Turmbrand und Stolpersteinen.'),
    geschichtspfadSource(stationSource(7), 'Ältestes Schulhaus', 'PDF S. 18-19', 'Schulgeschichte seit dem 16. Jahrhundert, Schulhausentwicklung und Sonnenwirtle-Bezug.'),
    geschichtspfadSource(stationSource(8), 'Stadtbibliothek', 'PDF S. 19', 'Schulhausneubau 1811/1813, Umbauten und spätere Nutzung als Stadtbibliothek.'),
    geschichtspfadSource(stationSource(9), 'Stadtmuseum / Alte Post', 'PDF S. 20', 'Fachwerkbau von 1595, Alte-Post-Zuschreibung, Johannes Laichinger und Museumsnutzung.'),
    geschichtspfadSource(stationSource(10), 'Mittelalterliche Hinrichtungsstätte / Galgenwiese', 'PDF S. 21', 'Galgenwiese, Hochgericht, Abschreckungsfunktion und geophysikalische Prospektion 2020.'),
    geschichtspfadSource(stationSource(11), 'Altes Pfarrhaus und Pfarrscheuer', 'PDF S. 22', 'Pfarrhaus, Pfarrerrolle, Pfarrscheuer, Sonnenwirtle-Einbruch und Nutzungswandel.'),
    geschichtspfadSource(stationSource(12), 'Marktplatz', 'PDF S. 24-25', 'Platzanlage, Marktgeschichte, Märkte, autogerechter Umbau und Sonnenwirtle-Bezug.'),
    geschichtspfadSource(stationSource(13), 'Mühlrad von 1906 / Haus Filsblick', 'PDF S. 26', 'Mühlrad, Zementmühle, mechanische Weberei, Wasserleistung und Gewerbefolge.'),
    geschichtspfadSource(stationSource(14), 'Historisches Viertel Bettelspitz', 'PDF S. 27', 'Filsnahe Wohn- und Arbeitslage, Fischerei, Tagelöhner, Seilerei und Auswanderungsbezüge.'),
    geschichtspfadSource(stationSource(15), 'Siechengärten und Industriegebiet', 'PDF S. 28', 'Siechengärten, Martin & Söhne, Schwäbische Textilwerke, Blumenstein und Arisierungskontext.'),
    geschichtspfadSource(stationSource(16), 'Wirtschaft zur Schwane', 'PDF S. 29', 'Gasthausgeschichte, Straße, Wohlstand, Kino, Vereine und SPD-Ortsvereinsgründung.'),
    geschichtspfadSource(stationSource(17), 'Filstalstraße, Rinnenzoll und B10', 'PDF S. 30', 'Landstraße, Rinnenzoll, Chaussee, Zollhütte, Pflasterung und B10-Verkehrsgeschichte.'),
    geschichtspfadSource(stationSource(18), 'Fischerhanne und Fachwerk-Scheuer', 'PDF S. 31', 'Fischerhanne, Sonnenwirtle-Konflikt, Hafnerstraße und Fachwerkbauweise.'),
    geschichtspfadSource(stationSource(19), 'Kirchheimer Straße und Filshochwasser', 'PDF S. 32-33', 'Filsbrücke, Furt, Brückenzoll, Armenhaus, Hochwasser 1817 und Brunnenanlage.'),
    geschichtspfadSource(stationSource(20), 'Mühle Kolb und Freibäder', 'PDF S. 34-36', 'Äußere Mühle, Mühlkanal, Translozierung des Mühlrads, Hermann Kolb und frühe Freibäder.'),
    geschichtspfadSource(stationSource(21), 'Zeitungsverlag und Kreissparkasse', 'PDF S. 37', 'Zeitung Unterer Filstal- und Schurwaldbote, Eugen Jenz, Gleichschaltung und Kreissparkasse.'),
    geschichtspfadSource(stationSource(22), 'Wirtschaft zur Traube und Markt-Apotheke', 'PDF S. 38-39', 'Obere Herberge, Brauerei, Gasthausbrand, Kaufhaus und Markt-Apotheke.'),
    geschichtspfadSource(stationSource(23), 'Amtshaus, Posthaus und Kreissparkasse', 'PDF S. 40', 'Postmeister, Poststrecke, Amtmannsfamilie Geyer, Ludwigstraße und spätere Nutzungen.'),
    geschichtspfadSource(stationSource(24), 'KAUFFMANN-Areal', 'PDF S. 41', 'Zinser-Zementofen, Kauffmann-Produktion, Villa, Bürgerentscheid, Musikschule und neue Mitte.'),
    geschichtspfadSource(stationSource(25), 'Bahnhof und Friedenslinde', 'PDF S. 42-43', 'Bahnhof seit 1847, Post/Telegraph/Telefon, Bahntrasse, Friedenslinde und Todesmarsch 1945.'),
    geschichtspfadSource(stationSource(26), 'Ortserweiterung der Kaiserzeit', 'PDF S. 44', 'Gewerbemischgebiet, Wilhelmstraße, Acetylenwerk, Apollo-Kino und Zwangsarbeit für Zinser.'),
    geschichtspfadSource(stationSource(27), 'Alte Tuchfabrik, Altes Gaswerk und Haefele-Areal', 'PDF S. 45-46', 'Tuchfabrik Scheuffelen, Gaswerk, Garnspinnerei Haefele, Pusteblume und Verkehrsgeschichte.'),
    geschichtspfadSource(stationSource(28), 'Grünanlage, Reichsarbeitsdienstlager und Kriegsgefangenenkommando', 'PDF S. 47-49', 'Dietrich-Eckart-Anlage, RAD-Lager, Kriegsgefangenenkommando 6051 und Zwangsarbeiterzahlen 1944/45.'),
    geschichtspfadSource(stationSource(29), 'Multifunktionsplatz Viehmarktplatz', 'PDF S. 50', 'Vieh- und Pferdemärkte, Bauverbot, Schieß- und Zollhaus sowie Revolutionsjahre.'),
    geschichtspfadSource(stationSource(30), 'Eberbrunnen', 'PDF S. 51', 'Eberskulptur, Wappen, Namensdeutung und Stadtfarben.'),
    geschichtspfadSource(stationSource(31), 'Sonnenwirtle und Deutscher Kaiser', 'PDF S. 52', 'Friedrich Schwahn, Strafjustiz, Hinrichtung und literarische Verarbeitung durch Schiller und Hermann Kurz.'),
    geschichtspfadSource(stationSource(32), 'Stadtapotheke', 'PDF S. 53', 'Apothekengeschichte, Carl Lang, Daimler-Bezüge, Johannes Laichinger und technische Wissenskultur.'),
    geschichtspfadSource(stationSource(33), 'Schuler-Areal', 'PDF S. 54', 'Sägewerk, Hammerschmiede, Schuler-Filiale, Südrad und industrieller Strukturwandel.'),
  ];

  const sources = [
    {
      id: 'eb-s01',
      type: 'text' as SourceType,
      title: 'Stadt Ebersbach: Geschichtspfad Ebersbach an der Fils',
      url: geschichtspfadUrl,
      license: geschichtspfadLicense,
      desc: 'Primäre Grundlage des Moduls: offizieller städtischer Geschichtspfad. Für Orte und Ereignisse werden zusätzlich die konkreten PDF-Seiten als eigene Quellenreferenzen geführt.',
    },
    {
      id: 'eb-s02',
      type: 'text' as SourceType,
      title: 'Stadt Ebersbach: Stadtarchiv',
      url: 'https://www.ebersbach.de/Lebenswertes-Ebersbach/Das-ist-Ebersbach/Stadtarchiv',
      license: 'Stadt Ebersbach an der Fils',
      desc: 'Offizielle Seite des Stadtarchivs; Kontext zur archivischen Zuständigkeit und zur lokalen Forschungsgrundlage.',
    },
    {
      id: 'eb-s03',
      type: 'text' as SourceType,
      title: 'LEO-BW Ortslexikon: Ebersbach an der Fils',
      url: 'https://www.leo-bw.de/web/guest/detail-gis/-/Detail/details/ORT/labw_ortslexikon/674/Ebersbach%20an%20der%20Fils',
      license: 'LEO-BW / Landesarchiv Baden-Württemberg',
      desc: 'Landeskundliche Kontrollquelle zu Siedlung, Württemberg-Bezug, Kirche, Markt, Poststation und Industrialisierung. Wichtig für die Aussage, dass Industrie vorwiegend am östlichen und westlichen Ortsrand in der Talaue nahe der Eisenbahn entstand.',
    },
    {
      id: 'eb-s04',
      type: 'text' as SourceType,
      title: 'Beschreibung des Oberamts Göppingen, Kapitel Ebersbach (1844)',
      url: 'https://de.wikisource.org/wiki/Beschreibung_des_Oberamts_G%C3%B6ppingen/Kapitel_B_10',
      license: 'Gemeinfreie historische Quelle, digitalisiert bei Wikisource',
      desc: 'Historische Quelle, Wikisource-Seiten [177]-[181]. Wichtig für Filslage, Brücke, Ebersbach, Kirche, Gewerbe, Mühlen, Märkte, Rinnenzoll, Poststation, Hochgericht, Burgtradition und Krisenerinnerung.',
    },
    {
      id: 'eb-s05',
      type: 'map' as SourceType,
      title: 'OpenStreetMap: Ebersbach an der Fils und Relation 2792717',
      url: 'https://www.openstreetmap.org/relation/2792717',
      license: '(c) OpenStreetMap contributors, ODbL 1.0',
      desc: 'Moderne Präzisionsreferenz für heutige Gebäude, Straßen, Wasserlauf, Bahntrasse und kommunale Identifikatoren. Historische Aussagen werden nicht aus OSM abgeleitet.',
    },
    {
      id: 'eb-s06',
      type: 'map' as SourceType,
      title: 'Wikidata: Ebersbach an der Fils (Q80844)',
      url: 'https://www.wikidata.org/wiki/Q80844',
      license: 'Wikidata, CC0',
      desc: 'Normdaten- und Identifikatorquelle für die Stadt Ebersbach an der Fils.',
    },
    {
      id: 'eb-s07',
      type: 'map' as SourceType,
      title: 'LEO-BW Kartenblatt NO XX 31 / historische Kartenbezüge Ebersbach',
      url: 'https://www.leo-bw.de/web/guest/detail-gis/-/Detail/details/ORT/labw_ortslexikon/674/Ebersbach%20an%20der%20Fils',
      license: 'LEO-BW / Landesarchiv Baden-Württemberg',
      desc: 'Startpunkt für historische Kartenbezüge, darunter Kartenblätter zu Ebersbach. Im MVP wird darauf verwiesen, ohne nicht geprüfte Kartendigitalisate als Basemap zu übernehmen.',
    },
    {
      id: 'eb-s08',
      type: 'map' as SourceType,
      title: 'Chronotop Demo-Geodaten: Ebersbach Geschichtspfad',
      url: '/geodata/ebersbach-geschichtspfad.geojson',
      license: 'CC BY-SA 4.0 / didaktische Rekonstruktion mit Quellenhinweisen',
      desc: 'Kuratierte lokale GeoJSON-Datei für GitHub-Pages-Demo und Autorenimport: Stationen, präzise Referenzlinien und rekonstruierte Untersuchungsräume.',
    },
    {
      id: 'eb-s09',
      type: 'law' as SourceType,
      title: 'Stadt Ebersbach: Bebauungsplan Kauffmann-Areal, 1. Änderung, Begründung',
      url: 'https://www.ebersbach.de/resources/02%20Datenobjekte/E-B%C3%BCrgerservice/Bebauungspl%C3%A4ne/KauffmannAreal/Textteil%20inklusive%20Begr%C3%BCndung%20erste%20%C3%84nderung%20Bebauungsplan%20Kauffmann%20Areal.pdf',
      license: 'Stadt Ebersbach an der Fils',
      desc: 'Amtliche Planungsquelle zur Lage, heutigen Nutzung und städtebaulichen Bedeutung des KAUFFMANN-Areals nach der Fertigstellung 2012.',
    },
    ...geschichtspfadStationSources,
  ];

  for (const s of sources) {
    run(
      'INSERT OR REPLACE INTO source (id, module_id, type, title, url, license, description) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [s.id, modId, s.type, s.title, s.url, s.license, s.desc],
    );
  }

  const places: PlaceSeed[] = [
    {
      id: 'eb-p01', station: 1, name: 'Rathaus', lat: 48.714617, lng: 9.523606, wd: 'Q80844',
      desc: 'Rathaus und kommunaler Mittelpunkt. Der Backsteinbau von 1887 steht für Selbstverwaltung, Modernisierung und die spätere Umgestaltung um Bahnhofsallee und KAUFFMANN-Areal.',
      geometry: pointGeometry(9.523606, 48.714617), validFrom: '1887', certainty: 'certain', source: stationSource(1),
    },
    {
      id: 'eb-p02', station: 2, name: 'Badrain / Georg-Weingardt-Straße', lat: 48.714573, lng: 9.523811,
      desc: 'Ehemaliger Raum von Mühlkanal, Badstube, Sägerei, Gerberei, Zement- und späteren Gewerbenutzungen. Der heutige Straßenbezug ist präzise, die historische Nutzungsabfolge ist aus dem Geschichtspfad rekonstruiert.',
      geometry: pointGeometry(9.523811, 48.714573), validFrom: '1535', certainty: 'probable', source: stationSource(2),
    },
    {
      id: 'eb-p03', station: 3, name: 'Burggarten / Fritz-Kauffmann-Straße', lat: 48.715092, lng: 9.523845,
      desc: 'Flurname und Erinnerungsort einer möglichen Niederungsburg. Der Geschichtspfad betont, dass eine Burg hier nicht archäologisch gesichert ist; die Geometrie ist daher als wahrscheinlicher Referenzpunkt zu lesen.',
      geometry: pointGeometry(9.523845, 48.715092), validFrom: '1160', certainty: 'contested', source: stationSource(3),
    },
    {
      id: 'eb-p04', station: 4, name: 'Historisches Viertel Kirchberg', lat: 48.715463, lng: 9.520792,
      desc: 'Hochgelegener mittelalterlicher Kernbereich um Veitskirche, Kirchbergstraße, Hohe Gasse und Krapfenreuter Straße. Die Fläche wird als siedlungsgeschichtlicher Untersuchungsraum rekonstruiert.',
      geometry: pointGeometry(9.520792, 48.715463), validFrom: '1400', certainty: 'probable', source: stationSource(4),
    },
    {
      id: 'eb-p05', station: 5, name: 'Siedlung, Herz-Jesu-Kirche und Luftschutzstollen', lat: 48.718240, lng: 9.528919,
      desc: 'Arbeiterwohnen, katholische Gemeinde und Luftschutzgeschichte an der Leintelstraße. Herz-Jesu wurde 1931 geweiht; der Luftschutzstollen von 1943 ist nur teilweise erhalten beziehungsweise erschließbar.',
      geometry: pointGeometry(9.528919, 48.718240), validFrom: '1900', certainty: 'probable', source: stationSource(5),
    },
    {
      id: 'eb-p06', station: 6, name: 'Evangelische Veitskirche', lat: 48.715706, lng: 9.520765,
      desc: 'Ältestes Gebäude und kirchlicher Mittelpunkt. Die Kirche verweist auf Patronat, Wehrkirchhof, Reformation und auf Formen christlicher Hilfe und Erinnerung im 20. Jahrhundert.',
      geometry: pointGeometry(9.520765, 48.715706), validFrom: '1228', certainty: 'certain', source: stationSource(6),
    },
    {
      id: 'eb-p07', station: 7, name: 'Ältestes Schulhaus', lat: 48.715520, lng: 9.521350,
      desc: 'Frühe Schulgeschichte am Kirchberg: Schulunterricht ist seit dem 16. Jahrhundert belegt; das alte Schulhaus macht Bildung als Teil kommunaler Entwicklung sichtbar.',
      geometry: pointGeometry(9.521350, 48.715520), validFrom: '1561', certainty: 'probable', source: stationSource(7),
    },
    {
      id: 'eb-p08', station: 8, name: 'Stadtbibliothek', lat: 48.715524, lng: 9.521194,
      desc: 'Heutige Stadtbibliothek im Kirchbergraum. Im Modul dient sie als Station für Bildung, Lesen und die Umnutzung historischer Gebäude.',
      geometry: pointGeometry(9.521194, 48.715524), validFrom: '1811', certainty: 'certain', source: stationSource(8),
    },
    {
      id: 'eb-p09', station: 9, name: 'Stadtmuseum / Alte Post', lat: 48.715090, lng: 9.520816,
      desc: 'Das Gebäude von 1595 ist ein wichtiger Erinnerungs- und Museumsort. Die volkstümliche Bezeichnung als Alte Post wird quellenkritisch behandelt, weil die Postgeschichte differenzierter ist.',
      geometry: pointGeometry(9.520816, 48.715090), validFrom: '1595', certainty: 'certain', source: stationSource(9),
    },
    {
      id: 'eb-p10', station: 10, name: 'Mittelalterliche Hinrichtungsstätte / Galgenwiese', lat: 48.710981, lng: 9.524452,
      desc: 'Rekonstruierter Bezug zur Hochgerichtsbarkeit südlich des Ortskerns. Die Verortung ist als Erinnerungs- und Flurnamenbezug zu lesen, nicht als vermessener Galgenstandort.',
      geometry: pointGeometry(9.524452, 48.710981), validFrom: '1500', validTo: '1800', certainty: 'reconstructed', source: stationSource(10),
    },
    {
      id: 'eb-p11', station: 11, name: 'Altes Pfarrhaus und Pfarrscheuer', lat: 48.714744, lng: 9.523052,
      desc: 'Pfarrhaus von 1581 und angrenzende Gebäude. Der Ort steht für kirchliche Verwaltung, Gemeindeleben und lokale Konfliktgeschichten.',
      geometry: pointGeometry(9.523052, 48.714744), validFrom: '1581', certainty: 'certain', source: stationSource(11),
    },
    {
      id: 'eb-p12', station: 12, name: 'Marktplatz', lat: 48.714273, lng: 9.523643,
      desc: 'Markt- und Öffentlichkeitsraum. Die Marktprivilegien, Wochen- und Jahrmärkte sowie spätere Verkehrs- und Platzumgestaltungen verdichten sich hier.',
      geometry: pointGeometry(9.523643, 48.714273), validFrom: '1599', certainty: 'certain', source: stationSource(12),
    },
    {
      id: 'eb-p13', station: 13, name: 'Mühlrad von 1906 / Haus Filsblick', lat: 48.712809, lng: 9.525623,
      desc: 'Wasserenergie als Motor der Gewerbeentwicklung. Das große unterschlächtige Mühlrad verweist auf Gips, Zement, Weberei und die Nutzung von Fils und Kanal.',
      geometry: pointGeometry(9.525623, 48.712809), validFrom: '1906', certainty: 'probable', source: stationSource(13),
    },
    {
      id: 'eb-p14', station: 14, name: 'Historisches Viertel Bettelspitz', lat: 48.713158, lng: 9.527460,
      desc: 'Filsnahe, hochwassergefährdete und sozial schwächere Wohnlage. Die Station macht sichtbar, dass Topografie und soziale Lage zusammenhängen konnten.',
      geometry: pointGeometry(9.527460, 48.713158), validFrom: '1700', certainty: 'reconstructed', source: stationSource(14),
    },
    {
      id: 'eb-p15', station: 15, name: 'Siechengärten und Industriegebiet', lat: 48.714300, lng: 9.518225,
      desc: 'Vom armen Siechengärten-Raum zum industriellen Ortsrand: 1887 begann mit Martin & Söhne eine neue Fabrikphase; später folgten textile Großbetriebe und NS-Verfolgungszusammenhänge.',
      geometry: pointGeometry(9.518225, 48.714300), validFrom: '1887', certainty: 'probable', source: stationSource(15),
    },
    {
      id: 'eb-p16', station: 16, name: 'Wirtschaft zur Schwane', lat: 48.714467, lng: 9.521090,
      desc: 'Gasthaus seit dem 16. Jahrhundert, Lage an der alten Durchgangsstraße. Die Schwane steht für Wirtshausöffentlichkeit, Verkehr, Kino- und Vereinsgeschichte.',
      geometry: pointGeometry(9.521090, 48.714467), validFrom: '1537', certainty: 'certain', source: stationSource(16),
    },
    {
      id: 'eb-p17', station: 17, name: 'Filstalstraße, Rinnenzoll und B10', lat: 48.714235, lng: 9.523109,
      desc: 'Straßen- und Durchgangsraum vom Rinnenzoll über Chaussee und Bundesstraße bis zur Verkehrsentlastung. Der Punkt liegt auf der historischen Ortsdurchfahrt.',
      geometry: pointGeometry(9.523109, 48.714235), validFrom: '1503', certainty: 'probable', source: stationSource(17),
    },
    {
      id: 'eb-p18', station: 18, name: 'Fischerhanne und Fachwerk-Scheuer', lat: 48.713703, lng: 9.524812,
      desc: 'Hafnerstraße und Fachwerk-Scheuer als Ort lokaler Alltags- und Kriminalgeschichte um den Sonnenwirtle-Kontext.',
      geometry: pointGeometry(9.524812, 48.713703), validFrom: '1757', certainty: 'probable', source: stationSource(18),
    },
    {
      id: 'eb-p19', station: 19, name: 'Kirchheimer Straße und Filsübergang', lat: 48.713925, lng: 9.524751,
      desc: 'Straße, Furt, Brücke und Hochwasser: Die Station zeigt, wie der Zugang über die Fils das Ortsleben begrenzte und zugleich verband.',
      geometry: pointGeometry(9.524751, 48.713925), validFrom: '1700', certainty: 'probable', source: stationSource(19),
    },
    {
      id: 'eb-p20', station: 20, name: 'Mühle Kolb und Freibäder', lat: 48.712300, lng: 9.524700,
      desc: 'Mühlenstandort südlich der Fils, später durch Verkehrsumbau stark verändert. Der Punkt ist eine rekonstruierte Referenz für Mühle, Kanal und frühe Badekultur.',
      geometry: pointGeometry(9.524700, 48.712300), validFrom: '1400', certainty: 'reconstructed', source: stationSource(20),
    },
    {
      id: 'eb-p21', station: 21, name: 'Zeitungsverlag und Kreissparkasse', lat: 48.714180, lng: 9.524520,
      desc: 'Presse, Kreditwesen und Öffentlichkeit: Der frühere Zeitungsverlag macht lokale Kommunikation, Wirtschaftskrise und Gleichschaltung greifbar.',
      geometry: pointGeometry(9.524520, 48.714180), validFrom: '1906', certainty: 'probable', source: stationSource(21),
    },
    {
      id: 'eb-p22', station: 22, name: 'Wirtschaft zur Traube und Markt-Apotheke', lat: 48.714310, lng: 9.524938,
      desc: 'Obere Herberge, Gastwirtschaft, Handel und Apotheke. Die Station zeigt städtische Funktionen an der Hauptstraße: Versorgung, Kommunikation und sozialer Status.',
      geometry: pointGeometry(9.524938, 48.714310), validFrom: '1555', certainty: 'probable', source: stationSource(22),
    },
    {
      id: 'eb-p23', station: 23, name: 'Amtshaus, Posthaus und Kreissparkasse', lat: 48.714059, lng: 9.523967,
      desc: 'Amts- und Postgeschichte am Marktplatz. Der Ort verbindet lokale Verwaltung, Reichsstraße, Poststation und spätere Finanzinfrastruktur.',
      geometry: pointGeometry(9.523967, 48.714059), validFrom: '1554', certainty: 'probable', source: stationSource(23),
    },
    {
      id: 'eb-p24', station: 24, name: 'KAUFFMANN-Areal', lat: 48.714820, lng: 9.524174,
      desc: 'Vom Zinser-Zementofen zur Kauffmann-Fabrik und zum heutigen innerstädtischen Areal. Der Ort ist ein Schlüssel für Industrie, Literatur, Bürgerentscheid und Stadtsanierung.',
      geometry: pointGeometry(9.524174, 48.714820), validFrom: '1888', certainty: 'probable', source: stationSource(24),
    },
    {
      id: 'eb-p25', station: 25, name: 'Bahnhof und Friedenslinde', lat: 48.715968, lng: 9.526622,
      desc: 'Bahnhof der Filsbahn seit 1847, später Post-, Telegraphen- und Verwaltungsbezug. Die Friedenslinde verweist auf Erinnerung an 1870/71.',
      geometry: pointGeometry(9.526622, 48.715968), validFrom: '1847', certainty: 'certain', source: stationSource(25),
    },
    {
      id: 'eb-p26', station: 26, name: 'Ortserweiterung der Kaiserzeit', lat: 48.716200, lng: 9.528176,
      desc: 'Erweiterungsraum zwischen Bahnhofstraße, Wilhelmstraße und Brückenstraße. Straßennamen, Wohnbauten und Betriebe zeigen das Wachstum um 1900.',
      geometry: pointGeometry(9.528176, 48.716200), validFrom: '1880', validTo: '1914', certainty: 'reconstructed', source: stationSource(26),
    },
    {
      id: 'eb-p27', station: 27, name: 'Alte Tuchfabrik, Altes Gaswerk und Haefele-Areal', lat: 48.716051, lng: 9.536857,
      desc: 'Östlicher Industrie- und Gewerberaum: Tuchfabrik, Gaswerk, Haefele und heutige Umnutzungen zeigen Strukturwandel im Filstal.',
      geometry: pointGeometry(9.536857, 48.716051), validFrom: '1862', certainty: 'probable', source: stationSource(27),
    },
    {
      id: 'eb-p28', station: 28, name: 'Grünanlage, Reichsarbeitsdienstlager und Kriegsgefangenenkommando', lat: 48.714864, lng: 9.532252,
      desc: 'Rekonstruierter Problemraum für Parkanlage, RAD-Lager, Kriegsgefangenenkommando und Zwangsarbeit. Die genaue Lagerausdehnung wird nicht behauptet.',
      geometry: pointGeometry(9.532252, 48.714864), validFrom: '1934', validTo: '1945', certainty: 'reconstructed', source: stationSource(28),
    },
    {
      id: 'eb-p29', station: 29, name: 'Multifunktionsplatz Viehmarktplatz', lat: 48.713908, lng: 9.526056,
      desc: 'Vieh- und Pferdemärkte machten Ebersbach überregional sichtbar. Der heutige Platz erinnert an Marktökonomie, Verkehr und Wandel öffentlicher Flächen.',
      geometry: pointGeometry(9.526056, 48.713908), validFrom: '1800', certainty: 'probable', source: stationSource(29),
    },
    {
      id: 'eb-p30', station: 30, name: 'Eberbrunnen', lat: 48.714273, lng: 9.523643,
      desc: 'Symbolischer Ort für Name, Wappen und Stadtidentität. Der Eber verweist auf Siegeltradition, Ortsnamenfragen und kommunale Selbstdeutung.',
      geometry: pointGeometry(9.523643, 48.714273), validFrom: '1968', certainty: 'probable', source: stationSource(30),
    },
    {
      id: 'eb-p31', station: 31, name: 'Sonnenwirtle und Deutscher Kaiser', lat: 48.714104, lng: 9.525541,
      desc: 'Erinnerungsort um Friedrich Schwahn, den Sonnenwirtle. Der Fall verbindet Sozialgeschichte, Strafjustiz und literarische Verarbeitung bei Schiller und Hermann Kurz.',
      geometry: pointGeometry(9.525541, 48.714104), validFrom: '1729', certainty: 'probable', source: stationSource(31),
    },
    {
      id: 'eb-p32', station: 32, name: 'Stadtapotheke', lat: 48.714302, lng: 9.526436,
      desc: 'Apotheken- und Technikgeschichte an der Hauptstraße. Der Geschichtspfad verbindet den Ort unter anderem mit Carl Lang, Daimler-Bezügen und lokaler Wissenskultur.',
      geometry: pointGeometry(9.526436, 48.714302), validFrom: '1862', certainty: 'certain', source: stationSource(32),
    },
    {
      id: 'eb-p33', station: 33, name: 'Schuler-Areal', lat: 48.714237, lng: 9.538337,
      desc: 'Östlicher Gewerbestandort im Buchwasen: Säge, Hammer, Kleemann, Schuler und spätere Industrien zeigen die lange Linie von Wassernutzung, Maschinenbau und Strukturwandel.',
      geometry: pointGeometry(9.538337, 48.714237), validFrom: '1607', certainty: 'probable', source: stationSource(33),
    },
    {
      id: 'eb-p34', name: 'Fils als Tal-, Mühlen- und Industrieraum', lat: 48.7139, lng: 9.5270,
      desc: 'Aktuelle OSM-Wasserlaufgeometrie als moderne Referenz für den historischen Filsraum: Hochwasser, Mühlen, Kanäle, Gewerbe und Industrie müssen zusammen gelesen werden.',
      geometry: ebersbachFils, validFrom: '1400', certainty: 'reconstructed', source: 'eb-s04',
    },
    {
      id: 'eb-p35', name: 'Filsbahn durch Ebersbach', lat: 48.7162, lng: 9.5263,
      desc: 'Präzise moderne Bahntrassenreferenz der heutigen Strecke 4700. Historisch steht sie für die 1847 eröffnete Filsbahn und die Durchschneidung wie Anbindung Ebersbachs.',
      geometry: ebersbachRail, validFrom: '1847', certainty: 'reconstructed', source: stationSource(25),
    },
    {
      id: 'eb-p36', name: 'Ebersbach und Mühlkanalbezug', lat: 48.7152, lng: 9.5234,
      desc: 'Wasserlauf des Ebersbachs als moderne Referenz für Badrain, Mühlkanal, Wasserrechte und frühe Gewerbe. Historische Kanalführungen sind nur teilweise rekonstruierbar.',
      geometry: ebersbachStream, validFrom: '1535', certainty: 'reconstructed', source: stationSource(2),
    },
    {
      id: 'eb-p37', name: 'Reichsstraße, Chaussee, Ortsdurchfahrt und B10-Achse', lat: 48.7147, lng: 9.5270,
      desc: 'Rekonstruierte Leselinie der alten Durchgangsachse durch den Ort. Sie verbindet Marktort, Rinnenzoll, Poststation, Chaussee, B10-Belastung und spätere Entlastung.',
      geometry: reichsstrasseB10, validFrom: '1503', certainty: 'reconstructed', source: stationSource(17),
    },
    {
      id: 'eb-p38', name: 'Mittelalterlicher Kirchberg-Kern', lat: 48.7153, lng: 9.5210,
      desc: 'Rekonstruierter hochwassersicherer Siedlungskern um Kirchberg und Veitskirche. Die Fläche ist ein didaktischer Untersuchungsraum, keine Katastergrenze.',
      geometry: kirchbergArea, validFrom: '1400', certainty: 'reconstructed', source: stationSource(4),
    },
    {
      id: 'eb-p39', name: 'Filsniederung und Bettelspitz', lat: 48.7131, lng: 9.5248,
      desc: 'Rekonstruierter Niederungsraum südlich des Ortskerns. Er macht Hochwasser, ärmere Wohnlagen, Mühlen, Brücken und Gewerbe als Raumbeziehung sichtbar.',
      geometry: filsLowlandArea, validFrom: '1700', certainty: 'reconstructed', source: stationSource(14),
    },
    {
      id: 'eb-p40', name: 'Industrieband an Bahn und Fils', lat: 48.7154, lng: 9.5285,
      desc: 'Analytische Fläche für Fabriken, Gewerbe, Bahn, Fils und spätere Umnutzungen. Sie behauptet keine historischen Werksgrenzen, sondern zeigt Standortlogik.',
      geometry: industrialBeltArea, validFrom: '1887', validTo: '1970', certainty: 'reconstructed', source: stationSource(15),
    },
    {
      id: 'eb-p41', name: 'Kaiserzeitliche Ortserweiterung', lat: 48.7162, lng: 9.5284,
      desc: 'Rekonstruierter Erweiterungsraum um Bahnhofstraße, Wilhelmstraße und Brückenstraße. Er steht für Bevölkerungswachstum, Arbeiterwohnen und neue städtische Funktionen um 1900.',
      geometry: kaiserzeitExpansionArea, validFrom: '1880', validTo: '1914', certainty: 'reconstructed', source: stationSource(26),
    },
    {
      id: 'eb-p42', name: 'RAD-, Kriegsgefangenen- und Zwangsarbeitsraum', lat: 48.7157, lng: 9.5326,
      desc: 'Rekonstruierter Problemraum für Reichsarbeitsdienstlager, Kriegsgefangenenkommando und ausländische Zwangsarbeit 1944/45. Die genaue Ausdehnung bleibt unsicher.',
      geometry: forcedLaborArea, validFrom: '1934', validTo: '1945', certainty: 'reconstructed', source: stationSource(28),
    },
  ];

  for (const p of places) {
    run(
      `INSERT OR REPLACE INTO place
       (id, module_id, wikidata_id, lat, lng, name, description, geometry_geojson, valid_from, valid_to, certainty, source_of_claim)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        p.id, modId, p.wd ?? null, p.lat, p.lng,
        p.name,
        p.desc,
        p.geometry ? JSON.stringify(p.geometry) : null,
        p.validFrom ?? null,
        p.validTo ?? null,
        p.certainty ?? 'certain',
        p.source ?? null,
      ],
    );
  }

  const times = [
    { id: 'eb-t01', type: 'span', start: '1160', end: '1200', certainty: 'probable' as Certainty, label: 'um 1160-1200' },
    { id: 'eb-t02', type: 'span', start: '1160', end: '1188', certainty: 'probable' as Certainty, label: 'um 1160-1188' },
    { id: 'eb-t03', type: 'instant', date: '1299', certainty: 'certain' as Certainty, label: '1299' },
    { id: 'eb-t04', type: 'span', start: '1500', end: '1599', certainty: 'certain' as Certainty, label: 'um 1500-1599' },
    { id: 'eb-t05', type: 'span', start: '1589', end: '1649', certainty: 'certain' as Certainty, label: '1589-1649' },
    { id: 'eb-t06', type: 'instant', date: '1844', certainty: 'certain' as Certainty, label: '1844' },
    { id: 'eb-t07', type: 'span', start: '1846', end: '1847', certainty: 'certain' as Certainty, label: '1846-1847' },
    { id: 'eb-t08', type: 'span', start: '1887', end: '1914', certainty: 'certain' as Certainty, label: '1887-1914' },
    { id: 'eb-t09', type: 'span', start: '1900', end: '1931', certainty: 'certain' as Certainty, label: '1900-1931' },
    { id: 'eb-t10', type: 'span', start: '1905', end: '2012', certainty: 'certain' as Certainty, label: '1905-2012' },
    { id: 'eb-t11', type: 'span', start: '1934', end: '1945', certainty: 'certain' as Certainty, label: '1934-1945' },
    { id: 'eb-t12', type: 'instant', date: '1945-04-04', certainty: 'certain' as Certainty, label: '4. April 1945' },
    { id: 'eb-t13', type: 'span', start: '1949', end: '1976', certainty: 'certain' as Certainty, label: '1949-1976' },
    { id: 'eb-t14', type: 'span', start: '1990', end: '2012', certainty: 'certain' as Certainty, label: '1990-2012' },
    { id: 'eb-t15', type: 'span', start: '1729', end: '1787', certainty: 'certain' as Certainty, label: '1729-1787' },
  ];

  for (const t of times) {
    run(
      'INSERT OR REPLACE INTO time_object (id, module_id, type, date, start_date, end_date, certainty, label) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [t.id, modId, t.type, (t as any).date ?? null, (t as any).start ?? null, (t as any).end ?? null, t.certainty, t.label],
    );
  }

  const concepts = [
    { id: 'eb-c01', kind: 'analytical', label: 'Ortsentwicklung', desc: 'Historische Veränderung eines Ortes durch Siedlung, Verkehr, Wirtschaft, Verwaltung, Erinnerung und soziale Konflikte.' },
    { id: 'eb-c02', kind: 'analytical', label: 'Topografie', desc: 'Höhenlage, Talraum, Hochwasser und Wasserläufe als Bedingungen historischer Entwicklung.' },
    { id: 'eb-c03', kind: 'analytical', label: 'Marktort', desc: 'Ort mit Marktprivilegien, Handelsfunktionen, Wirtshäusern, Handwerk, Zoll und öffentlichem Raum.' },
    { id: 'eb-c04', kind: 'analytical', label: 'Verkehrslage', desc: 'Straßen, Brücken, Poststation, Bahn und B10 als prägende Raumfaktoren.' },
    { id: 'eb-c05', kind: 'analytical', label: 'Wasserenergie', desc: 'Nutzung von Fils, Ebersbach, Mühlkanälen und Wasserrechten für Mühlen und frühe Industrie.' },
    { id: 'eb-c06', kind: 'analytical', label: 'Industrialisierung', desc: 'Wandel von Gewerbe, Arbeit, Kapital, Fabriken, Arbeiterwohnen und Ortsbild seit dem späten 19. Jahrhundert.' },
    { id: 'eb-c07', kind: 'analytical', label: 'Arbeiterwohnen', desc: 'Wohn- und Sozialräume, die mit Fabriken, Zuzug, Kirchen und städtischer Erweiterung verbunden sind.' },
    { id: 'eb-c08', kind: 'analytical', label: 'NS-Zwangsarbeit', desc: 'Gewaltgeschichte von Lager, Kriegsgefangenschaft, ausländischer Zwangsarbeit und betrieblicher Nutzung im Krieg.' },
    { id: 'eb-c09', kind: 'source', label: 'Quellenkritik', desc: 'Unterscheidung von Primärquelle, späterer Darstellung, historischer Karte, moderner Referenz und didaktischer Rekonstruktion.' },
    { id: 'eb-c10', kind: 'analytical', label: 'Präzisionsgeometrie', desc: 'Exakte moderne Geometrien, wahrscheinliche historische Referenzpunkte und rekonstruierte Untersuchungsräume werden sichtbar unterschieden.' },
    { id: 'eb-c11', kind: 'narrative', label: 'Erinnerungskultur', desc: 'Wie lokale Geschichte durch Museum, Geschichtspfad, Brunnen, Stolpersteine, Literatur und Stadtraum erzählt wird.' },
    { id: 'eb-c12', kind: 'analytical', label: 'Strukturwandel', desc: 'Umnutzung von Industrieflächen, Verkehrsentlastung, Stadtsanierung und neue öffentliche Räume nach 1945.' },
  ];

  for (const c of concepts) {
    run('INSERT OR REPLACE INTO concept (id, module_id, kind, label, description) VALUES (?, ?, ?, ?, ?)',
      [c.id, modId, c.kind, c.label, c.desc]);
  }

  const actors = [
    { id: 'eb-a01', type: 'institution', name: 'Stadt Ebersbach an der Fils', desc: 'Kommunaler Akteur, Erinnerungsträger und Herausgeber des Geschichtspfads.', source: 'eb-s01' },
    { id: 'eb-a02', type: 'group', name: 'Adelige von Ebersbach, Staufer- und Adelberg-Bezüge', desc: 'Mittelalterliche Herrschafts- und Erinnerungsbezüge, deren genaue Burgorte quellenkritisch behandelt werden müssen.', source: 'eb-gp-volknand' },
    { id: 'eb-a03', type: 'institution', name: 'Württemberg', desc: 'Territorialer und staatlicher Rahmen seit dem Übergang an Württemberg; wichtig für Amt, Markt, Straße und Bahn.', source: 'eb-s03' },
    { id: 'eb-a04', type: 'group', name: 'Fuhrleute, Handwerker, Krämer und Wirte', desc: 'Sozial- und wirtschaftsgeschichtliche Gruppe des Marktorts an Straße, Post und Handel.', source: 'eb-s04' },
    { id: 'eb-a05', type: 'group', name: 'Müller, Gerber, Weber und Fabrikarbeiterinnen', desc: 'Arbeitswelt von Wassergewerbe, Textilindustrie, Fabrikarbeit und späteren Industriearealen.', source: 'eb-s04' },
    { id: 'eb-a06', type: 'institution', name: 'Martin & Söhne / Schwäbische Textilwerke', desc: 'Textilindustrielle Akteure im Raum Siechengärten und Industriegebiet; Eigentums- und NS-Kontexte sind quellenkritisch zu behandeln.', source: stationSource(15) },
    { id: 'eb-a07', type: 'institution', name: 'Familie und Firma Kauffmann', desc: 'Industrie-, Konsumgüter- und Literaturbezug im KAUFFMANN-Areal; Fritz Alexander Kauffmann ist Teil der lokalen Erinnerung.', source: stationSource(24) },
    { id: 'eb-a08', type: 'institution', name: 'Reichsarbeitsdienst und Kriegsgefangenenkommando 6051', desc: 'NS-Institutionen im lokalen Lager- und Zwangsarbeitsraum.', source: stationSource(28) },
    { id: 'eb-a09', type: 'group', name: 'Zwangsarbeiterinnen, Zwangsarbeiter und Kriegsgefangene', desc: 'Betroffene von Ausbeutung und Gewalt im Ebersbacher Kriegsalltag 1944/45.', source: stationSource(28) },
    { id: 'eb-a10', type: 'group', name: 'Nachkriegskommune und Bürgerschaft', desc: 'Akteure von Wiederaufbau, Wachstum, Eingemeindung, Verkehrsentlastung und Stadtsanierung.', source: 'eb-gp-overview' },
    { id: 'eb-a11', type: 'person', name: 'Friedrich Schwahn, der Sonnenwirtle', desc: 'Ebersbacher Wirtshaussohn, hingerichtet 1760; sein Fall wurde literarisch unter anderem von Schiller verarbeitet.', birthDate: '1729', deathDate: '1760', source: stationSource(31) },
    { id: 'eb-a12', type: 'institution', name: 'Württembergische Eisenbahn', desc: 'Infrastrukturakteur der Filsbahn; Bahnanschluss und Trasse veränderten Ort und Wirtschaft.', source: stationSource(25) },
  ];

  for (const a of actors) {
    run(
      'INSERT OR REPLACE INTO actor (id, module_id, type, name, description, birth_date, death_date, certainty, source_of_claim) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [a.id, modId, a.type, a.name, a.desc, (a as any).birthDate ?? null, (a as any).deathDate ?? null, 'certain', (a as any).source ?? 'eb-s01'],
    );
  }

  const events: EventSeed[] = [
    {
      id: 'eb-e01',
      title: 'Topografie als Ausgangspunkt: Höhe, Bach und Fils',
      desc: 'Als Ebersbach im Hochmittelalter quellenmäßig fassbar wird, ist die Topografie bereits der Schlüssel: Der Kirchberg lag höher und damit sicherer als die Filsniederung; Bach, Fils und Überschwemmungsrisiko bestimmten, wo gewohnt, gearbeitet und später gebaut wurde. Ältere Spuren bleiben Hintergrundwissen, die Kartenarbeit startet aber bewusst mit historisch belastbareren Ortsbezügen.',
      place: 'eb-p38', time: 'eb-t01',
      sources: [ 'eb-gp-overview', 'eb-gp-arnolf', stationSource(4), 'eb-s03', 'eb-s04' ],
      actors: [{ id: 'eb-a01', role: 'heutiger Erinnerungsträger' }],
      concepts: ['eb-c01', 'eb-c02', 'eb-c09', 'eb-c10'],
    },
    {
      id: 'eb-e02',
      title: 'Mittelalterliche Anfänge: Arnolf, Volknand und die unsichere Burg',
      desc: 'Arnolf von Ebersbach und Volknand von Ebersbach/Adelberg verankern den Ort im hochmittelalterlichen Herrschaftsraum. Gerade hier ist Quellenkritik zentral: Burggarten und Burgtradition sind historisch wichtig, aber archäologisch nicht sicher genug, um sie als exakte Burgfläche auszugeben.',
      place: 'eb-p03', time: 'eb-t02',
      sources: [ 'eb-gp-arnolf', 'eb-gp-volknand', stationSource(3), stationSource(4), 'eb-s03', 'eb-s04' ],
      actors: [{ id: 'eb-a02', role: 'mittelalterlicher Herrschaftsbezug' }],
      concepts: ['eb-c09', 'eb-c10', 'eb-c11'],
      follows: 'eb-e01',
    },
    {
      id: 'eb-e03',
      title: '1299 und danach: Ebersbach wird württembergischer Amts- und Marktort',
      desc: 'Mit dem Übergang an Württemberg und den älteren Markt-, Zoll- und Hochgerichtsbezügen wird Ebersbach als Ort höherer lokaler Bedeutung sichtbar. LEO-BW und die Oberamtsbeschreibung helfen, die Stationen Marktplatz, Amtshaus, Posthaus und Galgenwiese nicht isoliert, sondern als Funktionsnetz zu lesen.',
      place: 'eb-p12', time: 'eb-t03',
      sources: [ 'eb-s03', 'eb-s04', stationSource(12), stationSource(23) ],
      actors: [
        { id: 'eb-a03', role: 'territorialer Rahmen' },
        { id: 'eb-a04', role: 'lokale Markt- und Gewerbewelt' },
      ],
      concepts: ['eb-c01', 'eb-c03', 'eb-c04', 'eb-c09'],
      follows: 'eb-e02',
    },
    {
      id: 'eb-e04',
      title: 'Markt, Rinnenzoll, Post und Reichsstraße: Warum die Straße den Ort prägt',
      desc: 'Der alte Durchgangsraum erklärt viele Stationen zugleich: Schwane, Traube, Amtshaus, Posthaus, Rinnenzoll, Marktplatz und später B10. Lernende können daran sehen, dass Verkehr nicht nur Bewegung bedeutet, sondern Einkommen, Konflikt, Lärm, Handel und Stadtraum formt.',
      place: 'eb-p37', time: 'eb-t04',
      sources: [ stationSource(17), stationSource(16), stationSource(23), 'eb-s04', 'eb-s03' ],
      actors: [
        { id: 'eb-a03', role: 'Privilegien und Verwaltung' },
        { id: 'eb-a04', role: 'Nutzer und Profiteure der Straße' },
      ],
      concepts: ['eb-c03', 'eb-c04', 'eb-c10'],
      follows: 'eb-e03',
    },
    {
      id: 'eb-e05',
      title: 'Krisen im Marktort: Seuchen und Dreißigjähriger Krieg',
      desc: 'Die prosperierende Marktgemeinde erlitt schwere Einschnitte: Seuchenwellen Ende des 16. Jahrhunderts und der Dreißigjährige Krieg ließen Bevölkerung, Gebäude und kommunale Stabilität einbrechen. In der Kartenarbeit wird deutlich, dass derselbe Markt- und Straßenraum zugleich verwundbar war.',
      place: 'eb-p38', time: 'eb-t05',
      sources: [ 'eb-gp-overview', 'eb-s04' ],
      actors: [{ id: 'eb-a01', role: 'Gemeinde als Krisenraum' }],
      concepts: ['eb-c01', 'eb-c03', 'eb-c11'],
      follows: 'eb-e04',
    },
    {
      id: 'eb-e06',
      title: 'Mühlen, Kanäle und Fils: Wasser als Energie und Risiko',
      desc: 'Fils, Ebersbach, Mühlkanäle und Wasserrechte verbanden Mühlen, Gerberei, Säge, Zement, Weberei und Hochwasser. Die Oberamtsbeschreibung nennt 1844 eine dichte Mühlen- und Gewerbelandschaft; der Geschichtspfad macht diese Energiegeschichte an Badrain, Mühlrad, Mühle Kolb und Schuler-Areal konkret.',
      place: 'eb-p34', time: 'eb-t06',
      sources: [ stationSource(2), stationSource(13), stationSource(20), stationSource(33), 'eb-s04' ],
      actors: [{ id: 'eb-a05', role: 'Wassergewerbe und Arbeit' }],
      concepts: ['eb-c02', 'eb-c05', 'eb-c06', 'eb-c10'],
      follows: 'eb-e05',
    },
    {
      id: 'eb-e07',
      title: '1846/47: Die Eisenbahn schneidet und verbindet Ebersbach',
      desc: 'Die Filsbahn war kein neutraler Strich auf der Karte. Sie schnitt durch den Ort und entzog alten Fuhr- und Straßengewerben Bedeutung, verband Ebersbach aber zugleich mit Rohstoffen, Pendelwegen, Märkten und späteren Fabriken. Die präzise Trasse dient als moderne Referenz für diese langfristige Raumwirkung.',
      place: 'eb-p35', time: 'eb-t07',
      sources: [ stationSource(25), 'eb-s03', 'eb-s05' ],
      actors: [
        { id: 'eb-a12', role: 'Infrastruktur' },
        { id: 'eb-a04', role: 'betroffene Verkehrsgewerbe' },
      ],
      concepts: ['eb-c04', 'eb-c06', 'eb-c10'],
      follows: 'eb-e06',
    },
    {
      id: 'eb-e08',
      title: '1887-1914: Industrie entsteht am Rand, nahe Fils und Bahn',
      desc: 'Die Industrialisierung Ebersbachs zeigt eine klare Standortlogik: Fabriken siedelten besonders an der Talaue, an Wasser- und Bahnbezügen sowie an Ortsrändern. Martin & Söhne, textile Betriebe, Kauffmann, Haefele, Schuler und andere Standorte verändern Arbeit, Bevölkerung und Stadtbild.',
      place: 'eb-p40', time: 'eb-t08',
      sources: [ stationSource(15), stationSource(24), stationSource(27), stationSource(33), 'eb-s03' ],
      actors: [
        { id: 'eb-a05', role: 'Arbeitswelt' },
        { id: 'eb-a06', role: 'Textilindustrie' },
        { id: 'eb-a07', role: 'Industrie und Umnutzung' },
      ],
      concepts: ['eb-c04', 'eb-c05', 'eb-c06', 'eb-c07', 'eb-c10'],
      follows: 'eb-e07',
    },
    {
      id: 'eb-e09',
      title: 'Arbeiterwohnen, katholische Gemeinde und Luftschutz: die Siedlung als Sozialraum',
      desc: 'Die Siedlung um die Leintelstraße entstand nicht als dekoratives Wohnviertel, sondern aus Zuzug, Arbeit, Konfession und städtischem Wachstum. Die Herz-Jesu-Kirche und der Luftschutzstollen zeigen, wie Industrialisierung, Religion und Kriegserfahrung im selben Quartier sichtbar werden.',
      place: 'eb-p41', time: 'eb-t09',
      sources: [ stationSource(5), stationSource(26) ],
      actors: [{ id: 'eb-a05', role: 'Arbeiterinnen, Arbeiter und Familien' }],
      concepts: ['eb-c07', 'eb-c06', 'eb-c11'],
      follows: 'eb-e08',
    },
    {
      id: 'eb-e10',
      title: 'KAUFFMANN-Areal: Fabrik, Familie, Literatur und Stadtsanierung',
      desc: 'Das KAUFFMANN-Areal verbindet mehrere Zeitschichten: Zinser-Zementofen, Kauffmann-Produktion, Fritz Alexander Kauffmanns literarische Erinnerung, Unternehmensende, Bürgerentscheid und neue Innenstadt. Es eignet sich als Schlüsselstation, weil Industriegeschichte und heutiger Stadtraum direkt aufeinanderliegen.',
      place: 'eb-p24', time: 'eb-t10',
      sources: [ stationSource(24), 'eb-gp-kauffmann-literatur', 'eb-s09', 'eb-s02' ],
      actors: [
        { id: 'eb-a07', role: 'Unternehmen und Erinnerung' },
        { id: 'eb-a10', role: 'Stadtsanierung und Bürgerentscheid' },
      ],
      concepts: ['eb-c06', 'eb-c11', 'eb-c12'],
      follows: 'eb-e09',
    },
    {
      id: 'eb-e11',
      title: 'Presse, Öffentlichkeit und Gleichschaltung: der Zeitungsverlag',
      desc: 'Der lokale Zeitungsverlag zeigt, dass Moderne nicht nur Fabriken bedeutete. Zeitung, Kreissparkasse und Hauptstraße stehen für Information, Kredit und Öffentlichkeit. In der NS-Zeit wurde lokale Presse zugleich zum Ort von Druck, Anpassung und Gleichschaltung.',
      place: 'eb-p21', time: 'eb-t11',
      sources: [ stationSource(21) ],
      actors: [{ id: 'eb-a01', role: 'lokale Öffentlichkeit' }],
      concepts: ['eb-c09', 'eb-c11'],
      follows: 'eb-e10',
    },
    {
      id: 'eb-e12',
      title: '1934-1945: Grünanlage, RAD-Lager, Kriegsgefangene und Zwangsarbeit',
      desc: 'Die Grünanlage am Hölzernen Rain trägt eine schwierige Geschichte: NS-Symbolik, Reichsarbeitsdienstlager, Kriegsgefangenenkommando und 1944/45 ausländische Zwangsarbeit. Die Fläche ist bewusst rekonstruiert, damit Ausbeutung und Lageralltag sichtbar werden, ohne Genauigkeit vorzutäuschen.',
      place: 'eb-p42', time: 'eb-t11',
      sources: [ stationSource(28), stationSource(26) ],
      actors: [
        { id: 'eb-a08', role: 'NS-Institutionen' },
        { id: 'eb-a09', role: 'Betroffene' },
      ],
      concepts: ['eb-c08', 'eb-c09', 'eb-c10', 'eb-c11'],
      follows: 'eb-e11',
    },
    {
      id: 'eb-e13',
      title: '4. April 1945: Todesmarsch durch Ebersbach',
      desc: 'Der Geschichtspfad erinnert daran, dass Gefangene aus Ludwigsburg im April 1945 durch Ebersbach kamen und untergebracht wurden. Die Karte behandelt dies nicht als exakt vermessene Route, sondern als lokale Spur im größeren Gewalt- und Kriegsende-Zusammenhang.',
      place: 'eb-p25', time: 'eb-t12',
      sources: [ stationSource(25), stationSource(28) ],
      actors: [
        { id: 'eb-a09', role: 'Gefangene und Betroffene' },
        { id: 'eb-a01', role: 'lokale Aufnahme-/Verwaltungsnotiz' },
      ],
      concepts: ['eb-c08', 'eb-c09', 'eb-c11'],
      follows: 'eb-e12',
    },
    {
      id: 'eb-e14',
      title: 'Nachkriegswachstum, Eingemeindung und Stadtwerdung',
      desc: 'Nach 1945 wuchs Ebersbach stark: neue Wohngebiete, Wirtschaftswunder, Eingemeindungen und die Stadterhebung 1975/76 veränderten Maßstab und Selbstverständnis. Der alte Marktort wurde zur Stadtlandschaft mit mehreren Teilorten und neuen Aufgaben.',
      place: 'eb-p01', time: 'eb-t13',
      sources: [ 'eb-gp-overview', 'eb-s03' ],
      actors: [{ id: 'eb-a10', role: 'Kommunale Entwicklung' }],
      concepts: ['eb-c01', 'eb-c12', 'eb-c11'],
      follows: 'eb-e13',
    },
    {
      id: 'eb-e15',
      title: '1990-2012: B10-Entlastung und neue Innenstadt',
      desc: 'Die Verlegung der B10 aus dem Ortskern und die Entwicklung des KAUFFMANN-Areals zeigen, wie Verkehr und Industrieflächen bis heute Stadtgestaltung bestimmen. Die Karte fordert hier ein Gegenwartsurteil: Welche historischen Spuren wurden bewahrt, überbaut oder neu lesbar gemacht?',
      place: 'eb-p37', time: 'eb-t14',
      sources: [ stationSource(17), stationSource(24), 'eb-s09', 'eb-s02' ],
      actors: [
        { id: 'eb-a10', role: 'Planung und Bürgerschaft' },
        { id: 'eb-a01', role: 'Stadtentwicklung' },
      ],
      concepts: ['eb-c04', 'eb-c11', 'eb-c12'],
      follows: 'eb-e14',
    },
    {
      id: 'eb-e16',
      title: 'Sonnenwirtle: Lokalgeschichte zwischen Armut, Strafjustiz und Literatur',
      desc: 'Friedrich Schwahn, der Sonnenwirtle, eignet sich als Reflexionspunkt: Lokale Kriminalgeschichte wurde über Schiller und Hermann Kurz zu Literatur und Erinnerung. Die Aufgabe ist nicht, den Räuber zu romantisieren, sondern soziale Lage, Recht, Gewalt und Erzählung zu unterscheiden.',
      place: 'eb-p31', time: 'eb-t15',
      sources: [ stationSource(31), stationSource(18), 'eb-s03' ],
      actors: [{ id: 'eb-a11', role: 'historische Person und Erinnerungsfigur' }],
      concepts: ['eb-c09', 'eb-c11'],
      follows: null,
    },
  ];

  for (const e of events) {
    run(
      'INSERT OR REPLACE INTO event (id, module_id, title, description, place_id, time_object_id, follows_id, part_of_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [e.id, modId, e.title, e.desc, e.place, e.time, e.follows ?? null, null],
    );
    run('DELETE FROM event_source WHERE event_id = ?', [e.id]);
    for (const sid of e.sources) run('INSERT OR REPLACE INTO event_source (event_id, source_id) VALUES (?, ?)', [e.id, sid]);
    run('DELETE FROM event_actor WHERE event_id = ?', [e.id]);
    for (const al of e.actors) run(
      'INSERT OR REPLACE INTO event_actor (event_id, actor_id, role, certainty, source_of_claim) VALUES (?, ?, ?, ?, ?)',
      [e.id, al.id, al.role, 'certain', e.sources[0]],
    );
    run('DELETE FROM event_concept WHERE event_id = ?', [e.id]);
    for (const cid of e.concepts) run('INSERT OR REPLACE INTO event_concept (event_id, concept_id) VALUES (?, ?)', [e.id, cid]);
  }

  const movements = [
    {
      id: 'eb-mv01',
      eventId: 'eb-e04',
      name: 'Historische Verkehrsachse: Reichsstraße - Chaussee - B10',
      desc: 'Rekonstruierte Durchgangsachse durch Ebersbach. Sie erklärt Rinnenzoll, Post, Wirtshäuser, Markt und spätere Verkehrsbelastung. Diese Linie ist kein Geschichtspfad und kein moderner Spazierweg, sondern ein historisch-thematischer Kartenbefund.',
      color: '#7a6d58',
      coords: reichsstrasseB10.coordinates,
    },
    {
      id: 'eb-mv02',
      eventId: 'eb-e07',
      name: 'Filsbahn-Trasse durch Ebersbach',
      desc: 'Präzise moderne Bahntrassenreferenz für die historische Filsbahnwirkung seit 1847. Die Linie zeigt die Raumwirkung von Bahnanschluss und Trasse, nicht eine Lernroute.',
      color: '#5f3a2e',
      coords: ebersbachRail.coordinates,
    },
  ];

  for (const mv of movements) {
    run(
      'INSERT OR REPLACE INTO movement (id, module_id, event_id, name, description, coordinates, color) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [mv.id, modId, mv.eventId, mv.name, mv.desc, JSON.stringify(mv.coords), mv.color],
    );
  }

  const tasks = [
    {
      id: 'eb-task-01',
      title: 'Kartenbefund: Warum liegt der frühe Ort am Kirchberg?',
      prompt: 'Blende zuerst Stationen, Fils, Ebersbach und Kirchberg-Fläche ein. Erkläre mit mindestens drei Kartenbelegen, warum der historische Kern nicht einfach in der Filsniederung entstand.',
      answer: 'Erwartet: Kirchberg als höherer, hochwassersicherer Kern; Filsniederung/Bettelspitz als riskanter und sozial anders genutzter Raum; Ebersbach/Fils als Wasser- und Gewerbefaktor; Veitskirche/Kirchberg als früher Orientierungspunkt. Gute Antworten unterscheiden sichere und rekonstruierte Geometrie.',
      target: 'eb-e01',
      position: 1,
    },
    {
      id: 'eb-task-02',
      title: 'Quellenkritik: Burg oder Burggarten?',
      prompt: 'Vergleiche Burggarten, Kirchberg-Kern, Geschichtspfad und LEO-BW. Formuliere, was zur mittelalterlichen Burgtradition gesagt werden darf und was nicht.',
      answer: 'Gesichert bzw. gut belegbar sind hochmittelalterliche Personen- und Herrschaftsbezüge sowie die Bedeutung des Kirchbergraums. Nicht gesichert ist eine exakt archäologisch nachgewiesene Burgfläche am Burggarten. Deshalb muss die Karte contested/probable/reconstructed sichtbar machen.',
      target: 'eb-e02',
      position: 2,
    },
    {
      id: 'eb-task-03',
      title: 'Marktort lesen: Straße, Zoll und Wirtshäuser',
      prompt: 'Nutze Marktplatz, Schwane, Traube, Amtshaus/Posthaus, Rinnenzoll und die Durchgangsachse. Erkläre, warum Verkehr für Ebersbach zugleich Chance und Belastung war.',
      answer: 'Mögliche Belege: Marktprivilegien, Rinnenzoll 1503, Poststation, Wirtshäuser an der Durchgangsstraße, später B10-Verkehr. Chance: Handel, Gäste, Abgaben, Öffentlichkeit; Belastung: Konkurrenz durch Bahn, Lärm, Unfallgefahr, Umbauzwang.',
      target: 'eb-e04',
      position: 3,
    },
    {
      id: 'eb-task-04',
      title: 'Industrialisierung als Raumkette',
      prompt: 'Erstelle eine Belegkette von Fils/Mühlkanal über Eisenbahn bis Industrieband. Nutze mindestens vier Stationen und erkläre, warum Industrie besonders an bestimmten Rändern entstand.',
      answer: 'Starke Antworten verbinden Wasserenergie (Badrain, Mühlrad, Mühle Kolb, Schuler), Bahntrasse/Bahnhof, Filsniederung und Industrieband. Der Ortsrand bot Fläche und Anschluss, während der alte Kern andere Funktionen hatte.',
      target: 'eb-e08',
      position: 4,
    },
    {
      id: 'eb-task-05',
      title: 'Schwierige Geschichte sichtbar machen',
      prompt: 'Untersuche RAD-/Zwangsarbeitsraum, Bahnhof und Todesmarsch-Ereignis. Warum darf die Karte diese Geschichte nicht verschweigen, aber auch nicht genauer darstellen, als die Quellen es erlauben?',
      answer: 'Erwartet wird die Verbindung von RAD-Lager, Kriegsgefangenenkommando, ausländischer Zwangsarbeit und Todesmarsch-Spur. Genaue Lagergrenzen und Wegverläufe dürfen nicht behauptet werden; die Karte zeigt deshalb Ortsbezüge und rekonstruierte Untersuchungsräume mit Quellenhinweis und Unsicherheitsmarkierung.',
      target: 'eb-e12',
      position: 5,
    },
    {
      id: 'eb-task-06',
      title: 'Raumurteil: Vom Marktort zur Stadtlandschaft',
      prompt: 'Formuliere ein begründetes Urteil: Welche drei Faktoren veränderten Ebersbach am stärksten - Topografie/Wasser, Straße, Eisenbahn, Industrie, NS-Zeit, Nachkriegswachstum oder Stadtsanierung? Belege dein Urteil mit Karte und Quellen.',
      answer: 'Es gibt mehrere tragfähige Urteile. Besonders stark sind Kombinationen aus Topografie/Wasser, Verkehrslage und Industrialisierung; ergänzt durch Nachkriegswachstum und Stadtsanierung. Entscheidend ist, dass jedes Argument mit Station, Geometrie, Zeit und Quelle belegt wird.',
      target: 'eb-e15',
      position: 6,
    },
  ];

  for (const t of tasks) {
    run(
      'INSERT OR REPLACE INTO task (id, module_id, title, prompt, type, options, answer_key, target_event_id, position) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [t.id, modId, t.title, t.prompt, 'text', null, t.answer, t.target, t.position],
    );
  }

  flushSaveDb();
  console.log([
    'Seed "Ebersbach an der Fils" complete:',
    `  ${places.length} Orte/Geometrien`,
    `  ${times.length} Zeitobjekte`,
    `  ${actors.length} Akteure`,
    `  ${concepts.length} Begriffe`,
    `  ${sources.length} Quellen`,
    `  ${events.length} Ereignisse`,
    `  ${movements.length} Bewegungen/Achsen`,
    `  ${tasks.length} Aufgaben`,
  ].join('\n'));
}

seed().catch(err => { console.error(err); process.exit(1); });
