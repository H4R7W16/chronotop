import { useEffect, useRef } from 'react';
import OpenSeadragon from 'openseadragon';

interface IiifViewerProps {
  imageUrl?: string;
  manifestUrl?: string;
}

export function IiifViewer({ imageUrl, manifestUrl }: IiifViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const viewerRef = useRef<any | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    // Determine tile source
    let tileSources: any;
    if (imageUrl) {
      // IIIF Image API info.json
      tileSources = imageUrl.endsWith('/info.json') ? imageUrl : `${imageUrl}/info.json`;
    } else if (manifestUrl) {
      tileSources = manifestUrl;
    } else {
      return;
    }

    viewerRef.current = OpenSeadragon({
      element: containerRef.current,
      tileSources,
      prefixUrl: '',
      showNavigationControl: true,
      navigationControlAnchor: OpenSeadragon.ControlAnchor.TOP_LEFT,
    });

    return () => {
      viewerRef.current?.destroy();
      viewerRef.current = null;
    };
  }, [imageUrl, manifestUrl]);

  if (!imageUrl && !manifestUrl) return null;

  return (
    <div className="border border-slate-200 rounded overflow-hidden">
      <div ref={containerRef} className="w-full h-64 bg-black" />
    </div>
  );
}
