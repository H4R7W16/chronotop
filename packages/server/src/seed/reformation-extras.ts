// Erweitert das Reformations-Modul um Akteure und Begriffe
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

  const modId = '00000000-0000-0000-0000-000000000001';

  // === Akteure ===
  const actors = [
    { id: 'ar01', type: 'person', name: 'Martin Luther', wd: 'Q9554',
      birth: '1483-11-10', death: '1546-02-18',
      desc: 'Augustinermönch, Theologe und Professor in Wittenberg. Luthers Kritik an Ablass und kirchlicher Autorität wurde durch Druck, Reichspolitik und Schutzverhältnisse zum Auslöser einer europäischen Reformationsbewegung.' },
    { id: 'ar02', type: 'person', name: 'Karl V.', wd: 'Q32500',
      birth: '1500-02-24', death: '1558-09-21',
      desc: 'Römisch-deutscher Kaiser. Er verstand die religiöse Einheit des Reiches als politische Ordnungsfrage und ließ nach dem Wormser Reichstag die Reichsacht gegen Luther verhängen.' },
    { id: 'ar03', type: 'person', name: 'Friedrich der Weise', wd: 'Q57114',
      birth: '1463-01-17', death: '1525-05-05',
      desc: 'Kurfürst von Sachsen und Gründer der Universität Wittenberg. Er schützte Luther politisch, ohne sich früh offen zu dessen Lehre zu bekennen, und ließ ihn 1521 auf die Wartburg bringen.' },
    { id: 'ar04', type: 'person', name: 'Huldrych Zwingli', wd: 'Q123371',
      birth: '1484-01-01', death: '1531-10-11',
      desc: 'Zürcher Reformator. Seine Reformation verband Predigt, Bibelauslegung und Ratsentscheidungen besonders eng; in der Abendmahlsfrage blieb er von Luther getrennt.' },
    { id: 'ar05', type: 'person', name: 'Johannes Calvin', wd: 'Q37577',
      birth: '1509-07-10', death: '1564-05-27',
      desc: 'Französischer Theologe und Reformator. Calvin prägte von Genf aus eine reformierte Tradition mit großer europäischer Ausstrahlung, besonders durch die Institutio und Genfer Kirchenordnung.' },
    { id: 'ar06', type: 'person', name: 'Philipp Melanchthon', wd: 'Q48305',
      birth: '1497-02-16', death: '1560-04-19',
      desc: 'Humanist, Theologe und engster Wittenberger Mitstreiter Luthers. Als Hauptverfasser der Confessio Augustana übersetzte er reformatorische Lehre in eine reichspolitisch anschlussfähige Bekenntnisschrift.' },
    { id: 'ar07', type: 'person', name: 'Martin Bucer', wd: 'Q57017',
      birth: '1491-11-11', death: '1551-02-28',
      desc: 'Straßburger Reformator. Bucer steht für die oberdeutsche Reformation, städtische Kirchenordnung und wiederholte Vermittlungsversuche zwischen lutherischen und schweizerischen Positionen.' },
    { id: 'ar08', type: 'institution', name: 'Römische Kurie', wd: 'Q42867',
      desc: 'Verwaltungs- und Entscheidungsapparat des Heiligen Stuhls. In der Reformation wurde sie für Kritiker zum Symbol kirchlicher Macht, fiskalischer Interessen und autoritativer Lehrentscheidungen.' },
    { id: 'ar09', type: 'group', name: 'Wiedertäufer (Münsteraner Täuferreich)', wd: 'Q186073',
      desc: 'Radikalreformatorische Bewegung mit unterschiedlichen Strömungen. Das Täuferreich von Münster war eine extreme Sonderentwicklung, die von Gegnern später oft pauschal gegen alle Täufer verwendet wurde.' },
    // P3.4: Neue Akteure
    { id: 'ar10', type: 'person', name: 'Andreas Bodenstein von Karlstadt', wd: 'Q319881',
      birth: '1486-01-01', death: '1541-12-24',
      desc: 'Früher Wittenberger Reformator und Theologe. Karlstadt unterstützte Luther zunächst, drängte aber stärker auf praktische Reformen, Laienkelch und Bilderentfernung; sein Konflikt mit Luther zeigt Bruchlinien innerhalb der frühen Bewegung.' },
    { id: 'ar11', type: 'person', name: 'Thomas Müntzer', wd: 'Q57315',
      birth: '1489-01-01', death: '1525-05-27',
      desc: 'Prediger und radikaler Reformator. Müntzer verband apokalyptische Erwartung, Sozialkritik und Bauernkrieg; nach der Niederlage bei Frankenhausen wurde er 1525 hingerichtet.' },
    { id: 'ar12', type: 'person', name: 'Johann Tetzel', wd: 'Q432653',
      birth: '1465-01-01', death: '1519-08-11',
      desc: 'Dominikaner und Ablassprediger. Tetzel wurde in der protestantischen Erinnerung zur Gegenfigur Luthers; historisch steht er für die spätmittelalterliche Ablasspraxis, gegen die Luther argumentierte.' },
    { id: 'ar13', type: 'person', name: 'Lucas Cranach der Ältere', wd: 'Q191748',
      birth: '1472-10-04', death: '1553-10-16',
      desc: 'Maler, Grafiker und Hofmaler der sächsischen Kurfürsten. Cranachs Werkstatt machte Luther, Melanchthon und reformatorische Bildprogramme sichtbar und massenhaft reproduzierbar.' },
    { id: 'ar14', type: 'person', name: 'Johann Eck', wd: 'Q312373',
      birth: '1486-11-13', death: '1543-02-13',
      desc: 'Katholischer Theologe und profilierter Gegner Luthers. Die Leipziger Disputation mit Eck verschärfte den Konflikt um Papstautorität, Konzilien und kirchliche Tradition.' },
  ];
  for (const a of actors) {
    run('INSERT OR REPLACE INTO actor (id, module_id, type, name, wikidata_id, description, birth_date, death_date) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [a.id, modId, a.type, a.name, a.wd, a.desc, (a as any).birth ?? null, (a as any).death ?? null]);
  }

  // === Begriffe ===
  const concepts = [
    { id: 'cr01', kind: 'analytical', label: 'Reformation',
      desc: 'Analytischer Sammelbegriff für religiöse, politische, mediale und soziale Umbrüche des 16. Jahrhunderts. Die Reformation ist keine einheitliche Bewegung, sondern ein Geflecht lutherischer, reformierter, katholischer und radikalreformatorischer Antworten.' },
    { id: 'cr02', kind: 'analytical', label: 'Konfessionalisierung',
      desc: 'Modernes historiographisches Konzept, das die Herausbildung getrennter Konfessionskirchen (lutherisch, reformiert, katholisch) als parallelen Prozess der Staats- und Gesellschaftsbildung beschreibt.' },
    { id: 'cr03', kind: 'source', label: 'Sola scriptura',
      desc: 'Quellen- und Lehrbegriff: Die Heilige Schrift gilt als maßgebliche Norm theologischer Wahrheit. Umstritten blieb, wer Schrift verbindlich auslegt und welche Rolle Tradition, Konzilien und kirchliches Amt behalten.' },
    { id: 'cr04', kind: 'source', label: 'Reichsacht',
      desc: 'Quellenbegriff: rechtliches Instrument des Reichsrechts, durch das eine Person ihrer bürgerlichen Rechte beraubt wird – verhängt über Luther 1521.' },
    { id: 'cr05', kind: 'source', label: 'Ablass',
      desc: 'Zeitgenössischer Begriff für den kirchlichen Nachlass zeitlicher Sündenstrafen. Der Konflikt entzündete sich an Verkündigung, Finanzierung und Heilsversprechen der Ablasspraxis, nicht nur an „Geld gegen Vergebung".' },
    { id: 'cr06', kind: 'narrative', label: 'Stunde der Wahrheit',
      desc: 'Erinnerungsfigur des protestantischen Geschichtsbildes: Luthers Auftritt vor dem Reichstag zu Worms wird als Moment heroischer Standhaftigkeit überhöht. Forschung sieht das heute differenzierter.' },
    { id: 'cr07', kind: 'narrative', label: 'Lutherjahr',
      desc: 'Erinnerungsfigur: regelmäßige Jubiläen (1817, 1917, 2017) konstruieren Luther als deutschen Nationalhelden – mit jeweils unterschiedlichen politischen Zwecken.' },
    // P3.4: Neue Begriffe
    { id: 'cr08', kind: 'source', label: 'Sola fide',
      desc: 'Reformatorisches Prinzip „durch Glauben allein". Es richtet sich gegen die Vorstellung, Menschen könnten Heil durch eigene Verdienste sichern; daraus entstanden heftige Konflikte über Werke, Sakramente und kirchliche Vermittlung.' },
    { id: 'cr09', kind: 'source', label: 'Sola gratia',
      desc: 'Reformatorisches Prinzip „aus Gnade allein". Es betont Gottes Handeln als Grund des Heils und verschiebt religiöse Sicherheit weg von kirchlichen Leistungs- und Bußsystemen.' },
    { id: 'cr10', kind: 'source', label: 'Priestertum aller Gläubigen',
      desc: 'Reformatorische Idee, dass alle Getauften vor Gott geistlichen Rang besitzen. Das bedeutete nicht automatisch moderne Gleichheit, stellte aber die exklusive Vermittlungsrolle des Klerus in Frage.' },
  ];
  for (const c of concepts) {
    run('INSERT OR REPLACE INTO concept (id, module_id, kind, label, description) VALUES (?, ?, ?, ?, ?)',
      [c.id, modId, c.kind, c.label, c.desc]);
  }

  // === Verknüpfungen Ereignis ↔ Akteur/Begriff ===
  // Erweitert bestehende Ereignisse mit neuen Akteuren und Begriffen
  const links = [
    { eventId: 'e01', actors: [
        { id: 'ar01', role: 'Verfasser der Thesen' },
        { id: 'ar08', role: 'Adressat der Kritik' },
        { id: 'ar12', role: 'Gegenstand der Kritik (Ablassprediger)' },
        { id: 'ar13', role: 'künstlerische Dokumentation' }
      ],
      concepts: ['cr01', 'cr03', 'cr05', 'cr08', 'cr09'] },
    { eventId: 'e02', actors: [
        { id: 'ar01', role: 'Angeklagter' },
        { id: 'ar02', role: 'Reichsoberhaupt' },
        { id: 'ar14', role: 'Theologischer Gegner' }
      ],
      concepts: ['cr01', 'cr03', 'cr04', 'cr06', 'cr08', 'cr09', 'cr10'] },
    { eventId: 'e03', actors: [
        { id: 'ar01', role: 'Schutzbefohlener' },
        { id: 'ar03', role: 'Schutzherr' },
        { id: 'ar10', role: 'Verbündeter Reformator' },
        { id: 'ar13', role: 'dokumentiert auf der Wartburg' }
      ],
      concepts: ['cr01', 'cr03', 'cr08'] },
    { eventId: 'e04', actors: [
        { id: 'ar04', role: 'Verteidiger der Thesen' },
        { id: 'ar10', role: 'reformatorische Bewegung' }
      ],
      concepts: ['cr01', 'cr08', 'cr09', 'cr10'] },
    { eventId: 'e05', actors: [
        { id: 'ar01', role: 'Disputant' },
        { id: 'ar04', role: 'Disputant' }
      ],
      concepts: ['cr01', 'cr03', 'cr08', 'cr09', 'cr10'] },
    { eventId: 'e06', actors: [
        { id: 'ar06', role: 'Hauptverfasser' },
        { id: 'ar02', role: 'Adressat' },
        { id: 'ar01', role: 'inspiriert durch Thesen' }
      ],
      concepts: ['cr01', 'cr02', 'cr03', 'cr08', 'cr09'] },
    { eventId: 'e07', actors: [
        { id: 'ar05', role: 'Verfasser' },
        { id: 'ar06', role: 'zeitgenössischer Theologe' }
      ],
      concepts: ['cr01', 'cr02', 'cr08', 'cr09', 'cr10'] },
    { eventId: 'e08', actors: [
        { id: 'ar09', role: 'Akteure des Täuferreichs' },
        { id: 'ar11', role: 'Vorläufer und inspirierender Reformator' }
      ],
      concepts: ['cr01'] },
    { eventId: 'e09', actors: [
        { id: 'ar02', role: 'unterzeichnender Kaiser' },
        { id: 'ar04', role: 'reformierter Bezug' }
      ],
      concepts: ['cr01', 'cr02', 'cr04'] },
    { eventId: 'e10', actors: [
        { id: 'ar07', role: 'Reformator' },
        { id: 'ar04', role: 'Inspirationsquelle' },
        { id: 'ar01', role: 'Inspirationsquelle' }
      ],
      concepts: ['cr01', 'cr02'] },
  ];

  for (const link of links) {
    run('DELETE FROM event_actor WHERE event_id = ?', [link.eventId]);
    for (const a of link.actors) {
      run('INSERT OR REPLACE INTO event_actor (event_id, actor_id, role) VALUES (?, ?, ?)', [link.eventId, a.id, a.role]);
    }
    run('DELETE FROM event_concept WHERE event_id = ?', [link.eventId]);
    for (const cid of link.concepts) {
      run('INSERT OR REPLACE INTO event_concept (event_id, concept_id) VALUES (?, ?)', [link.eventId, cid]);
    }
  }

  flushSaveDb();
  console.log('Reformations-Modul erweitert: 14 Akteure, 10 Begriffe, 10 Ereignisse mit erweiterten Verknüpfungen.');
}

seed().catch(console.error);
