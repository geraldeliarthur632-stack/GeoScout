
import React, { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap, Circle, Polygon, useMapEvents, Polyline } from 'react-leaflet';
import L from 'leaflet';
import { Coordinate } from '../types';

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
  html: `<div class="relative flex items-center justify-center w-8 h-8">
          <span class="absolute inline-flex w-full h-full rounded-full bg-cyan-400 opacity-75 animate-ping"></span>
          <span class="relative inline-flex rounded-full h-4 w-4 bg-cyan-500 border-2 border-white shadow-[0_0_10px_#06b6d4]"></span>
         </div>`,
  iconSize: [32, 32],
  iconAnchor: [16, 16]
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
  onMarkerDragEnd: (newCoords: Coordinate) => void;
  isScanning: boolean;
  polygonPoints: Coordinate[];
  onMapClick: (coords: Coordinate) => void;
}

const MapController: React.FC<{ center: Coordinate; zoom: number }> = ({ center, zoom }) => {
  const map = useMap();
  
  useEffect(() => {
    if (center && !isNaN(center.lat) && !isNaN(center.lng)) {
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
      if (e.latlng && !isNaN(e.latlng.lat) && !isNaN(e.latlng.lng)) {
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
  onMarkerDragEnd, 
  isScanning,
  polygonPoints,
  onMapClick
}) => {
  const defaultCenter: [number, number] = [-23.5505, -46.6333];
  
  const safeCenter: [number, number] = 
    (center && !isNaN(center.lat) && !isNaN(center.lng)) 
      ? [center.lat, center.lng] 
      : defaultCenter;

  const safeMarker: [number, number] | null = 
    (markerPosition && !isNaN(markerPosition.lat) && !isNaN(markerPosition.lng))
      ? [markerPosition.lat, markerPosition.lng]
      : null;

  // Filtragem defensiva para evitar o erro "Invalid LatLng object: (NaN, NaN)"
  const polyCoords: [number, number][] = polygonPoints
    .filter(p => p && !isNaN(p.lat) && !isNaN(p.lng))
    .map(p => [p.lat, p.lng]);

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

        {/* Polígono de Área */}
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

        {/* Marcadores dos vértices do polígono */}
        {polyCoords.map((p, idx) => (
          <Marker 
            key={`${idx}-${p[0]}-${p[1]}`} 
            position={p} 
            icon={PointIcon}
            interactive={false}
          />
        ))}

        {/* Marcador da Base GPS */}
        {safeMarker && (
          <Marker 
            position={safeMarker} 
            icon={BaseStationIcon}
            draggable={!isScanning}
            eventHandlers={{
              dragend: (e) => {
                const marker = e.target;
                const position = marker.getLatLng();
                if (position && !isNaN(position.lat) && !isNaN(position.lng)) {
                  onMarkerDragEnd({ lat: position.lat, lng: position.lng });
                }
              }
            }}
          >
            <Popup className="tech-popup" closeButton={false} autoPan={false}>
              <div className="text-slate-900 font-bold px-2 py-1 text-center font-mono text-[10px] tracking-widest bg-cyan-400 rounded-sm">
                BASE GPS
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

      {/* Mira Central Decorativa */}
      <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 pointer-events-none z-[400] opacity-50 mix-blend-screen">
        <svg width="100" height="100" viewBox="0 0 100 100" fill="none">
          <circle cx="50" cy="50" r="40" stroke="#06b6d4" strokeWidth="0.5" strokeDasharray="2 4"/>
          <line x1="50" y1="0" x2="50" y2="20" stroke="#06b6d4" strokeWidth="1"/>
          <line x1="50" y1="80" x2="50" y2="100" stroke="#06b6d4" strokeWidth="1"/>
          <line x1="0" y1="50" x2="20" y2="50" stroke="#06b6d4" strokeWidth="1"/>
          <line x1="80" y1="50" x2="100" y2="50" stroke="#06b6d4" strokeWidth="1"/>
        </svg>
      </div>
    </div>
  );
};

export default MapViewer;
