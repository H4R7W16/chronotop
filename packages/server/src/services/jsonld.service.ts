import * as moduleRepo from '../repositories/module.repo.js';
import * as eventRepo from '../repositories/ereignis.repo.js';
import * as annotationRepo from '../repositories/annotation.repo.js';
import type { LocalizedString } from '../../../shared/types.js';

/** Konvertiert LocalizedString in JSON-LD-konforme Darstellung (Sprachkennzeichnung). */
function toJsonLdValue(value: LocalizedString | undefined): any {
  if (!value) return undefined;
  if (typeof value === 'string') return value;
  const entries = Object.entries(value).filter(([, v]) => v);
  if (entries.length === 0) return undefined;
  if (entries.length === 1) return entries[0][1];
  return entries.map(([lang, val]) => ({ '@value': val, '@language': lang }));
}

export function buildJsonLd(moduleId: string): object | null {
  const mod = moduleRepo.findById(moduleId);
  if (!mod) return null;

  const events = eventRepo.findByModule(moduleId);
  const annotations = annotationRepo.findByModule(moduleId);

  return {
    '@context': {
      '@vocab': 'https://schema.org/',
      chronotop: 'https://chronotop.org/vocab/',
      oa: 'http://www.w3.org/ns/oa#',
      wikidata: 'http://www.wikidata.org/entity/',
      certainty: 'chronotop:certainty',
      followsEvent: 'chronotop:followsEvent',
      partOfEvent: 'chronotop:partOfEvent',
    },
    '@type': 'CreativeWork',
    '@id': `urn:chronotop:module:${mod.id}`,
    name: toJsonLdValue(mod.title),
    description: toJsonLdValue(mod.description),
    author: { '@type': 'Person', name: mod.authorName },
    version: mod.version,
    license: 'https://creativecommons.org/licenses/by-sa/4.0/',
    hasPart: events.map(event => {
      const eventLd: Record<string, any> = {
        '@type': 'Event',
        '@id': `urn:chronotop:event:${event.id}`,
        name: toJsonLdValue(event.title),
        description: toJsonLdValue(event.description),
      };

      if (event.place) {
        eventLd.location = {
          '@type': 'Place',
          '@id': `urn:chronotop:place:${event.place.id}`,
          name: toJsonLdValue(event.place.name),
          geo: {
            '@type': 'GeoCoordinates',
            latitude: event.place.lat,
            longitude: event.place.lng,
          },
          ...(event.place.wikidataId && {
            sameAs: `http://www.wikidata.org/entity/${event.place.wikidataId}`,
          }),
          ...(event.place.validFrom && { 'chronotop:validFrom': event.place.validFrom }),
          ...(event.place.validTo   && { 'chronotop:validTo':   event.place.validTo }),
          ...(event.place.certainty && event.place.certainty !== 'certain' && {
            'chronotop:certainty': event.place.certainty,
          }),
          ...(event.place.sourceOfClaim && {
            'chronotop:sourceOfClaim': `urn:chronotop:source:${event.place.sourceOfClaim}`,
          }),
        };
      }

      if (event.timeObject) {
        eventLd.temporal = {
          '@type': 'chronotop:TimeObject',
          '@id': `urn:chronotop:timeobject:${event.timeObject.id}`,
          name: toJsonLdValue(event.timeObject.label),
          certainty: event.timeObject.certainty,
          ...(event.timeObject.type === 'instant' && event.timeObject.date && {
            startDate: event.timeObject.date,
          }),
          ...(event.timeObject.type === 'span' && {
            startDate: event.timeObject.startDate,
            endDate: event.timeObject.endDate,
          }),
        };
      }

      if (event.sources && event.sources.length > 0) {
        eventLd.isBasedOn = event.sources.map(src => ({
          '@type': 'CreativeWork',
          '@id': `urn:chronotop:source:${src.id}`,
          name: toJsonLdValue(src.title),
          additionalType: src.type,
          license: src.license,
          ...(src.url && { url: src.url }),
          ...(src.iiifImageUrl && {
            encoding: { '@type': 'MediaObject', contentUrl: src.iiifImageUrl },
          }),
          ...(src.iiifManifestUrl && {
            associatedMedia: { '@type': 'MediaObject', contentUrl: src.iiifManifestUrl },
          }),
        }));
      }

      if (event.actors && event.actors.length > 0) {
        eventLd.participant = event.actors.map(({ actor, role, certainty: linkCert, sourceOfClaim: linkSrc }) => ({
          '@type': actor.type === 'person' ? 'Person' : actor.type === 'institution' ? 'Organization' : 'Audience',
          '@id': `urn:chronotop:actor:${actor.id}`,
          name: toJsonLdValue(actor.name),
          additionalType: actor.type,
          ...(role && { roleName: role }),
          ...(actor.wikidataId && { sameAs: `http://www.wikidata.org/entity/${actor.wikidataId}` }),
          ...(actor.birthDate && { birthDate: actor.birthDate }),
          ...(actor.deathDate && { deathDate: actor.deathDate }),
          ...(actor.certainty && actor.certainty !== 'certain' && {
            'chronotop:certainty': actor.certainty,
          }),
          ...(linkCert && linkCert !== 'certain' && {
            'chronotop:roleCertainty': linkCert,
          }),
          ...(linkSrc && {
            'chronotop:roleSourceOfClaim': `urn:chronotop:source:${linkSrc}`,
          }),
        }));
      }

      if (event.concepts && event.concepts.length > 0) {
        eventLd.about = event.concepts.map(c => ({
          '@type': 'DefinedTerm',
          '@id': `urn:chronotop:concept:${c.id}`,
          name: toJsonLdValue(c.label),
          additionalType: `chronotop:${c.kind}Concept`,
          ...(c.description && { description: toJsonLdValue(c.description) }),
          ...(c.wikidataId && { sameAs: `http://www.wikidata.org/entity/${c.wikidataId}` }),
        }));
      }

      if (event.followsId) eventLd.followsEvent = { '@id': `urn:chronotop:event:${event.followsId}` };
      if (event.partOfId) eventLd.partOfEvent = { '@id': `urn:chronotop:event:${event.partOfId}` };

      return eventLd;
    }),
    // W3C-Annotation-Schicht: interpretative Aussagen separat von den Fakten,
    // damit klar bleibt, was Beleg und was Deutung ist.
    'chronotop:annotations': annotations.map(a => ({
      '@type': 'oa:Annotation',
      '@id': `urn:chronotop:annotation:${a.id}`,
      'oa:motivatedBy': `oa:${a.motivation}`,
      'oa:hasBody': annotationBodyToLd(a.body),
      'oa:hasTarget': a.target.map(t => ({ '@id': `urn:chronotop:${t.kind}:${t.id}` })),
      ...(a.creator && { creator: { '@type': 'Person', name: a.creator } }),
      ...(a.createdAt && { 'dcterms:created': a.createdAt }),
      ...(a.certainty && a.certainty !== 'certain' && { 'chronotop:certainty': a.certainty }),
      ...(a.sourceOfClaim && { 'chronotop:sourceOfClaim': `urn:chronotop:source:${a.sourceOfClaim}` }),
    })),
  };
}

function annotationBodyToLd(body: any): any {
  if (body?.type === 'text') {
    return { type: 'TextualBody', value: body.value, format: body.format ?? 'text/plain' };
  }
  if (body?.type === 'concept') {
    return { '@id': `urn:chronotop:concept:${body.conceptId}` };
  }
  if (body?.type === 'tag') {
    return { type: 'TextualBody', value: body.value, purpose: 'tagging' };
  }
  return body;
}
