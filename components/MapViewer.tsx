import React, { useEffect, useMemo, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap, Circle, Polygon, useMapEvents, Polyline } from 'react-leaflet';
import L from 'leaflet';
import { Coordinate } from '../types';
import { Copy, Check, Navigation } from 'lucide-react';

const fixLeafletIcons = () => {
  try {
    delete (L.Icon.Default.prototype as any)._getIconUrl;
    L.Icon.Default.mergeOptions({
      iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
      iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
      shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
    });
  } catch (e) {
    console.warn("Leaflet icon fix failed", e);
  }
};
fixLeafletIcons();

const BaseStationIcon = L.divIcon({
  className: 'custom-div-icon',
  html: `<div class="marker-container relative flex items-center justify-center w-8 h-8 transition-transform">
          <span class="absolute inline-flex w-full h-full rounded-full bg-cyan-400 opacity-75 animate-ping"></span>
          <span class="relative inline-flex rounded-full h-4 w-4 bg-cyan-500 border-2 border-white shadow-[0_0_10px_#06b6d4]"></span>
         </div>`,
  iconSize: [32, 32],
  iconAnchor: [16, 16]
});

const UserLocationIcon = L.divIcon({
  className: 'user-location-icon',
  html: `<div class="relative flex items-center justify-center w-6 h-6">
          <span class="absolute inline-flex w-full h-full rounded-full bg-blue-500 opacity-40 animate-pulse"></span>
          <span class="relative inline-flex rounded-full h-3 w-3 bg-blue-600 border-2 border-white"></span>
         </div>`,
  iconSize: [24, 24],
  iconAnchor: [12, 12]
});

const PointIcon = L.divIcon({
  className: 'point-icon',
  html: `<div class="w-2 h-2 bg-cyan-400 rounded-full border border-white shadow-sm"></div>`,
  iconSize: [8, 8],
  iconAnchor: [4, 4]
});

interface MapViewerProps {
  center: Coordinate;
  zoom: number;
  markerPosition: Coordinate | null;
  userPosition: Coordinate | null;
  onMarkerDragEnd: (newCoords: Coordinate) => void;
  isScanning: boolean;
  polygonPoints: Coordinate[];
  onMapClick: (coords: Coordinate) => void;
  onStartNavigation?: (dest: Coordinate) => void;
}

const isValidCoord = (c: any): c is Coordinate => 
  c && typeof c.lat === 'number' && typeof c.lng === 'number' && Number.isFinite(c.lat) && Number.isFinite(c.lng);

const MapController: React.FC<{ center: Coordinate; zoom: number }> = ({ center, zoom }) => {
  const map = useMap();
  
  useEffect(() => {
    setTimeout(() => {
        map.invalidateSize();
    }, 500);
  }, [map]);

  useEffect(() => {
    if (isValidCoord(center)) {
      map.flyTo([center.lat, center.lng], zoom, {
        duration: 1.5,
        animate: true
      });
    }
  }, [center, zoom, map]);

  return null;
};

const MapEventsHandler: React.FC<{ onClick: (coords: Coordinate) => void }> = ({ onClick }) => {
  useMapEvents({
    click(e) {
      if (e.latlng && Number.isFinite(e.latlng.lat) && Number.isFinite(e.latlng.lng)) {
        onClick({ lat: e.latlng.lat, lng: e.latlng.lng });
      }
    }
  });
  return null;
};

const MapViewer: React.FC<MapViewerProps> = ({ 
  center, 
  zoom, 
  markerPosition, 
  userPosition,
  onMarkerDragEnd, 
  isScanning,
  polygonPoints,
  onMapClick,
  onStartNavigation
}) => {
  const [copied, setCopied] = useState(false);
  const defaultCenter: [number, number] = [-23.5505, -46.6333];
  
  const safeCenter = useMemo((): [number, number] => 
    isValidCoord(center) ? [center.lat, center.lng] : defaultCenter, 
  [center]);

  const safeMarker = useMemo((): [number, number] | null => 
    isValidCoord(markerPosition) ? [markerPosition.lat, markerPosition.lng] : null,
  [markerPosition]);

  const safeUser = useMemo((): [number, number] | null => 
    isValidCoord(userPosition) ? [userPosition.lat, userPosition.lng] : null,
  [userPosition]);

  const polyCoords = useMemo((): [number, number][] => 
    polygonPoints
      .filter(p => isValidCoord(p))
      .map(p => [p.lat, p.lng]),
  [polygonPoints]);

  const handleCopy = (coords: Coordinate) => {
    const text = `${coords.lat.toFixed(7)}, ${coords.lng.toFixed(7)}`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="relative w-full h-full z-0 bg-black">
      <MapContainer 
        center={safeCenter} 
        zoom={zoom} 
        scrollWheelZoom={true} 
        className="w-full h-full"
        zoomControl={false}
      >
        <TileLayer
          attribution='&copy; Esri World Imagery'
          url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
          maxNativeZoom={17}
          maxZoom={19}
        />
        <TileLayer
             attribution='Rótulos'
             url="https://{s}.basemaps.cartocdn.com/light_only_labels/{z}/{x}/{y}{r}.png"
             opacity={0.6}
             zIndex={10}
        />

        <MapController center={center} zoom={zoom} />
        <MapEventsHandler onClick={onMapClick} />

        {polyCoords.length >= 3 ? (
          <Polygon 
            positions={polyCoords}
            pathOptions={{
              color: '#22d3ee',
              fillColor: '#06b6d4',
              fillOpacity: 0.2,
              weight: 3,
              dashArray: '5, 10'
            }}
          />
        ) : polyCoords.length > 1 ? (
          <Polyline 
            positions={polyCoords}
            pathOptions={{ color: '#06b6d4', weight: 2, dashArray: '5, 10' }}
          />
        ) : null}

        {polyCoords.map((p, idx) => (
          <Marker 
            key={`${idx}-${p[0]}-${p[1]}`} 
            position={p} 
            icon={PointIcon}
            interactive={false}
          />
        ))}

        {safeUser && (
          <Marker position={safeUser} icon={UserLocationIcon} interactive={false} />
        )}

        {safeMarker && (
          <Marker 
            position={safeMarker} 
            icon={BaseStationIcon}
            draggable={!isScanning}
            eventHandlers={{
              click: (e) => {
                const el = e.target.getElement();
                if (el) {
                  el.classList.remove('animate-marker-bounce');
                  void el.offsetWidth;
                  el.classList.add('animate-marker-bounce');
                }
              },
              dragend: (e) => {
                const marker = e.target;
                const position = marker.getLatLng();
                if (position && Number.isFinite(position.lat) && Number.isFinite(position.lng)) {
                  onMarkerDragEnd({ lat: position.lat, lng: position.lng });
                }
              }
            }}
          >
            <Popup className="base-tech-popup">
              <div className="bg-slate-900 text-white p-3 rounded-xl border border-cyan-500/50 min-w-[220px] shadow-2xl font-mono">
                <div className="flex items-center gap-2 mb-2 text-cyan-400 border-b border-cyan-900 pb-2">
                   <div className="w-2 h-2 rounded-full bg-cyan-500 animate-pulse"></div>
                   <span className="text-[10px] font-black tracking-widest uppercase">Base Selecionada</span>
                </div>
                
                <div className="bg-black/40 p-2 rounded border border-slate-800 mb-3 text-center">
                  <div className="text-xs text-cyan-100 select-all tracking-tighter">
                    {markerPosition?.lat.toFixed(7)}, {markerPosition?.lng.toFixed(7)}
                  </div>
                </div>

                <div className="flex flex-col gap-2">
                  <button 
                    onClick={() => markerPosition && onStartNavigation?.(markerPosition)}
                    className="w-full flex items-center justify-center gap-2 py-2 rounded-lg text-[10px] font-bold uppercase tracking-wider bg-emerald-600 hover:bg-emerald-500 text-white transition-all active:scale-95"
                  >
                    <Navigation className="w-3.5 h-3.5" />
                    ABRIR GOOGLE MAPS
                  </button>

                  <button 
                    onClick={() => markerPosition && handleCopy(markerPosition)}
                    className={`w-full flex items-center justify-center gap-2 py-2 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all active:scale-95 ${copied ? 'bg-slate-700 text-white' : 'bg-slate-800 hover:bg-slate-700 text-slate-300'}`}
                  >
                    {copied ? (
                      <><Check className="w-3 h-3" /> Copiado!</>
                    ) : (
                      <><Copy className="w-3 h-3" /> Copiar Coordenada</>
                    )}
                  </button>
                </div>
              </div>
            </Popup>
          </Marker>
        )}

        {safeMarker && (
            <Circle 
                center={safeMarker}
                radius={100} 
                pathOptions={{ 
                  color: '#06b6d4', 
                  fillColor: '#06b6d4', 
                  fillOpacity: 0.05, 
                  weight: 1,
                  dashArray: '4, 8'
                }}
            />
        )}
      </MapContainer>
    </div>
  );
};

export default MapViewer;
