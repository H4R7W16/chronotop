// Seed: Esslingen am Neckar 1933-1945
//
// Regionalgeschichtliches Modul fuer die Arbeit mit Karte, Quellen und Deutung.
// Leitfrage: Wie wird NS-Herrschaft in einer Industriestadt als Raum aus
// Verwaltung, Strasse, Gewalt, Ausgrenzung, Zwangsarbeit und Kriegsende sichtbar?

import { getDb } from '../db.js';
import { setDbInstance, run, flushSaveDb } from '../dbHelper.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

type Certainty = 'certain' | 'probable' | 'contested' | 'reconstructed';

type PlaceSeed = {
  id: string;
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

  const modId = '00000000-0000-0000-0000-000000000003';

  run(
    'INSERT OR REPLACE INTO content_module (id, title, description, author_name, version, license) VALUES (?, ?, ?, ?, ?, ?)',
    [
      modId,
      'Esslingen am Neckar 1933-1945',
      'Quellenbasiertes Kartenmodul zur NS-Herrschaft in Esslingen: Lernende untersuchen, wie Demokratieabbau, antisemitische Gewalt, Zwangssterilisation, Krankenmorde, Zwangsarbeit, Deportationen, Luftkrieg und Kriegsende in konkreten Stadtraeumen sichtbar werden. Die Karte ist Arbeitsquelle: exakte Referenzpunkte, rekonstruierte Aktionsraeume und schematische Gewaltwege muessen unterschieden und begruendet gedeutet werden.',
      'Kreismedienzentrum Esslingen',
      '1.1.0-research',
      'CC-BY-SA 4.0',
    ],
  );

  // Remove stale rows from older demo versions of this module before reseeding.
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

  const esslingenNeckar = {
    type: 'LineString',
    coordinates: [
      [9.419803, 48.706719],
      [9.395808, 48.717142],
      [9.356816, 48.717082],
      [9.321007, 48.727586],
      [9.302901, 48.737099],
      [9.27524, 48.74218],
      [9.267551, 48.747835],
      [9.250361, 48.774099],
      [9.220595, 48.790913],
      [9.209291, 48.802782],
    ],
  };

  const altstadtActionArea = {
    type: 'Polygon',
    coordinates: [[
      [9.3042, 48.7432],
      [9.3123, 48.7424],
      [9.3130, 48.7400],
      [9.3072, 48.7392],
      [9.3039, 48.7412],
      [9.3042, 48.7432],
    ]],
  };

  const shoppingAndBoycottArea = {
    type: 'Polygon',
    coordinates: [[
      [9.3061, 48.7427],
      [9.3102, 48.7421],
      [9.3106, 48.7407],
      [9.3070, 48.7404],
      [9.3058, 48.7415],
      [9.3061, 48.7427],
    ]],
  };

  const industrialAndForcedLaborArea = {
    type: 'Polygon',
    coordinates: [[
      [9.2968, 48.7371],
      [9.3235, 48.7272],
      [9.3532, 48.7334],
      [9.3326, 48.7448],
      [9.3052, 48.7431],
      [9.2968, 48.7371],
    ]],
  };

  const sources = [
    {
      id: 'es-sq01',
      type: 'text',
      title: 'LEO-BW: Esslingen am Neckar, Geschichte ab 1806',
      url: 'https://www.leo-bw.de/detail-gis/-/Detail/details/ORT/labw_ortslexikon/328/Esslingen%2Bam%2BNeckar',
      license: 'LEO-BW / Landesarchiv Baden-Wuerttemberg',
      desc: 'Zentrale landesgeschichtliche Basis fuer Esslingen: Wahlergebnisse, Gleichschaltung, Pogrom, juedische Opfer, Zwangssterilisation, Krankenmorde, Zwangsarbeit, Luftkrieg und Kriegsende.',
    },
    {
      id: 'es-sq02',
      type: 'text',
      title: 'LEO-BW Themenmodul: Juedisches Leben in Esslingen',
      url: 'https://www.leo-bw.de/themenmodul/juedisches-leben-im-suedwesten/orte/wurttemberg/esslingen-am-neckar',
      license: 'LEO-BW / Landesarchiv Baden-Wuerttemberg',
      desc: 'Volltext und Bildkontext zur juedischen Gemeinde, Synagoge Im Heppaecher, Wilhelmspflege und den Novemberpogromen. Der Beitrag basiert auf Paul Sauer und ist quellenkritisch als Textstand von 1966 einzuordnen.',
    },
    {
      id: 'es-sq03',
      type: 'text',
      title: 'DHM LeMO: Etablierung der NS-Herrschaft',
      url: 'https://www.dhm.de/lemo/kapitel/ns-regime/etablierung',
      license: 'DHM LeMO, CC BY-NC-SA 4.0',
      desc: 'Ueberregionaler Kontext zu Machtuebernahme, Terror gegen politische Gegner, Reichstagsbrandverordnung, Ermaechtigungsgesetz, Gleichschaltung und Propaganda.',
    },
    {
      id: 'es-sq04',
      type: 'text',
      title: 'DHM LeMO: Geschaeftsboykott 1933',
      url: 'https://www.dhm.de/lemo/kapitel/ns-regime/ausgrenzung/antisemitismus',
      license: 'DHM LeMO, CC BY-NC-SA 4.0',
      desc: 'Kontext zum reichsweiten Boykott juedischer Geschaefte, Aerzte und Rechtsanwaelte am 1. April 1933 und zur Rolle von SA/SS im oeffentlichen Raum.',
    },
    {
      id: 'es-sq05',
      type: 'text',
      title: 'DHM LeMO: Nuernberger Gesetze 1935',
      url: 'https://www.dhm.de/lemo/kapitel/ns-regime/ausgrenzung-und-verfolgung/nuernberger-gesetze-1935',
      license: 'DHM LeMO, CC BY-NC-SA 4.0',
      desc: 'Kontextquelle zur rechtlichen Entrechtung juedischer Menschen durch Reichsbuergergesetz und Blutschutzgesetz.',
    },
    {
      id: 'es-sq06',
      type: 'text',
      title: 'Gedenkstaetten BW: Deportation nach Riga, 1. Dezember 1941',
      url: 'https://www.gedenkstaetten-bw.de/deportation-riga',
      license: 'LpB Baden-Wuerttemberg / Gedenkstaetten in Baden-Wuerttemberg',
      desc: 'Basisquelle zu Killesberg, Stuttgarter Nordbahnhof, Ziel Riga und zur Deportationslogistik aus Wuerttemberg und Hohenzollern.',
    },
    {
      id: 'es-sq07',
      type: 'text',
      title: 'Bundesarchiv: Gedenkbuch fuer die Opfer der Verfolgung der Juden',
      url: 'https://www.bundesarchiv.de/gedenkbuch/introduction/',
      license: 'Bundesarchiv / Rechercheangebot',
      desc: 'Recherchebasis fuer Namen und Lebensdaten juedischer Opfer. Direkte Filterlinks sind nicht stabil, deshalb fuehrt die Demo auf den Sucheinstieg.',
    },
    {
      id: 'es-sq08',
      type: 'text',
      title: 'Denk-Zeichen Esslingen: lokale Erinnerungsarbeit',
      url: 'https://www.denkzeichen.com/',
      license: 'Denk-Zeichen e.V. Esslingen',
      desc: 'Lokaler Einstieg in Stolpersteine, Gedenkorte, Biografien und Esslinger Erinnerungsarbeit. Einzelangaben muessen fuer produktive Module mit Archiv- oder Publikationsbelegen verbunden werden.',
    },
    {
      id: 'es-sq09',
      type: 'text',
      title: 'Zwangsarbeit in Esslingen 1939-1945, bibliografischer Nachweis',
      url: 'https://www.zwangsarbeit-archiv.de/buecher_medien/literatur/b00732/index.html',
      license: 'Stiftung EVZ / Freie Universitaet Berlin, bibliografischer Nachweis',
      desc: 'Nachweis zu Elisabeth Timm: Zwangsarbeit in Esslingen 1939-1945. Die Seite nennt fuer 1944 mehr als 11.000 Zwangsarbeiter in Ruestungsproduktion und Luftschutzstollenbau.',
    },
    {
      id: 'es-sq10',
      type: 'text',
      title: 'Dokumentationszentrum Oberer Kuhberg: fruehes KZ und politische Verfolgung',
      url: 'https://dzok-ulm.de/gedenkstaette/der-historische-ort/',
      license: 'DZOK Ulm / Bildungsangebot',
      desc: 'Regionaler Kontext zur Verfolgung politischer Gegner und fruehen Konzentrationslagern in Wuerttemberg.',
    },
    {
      id: 'es-sq11',
      type: 'text',
      title: 'Stadt Esslingen: Feuerwehrgeschichte, NS-Zeit und Luftkrieg',
      url: 'https://www.esslingen.de/stadt-und-politik/feuerwehr/allgemeines/historisch-interessierte',
      license: 'Stadt Esslingen',
      desc: 'Staedtische Ueberblicksseite zur Umgestaltung des Feuerloeschwesens im Nationalsozialismus und zu Luftkriegseinsaetzen.',
    },
    {
      id: 'es-sq12',
      type: 'map',
      title: 'OpenStreetMap: Praezisionsreferenzen Esslingen/Stuttgart',
      url: 'https://www.openstreetmap.org/',
      license: '(c) OpenStreetMap contributors, ODbL 1.0',
      desc: 'Moderne Referenzgeometrien fuer Orte, Gebaeude, Bahnhoefe, Friedhoefe, Wasserlauf und Gedenkorte. Historische Deutung wird nur zusammen mit Fachquellen vorgenommen.',
    },
    {
      id: 'es-sq13',
      type: 'text',
      title: 'Stadtarchiv Esslingen / Objekt des Monats: Franzoesische Besatzung 1945',
      url: 'https://www.esslingen.de/juni-2025',
      license: 'Stadt Esslingen / Stadtarchiv Esslingen',
      desc: 'Objekt des Monats zur franzoesischen Besatzung: US-Besetzung am 22. April 1945, Uebergabe an die franzoesische Armee am 3. Mai, Rueckgabe an die USA am 7. Juli 1945.',
    },
    {
      id: 'es-sq14',
      type: 'text',
      title: 'Das Jahr 1945: Esslingen',
      url: 'https://dasjahr1945.de/esslingen/',
      license: 'Das Jahr 1945 / Bildungsprojekt',
      desc: 'Kurzueberblick zu Besetzung, Beschuss, geplanter Bombardierung, Kontaktaufnahme zu US-Truppen in Waeldenbronn und kampfloser Uebergabe.',
    },
    {
      id: 'es-sq15',
      type: 'text',
      title: 'Alemannia Judaica: Synagoge Esslingen',
      url: 'https://www.alemannia-judaica.de/esslingen_synagoge.htm',
      license: 'Alemannia Judaica / Joachim Hahn, Sammlung und Dokumentation',
      desc: 'Detaillierte Dokumentation zur Synagoge Im Heppaecher, zum Pogrom am 10. November 1938 und zur Wilhelmspflege. Fuer Unterricht und Demo als Sekundaer-/Dokumentationsquelle nutzbar.',
    },
    {
      id: 'es-sq16',
      type: 'text',
      title: 'Gedenkstaette Grafeneck',
      url: 'https://www.gedenkstaette-grafeneck.de/',
      license: 'Gedenkstaette Grafeneck',
      desc: 'Gedenkort und Dokumentationszentrum zu den Krankenmorden der Aktion T4 in Grafeneck.',
    },
    {
      id: 'es-sq17',
      type: 'text',
      title: 'Gedenkstaette Hadamar',
      url: 'https://www.gedenkstaette-hadamar.de/',
      license: 'Gedenkstaette Hadamar',
      desc: 'Gedenk- und Lernort zur NS-"Euthanasie"; zwischen 1941 und 1945 wurden in Hadamar fast 15.000 Menschen ermordet.',
    },
    {
      id: 'es-sq18',
      type: 'map',
      title: 'Zeichen der Erinnerung: Stuttgart Nordbahnhof',
      url: 'https://www.zeichen-der-erinnerung.org/',
      license: 'Zeichen der Erinnerung e.V.',
      desc: 'Gedenkort an der ehemaligen Deportationsrampe am Stuttgarter Nordbahnhof.',
    },
  ];

  for (const s of sources) {
    run(
      'INSERT OR REPLACE INTO source (id, module_id, type, title, url, license, description) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [s.id, modId, s.type, s.title, s.url, s.license, s.desc],
    );
  }

  const places: PlaceSeed[] = [
    {
      id: 'es-p01',
      name: 'Esslinger Marktplatz',
      lat: 48.742712,
      lng: 9.306490,
      wd: 'Q55230',
      desc: 'Zentraler oeffentlicher Raum der Altstadt. Im Modul steht der Marktplatz fuer Kundgebungen, politische Inszenierung und die Sichtbarkeit nationalsozialistischer Macht im Alltag.',
      geometry: pointGeometry(9.306490, 48.742712),
      validFrom: '1933',
      validTo: '1945',
      certainty: 'probable',
      source: 'es-sq12',
    },
    {
      id: 'es-p02',
      name: 'Synagoge Im Heppaecher 3',
      lat: 48.741759,
      lng: 9.311468,
      desc: 'Ehemalige Synagoge der juedischen Gemeinde Esslingen. Die Inneneinrichtung wurde am 10. November 1938 demoliert, gepluendert oder verbrannt; seit 2012 wird das Gebaeude wieder als Synagoge genutzt.',
      geometry: pointGeometry(9.311468, 48.741759),
      validFrom: '1819',
      validTo: '1945',
      certainty: 'certain',
      source: 'es-sq02',
    },
    {
      id: 'es-p03',
      name: 'Bahnhof Esslingen (Neckar)',
      lat: 48.739204,
      lng: 9.300368,
      wd: 'Q1048600',
      desc: 'Praeziser moderner Referenzpunkt fuer Esslingen als Bahnort. Im NS-Modul ist er Ausgangspunkt fuer lokale Transfers in die Stuttgarter Deportationslogistik, nicht automatisch Beleg fuer einen exakt bekannten Einzelweg.',
      geometry: pointGeometry(9.300368, 48.739204),
      validFrom: '1933',
      validTo: '1945',
      certainty: 'probable',
      source: 'es-sq12',
    },
    {
      id: 'es-p04',
      name: 'Altes Rathaus Esslingen',
      lat: 48.742327,
      lng: 9.307751,
      wd: 'Q1373491',
      desc: 'Staedtischer Verwaltungs- und Symbolraum. Hier wird Gleichschaltung als kommunaler Machtumbau lesbar: Aufhebung des demokratisch gewaehlten Gemeinderats, NSDAP-Dominanz, Parteigefolgschaft und Verwaltungskontinuitaet.',
      geometry: pointGeometry(9.307751, 48.742327),
      validFrom: '1933',
      validTo: '1945',
      certainty: 'certain',
      source: 'es-sq01',
    },
    {
      id: 'es-p05',
      name: 'Ritterstrasse und Hafenmarkt als Einkaufs- und Beobachtungsraum',
      lat: 48.7414,
      lng: 9.3082,
      desc: 'Rekonstruierter Aktionsraum fuer Boykott, soziale Markierung und wirtschaftliche Ausgrenzung. Die Flaeche behauptet keine exakten Schaufenster- oder Firmenparzellen, sondern macht die Verlagerung von Antisemitismus in den oeffentlichen Alltag untersuchbar.',
      geometry: shoppingAndBoycottArea,
      validFrom: '1933',
      validTo: '1938',
      certainty: 'reconstructed',
      source: 'es-sq01',
    },
    {
      id: 'es-p06',
      name: 'Stuttgart-Killesberg: Sammelplatz der Deportationen',
      lat: 48.799465,
      lng: 9.171492,
      desc: 'Sammelplatz fuer Juedinnen und Juden aus Wuerttemberg und Hohenzollern vor Deportationen, darunter der Transport nach Riga am 1. Dezember 1941.',
      geometry: pointGeometry(9.171492, 48.799465),
      validFrom: '1941',
      validTo: '1945',
      certainty: 'probable',
      source: 'es-sq06',
    },
    {
      id: 'es-p07',
      name: 'Neckar- und Industriezone Esslingen-Ost',
      lat: 48.7368,
      lng: 9.3250,
      desc: 'Rekonstruierte Untersuchungsflaeche fuer Industrie, Ruestungswirtschaft, Luftschutzstollen, Zwangsarbeit und Luftkrieg im Neckar-/Bahnumfeld. Sie zeigt einen historischen Problemraum, keine exakt vermessenen Lager- oder Betriebsgrenzen.',
      geometry: industrialAndForcedLaborArea,
      validFrom: '1939',
      validTo: '1945',
      certainty: 'reconstructed',
      source: 'es-sq09',
    },
    {
      id: 'es-p08',
      name: 'Waeldenbronn: Kontakt zu US-Truppen',
      lat: 48.758913,
      lng: 9.318396,
      desc: 'Wohnplatz noerdlich der Innenstadt. Fuer das Kriegsende 1945 dient er als Referenz fuer die Kontaktaufnahme zu den anrueckenden US-Truppen vor der kampflosen Uebergabe Esslingens.',
      geometry: pointGeometry(9.318396, 48.758913),
      validFrom: '1945-04-22',
      validTo: '1945-04-22',
      certainty: 'probable',
      source: 'es-sq14',
    },
    {
      id: 'es-p09',
      name: 'Ebershaldenfriedhof: juedische Abteilung und Erinnerungsort',
      lat: 48.739578,
      lng: 9.322795,
      desc: 'Moderner Referenzpunkt fuer die juedische Abteilung auf dem Ebershaldenfriedhof und fuer Erinnerung an Verfolgung, Deportation und Tod. Die exakte Lage einzelner Graeber ist nicht Teil dieses MVP.',
      geometry: pointGeometry(9.322795, 48.739578),
      validFrom: '1933',
      validTo: '1945',
      certainty: 'probable',
      source: 'es-sq02',
    },
    {
      id: 'es-p10',
      name: 'Neckar als Stadt-, Industrie- und Verkehrsraum',
      lat: 48.742,
      lng: 9.315,
      desc: 'Generalisierte Neckarlinie als Lesespur fuer Stadtentwicklung, Industrie, Verkehr und Luftkrieg. Die Linie nutzt OpenStreetMap-Wasserlaufdaten als moderne Referenz.',
      geometry: esslingenNeckar,
      validFrom: '1933',
      validTo: '1945',
      certainty: 'reconstructed',
      source: 'es-sq12',
    },
    {
      id: 'es-p11',
      name: 'Altstadt-Aktionsraum 1933-1938',
      lat: 48.7416,
      lng: 9.3084,
      desc: 'Rekonstruierte Flaeche zwischen Marktplatz, Rathaus, Hafenmarkt, Ritterstrasse und Synagoge. Sie macht sichtbar, dass NS-Herrschaft nicht nur in Institutionen, sondern auf Strassen, Plaetzen und Wegen stattfand.',
      geometry: altstadtActionArea,
      validFrom: '1933',
      validTo: '1938',
      certainty: 'reconstructed',
      source: 'es-sq01',
    },
    {
      id: 'es-p12',
      name: 'Wilhelmspflege / Theodor-Rothschild-Haus',
      lat: 48.746955,
      lng: 9.312110,
      desc: 'Israelitisches Waisenhaus und wichtiges Zentrum juedischen Lebens. 1938 wurden Kinder bedroht und beraubt, Lehrkraefte misshandelt; 1939 wurde die Einrichtung endgueltig geschlossen.',
      geometry: pointGeometry(9.312110, 48.746955),
      validFrom: '1842',
      validTo: '1945',
      certainty: 'probable',
      source: 'es-sq02',
    },
    {
      id: 'es-p13',
      name: 'Staedtisches Krankenhaus / Klinikum Esslingen',
      lat: 48.737456,
      lng: 9.326378,
      desc: 'Moderner Referenzpunkt fuer das staedtische Krankenhaus. LEO-BW nennt fuer Esslingen wohl 236 Opfer von Zwangssterilisationen im staedtischen Krankenhaus.',
      geometry: pointGeometry(9.326378, 48.737456),
      validFrom: '1934',
      validTo: '1945',
      certainty: 'probable',
      source: 'es-sq01',
    },
    {
      id: 'es-p14',
      name: 'Kennenburg',
      lat: 48.746789,
      lng: 9.330009,
      desc: 'Ortsteil und Referenz fuer Heilanstalt/Privatklinik-Kontexte. Im Modul markiert Kennenburg den lokalen Ausgangspunkt fuer einen Teil der Esslinger Opfer der Krankenmorde.',
      geometry: pointGeometry(9.330009, 48.746789),
      validFrom: '1933',
      validTo: '1945',
      certainty: 'probable',
      source: 'es-sq01',
    },
    {
      id: 'es-p15',
      name: 'Stuttgart Nordbahnhof / Zeichen der Erinnerung',
      lat: 48.797012,
      lng: 9.189229,
      desc: 'Gedenkort an der frueheren Deportationsrampe. Von hier verliessen Deportationszuege Wuerttemberg und Hohenzollern, unter anderem am 1. Dezember 1941 nach Riga.',
      geometry: pointGeometry(9.189229, 48.797012),
      validFrom: '1941',
      validTo: '1945',
      certainty: 'certain',
      source: 'es-sq18',
    },
    {
      id: 'es-p16',
      name: 'Pliensaubruecke / suedlicher Neckarzugang',
      lat: 48.735869,
      lng: 9.301559,
      desc: 'Moderner Referenzpunkt fuer den suedlichen Neckarzugang. Im Modul ergaenzt er die Karte zum Kriegsende und zur Frage, wie Topografie, Bruecken und Stadtraum beim Uebergang 1945 eine Rolle spielten.',
      geometry: pointGeometry(9.301559, 48.735869),
      validFrom: '1945-04-22',
      validTo: '1945-04-22',
      certainty: 'probable',
      source: 'es-sq12',
    },
  ];

  for (const p of places) {
    run(
      `INSERT OR REPLACE INTO place
         (id, module_id, wikidata_id, lat, lng, name, description, geometry_geojson, valid_from, valid_to, certainty, source_of_claim)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        p.id,
        modId,
        p.wd ?? null,
        p.lat,
        p.lng,
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
    { id: 'es-t01', type: 'instant', date: '1933-01-30', label: '30. Januar 1933', certainty: 'certain' },
    { id: 'es-t02', type: 'span', start: '1933-03-01', end: '1933-07-31', label: 'Maerz-Juli 1933', certainty: 'certain' },
    { id: 'es-t03', type: 'instant', date: '1933-04-01', label: '1. April 1933', certainty: 'certain' },
    { id: 'es-t04', type: 'span', start: '1933-03-01', end: '1936-12-31', label: '1933-1936', certainty: 'certain' },
    { id: 'es-t05', type: 'instant', date: '1935-09-15', label: '15. September 1935', certainty: 'certain' },
    { id: 'es-t06', type: 'instant', date: '1938-11-10', label: '10. November 1938', certainty: 'certain' },
    { id: 'es-t07', type: 'span', start: '1938-11-10', end: '1939-09-01', label: 'November 1938-September 1939', certainty: 'certain' },
    { id: 'es-t08', type: 'span', start: '1934-01-01', end: '1941-12-31', label: '1934-1941', certainty: 'probable' },
    { id: 'es-t09', type: 'span', start: '1939-09-01', end: '1945-04-22', label: '1939-1945', certainty: 'certain' },
    { id: 'es-t10', type: 'instant', date: '1941-12-01', label: '1. Dezember 1941', certainty: 'certain' },
    { id: 'es-t11', type: 'instant', date: '1942-08-22', label: '22. August 1942', certainty: 'certain' },
    { id: 'es-t12', type: 'span', start: '1944-09-01', end: '1944-12-31', label: 'Herbst/Winter 1944', certainty: 'certain' },
    { id: 'es-t13', type: 'instant', date: '1945-04-22', label: '22. April 1945', certainty: 'certain' },
    { id: 'es-t14', type: 'span', start: '1945-05-03', end: '1945-07-07', label: '3. Mai-7. Juli 1945', certainty: 'certain' },
  ] as const;

  for (const tm of times) {
    run(
      'INSERT OR REPLACE INTO time_object (id, module_id, type, date, start_date, end_date, certainty, label) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [
        tm.id,
        modId,
        tm.type,
        tm.type === 'instant' ? (tm as any).date : null,
        tm.type === 'span' ? (tm as any).start : null,
        tm.type === 'span' ? (tm as any).end : null,
        tm.certainty,
        tm.label,
      ],
    );
  }

  const actors = [
    {
      id: 'es-a01',
      type: 'person',
      name: 'Wilhelm Murr',
      wd: 'Q1371017',
      birth: '1888-08-16',
      death: '1945-05-14',
      desc: 'NSDAP-Gauleiter und Reichsstatthalter in Wuerttemberg. Esslingen ist als Herkunfts- und Wirkungsraum Murrs fuer regionale NS-Herrschaft besonders relevant.',
    },
    {
      id: 'es-a02',
      type: 'institution',
      name: 'NSDAP-Orts- und Kreisstrukturen Esslingen',
      wd: null,
      desc: 'Lokale Parteistrukturen, die Gleichschaltung, Propaganda, antisemitische Aktionen und Mobilisierung im oeffentlichen Raum vorantrieben.',
    },
    {
      id: 'es-a03',
      type: 'institution',
      name: 'SA und parteigebundene Gewaltakteure',
      wd: 'Q156844',
      desc: 'Paramilitaerische und parteigebundene Gewaltakteure, die Einschuechterung, Boykott, Pogrom und Misshandlungen mittrugen. Im Modul wird die pauschale Abkuerzung SA nur dort verwendet, wo die Quelle sie stuetzt.',
    },
    {
      id: 'es-a04',
      type: 'institution',
      name: 'Gestapo / Stapoleitstelle Stuttgart',
      wd: null,
      desc: 'Regionale Gestapo-Struktur, die Ueberwachung, Verhaftungen und Deportationen in Wuerttemberg koordinierte.',
    },
    {
      id: 'es-a05',
      type: 'group',
      name: 'Juedische Esslingerinnen und Esslinger',
      wd: null,
      desc: 'Betroffene der antisemitischen Ausgrenzung, Entrechtung, Enteignung, Vertreibung, Deportation und Ermordung. Das Modul verbindet Orte mit Biografiearbeit, ohne Namen und Zahlen ungesichert zu behaupten.',
    },
    {
      id: 'es-a06',
      type: 'group',
      name: 'Zwangsarbeiterinnen und Zwangsarbeiter',
      wd: null,
      desc: 'Verschleppte, kriegsgefangene oder unter Zwang angeworbene Menschen, die in Esslingen in Ruestung, Industrie, Bau, Luftschutzstollen, Betrieben und kommunalen Zusammenhaengen arbeiteten.',
    },
    {
      id: 'es-a07',
      type: 'institution',
      name: 'US-Streitkraefte',
      wd: null,
      desc: 'Alliierte Truppen, denen Esslingen am 22. April 1945 kampflos uebergeben wurde. Die genaue taktische Einheit bleibt im MVP offen, weil die Quelle fuer das Unterrichtsmodul die lokale Uebergabe und Besetzung absichert.',
    },
    {
      id: 'es-a08',
      type: 'institution',
      name: 'Franzoesische Besatzungsmacht',
      wd: null,
      desc: 'Besatzungsmacht in Esslingen vom 3. Mai bis 7. Juli 1945. Das Modul trennt diese Phase deutlich von der US-Besetzung am 22. April 1945.',
    },
    {
      id: 'es-a09',
      type: 'group',
      name: 'Patientinnen, Patienten und behinderte Menschen',
      wd: null,
      desc: 'Opfer von Zwangssterilisation und Krankenmorden. Der Begriff NS-"Euthanasie" wird im Modul als Taeter- und Tarnbegriff markiert, nicht normalisiert.',
    },
    {
      id: 'es-a10',
      type: 'institution',
      name: 'Esslinger Unternehmen und Kommunalverwaltung',
      wd: null,
      desc: 'Betriebe, Verwaltung und lokale Akteure, die in Kriegswirtschaft, Zwangsarbeit, Luftschutz, Entnazifizierung und Nachkriegsverwaltung eingebunden waren.',
    },
    {
      id: 'es-a11',
      type: 'institution',
      name: 'Wilhelmspflege / Theodor-Rothschild-Haus',
      wd: null,
      desc: 'Israelitisches Waisenhaus, Bildungs- und Schutzraum juedischer Kinder und Jugendlicher, 1938/39 massiv angegriffen und zerschlagen.',
    },
    {
      id: 'es-a12',
      type: 'institution',
      name: 'Wehrmacht, Volkssturm und NS-Kreisleitung',
      wd: null,
      desc: 'Militaerische und parteiliche Strukturen, die beim Kriegsende 1945 zerfielen, abzogen oder demobilisiert wurden.',
    },
  ];

  for (const a of actors) {
    run(
      'INSERT OR REPLACE INTO actor (id, module_id, type, name, wikidata_id, description, birth_date, death_date) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [a.id, modId, a.type, a.name, a.wd ?? null, a.desc, (a as any).birth ?? null, (a as any).death ?? null],
    );
  }

  const concepts = [
    {
      id: 'es-c01',
      kind: 'analytical',
      label: 'Gleichschaltung',
      desc: 'Historisch-analytischer Begriff fuer die Unterwerfung von Staat, Kommunen, Parteien, Vereinen, Medien und Verwaltung unter nationalsozialistische Kontrolle.',
    },
    {
      id: 'es-c02',
      kind: 'source',
      label: 'Volksgemeinschaft',
      desc: 'NS-Propagandabegriff. Er behauptete Zugehoerigkeit und Solidaritaet, funktionierte aber ueber rassistische, politische und soziale Ausgrenzung.',
    },
    {
      id: 'es-c03',
      kind: 'analytical',
      label: 'Arisierung',
      desc: 'Analytischer Begriff fuer Zwangsverkauf, Enteignung und Verdraengung juedischer Geschaefte, Betriebe und beruflicher Existenzen.',
    },
    {
      id: 'es-c04',
      kind: 'analytical',
      label: 'Shoah',
      desc: 'Begriff fuer die systematische Ermordung der europaeischen Juedinnen und Juden durch das NS-Regime und seine Helfer.',
    },
    {
      id: 'es-c05',
      kind: 'analytical',
      label: 'Zwangsarbeit',
      desc: 'Bestandteil der NS-Kriegswirtschaft. In Esslingen war Zwangsarbeit in Betrieben, Baustellen, Luftschutzstollen und Alltag sichtbar.',
    },
    {
      id: 'es-c06',
      kind: 'narrative',
      label: '"Stunde Null"',
      desc: 'Nachkriegsmetapher fuer einen angeblichen radikalen Neuanfang 1945. Historisch problematisch, weil sie Kontinuitaeten in Verwaltung, Wirtschaft, Mentalitaeten und Erinnerung verdecken kann.',
    },
    {
      id: 'es-c07',
      kind: 'analytical',
      label: 'Deportationslogistik',
      desc: 'Verbindung lokaler Erfassung, Sammelpunkte, Bahn, Gestapo-Verwaltung und ueberregionaler Vernichtungsorte.',
    },
    {
      id: 'es-c08',
      kind: 'source',
      label: 'NS-"Euthanasie"',
      desc: 'Taeter- und Tarnbegriff fuer Krankenmorde an behinderten, psychisch kranken und als "lebensunwert" stigmatisierten Menschen. Im Modul wird der Begriff nur kritisch markiert verwendet.',
    },
    {
      id: 'es-c09',
      kind: 'analytical',
      label: 'Zwangssterilisation',
      desc: 'Staatlich organisierte Verletzung koerperlicher Selbstbestimmung auf Grundlage des Gesetzes zur Verhuetung erbkranken Nachwuchses.',
    },
    {
      id: 'es-c10',
      kind: 'analytical',
      label: 'Taeter-Zuschauer-Raum',
      desc: 'Analytischer Zugriff auf oeffentliche Gewalt: Wer handelt, wer profitiert, wer sieht zu, wer widerspricht, wer wird ausgeschlossen?',
    },
    {
      id: 'es-c11',
      kind: 'analytical',
      label: 'Kartenkritik',
      desc: 'Unterscheidung von exakten Referenzpunkten, wahrscheinlichen historischen Orten, rekonstruierten Aktionsraeumen und schematischen Routen.',
    },
  ];

  for (const c of concepts) {
    run(
      'INSERT OR REPLACE INTO concept (id, module_id, kind, label, description) VALUES (?, ?, ?, ?, ?)',
      [c.id, modId, c.kind, c.label, c.desc],
    );
  }

  const events: EventSeed[] = [
    {
      id: 'es-e01',
      title: 'Machtuebernahme im Stadtraum: Fahnen, Aufmaersche, Drohung',
      desc: 'Nach dem 30. Januar 1933 wurde NS-Herrschaft auch in Esslingen im oeffentlichen Raum sichtbar. Entscheidend ist nicht nur, dass es Kundgebungen gab, sondern was sie im Raum bewirkten: Zustimmung wurde inszeniert, politische Gegner wurden eingeschuechtert, juedische Esslingerinnen und Esslinger mussten erleben, wie Strassen und Plaetze zu Orten demonstrativer Ausgrenzung wurden.',
      place: 'es-p11',
      time: 'es-t01',
      sources: ['es-sq03', 'es-sq01'],
      actors: [
        { id: 'es-a02', role: 'Mobilisierung' },
        { id: 'es-a03', role: 'sichtbare Gewaltandrohung' },
      ],
      concepts: ['es-c02', 'es-c10', 'es-c11'],
    },
    {
      id: 'es-e02',
      title: 'Kommunale Gleichschaltung: Gemeinderat, Oberbuergermeister, NSDAP',
      desc: 'LEO-BW beschreibt fuer Esslingen die Aufhebung des demokratisch gewaehlten Gemeinderats am 1. April 1933, den Ruecktritt des Oberbuergermeisters Ingo Lang von Langen am 3. Mai und die NSDAP-Dominanz im neuen Gemeinderat. Damit wird Gleichschaltung vor Ort konkret: Demokratie wurde nicht nur reichspolitisch zerstoert, sondern in Ratszimmern, Amtswegen und Personalentscheidungen.',
      place: 'es-p04',
      time: 'es-t02',
      sources: ['es-sq01', 'es-sq03'],
      actors: [
        { id: 'es-a01', role: 'uebergeordnete regionale NS-Macht' },
        { id: 'es-a02', role: 'lokale Umsetzung' },
      ],
      concepts: ['es-c01', 'es-c02'],
      follows: 'es-e01',
    },
    {
      id: 'es-e03',
      title: '1. April 1933: Boykott juedischer Geschaefte als oeffentliche Markierung',
      desc: 'Der reichsweite Boykott juedischer Geschaefte wurde auch in Esslingen Teil einer dauerhaften Verdraengung. LEO-BW nennt, dass nach dem Boykott bis 1940 24 juedische Firmen, Geschaefte und Freiberufler zur Schliessung und Berufsaufgabe gezwungen wurden. Die Kartenflaeche zeigt deshalb nicht einzelne Schaufenster, sondern den sozialen Beobachtungsraum: Wer kaufte wo, wer wurde markiert, wer wagte Solidaritaet?',
      place: 'es-p05',
      time: 'es-t03',
      sources: ['es-sq01', 'es-sq04'],
      actors: [
        { id: 'es-a03', role: 'Einschuechterung im oeffentlichen Raum' },
        { id: 'es-a05', role: 'Betroffene' },
      ],
      concepts: ['es-c02', 'es-c03', 'es-c10', 'es-c11'],
      follows: 'es-e02',
    },
    {
      id: 'es-e04',
      title: 'Politische Gegner: Verhaftungen, Verbote, Verstummen des roten Esslingen',
      desc: 'Esslingen hatte vor 1933 ein starkes sozialdemokratisches und kommunistisches Milieu. Nach Reichstagsbrandverordnung, Verboten und Verhaftungswellen wurde dieser Raum zerschlagen. LEO-BW nennt mehrere Verhaftungswellen, besonders gegen Kommunisten; regionale fruehe Konzentrationslager wie Oberer Kuhberg zeigen, dass kommunale Repression in ein wuerttembergisches Lagersystem eingebunden war.',
      place: 'es-p04',
      time: 'es-t04',
      sources: ['es-sq01', 'es-sq10'],
      actors: [
        { id: 'es-a04', role: 'Verfolgungsapparat' },
        { id: 'es-a02', role: 'lokale Machtstruktur' },
      ],
      concepts: ['es-c01', 'es-c10'],
      follows: 'es-e02',
    },
    {
      id: 'es-e05',
      title: 'Nuernberger Gesetze: Aus Nachbarschaft wird rechtliche Ausgrenzung',
      desc: 'Die Nuernberger Gesetze von 1935 machten rassistische Ausgrenzung zu scheinbar nuechterner Rechtsordnung. Fuer Esslingen muss diese Reichsgesetzgebung lokal gelesen werden: Schule, Beruf, Vereinsleben, Nachbarschaft und wirtschaftliche Existenz wurden nicht nur sozial, sondern rechtlich getrennt. Gute Kartenarbeit fragt hier: Welche Orte waren weiterhin gemeinsam sichtbar, aber rechtlich nicht mehr gemeinsam zugaenglich?',
      place: 'es-p11',
      time: 'es-t05',
      sources: ['es-sq05', 'es-sq02'],
      actors: [
        { id: 'es-a05', role: 'entrechtete Betroffene' },
        { id: 'es-a02', role: 'lokale Umsetzung und Propaganda' },
      ],
      concepts: ['es-c02', 'es-c03', 'es-c04'],
      follows: 'es-e03',
    },
    {
      id: 'es-e06',
      title: '10. November 1938: Pogromweg vom Marktplatz zur Synagoge und Wilhelmspflege',
      desc: 'In Esslingen fand am Mittag des 10. November 1938 eine antisemitische Kundgebung statt. Danach zogen Teilnehmer zur Synagoge Im Heppaecher und zur Wilhelmspflege. LEO-BW nennt die Demolierung, Pluenderung und Verbrennung der Synagogeneinrichtung; das Waisenhaus wurde Schauplatz brutaler Pluenderungen und Verwuestungen, Lehrer und Hausvater wurden misshandelt. Die Route ist eine didaktische Rekonstruktion aus den genannten Orten, kein vermessener Marschweg.',
      place: 'es-p11',
      time: 'es-t06',
      sources: ['es-sq01', 'es-sq02', 'es-sq15'],
      actors: [
        { id: 'es-a02', role: 'Kundgebung und lokale NS-Struktur' },
        { id: 'es-a03', role: 'Gewaltakteure' },
        { id: 'es-a05', role: 'Opfer' },
        { id: 'es-a11', role: 'angegriffene Einrichtung' },
      ],
      concepts: ['es-c02', 'es-c04', 'es-c10', 'es-c11'],
      follows: 'es-e05',
    },
    {
      id: 'es-e07',
      title: 'Wilhelmspflege 1938/39: Schutzraum wird zerschlagen',
      desc: 'Die Wilhelmspflege war ein zentraler Ort juedischer Bildung und Fuerfuersorge in Wuerttemberg. Nach LEO-BW lebten dort im Juni 1938 78 Kinder. In der Pogromgewalt wurden Kinder bedroht und beraubt, Lehrkraefte misshandelt, Buecher und Thorarollen verbrannt; die Anstalt durfte Anfang 1939 kurz wieder oeffnen und wurde mit Kriegsbeginn endgueltig geschlossen. Das Ereignis verschiebt den Blick: Verfolgung traf nicht abstrakt "die Gemeinde", sondern konkrete Kinder, Paedagogen und Schutzraeume.',
      place: 'es-p12',
      time: 'es-t07',
      sources: ['es-sq02', 'es-sq15'],
      actors: [
        { id: 'es-a11', role: 'betroffene Einrichtung' },
        { id: 'es-a05', role: 'Kinder, Jugendliche, Personal' },
        { id: 'es-a03', role: 'Gewaltakteure' },
      ],
      concepts: ['es-c04', 'es-c10'],
      follows: 'es-e06',
    },
    {
      id: 'es-e08',
      title: 'Zwangssterilisation und Krankenmorde: Gewalt hinter Klinik- und Anstaltsorten',
      desc: 'LEO-BW nennt fuer Esslingen wohl 236 Frauen und Maenner, die im staedtischen Krankenhaus zwangssterilisiert wurden. Mindestens 59 behinderte Personen aus der Kreisstadt, zuvor unter anderem in Esslingen-Kennenburg, Stetten, Winnenden, Goeppingen und Zwiefalten untergebracht, wurden 1940/41 in Grafeneck und Hadamar ermordet. Der Kartenbezug macht sichtbar, dass NS-Gewalt nicht nur im Polizeistaat, sondern auch in medizinisch-buerokratischen Raeumen organisiert wurde.',
      place: 'es-p13',
      time: 'es-t08',
      sources: ['es-sq01', 'es-sq16', 'es-sq17'],
      actors: [
        { id: 'es-a09', role: 'Opfer' },
        { id: 'es-a10', role: 'medizinisch-buerokratische Mitwirkung' },
      ],
      concepts: ['es-c08', 'es-c09', 'es-c10', 'es-c11'],
      follows: null,
    },
    {
      id: 'es-e09',
      title: 'Zwangsarbeit: Kriegswirtschaft im Neckar- und Industrieraum',
      desc: 'Zwangsarbeit war in Esslingen kein Randthema. Die lokale Studie von Elisabeth Timm nennt fuer 1944 mehr als 11.000 Zwangsarbeiter in Ruestungsproduktion und Luftschutzstollenbau; LEO-BW nennt fuer 1942/43 rund 4.000 und 169 Todesfaelle zwischen 1939 und 1945. Die rekonstruierte Flaeche dient als Arbeitsraum, um Betriebe, Wege, Lager, Stollen, kommunale Verantwortung und Nachbarschaft zusammenzudenken.',
      place: 'es-p07',
      time: 'es-t09',
      sources: ['es-sq09', 'es-sq01'],
      actors: [
        { id: 'es-a06', role: 'Betroffene' },
        { id: 'es-a10', role: 'Betriebe und Verwaltung' },
      ],
      concepts: ['es-c05', 'es-c10', 'es-c11'],
      follows: null,
    },
    {
      id: 'es-e10',
      title: '1. Dezember 1941: Esslingen in der Deportationslogistik nach Riga',
      desc: 'Die erste grosse Deportation aus Wuerttemberg und Hohenzollern verliess am 1. Dezember 1941 den Stuttgarter Nordbahnhof mit Ziel Riga. Juedische Menschen aus Orten des Landes wurden zuvor zum Sammelplatz Killesberg gebracht. Fuer Esslingen verbindet die Karte Bahnhof, Killesberg und Nordbahnhof als lokale Transferlogistik; Namen und Einzelschicksale muessen ueber Gedenkbuch, Denk-Zeichen und Archivarbeit vertieft werden.',
      place: 'es-p15',
      time: 'es-t10',
      sources: ['es-sq06', 'es-sq07', 'es-sq18'],
      actors: [
        { id: 'es-a04', role: 'Organisation' },
        { id: 'es-a05', role: 'Opfer' },
      ],
      concepts: ['es-c04', 'es-c07', 'es-c11'],
      follows: 'es-e06',
    },
    {
      id: 'es-e11',
      title: '22. August 1942: Deportation nach Theresienstadt',
      desc: 'Im August 1942 wurden vor allem aeltere juedische Menschen aus Wuerttemberg nach Theresienstadt deportiert. NS-Sprache tarnte Theresienstadt als Altersghetto oder Schutzraum; tatsaechlich bedeutete der Transport Entrechtung, Hunger, Krankheit, Tod und fuer viele Weiterdeportation. Das Modul behandelt die Route nicht als vollstaendig vermessenen Weg, sondern als Frage nach Verwaltung, Bahn und Taetersprache.',
      place: 'es-p03',
      time: 'es-t11',
      sources: ['es-sq06', 'es-sq07'],
      actors: [
        { id: 'es-a04', role: 'Organisation' },
        { id: 'es-a05', role: 'Opfer' },
      ],
      concepts: ['es-c04', 'es-c07', 'es-c11'],
      follows: 'es-e10',
    },
    {
      id: 'es-e12',
      title: 'Luftkrieg und Industrie: Zerstoerung ohne Ursachenvergessen',
      desc: 'LEO-BW nennt fuer Esslingen 126 total und 60 stark zerstoerte Gebaeude sowie 54 Tote durch Fliegerangriffe. Die staedtische Feuerwehrseite verweist auf Luftkriegseinsaetze. Die didaktische Aufgabe ist hier heikel und wichtig: Leid und Zerstoerung in Esslingen muessen ernst genommen werden, ohne den von Deutschland begonnenen Krieg, Ruestungswirtschaft und Zwangsarbeit aus demselben Raum auszublenden.',
      place: 'es-p07',
      time: 'es-t12',
      sources: ['es-sq01', 'es-sq11'],
      actors: [
        { id: 'es-a10', role: 'Infrastruktur, Betriebe, Luftschutz' },
        { id: 'es-a12', role: 'militaerischer Kontext' },
      ],
      concepts: ['es-c05', 'es-c10'],
      follows: null,
    },
    {
      id: 'es-e13',
      title: '22. April 1945: kampflose Uebergabe an US-Streitkraefte',
      desc: 'Das alte Modul hatte hier die franzoesische Armee zu frueh gesetzt. Die Quellenlage ist klarer: Esslingen wurde am 22. April 1945 von US-Truppen besetzt beziehungsweise ihnen kampflos uebergeben. LEO-BW und Das Jahr 1945 nennen den Abzug der NS-Kreisleitung, die Aufloesung des Volkssturms und die Kontaktaufnahme zu US-Truppen bei Waeldenbronn. Die Karte zeigt deshalb Waeldenbronn, Innenstadt und Neckarzugang als Raum des Zusammenbruchs.',
      place: 'es-p08',
      time: 'es-t13',
      sources: ['es-sq01', 'es-sq14'],
      actors: [
        { id: 'es-a07', role: 'Besetzung / Befreiung vom NS-Regime' },
        { id: 'es-a12', role: 'Zusammenbruch und Abzug' },
      ],
      concepts: ['es-c06', 'es-c11'],
      follows: null,
    },
    {
      id: 'es-e14',
      title: '3. Mai-7. Juli 1945: franzoesische Besatzung und schwieriger Neubeginn',
      desc: 'Ab 3. Mai 1945 uebernahm die franzoesische Armee voruebergehend die Besatzungsmacht in Esslingen, am 7. Juli ging die Stadt wieder an die US-Armee zurueck. Das Stadtarchiv-Objekt des Monats zeigt die Ambivalenz: Befreiung vom NS-Regime, Besatzungsherrschaft, Requisitionen, Listen von NSDAP-Mitgliedern und Zwangsarbeitern, Sicherheitsprobleme und erste Entnazifizierung lagen im selben Nachkriegsraum.',
      place: 'es-p04',
      time: 'es-t14',
      sources: ['es-sq13', 'es-sq01'],
      actors: [
        { id: 'es-a08', role: 'Besatzungsmacht' },
        { id: 'es-a10', role: 'Verwaltung und Entnazifizierung' },
      ],
      concepts: ['es-c06', 'es-c10'],
      follows: 'es-e13',
    },
  ];

  for (const e of events) {
    run(
      'INSERT OR REPLACE INTO event (id, module_id, title, description, place_id, time_object_id, follows_id, part_of_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [e.id, modId, e.title, e.desc, e.place, e.time, e.follows ?? null, null],
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

  const movements = [
    {
      id: 'es-mv01',
      eventId: 'es-e06',
      name: 'Pogromweg Marktplatz - Synagoge - Wilhelmspflege',
      desc: 'Didaktisch rekonstruierte Route aus den quellenbenannten Orten der Kundgebung und Gewalt. Sie zeigt einen Taeter-Zuschauer-Raum, keinen vermessenen Marschweg.',
      color: '#7b2331',
      coords: [
        [9.306490, 48.742712],
        [9.308813, 48.741936],
        [9.311468, 48.741759],
        [9.312110, 48.746955],
      ],
    },
    {
      id: 'es-mv02a',
      eventId: 'es-e10',
      name: 'Deportationslogistik: Bahntrassenreferenz Esslingen - Stuttgart Nordbahnhof',
      desc: 'Praezisere moderne Bahntrassenreferenz entlang Neckar, Untertuerkheim und Bad Cannstatt bis zum Stuttgarter Nordbahnhof. Sie zeigt die Verkehrsachse fuer den Bahnbezug, nicht den minutengenauen Ablauf eines einzelnen Transports.',
      color: '#7b2331',
      coords: [
        [9.300368, 48.739204],
        [9.299353, 48.739059],
        [9.280666, 48.742842],
        [9.276516, 48.746068],
        [9.271422, 48.757976],
        [9.258126, 48.774444],
        [9.250913, 48.779398],
        [9.244609, 48.787729],
        [9.240994, 48.790850],
        [9.225990, 48.799443],
        [9.214237, 48.801804],
        [9.209487, 48.801208],
        [9.204200, 48.800100],
        [9.198400, 48.798800],
        [9.192600, 48.797400],
        [9.189229, 48.797012],
      ],
    },
    {
      id: 'es-mv02b',
      eventId: 'es-e10',
      name: 'Deportationslogistik: Zufuehrung Killesberg - Nordbahnhof (rekonstruiert)',
      desc: 'Rekonstruierte innerstaedtische Beziehung zwischen Sammelplatz Killesberg und Deportationsrampe Nordbahnhof. Die Linie ist bewusst gestrichelt zu lesen: belegte Orte, aber kein vermessener Fussweg.',
      color: '#7b2331',
      coords: [
        [9.171492, 48.799465],
        [9.176200, 48.800400],
        [9.181100, 48.799700],
        [9.185800, 48.798500],
        [9.189229, 48.797012],
      ],
    },
    {
      id: 'es-mv03',
      eventId: 'es-e08',
      name: 'Krankenmorde: Esslingen/Kennenburg - Grafeneck/Hadamar',
      desc: 'Schematische Gewaltbeziehung von lokalen Klinik-/Anstaltsbezugspunkten zu ueberregionalen Toetungsanstalten. Sie macht Vernichtungsraeume sichtbar, nicht einzelne Transportakten.',
      color: '#6f3b87',
      coords: [
        [9.326378, 48.737456],
        [9.330009, 48.746789],
        [9.435665, 48.395844],
        [8.042507, 50.450341],
      ],
    },
    {
      id: 'es-mv04',
      eventId: 'es-e13',
      name: 'Kriegsende: Waeldenbronn - Innenstadt - Pliensaubruecke',
      desc: 'Rekonstruierte lokale Raumbeziehung fuer Kontaktaufnahme, kampflose Uebergabe und Besetzung am 22. April 1945.',
      color: '#245b7d',
      coords: [
        [9.318396, 48.758913],
        [9.306490, 48.742712],
        [9.301559, 48.735869],
      ],
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
      id: 'es-task-01',
      title: 'Kartenbefund: Wo wird Herrschaft sichtbar?',
      prompt: 'Untersuche zuerst nur Altstadt-Aktionsraum, Rathaus, Marktplatz, Einkaufsraum und Synagoge. Formuliere drei Kartenbefunde: Wo wird NS-Herrschaft institutionell, wo oeffentlich, wo gewaltsam sichtbar?',
      answer: 'Starke Antworten unterscheiden Rathaus/Gemeinderat als institutionellen Machtumbau, Marktplatz/Altstadt als Propagandaraum, Ritterstrasse/Hafenmarkt als Beobachtungs- und Boykottraum sowie Synagoge/Wilhelmspflege als Gewaltorte. Rekonstruierte Flaechen werden als Deutung, nicht als Vermessung markiert.',
      target: 'es-e02',
      position: 1,
    },
    {
      id: 'es-task-02',
      title: 'Pogromroute quellenkritisch lesen',
      prompt: 'Erklaere, warum die Pogromroute eine rekonstruierte Route ist. Welche Aussagen erlaubt sie trotzdem, und welche Aussagen darfst du ohne weitere Quelle nicht machen?',
      answer: 'Erlaubt sind Aussagen zu den quellenbenannten Stationen Kundgebung, Synagoge und Wilhelmspflege sowie zum oeffentlichen Charakter der Gewalt. Nicht erlaubt sind exakte Marschzeiten, vollstaendige Teilnehmerzahlen, jede einzelne Strasse oder individuelle Taeterzuweisungen ohne Zusatzquelle.',
      target: 'es-e06',
      position: 2,
    },
    {
      id: 'es-task-03',
      title: 'Vergleich: vier Formen lokaler Gewalt',
      prompt: 'Vergleiche politische Verfolgung, antisemitische Gewalt, Zwangssterilisation/Krankenmorde und Zwangsarbeit. Erstelle fuer jede Form eine Belegkette aus Ort, Quelle, Akteur und Begriff.',
      answer: 'Moeglich: Rathaus/LEO-BW/Gestapo-NSDAP/Gleichschaltung; Synagoge-Wilhelmspflege/LEO-BW-Alemannia/Judenverfolgung-Shoah; Krankenhaus-Kennenburg/LEO-BW/medizinisch-buerokratische Akteure/NS-"Euthanasie"; Industriezone/Timm-Zwangsarbeit-Archiv/Betriebe-Verwaltung/Zwangsarbeit.',
      target: 'es-e08',
      position: 3,
    },
    {
      id: 'es-task-04',
      title: 'Deportationslogistik statt einzelner Pfeil',
      prompt: 'Nutze Bahnhof, Killesberg und Nordbahnhof, um zu erklaeren, wie lokale Ausgrenzung in ueberregionale Vernichtungslogistik ueberging. Beziehe mindestens zwei Quellen ein.',
      answer: 'Erwartet wird die Unterscheidung von lokaler Erfassung/Transfer, Sammelplatz Killesberg, Abfahrt am Nordbahnhof und Ziel Riga/Theresienstadt. Gute Antworten nutzen Gedenkstaetten BW und Bundesarchiv/Denk-Zeichen fuer Biografiearbeit und markieren die Kartenlinie als Beziehung, nicht als komplett belegte Route.',
      target: 'es-e10',
      position: 4,
    },
    {
      id: 'es-task-05',
      title: 'Urteil 1945: Befreiung, Besatzung, Kontinuitaet',
      prompt: 'Beurteile den 22. April 1945 fuer Esslingen: Warum ist "Befreiung" richtig, warum reicht "Stunde Null" nicht? Nutze US-Besetzung, franzoesische Besatzungsphase und Entnazifizierung als Belege.',
      answer: 'Starke Urteile trennen 22. April US-Besetzung/kampflose Uebergabe von der franzoesischen Besatzung ab 3. Mai. Befreiung ist mit dem Ende der NS-Herrschaft begruendbar; "Stunde Null" greift zu kurz wegen Verwaltungs-, Personal-, Erinnerungs- und Nachkriegskontinuitaeten.',
      target: 'es-e13',
      position: 5,
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
    'Seed "Esslingen 1933-1945" complete:',
    `  ${places.length} Orte/Geometrien`,
    `  ${times.length} Zeitobjekte`,
    `  ${actors.length} Akteure`,
    `  ${concepts.length} Begriffe`,
    `  ${sources.length} Quellen`,
    `  ${events.length} Ereignisse`,
    `  ${movements.length} Bewegungen/Routen`,
    `  ${tasks.length} Aufgaben`,
  ].join('\n'));
}

seed().catch(err => { console.error(err); process.exit(1); });
