import { useTranslation } from 'react-i18next';
import { useLocalized } from '../../i18n/useLocalized.js';
import type { Source } from '@chronotop/shared';

interface QuelleCardProps {
  source: Source;
  onViewIiif?: (source: Source) => void;
}

const typeIcons: Record<string, string> = {
  text: '📄', image: '🖼', map: '🗺', statistics: '📊',
  law: '⚖', speech: '🎤', object: '🏛', audio: '🎵', video: '🎬',
};

// IIIF-Thumbnail bauen, falls möglich (aus Image-API)
function getThumbnailUrl(source: Source): string | null {
  if (source.iiifImageUrl) {
    const base = source.iiifImageUrl.replace(/\/info\.json$/, '').replace(/\/$/, '');
    return `${base}/full/!200,200/0/default.jpg`;
  }
  return null;
}

export function QuelleCard({ source, onViewIiif }: QuelleCardProps) {
  const { t } = useTranslation();
  const loc = useLocalized();
  const thumb = getThumbnailUrl(source);
  const hasViewable = !!(source.iiifImageUrl || source.iiifManifestUrl);

  return (
    <article className="bg-parchment-50 rounded-md border border-parchment-200 overflow-hidden hover:border-burgundy-200 hover:shadow-sm transition-all">
      <div className="flex gap-3 p-3">
        {/* Thumbnail oder Icon */}
        {thumb ? (
          <img
            src={thumb}
            alt={loc(source.title)}
            className="w-16 h-16 object-cover rounded shrink-0 border border-parchment-300 cursor-pointer"
            onClick={() => onViewIiif?.(source)}
            loading="lazy"
          />
        ) : (
          <div className="w-16 h-16 rounded bg-white border border-parchment-300 flex items-center justify-center shrink-0 text-2xl"
            aria-hidden="true">
            {typeIcons[source.type] || '📎'}
          </div>
        )}

        {/* Info */}
        <div className="flex-1 min-w-0">
          <h4 className="font-serif font-semibold text-ink-700 leading-tight text-[15px]">
            {loc(source.title)}
          </h4>
          <div className="flex flex-wrap gap-1.5 mt-1.5 text-[11px]">
            <span className="px-1.5 py-0.5 bg-verdigris-50 text-verdigris-600 rounded">
              {t(`source.types.${source.type}`)}
            </span>
            <span className="px-1.5 py-0.5 bg-parchment-200 text-ink-500 rounded font-mono">
              {source.license}
            </span>
          </div>
          {loc(source.description) && (
            <p className="text-ink-500 text-xs mt-2 leading-relaxed line-clamp-2">
              {loc(source.description)}
            </p>
          )}
          <div className="flex gap-3 mt-2 text-xs">
            {source.url && (
              <a href={source.url} target="_blank" rel="noopener noreferrer"
                className="text-burgundy-600 hover:underline">
                ↗ Externe Quelle
              </a>
            )}
            {hasViewable && onViewIiif && (
              <button onClick={() => onViewIiif(source)}
                className="text-burgundy-600 hover:underline">
                🔍 IIIF-Viewer
              </button>
            )}
          </div>
        </div>
      </div>
    </article>
  );
}
