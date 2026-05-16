// Seed: Industrialisierung an Neckar und Fils, 1845-1914
//
// Landesgeschichtliches MVP-Modul fuer Baden-Wuerttemberg.
// Schwerpunkt: Raumdeutung mit Karte, Eisenbahn, Flussraum, Energie und Industrieorten.

import { getDb } from '../db.js';
import { setDbInstance, run, flushSaveDb } from '../dbHelper.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

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

  const modId = '00000000-0000-0000-0000-000000000004';

  run(
    'INSERT OR REPLACE INTO content_module (id, title, description, author_name, version, license) VALUES (?, ?, ?, ?, ?, ?)',
    [
      modId,
      'Industrialisierung an Neckar und Fils, 1845-1914',
      'Landesgeschichtliches MVP-Modul fuer Baden-Wuerttemberg: Lernende untersuchen quellenbasiert, wie Neckar, Fils, Eisenbahn, Geislinger Steige, Energie und Industrieorte einen vernetzten Raum zwischen Stuttgart, Esslingen, Plochingen, Goeppingen, Geislingen und Untertuerkheim hervorbrachten. Die Karte ist Arbeitsmaterial: Linien, Punkte, Flaechen und Unsicherheiten muessen historisch gedeutet werden.',
      'Kreismedienzentrum Esslingen',
      '1.1.0-mvp',
      'CC-BY-SA 4.0',
    ],
  );

  const sources = [
    {
      id: 'nf-s01',
      type: 'text',
      title: 'Landesbildungsserver BW: Der industrialisierte Nationalstaat',
      url: 'https://www.schule-bw.de/faecher-und-schularten/gesellschaftswissenschaftliche-und-philosophische-faecher/landeskunde-landesgeschichte/module/bp_2016/der_industrialisierte_nationalstaat/index.html',
      license: 'Landesbildungsserver Baden-Wuerttemberg',
      desc: 'Didaktischer Rahmen fuer Industrialisierung, Nationalstaat und Wandel von Wirtschaft und Gesellschaft.',
    },
    {
      id: 'nf-s02',
      type: 'map',
      title: 'LEO-BW / Historischer Atlas: Die Industrie in Baden und Wuerttemberg 1895',
      url: 'https://www.leo-bw.de/detail-gis/-/Detail/details/DOKUMENT/kgl_atlas/HABW_11_07/Die%2BIndustrie%2Bin%2BBaden%2Bund%2BW%C3%BCrttemberg%2B1895',
      license: 'LEO-BW / Landesarchiv Baden-Wuerttemberg',
      desc: 'Kartografischer Ausgangspunkt fuer die Frage, wo Industrie um 1895 in Baden und Wuerttemberg konzentriert war.',
    },
    {
      id: 'nf-s03',
      type: 'text',
      title: 'Wirtschaftsarchiv Baden-Wuerttemberg: Maschinenfabrik Esslingen AG',
      url: 'https://www.wa-bw.de/maschinenfabrik-esslingen-ag/',
      license: 'Wirtschaftsarchiv Baden-Wuerttemberg',
      desc: 'Unternehmens- und Archivkontext zur Maschinenfabrik Esslingen als wichtigem Maschinenbau- und Eisenbahnindustriebetrieb.',
    },
    {
      id: 'nf-s04',
      type: 'text',
      title: 'Landtag BW: 175 Jahre Geislinger Steige',
      url: 'https://www.landtag-bw.de/de/aktuelles/dpa-nachrichten/175-jahre-geislinger-steige-meisterwerk-der-ingenieurskunst-578792',
      license: 'Landtag Baden-Wuerttemberg / dpa-Nachricht',
      desc: 'Aktueller landesgeschichtlicher Kontext zur Geislinger Steige als Ingenieurleistung und Regionalverkehrsachse.',
    },
    {
      id: 'nf-s05',
      type: 'text',
      title: 'VDE: Drehstromuebertragung Lauffen-Frankfurt',
      url: 'https://www.vde.com/de/geschichte/karte/baden-wuerttemberg/drehstromuebertragung-lauffen-frankfurt',
      license: 'VDE Ausschuss Geschichte der Elektrotechnik',
      desc: 'Fachlicher Kontext zur Fernuebertragung elektrischer Energie von Lauffen nach Frankfurt 1891.',
    },
    {
      id: 'nf-s06',
      type: 'text',
      title: 'Landesbildungsserver BW: Technikgeschichte Baden-Wuerttemberg',
      url: 'https://www.schule-bw.de/faecher-und-schularten/gesellschaftswissenschaftliche-und-philosophische-faecher/landeskunde-landesgeschichte/module/epochen/technikgeschichte/technikgeschichte-bw/3-3landesgeschichte.htm',
      license: 'Landesbildungsserver Baden-Wuerttemberg',
      desc: 'Landesgeschichtliche Einordnung von Energie, Elektrizitaet und Technikgeschichte in Baden-Wuerttemberg.',
    },
    {
      id: 'nf-s07',
      type: 'map',
      title: 'LGL BW: Historische Kartenwerke',
      url: 'https://www.lgl-bw.de/Produkte/Karten/Historische-Karten/historische-kartenwerke/',
      license: 'Landesamt fuer Geoinformation und Landentwicklung Baden-Wuerttemberg',
      desc: 'Startpunkt fuer historisches Kartenmaterial; Nutzung und Lizenz muessen je Kartenwerk geprueft werden.',
    },
    {
      id: 'nf-s08',
      type: 'map',
      title: 'Chronotop Demo-Geodaten: Neckar-Fils Industrialisierung',
      url: '/geodata/neckar-fils-industrial-corridor.geojson',
      license: 'CC BY 4.0 / didaktische Rekonstruktion',
      desc: 'Kuratierte, lokal mitgelieferte GeoJSON-Geometrien fuer den MVP: Neckar, Fils, Industriekorridor und Energiebezug.',
    },
    {
      id: 'nf-s09',
      type: 'map',
      title: 'OpenStreetMap: Filstalbahn / RE 5 Relation 12809',
      url: 'https://www.openstreetmap.org/relation/12809',
      license: '(c) OpenStreetMap contributors, ODbL 1.0',
      desc: 'Aktuelle Trassengeometrie der Bahnverbindung Stuttgart-Ulm, genutzt als praezise moderne Referenz fuer die historisch fortbestehende Centralbahn-/Filsbahn-Achse. Historische Einordnung bleibt im Modul sichtbar.',
    },
    {
      id: 'nf-s10',
      type: 'map',
      title: 'OpenStreetMap: Neckar-Wasserlauf Relation 123881',
      url: 'https://www.openstreetmap.org/relation/123881',
      license: '(c) OpenStreetMap contributors, ODbL 1.0',
      desc: 'Aktuelle Wasserlaufgeometrie des Neckars, genutzt als moderne Referenz fuer den historischen Fluss- und Verkehrsraum im Modul.',
    },
    {
      id: 'nf-s11',
      type: 'map',
      title: 'OpenStreetMap: Fils-Wasserlauf Relation 2939491',
      url: 'https://www.openstreetmap.org/relation/2939491',
      license: '(c) OpenStreetMap contributors, ODbL 1.0',
      desc: 'Aktuelle Wasserlaufgeometrie der Fils, genutzt als moderne Referenz fuer den historischen Tal- und Industrieraum.',
    },
    {
      id: 'nf-s12',
      type: 'map',
      title: 'LEO-BW / Historischer Atlas: Entwicklung des Eisenbahnnetzes',
      url: 'https://www.leo-bw.de/web/guest/detail-gis/-/Detail/details/DOKUMENT/kgl_atlas/HABW_10_04/Entwicklung%20des%20Eisenbahnnetzes',
      license: 'LEO-BW / Historischer Atlas von Baden-Wuerttemberg',
      desc: 'Fachliche Basis fuer die Deutung der wuerttembergischen Hauptbahn: Neckarbecken, Filstal und Geislinger Steige als raeumliche Zwangspunkte und Verbindungslinien.',
    },
    {
      id: 'nf-s13',
      type: 'text',
      title: 'LEO-BW Ortslexikon: Plochingen',
      url: 'https://www.leo-bw.de/detail-gis/-/Detail/details/ORT/labw_ortslexikon/439/Plochingen',
      license: 'LEO-BW / Landesarchiv Baden-Wuerttemberg',
      desc: 'Landeskundliche Ortsbeschreibung zu Plochingen als Hafen- und Industriestadt an der Muendung der Fils in den Neckar und als Verkehrsknoten.',
    },
    {
      id: 'nf-s14',
      type: 'text',
      title: 'WMF: Gruendungs- und Unternehmensgeschichte',
      url: 'https://aboutwmf.com/de/unternehmen/historie/',
      license: 'WMF GmbH',
      desc: 'Unternehmenshistorische Daten zu Straub & Schweizer, zur Gruendung in Geislingen 1853 und zur Fusion zur Wuerttembergischen Metallwarenfabrik 1880.',
    },
    {
      id: 'nf-s15',
      type: 'text',
      title: 'ERIH: Maerklineum Goeppingen',
      url: 'https://www.erih.de/da-will-ich-hin/site/maerklineum',
      license: 'European Route of Industrial Heritage',
      desc: 'Industriekulturelle Einordnung zu Maerklin in Goeppingen: Gruendung 1859, Blechwaren, spaetere Modelleisenbahnproduktion und Fabrikstandort.',
    },
    {
      id: 'nf-s16',
      type: 'text',
      title: 'Mercedes-Benz Group: 120 Jahre Werk Untertuerkheim',
      url: 'https://group.mercedes-benz.com/unternehmen/tradition/geschichte/120-jahre-untertuerkheim.html',
      license: 'Mercedes-Benz Group',
      desc: 'Unternehmenshistorische Quelle zum Umzug der Daimler-Motoren-Gesellschaft nach Untertuerkheim 1904 und zur Entwicklung des Standorts.',
    },
    {
      id: 'nf-s17',
      type: 'map',
      title: 'OpenStreetMap / Nominatim: Praezisionsreferenzen fuer Industrieorte',
      url: 'https://www.openstreetmap.org/',
      license: '(c) OpenStreetMap contributors, ODbL 1.0',
      desc: 'Moderne Referenzpunkte fuer Bahnhofs-, Werks- und Museumsstandorte. Historische Aussagen werden nur zusammen mit den jeweiligen Fachquellen im Modul verwendet.',
    },
  ];

  for (const s of sources) {
    run(
      'INSERT OR REPLACE INTO source (id, module_id, type, title, url, license, description) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [s.id, modId, s.type, s.title, s.url, s.license, s.desc],
    );
  }

  const corridorPolygon = {
    type: 'Polygon',
    coordinates: [[
      [9.135, 48.842], [9.245, 48.862], [9.438, 48.775], [9.655, 48.748],
      [9.862, 48.665], [9.895, 48.596], [9.706, 48.606], [9.518, 48.647],
      [9.321, 48.689], [9.166, 48.724], [9.135, 48.842],
    ]],
  };
  const centralRail = {
    type: 'LineString',
    coordinates: [
      [9.183657, 48.785255], [9.187357, 48.789432], [9.209487, 48.801208], [9.214237, 48.801804],
      [9.22599, 48.799443], [9.240994, 48.79085], [9.244609, 48.787729], [9.250913, 48.779398],
      [9.258126, 48.774444], [9.271422, 48.757976], [9.276516, 48.746068], [9.280666, 48.742842],
      [9.299353, 48.739059], [9.335931, 48.727021], [9.360962, 48.724373], [9.372753, 48.724497],
      [9.387373, 48.719009], [9.402157, 48.719063], [9.409674, 48.71497], [9.416538, 48.708829],
    ],
  };
  const filsRail = {
    type: 'LineString',
    coordinates: [
      [9.416538, 48.708829], [9.431385, 48.703375], [9.436327, 48.703117], [9.44578, 48.704294],
      [9.454802, 48.707881], [9.476261, 48.708328], [9.493086, 48.713511], [9.518947, 48.714468],
      [9.537624, 48.718247], [9.554736, 48.717959], [9.564694, 48.715983], [9.577471, 48.71002],
      [9.582946, 48.708838], [9.603324, 48.707739], [9.609938, 48.708759], [9.619073, 48.711535],
      [9.625859, 48.711494], [9.630856, 48.709966], [9.646229, 48.701917], [9.654638, 48.699356],
      [9.659393, 48.69919], [9.665036, 48.701001], [9.669755, 48.701455], [9.695049, 48.698565],
      [9.727816, 48.691662], [9.761779, 48.683034], [9.782184, 48.667411], [9.790755, 48.657696],
      [9.802128, 48.641905], [9.804594, 48.639677], [9.824982, 48.629618], [9.835125, 48.628497],
      [9.843041, 48.631082], [9.847025, 48.629832], [9.847923, 48.627824], [9.846341, 48.6239],
      [9.841918, 48.619774], [9.842311, 48.617873], [9.845724, 48.612771], [9.844558, 48.610079],
      [9.843924, 48.604427], [9.842529, 48.601645], [9.84311, 48.599901], [9.85068, 48.597659],
      [9.854338, 48.594346], [9.866112, 48.588121], [9.875894, 48.574713], [9.878644, 48.567781],
      [9.8818, 48.565872], [9.888573, 48.564227], [9.891238, 48.5621], [9.891664, 48.559472],
      [9.889655, 48.555029], [9.891465, 48.551815], [9.899272, 48.548172], [9.910236, 48.548595],
      [9.915029, 48.546987], [9.920702, 48.541739], [9.924931, 48.533571], [9.943566, 48.525078],
      [9.948308, 48.521507], [9.950443, 48.517232], [9.950069, 48.506704], [9.951541, 48.50392],
      [9.966474, 48.496158], [9.973319, 48.494342], [9.976279, 48.492468], [9.977413, 48.489516],
      [9.97529, 48.458558], [9.977495, 48.454293], [9.983883, 48.451343], [10.000157, 48.449486],
      [10.009499, 48.445397], [10.011874, 48.443289], [10.012467, 48.440833], [10.011348, 48.43861],
      [10.000214, 48.42777], [9.994342, 48.424797], [9.992264, 48.422565], [9.992461, 48.418329],
      [9.996364, 48.413699], [9.995698, 48.410283], [9.993009, 48.408292], [9.985532, 48.40605],
      [9.982952, 48.403866], [9.98229, 48.398],
    ],
  };
  const geislingerSteige = {
    type: 'LineString',
    coordinates: [
      [9.824982, 48.629618], [9.835125, 48.628497], [9.843041, 48.631082], [9.847025, 48.629832],
      [9.847923, 48.627824], [9.846341, 48.6239], [9.841918, 48.619774], [9.842311, 48.617873],
      [9.845724, 48.612771], [9.844558, 48.610079], [9.843924, 48.604427], [9.842529, 48.601645],
      [9.84311, 48.599901], [9.85068, 48.597659], [9.854338, 48.594346], [9.866112, 48.588121],
      [9.875894, 48.574713],
    ],
  };
  const neckarLine = {
    type: 'LineString',
    coordinates: [
      [9.201609, 49.142665], [9.198511, 49.128972], [9.194872, 49.123148],
      [9.190117, 49.120868], [9.164539, 49.117031], [9.161547, 49.115788],
      [9.153697, 49.106977], [9.15292, 49.101712], [9.156576, 49.095317],
      [9.160299, 49.092939], [9.175384, 49.089711], [9.178411, 49.086192],
      [9.177691, 49.083005], [9.172866, 49.079444], [9.168545, 49.078213],
      [9.156828, 49.079479], [9.155419, 49.076585], [9.176079, 49.063482],
      [9.178771, 49.059266], [9.172211, 49.045453], [9.167317, 49.041327],
      [9.160047, 49.043756], [9.157007, 49.049786], [9.152952, 49.05018],
      [9.15072, 49.048725], [9.1515, 49.026672], [9.160697, 49.015482],
      [9.158442, 49.010493], [9.148385, 49.005705], [9.147878, 49.002838],
      [9.153146, 49.001544], [9.163149, 49.006729], [9.172046, 49.003687],
      [9.176185, 48.998953], [9.171032, 48.990925], [9.171257, 48.988179],
      [9.17722, 48.985354], [9.190503, 48.988918], [9.19388, 49.000693],
      [9.197393, 49.002511], [9.200284, 49.001586], [9.202894, 48.996321],
      [9.203084, 48.990195], [9.213086, 48.983721], [9.215807, 48.979376],
      [9.213449, 48.976308], [9.19784, 48.969096], [9.197934, 48.962504],
      [9.192387, 48.95451], [9.192758, 48.94621], [9.19835, 48.943044],
      [9.206531, 48.943285], [9.231607, 48.951067], [9.249686, 48.94734],
      [9.252562, 48.942836], [9.248545, 48.934135], [9.244298, 48.930991],
      [9.215348, 48.925006], [9.212168, 48.920222], [9.212958, 48.913742],
      [9.220721, 48.908098], [9.227987, 48.906148], [9.234082, 48.906906],
      [9.242492, 48.910891], [9.252156, 48.912259], [9.255677, 48.911384],
      [9.259084, 48.907053], [9.256918, 48.900496], [9.257482, 48.89747],
      [9.266712, 48.892811], [9.276472, 48.882745], [9.2776, 48.879717],
      [9.275433, 48.87465], [9.267108, 48.871644], [9.255865, 48.863006],
      [9.247584, 48.849879], [9.243233, 48.845634], [9.228167, 48.83897],
      [9.215842, 48.837655], [9.2089, 48.834174], [9.208968, 48.827203],
      [9.22204, 48.825006], [9.226945, 48.821879], [9.228266, 48.818937],
      [9.209291, 48.802782], [9.220595, 48.790913], [9.250361, 48.774099],
      [9.267551, 48.747835], [9.27524, 48.74218], [9.302901, 48.737099],
      [9.321007, 48.727586], [9.356816, 48.717082], [9.395808, 48.717142],
      [9.419803, 48.706719],
    ],
  };
  const filsLine = {
    type: 'LineString',
    coordinates: [
      [9.800789, 48.605727], [9.801627, 48.608221], [9.806335, 48.609128],
      [9.805022, 48.612001], [9.80666, 48.613713], [9.81579, 48.615843],
      [9.812726, 48.619007], [9.819197, 48.624492], [9.817733, 48.627105],
      [9.813478, 48.628488], [9.815312, 48.632894], [9.80601, 48.638051],
      [9.803958, 48.638453], [9.801811, 48.637115], [9.797286, 48.639187],
      [9.797372, 48.641748], [9.798796, 48.643008], [9.797946, 48.644532],
      [9.795264, 48.647445], [9.792619, 48.647625], [9.788515, 48.650722],
      [9.78448, 48.651929], [9.780499, 48.661849], [9.775032, 48.666372],
      [9.775017, 48.66922], [9.772811, 48.673036], [9.767425, 48.674863],
      [9.766205, 48.678018], [9.752655, 48.681455], [9.752892, 48.684066],
      [9.750909, 48.685395], [9.741273, 48.686552], [9.728041, 48.691337],
      [9.697087, 48.69783], [9.688106, 48.697929], [9.676304, 48.699928],
      [9.653892, 48.698882], [9.642516, 48.702088], [9.636889, 48.706316],
      [9.627038, 48.71057], [9.612948, 48.708454], [9.608153, 48.704754],
      [9.594664, 48.703702], [9.587038, 48.706109], [9.58196, 48.703936],
      [9.557164, 48.715314], [9.550908, 48.716778], [9.525623, 48.712809],
      [9.499207, 48.712051], [9.492057, 48.712893], [9.489541, 48.710817],
      [9.480445, 48.707801], [9.471883, 48.706435], [9.454975, 48.707606],
      [9.451053, 48.70616], [9.44789, 48.702374], [9.432989, 48.700441],
      [9.419803, 48.706719],
    ],
  };
  const energyLine = {
    type: 'LineString',
    coordinates: [[9.146, 49.074], [8.950, 49.150], [8.690, 49.410], [8.466, 49.488], [8.682, 50.110]],
  };
  const pointGeometry = (lng: number, lat: number) => ({
    type: 'Point',
    coordinates: [lng, lat],
  });

  const places = [
    {
      id: 'nf-p01', name: 'Industriekorridor Neckar-Fils', lat: 48.735, lng: 9.520,
      desc: 'Analytische Untersuchungsflaeche, nicht historische Verwaltungsgrenze: Sie fasst Neckarabschnitt, Plochinger Knoten, Filstal und Albaufstieg als gemeinsamen Industrialisierungsraum zusammen.',
      geometry: corridorPolygon, validFrom: '1845', validTo: '1914', certainty: 'reconstructed', source: 'nf-s08',
    },
    {
      id: 'nf-p02', name: 'Centralbahn Stuttgart-Esslingen', lat: 48.765, lng: 9.265,
      desc: 'Erster Bahnraum des Moduls: Stuttgart/Cannstatt, Untertuerkheim, Esslingen und Plochingen werden enger verbunden. Die Linie nutzt die heutige Trasse als praezise Referenz fuer die historisch fortwirkende Achse.',
      geometry: centralRail, validFrom: '1845', validTo: '1914', certainty: 'reconstructed', source: 'nf-s09',
    },
    {
      id: 'nf-p03', name: 'Filsbahn und Anschluss nach Ulm', lat: 48.650, lng: 9.720,
      desc: 'Liniengeometrie fuer die Fortsetzung der Bahn durch das Filstal und ueber den Albaufstieg. Die heutige Trasse ist als moderne Referenz fuer den historischen Raumbezug gekennzeichnet.',
      geometry: filsRail, validFrom: '1847', validTo: '1914', certainty: 'reconstructed', source: 'nf-s09',
    },
    {
      id: 'nf-p04', name: 'Maschinenfabrik Esslingen, Bahnhof-/Neckarraum', lat: 48.739204, lng: 9.300368,
      desc: 'Lokomotiv- und Maschinenbaustandort in Esslingen. Der Punkt ist eine moderne Praezisionsreferenz am Bahnhofs-/Neckarraum; die exakte historische Werksausdehnung wird im MVP nicht behauptet.',
      geometry: pointGeometry(9.300368, 48.739204), validFrom: '1846', validTo: '1914', certainty: 'probable', source: 'nf-s17',
    },
    {
      id: 'nf-p05', name: 'Plochingen Bahnhofsknoten', lat: 48.713251, lng: 9.411906,
      desc: 'Knotenpunkt von Neckar, Fils und Bahn: Plochingen wurde frueh an die Eisenbahn angeschlossen und wenige Jahre spaeter Eisenbahnknoten. Der Punkt nutzt den heutigen Bahnhof als Referenz.',
      geometry: pointGeometry(9.411906, 48.713251), validFrom: '1846', validTo: '1914', certainty: 'probable', source: 'nf-s17',
    },
    {
      id: 'nf-p06', name: 'Goeppingen im Filstal', lat: 48.700349, lng: 9.652262,
      desc: 'Industrieort und Bahnort im Filstal. Der Bahnhofspunkt dient als raeumlicher Anker fuer den Vergleich von Bahnnaehe, Metallwaren, Maschinenbau und Stadtwachstum.',
      geometry: pointGeometry(9.652262, 48.700349), validFrom: '1847', validTo: '1914', certainty: 'probable', source: 'nf-s17',
    },
    {
      id: 'nf-p07', name: 'Geislinger Steige', lat: 48.602, lng: 9.895,
      desc: 'Topografisch anspruchsvoller Bahnabschnitt am Albtrauf; Karte und Relief werden hier zum Deutungsmaterial.',
      geometry: geislingerSteige, validFrom: '1850', validTo: '1914', certainty: 'probable', source: 'nf-s09',
    },
    {
      id: 'nf-p08', name: 'Neckar als Industrie- und Verkehrsraum', lat: 48.870, lng: 9.210,
      desc: 'Flussraum zwischen Heilbronn/Lauffen, Stuttgart/Cannstatt, Esslingen und Plochingen. Die Linie nutzt den aktuellen OSM-Wasserlauf als moderne Referenz fuer den historischen Verkehrs- und Industrieraum.',
      geometry: neckarLine, validFrom: '1845', validTo: '1914', certainty: 'reconstructed', source: 'nf-s10',
    },
    {
      id: 'nf-p09', name: 'Drehstromuebertragung Lauffen-Frankfurt', lat: 49.600, lng: 8.900,
      desc: 'Fernuebertragung 1891: Energie wird zu einem neuen raeumlichen Faktor der Industrialisierung. Die Linie ist eine schematische Verbindung der Endpunkte, kein verifizierter Leitungsverlauf.',
      geometry: energyLine, validFrom: '1891', validTo: '1891', certainty: 'reconstructed', source: 'nf-s05',
    },
    {
      id: 'nf-p10', name: 'Daimler-Motoren-Gesellschaft Untertuerkheim', lat: 48.785332, lng: 9.239113,
      desc: 'Neckarraum oestlich von Stuttgart: Mit dem Werk Untertuerkheim wird 1904 Automobil- und Motorenindustrie Teil des Neckar-Fils-Industrieraums. Der Punkt ist eine moderne Werksreferenz.',
      geometry: pointGeometry(9.239113, 48.785332), validFrom: '1904', validTo: '1914', certainty: 'probable', source: 'nf-s17',
    },
    {
      id: 'nf-p11', name: 'Fils als Tal- und Industrieachse', lat: 48.685, lng: 9.620,
      desc: 'Wasserlauf und Talraum der Fils zwischen Geislingen, Goeppingen und Plochingen. Die Linie nutzt den aktuellen OSM-Wasserlauf als moderne Referenz fuer den historischen Tal- und Industrieraum.',
      geometry: filsLine, validFrom: '1845', validTo: '1914', certainty: 'reconstructed', source: 'nf-s11',
    },
    {
      id: 'nf-p12', name: 'WMF Geislingen', lat: 48.620782, lng: 9.833787,
      desc: 'Metallwarenstandort in Geislingen: von Straub & Schweizer zur Wuerttembergischen Metallwarenfabrik. Der Punkt nutzt den modernen WMF-Industriearealbezug; historische Ausdehnung bleibt quellenkritisch markiert.',
      geometry: pointGeometry(9.833787, 48.620782), validFrom: '1853', validTo: '1914', certainty: 'probable', source: 'nf-s17',
    },
    {
      id: 'nf-p13', name: 'Maerklin Goeppingen', lat: 48.707787, lng: 9.639304,
      desc: 'Blechwaren- und Spielwarenindustrie in Goeppingen. Der moderne Werks-/Museumsraum dient als Praezisionsreferenz, die historische Entwicklung wird ueber die Fachquelle erschlossen.',
      geometry: pointGeometry(9.639304, 48.707787), validFrom: '1859', validTo: '1914', certainty: 'probable', source: 'nf-s17',
    },
  ];

  for (const p of places) {
    run(
      `INSERT OR REPLACE INTO place
       (id, module_id, lat, lng, name, description, geometry_geojson, valid_from, valid_to, certainty, source_of_claim)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        p.id, modId, p.lat, p.lng, p.name, p.desc,
        p.geometry ? JSON.stringify(p.geometry) : null,
        p.validFrom, p.validTo, p.certainty, p.source,
      ],
    );
  }

  const times = [
    { id: 'nf-t01', type: 'span', start: '1845', end: '1846', label: '1845-1846' },
    { id: 'nf-t02', type: 'instant', date: '1846', label: '1846' },
    { id: 'nf-t03', type: 'span', start: '1847', end: '1850', label: '1847-1850' },
    { id: 'nf-t04', type: 'instant', date: '1853', label: '1853' },
    { id: 'nf-t05', type: 'instant', date: '1859', label: '1859' },
    { id: 'nf-t06', type: 'instant', date: '1880', label: '1880' },
    { id: 'nf-t07', type: 'instant', date: '1891', label: '1891' },
    { id: 'nf-t08', type: 'instant', date: '1895', label: '1895' },
    { id: 'nf-t09', type: 'instant', date: '1904', label: '1904' },
    { id: 'nf-t10', type: 'span', start: '1895', end: '1914', label: '1895-1914' },
  ] as const;

  for (const t of times) {
    run(
      'INSERT OR REPLACE INTO time_object (id, module_id, type, date, start_date, end_date, certainty, label) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [
        t.id, modId, t.type,
        t.type === 'instant' ? (t as any).date : null,
        t.type === 'span' ? (t as any).start : null,
        t.type === 'span' ? (t as any).end : null,
        'certain', t.label,
      ],
    );
  }

  const concepts = [
    { id: 'nf-c01', kind: 'analytical', label: 'Raumfaktor', desc: 'Analytischer Begriff fuer Bedingungen, die industrielle Entwicklung raeumlich beguenstigen oder begrenzen: Verkehr, Energie, Topografie, Arbeitskraefte, Kapital, Verwaltung.' },
    { id: 'nf-c02', kind: 'analytical', label: 'Infrastruktur', desc: 'Dauerhafte technische Einrichtungen wie Bahnlinien, Bahnhoefe, Bruecken und Energieanlagen, die wirtschaftliche Nutzung von Raeumen veraendern.' },
    { id: 'nf-c03', kind: 'analytical', label: 'Industriekorridor', desc: 'Raeumliche Verdichtung mehrerer Industrieorte entlang gemeinsamer Verkehrs-, Energie- oder Arbeitsmaerkte.' },
    { id: 'nf-c04', kind: 'source', label: 'Historische Industriekarte', desc: 'Kartentyp, der Konzentrationen sichtbar macht, aber Kategorien, Massstab und Auswahl kritisch pruefbar macht.' },
    { id: 'nf-c05', kind: 'analytical', label: 'Standortfaktor', desc: 'Bedingung, die einen Produktionsort wahrscheinlicher macht: Wasser- oder Dampfkraft, Bahnanschluss, Arbeitskraefte, Zulieferer, Kapital, Absatzmarkt oder politischer Rahmen.' },
    { id: 'nf-c06', kind: 'analytical', label: 'Praezisionsgeometrie', desc: 'Unterscheidung zwischen exakter moderner Referenzgeometrie, wahrscheinlichem historischem Standort und didaktisch rekonstruierter Untersuchungsflaeche.' },
    { id: 'nf-c07', kind: 'analytical', label: 'Pfadabhaengigkeit', desc: 'Fruehe Infrastrukturentscheidungen koennen spaetere Industrieansiedlungen, Pendelwege und Stadtentwicklung dauerhaft vorstrukturieren.' },
  ];
  for (const c of concepts) {
    run('INSERT OR REPLACE INTO concept (id, module_id, kind, label, description) VALUES (?, ?, ?, ?, ?)',
      [c.id, modId, c.kind, c.label, c.desc]);
  }

  const actors = [
    { id: 'nf-a01', type: 'institution', name: 'Koenigreich Wuerttemberg', desc: 'Staatlicher Rahmen der fruehen Eisenbahn- und Industriepolitik im Neckar-Fils-Raum.' },
    { id: 'nf-a02', type: 'institution', name: 'Maschinenfabrik Esslingen AG', desc: 'Industriebetrieb, der Eisenbahn und Maschinenbau im regionalen Raum sichtbar verbindet.' },
    { id: 'nf-a03', type: 'group', name: 'Arbeiterinnen und Arbeiter', desc: 'Sozialgeschichtliche Perspektive: Industrialisierung veraendert Arbeitswege, Wohnorte, Zeitrhythmen und soziale Konflikte.' },
    { id: 'nf-a04', type: 'institution', name: 'Kommunen im Neckar-Fils-Raum', desc: 'Stuttgart, Esslingen, Plochingen, Goeppingen und Geislingen reagieren unterschiedlich auf Verkehr, Industrie und Wachstum.' },
    { id: 'nf-a05', type: 'institution', name: 'Wuerttembergische Staatseisenbahn', desc: 'Eisenbahnverwaltung und Infrastrukturbetrieb als planerischer und technischer Akteur der Raumerschliessung.' },
    { id: 'nf-a06', type: 'institution', name: 'Wuerttembergische Metallwarenfabrik (WMF)', desc: 'Geislinger Metallwarenunternehmen, das Standort, Exportorientierung und industrielle Arbeitswelt im Filstal greifbar macht.' },
    { id: 'nf-a07', type: 'institution', name: 'Gebr. Maerklin & Cie.', desc: 'Goeppinger Blechwaren- und Spielwarenunternehmen, spaeter stark mit Modelleisenbahnen verbunden.' },
    { id: 'nf-a08', type: 'institution', name: 'Daimler-Motoren-Gesellschaft', desc: 'Automobil- und Motorenindustrie im Neckarraum; Untertuerkheim zeigt die zweite Industrialisierungswelle um 1900.' },
  ];
  for (const a of actors) {
    run('INSERT OR REPLACE INTO actor (id, module_id, type, name, description) VALUES (?, ?, ?, ?, ?)',
      [a.id, modId, a.type, a.name, a.desc]);
  }

  const events = [
    {
      id: 'nf-e01', title: 'Wuerttemberg baut einen Tal- und Bahnraum',
      desc: 'Die fruehe wuerttembergische Hauptbahn nutzt nicht irgendeine Linie auf der Karte: Vom Neckarbecken folgt sie dem Raum Stuttgart-Esslingen-Plochingen, dann dem Filstal und schliesslich dem Albaufstieg. Die Lernfrage lautet: Welche Landschaftsformen lenken Technik, und wo veraendert Technik die Landschaft?',
      place: 'nf-p02', time: 'nf-t01', sources: ['nf-s12', 'nf-s09', 'nf-s10', 'nf-s11'], actors: ['nf-a01', 'nf-a05'], concepts: ['nf-c01', 'nf-c02', 'nf-c05', 'nf-c06'],
    },
    {
      id: 'nf-e02', title: 'Maschinenfabrik Esslingen: Eisenbahn erzeugt Industrie',
      desc: 'Die Maschinenfabrik Esslingen zeigt die Rueckkopplung zwischen Infrastruktur und Industrie. Die Bahn braucht Lokomotiven, Wagen, Bruecken, Maschinen und Wartung; genau daraus entstehen Nachfrage, Facharbeit und Zulieferbeziehungen. Der Standort ist deshalb mehr als ein Fabrikpunkt: Er ist ein Indiz fuer staatliche Eisenbahnpolitik und regionale Industrialisierung.',
      place: 'nf-p04', time: 'nf-t02', sources: ['nf-s02', 'nf-s03', 'nf-s12'], actors: ['nf-a01', 'nf-a02', 'nf-a03', 'nf-a05'], concepts: ['nf-c02', 'nf-c03', 'nf-c05', 'nf-c07'],
      follows: 'nf-e01',
    },
    {
      id: 'nf-e03', title: 'Filsbahn und Geislinger Steige: Topografie wird Arbeitsauftrag',
      desc: 'Die Filsbahn macht das Tal zur Trasse, die Geislinger Steige den Albtrauf zum technischen Problem. Im Kartenvergleich wird sichtbar, warum Industrialisierung nicht nur in Staedten stattfindet: Ingenieurbau, Bauarbeit, Steigungen und Knoten entscheiden mit, welche Raeume wirtschaftlich angeschlossen werden.',
      place: 'nf-p07', time: 'nf-t03', sources: ['nf-s04', 'nf-s09', 'nf-s12'], actors: ['nf-a01', 'nf-a03', 'nf-a05'], concepts: ['nf-c01', 'nf-c02', 'nf-c05'],
      follows: 'nf-e02',
    },
    {
      id: 'nf-e04', title: 'Geislingen 1853: Metallwaren folgen Bahn, Tal und Unternehmerinitiative',
      desc: 'Die Gruendung von Straub & Schweizer in Geislingen verbindet mehrere Standortfaktoren: Erfahrungen aus dem Bahnbau an der Steige, Metallhandwerk, Tal- und Bahnanschluss sowie unternehmerische Netzwerke. Der Punkt auf der Karte ist ein moderner Referenzpunkt; die historische Deutung entsteht erst durch Quelle, Zeit und Raumbezug.',
      place: 'nf-p12', time: 'nf-t04', sources: ['nf-s14', 'nf-s02', 'nf-s12'], actors: ['nf-a03', 'nf-a06'], concepts: ['nf-c03', 'nf-c05', 'nf-c06', 'nf-c07'],
      follows: 'nf-e03',
    },
    {
      id: 'nf-e05', title: 'Plochingen 1859: Aus Anschluss wird Knoten',
      desc: 'Plochingen eignet sich als Schluesselort, weil hier Neckar, Fils, Bahn und Spaeter auch weitere Verkehrstraeger zusammenlaufen. Der Ort hilft, den Unterschied zwischen Lage und Knotenfunktion zu lernen: Ein Punkt wird bedeutsam, wenn Linien ihn wiederholt nutzen und neue Verbindungen dort andocken.',
      place: 'nf-p05', time: 'nf-t05', sources: ['nf-s13', 'nf-s12', 'nf-s17'], actors: ['nf-a04', 'nf-a05'], concepts: ['nf-c01', 'nf-c02', 'nf-c07'],
      follows: 'nf-e03',
    },
    {
      id: 'nf-e06', title: 'Goeppingen 1859: Blechwaren, Spielwaren und Bahnnaehe',
      desc: 'Maerklin beginnt in Goeppingen mit lackierten Blechwaren und wird spaeter zu einem Leitbeispiel industrieller Spielwarenproduktion. Fuer die Raumdeutung ist der Fall interessant, weil er nicht nur Schwerindustrie zeigt: Auch spezialisierte Metallwaren, Facharbeit und Absatzwege gehoeren zur Industrialisierung des Filstals.',
      place: 'nf-p13', time: 'nf-t05', sources: ['nf-s15', 'nf-s02', 'nf-s17'], actors: ['nf-a03', 'nf-a07'], concepts: ['nf-c03', 'nf-c05', 'nf-c07'],
      follows: 'nf-e03',
    },
    {
      id: 'nf-e07', title: '1880: WMF macht Geislingen zum grossen Metallwarenstandort',
      desc: 'Mit der Fusion zur Wuerttembergischen Metallwarenfabrik wird aus einem lokalen Produktionsort ein grossbetrieblich sichtbarer Industriestandort. Die Industriekarte von 1895 ermoeglicht danach eine Kontrollfrage: Passt die einzelne Unternehmensgeschichte zum regionalen Muster aus Metallwaren, Maschinenbau und Bahnraum?',
      place: 'nf-p12', time: 'nf-t06', sources: ['nf-s14', 'nf-s02'], actors: ['nf-a06', 'nf-a03'], concepts: ['nf-c03', 'nf-c04', 'nf-c05'],
      follows: 'nf-e04',
    },
    {
      id: 'nf-e08', title: 'Lauffen-Frankfurt 1891: Energie wird ein Fernraum',
      desc: 'Die Drehstromuebertragung von Lauffen nach Frankfurt erweitert die Neckar-Fils-Perspektive. Energie ist nicht mehr nur an Muehlgraben, Dampfmaschine oder lokale Wasserkraft gebunden. Die Linie ist bewusst schematisch: Sie zeigt eine neue Raumbeziehung, keinen vermessenen Leitungsverlauf.',
      place: 'nf-p09', time: 'nf-t07', sources: ['nf-s05', 'nf-s06'], actors: ['nf-a01'], concepts: ['nf-c01', 'nf-c02', 'nf-c06'],
      follows: 'nf-e07',
    },
    {
      id: 'nf-e09', title: 'Industriekarte 1895: Cluster lesen, nicht Orte sammeln',
      desc: 'Die Karte "Die Industrie in Baden und Wuerttemberg 1895" verdichtet das Modul: Esslingen, Goeppingen, Geislingen und Cannstatt erscheinen nicht isoliert, sondern als Teil eines mittleren Neckar- und Filstalclusters. Zugleich bleibt die Karte Quelle: Sie zeigt Branchen und Groessenordnungen, aber keine Arbeitswege, Konflikte oder exakten Fabrikgrenzen.',
      place: 'nf-p01', time: 'nf-t08', sources: ['nf-s02', 'nf-s07', 'nf-s12'], actors: ['nf-a03', 'nf-a04'], concepts: ['nf-c03', 'nf-c04', 'nf-c06'],
      follows: 'nf-e08',
    },
    {
      id: 'nf-e10', title: 'Untertuerkheim 1904: Automobilindustrie dockt am Neckarraum an',
      desc: 'Mit dem neuen Werk Untertuerkheim wird um 1900 eine zweite industrielle Welle sichtbar: Motoren, Fahrzeuge, Entwicklung und Zulieferung verknuepfen sich mit einem bereits erschlossenen Neckarraum. Der Fall fordert dazu auf, Kontinuitaet und Wandel zu unterscheiden: Die Achsen bleiben, die Branchen veraendern sich.',
      place: 'nf-p10', time: 'nf-t09', sources: ['nf-s16', 'nf-s02', 'nf-s17'], actors: ['nf-a03', 'nf-a08'], concepts: ['nf-c03', 'nf-c05', 'nf-c07'],
      follows: 'nf-e09',
    },
    {
      id: 'nf-e11', title: '1895-1914: Neckar-Fils als vernetzter Industrieraum',
      desc: 'Am Ende steht kein Merksatz, sondern ein begruendetes Raumurteil: Industrialisierung an Neckar und Fils entsteht aus dem Zusammenwirken von Talraeumen, Bahntrassen, Knoten, Energie, Facharbeit, Unternehmen und staatlicher Infrastrukturpolitik. Gute Antworten belegen diese Deutung mit Linien, Punkten, Flaechen und Quellenkritik.',
      place: 'nf-p01', time: 'nf-t10', sources: ['nf-s01', 'nf-s02', 'nf-s12', 'nf-s13', 'nf-s14', 'nf-s15', 'nf-s16'], actors: ['nf-a01', 'nf-a03', 'nf-a04', 'nf-a05'], concepts: ['nf-c01', 'nf-c03', 'nf-c04', 'nf-c05', 'nf-c06', 'nf-c07'],
      follows: 'nf-e10',
    },
  ];

  for (const e of events) {
    run(
      'INSERT OR REPLACE INTO event (id, module_id, title, description, place_id, time_object_id, follows_id, part_of_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [e.id, modId, e.title, e.desc, e.place, e.time, (e as any).follows ?? null, null],
    );
    run('DELETE FROM event_source WHERE event_id = ?', [e.id]);
    for (const sid of e.sources) run('INSERT OR REPLACE INTO event_source (event_id, source_id) VALUES (?, ?)', [e.id, sid]);
    run('DELETE FROM event_actor WHERE event_id = ?', [e.id]);
    for (const aid of e.actors) run('INSERT OR REPLACE INTO event_actor (event_id, actor_id, role) VALUES (?, ?, ?)', [e.id, aid, null]);
    run('DELETE FROM event_concept WHERE event_id = ?', [e.id]);
    for (const cid of e.concepts) run('INSERT OR REPLACE INTO event_concept (event_id, concept_id) VALUES (?, ?)', [e.id, cid]);
  }

  const movements = [
    {
      id: 'nf-mv01',
      eventId: 'nf-e01',
      name: 'Bahnachse Stuttgart-Esslingen-Plochingen',
      desc: 'Fruehe Bahnverbindung als raeumliches Rueckgrat des Moduls; moderne Trasse als praezise Referenz fuer die historische Achse.',
      color: '#5f3a2e',
      coords: centralRail.coordinates,
    },
    {
      id: 'nf-mv02',
      eventId: 'nf-e03',
      name: 'Filsbahn ueber Geislinger Steige',
      desc: 'Bahnlinie durch das Filstal bis zum Albaufstieg; moderne Trasse als Referenz, historischer Deutungszeitraum 1847-1850.',
      color: '#7B2D42',
      coords: filsRail.coordinates,
    },
    {
      id: 'nf-mv03',
      eventId: 'nf-e08',
      name: 'Energieachse Lauffen-Frankfurt',
      desc: 'Schematische Verbindung der Endpunkte der Drehstromuebertragung 1891; nicht als exakter Leitungsverlauf lesen.',
      color: '#a8781c',
      coords: energyLine.coordinates,
    },
    {
      id: 'nf-mv04',
      eventId: 'nf-e09',
      name: 'Neckar-Fils-Talraum',
      desc: 'Fluss- und Talbezug als Lesespur fuer Industrieorte; Neckar und Fils sind getrennte Wasserlaeufe, werden hier aber als gemeinsamer Untersuchungsraum interpretiert.',
      color: '#236f8f',
      coords: [...neckarLine.coordinates.slice(-18), ...filsLine.coordinates.slice().reverse()],
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
      id: 'nf-task-01',
      title: 'Kartenbefund: Linien vor Punkten',
      prompt: 'Untersuche zuerst nur Linien und Flaechen: Welche drei Raumfaktoren strukturieren den Neckar-Fils-Industrieraum am staerksten? Belege jeden Faktor mit einer konkreten Kartenstelle.',
      answer: 'Erwartet: Bahntrasse Stuttgart-Esslingen-Plochingen, Filsbahn/Geislinger Steige, Neckar- und Filstal, Plochingen als Knoten, analytischer Korridor. Gute Antworten unterscheiden exakte Linien, moderne Referenzen und rekonstruierte Flaechen.',
      target: 'nf-e01',
      position: 1,
    },
    {
      id: 'nf-task-02',
      title: 'Fallvergleich: vier Industrieorte',
      prompt: 'Vergleiche Esslingen, Geislingen, Goeppingen und Untertuerkheim. Erstelle fuer jeden Ort eine kurze Belegkette aus Standortfaktor, Quelle und Kartenbefund.',
      answer: 'Moeglich: Esslingen = Bahnnachfrage/Maschinenbau; Geislingen = Steige, Metallwaren, WMF; Goeppingen = Filstal, Metall- und Spielwaren; Untertuerkheim = Neckarraum, Automobil/Motoren ab 1904. Entscheidend ist die Verknuepfung von Quelle und Geometrie.',
      target: 'nf-e10',
      position: 2,
    },
    {
      id: 'nf-task-03',
      title: 'Quellenkritik: Industriekarte 1895',
      prompt: 'Pruefe die Industriekarte von 1895: Was macht sie fuer die Deutung des Neckar-Fils-Raums stark, und wo braucht sie Ergaenzung durch andere Quellen?',
      answer: 'Stark sichtbar werden Branchenkonzentration, Lagebeziehungen und industrielle Verdichtung. Ergaenzt werden muessen genaue Werkslagen, Arbeitsbedingungen, soziale Konflikte, Genderaspekte, Eigentum, Pendelwege und Unsicherheiten der Geometrie.',
      target: 'nf-e09',
      position: 3,
    },
    {
      id: 'nf-task-04',
      title: 'Praezisionscheck',
      prompt: 'Ordne fuenf Kartenobjekte ein: exakte moderne Referenz, wahrscheinlicher historischer Punkt, schematische Achse oder analytische Flaeche. Begruende, warum diese Unterscheidung fuer historisches Arbeiten wichtig ist.',
      answer: 'Beispiele: Bahn/Fluesse = moderne Referenzlinien; Energie Lauffen-Frankfurt = schematische Achse; Industriekorridor = analytische Flaeche; Fabrikpunkte = wahrscheinliche historische Standortreferenzen. So wird vermieden, rekonstruierte Daten als Vermessung auszugeben.',
      target: 'nf-e09',
      position: 4,
    },
    {
      id: 'nf-task-05',
      title: 'Raumurteil',
      prompt: 'Formuliere ein begruendetes Urteil: War Industrialisierung an Neckar und Fils eher Ergebnis von Naturraum, Infrastruktur, Energie, Unternehmen oder Politik? Nutze mindestens vier Karten- und Quellenbelege.',
      answer: 'Erwartet wird ein abwaegendes Mehr-Faktoren-Urteil. Starke Antworten zeigen Zusammenwirken: Talraeume erleichtern Linienfuehrung, staatliche Eisenbahnpolitik schafft Infrastruktur, Betriebe nutzen Knoten und Facharbeit, Energie erweitert Standortlogiken.',
      target: 'nf-e11',
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
    'Seed "Industrialisierung an Neckar und Fils" complete:',
    `  ${places.length} Orte/Geometrien`,
    `  ${events.length} Ereignisse`,
    `  ${sources.length} Quellen`,
    `  ${tasks.length} Aufgaben`,
  ].join('\n'));
}

seed().catch(err => { console.error(err); process.exit(1); });
