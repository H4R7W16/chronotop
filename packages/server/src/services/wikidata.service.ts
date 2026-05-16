/**
 * Wikidata-Suche für Orte UND Akteure (Personen, Organisationen, Gruppen).
 *
 * Erweitert die einfache Suche um typenspezifische Felder:
 *   - Orte:        Koordinaten (P625)
 *   - Personen:    Geburts-/Sterbedatum (P569/P570), Wikipedia-Bild (P18)
 *   - Allgemein:   Klassifikation über P31 (instance of)
 */

export type WikidataEntityKind = 'place' | 'person' | 'organization' | 'group' | 'concept' | 'unknown';

export interface WikidataSearchResult {
  id: string;
  label: string;
  description?: string;
  kind: WikidataEntityKind;
  // Place
  lat?: number;
  lng?: number;
  // Person
  birthDate?: string;
  deathDate?: string;
  // Bild (Wikimedia Commons-Dateiname)
  image?: string;
}

// Wikidata-Items, die als Person/Organisation/Gruppe gelten (vereinfachte Heuristik)
const PERSON_QIDS = new Set([
  'Q5',          // human
  'Q15632617',   // fictional human
]);
const ORGANIZATION_QIDS = new Set([
  'Q43229',      // organization
  'Q4830453',    // business
  'Q163740',     // nonprofit organization
  'Q6256',       // country (auch politisch)
  'Q7188',       // government
  'Q11424',      // film – false
  'Q4022',       // river – place
]);
const GROUP_QIDS = new Set([
  'Q874405',     // social group
  'Q16334295',   // group of humans
  'Q41710',      // ethnic group
  'Q7278',       // political party
  'Q13414953',   // religious group
]);
const PLACE_QIDS = new Set([
  'Q486972',     // human settlement
  'Q515',        // city
  'Q3957',       // town
  'Q532',        // village
  'Q3624078',    // sovereign state
  'Q6256',       // country
  'Q23397',      // lake
  'Q4022',       // river
  'Q23442',      // island
  'Q8502',       // mountain
  'Q5107',       // continent
  'Q82794',      // geographic region
  'Q39816',      // valley
]);

function classify(p31Values: string[]): WikidataEntityKind {
  for (const v of p31Values) {
    if (PERSON_QIDS.has(v)) return 'person';
    if (ORGANIZATION_QIDS.has(v)) return 'organization';
    if (GROUP_QIDS.has(v)) return 'group';
    if (PLACE_QIDS.has(v)) return 'place';
  }
  return 'unknown';
}

// Konvertiert Wikidata-Datum (z.B. "+1483-11-10T00:00:00Z") zu ISO-Date
function parseWikidataDate(value: any): string | undefined {
  if (!value?.time) return undefined;
  // Format: +YYYY-MM-DDTHH:MM:SSZ (auch -YYYY für vor Christus)
  const m = value.time.match(/^([+-]?\d{4,})-(\d{2})-(\d{2})T/);
  if (!m) return undefined;
  let year = m[1];
  // Wikidata speichert oft Tag/Monat = 00 für unbekannt; reduziere dann auf YYYY
  const month = m[2];
  const day = m[3];
  if (month === '00' || day === '00') {
    return year.startsWith('+') ? year.slice(1) : year;
  }
  return year.startsWith('+') ? `${year.slice(1)}-${month}-${day}` : `${year}-${month}-${day}`;
}

export async function searchWikidata(query: string, lang: string = 'de'): Promise<WikidataSearchResult[]> {
  // Step 1: Suche
  const searchUrl = `https://www.wikidata.org/w/api.php?action=wbsearchentities&search=${encodeURIComponent(query)}&language=${lang}&limit=10&format=json&origin=*`;
  const searchRes = await fetch(searchUrl);
  const searchData = await searchRes.json();
  if (!searchData.search || searchData.search.length === 0) return [];

  // Step 2: Details (claims für relevante Properties)
  const ids = searchData.search.map((r: any) => r.id).join('|');
  const detailUrl = `https://www.wikidata.org/w/api.php?action=wbgetentities&ids=${ids}&props=claims&format=json&origin=*`;
  const detailRes = await fetch(detailUrl);
  const detailData = await detailRes.json();

  return searchData.search.map((result: any) => {
    const entry: WikidataSearchResult = {
      id: result.id,
      label: result.label,
      description: result.description,
      kind: 'unknown',
    };

    const entity = detailData.entities?.[result.id];
    const claims = entity?.claims ?? {};

    // P31: instance of → Klassifikation
    const p31Values: string[] = (claims.P31 ?? [])
      .map((c: any) => c.mainsnak?.datavalue?.value?.id)
      .filter(Boolean);
    entry.kind = classify(p31Values);

    // P625: Koordinaten (Orte)
    const p625 = claims.P625?.[0]?.mainsnak?.datavalue?.value;
    if (p625) {
      entry.lat = p625.latitude;
      entry.lng = p625.longitude;
      if (entry.kind === 'unknown') entry.kind = 'place';
    }

    // P569: Geburtsdatum (Personen)
    const p569 = claims.P569?.[0]?.mainsnak?.datavalue?.value;
    if (p569) entry.birthDate = parseWikidataDate(p569);

    // P570: Sterbedatum (Personen)
    const p570 = claims.P570?.[0]?.mainsnak?.datavalue?.value;
    if (p570) entry.deathDate = parseWikidataDate(p570);

    // P18: Bild (Wikimedia Commons-Dateiname)
    const p18 = claims.P18?.[0]?.mainsnak?.datavalue?.value;
    if (typeof p18 === 'string') entry.image = p18;

    // Kind-Heuristik: wenn Personen-Daten da sind, ist es eine Person
    if (entry.kind === 'unknown' && (entry.birthDate || entry.deathDate)) entry.kind = 'person';

    return entry;
  });
}
