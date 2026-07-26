import React, { useRef, useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import { WebView } from 'react-native-webview';

interface LeafletMapViewProps {
  targetLat: number;
  targetLng: number;
  techLat?: number;
  techLng?: number;
  techHeading?: number;
  serviceTitle?: string;
  techName?: string;
}

export default function LeafletMapView({
  targetLat,
  targetLng,
  techLat,
  techLng,
  techHeading = 0,
  serviceTitle = 'Service Location',
  techName = 'Technician',
}: LeafletMapViewProps) {
  const webViewRef = useRef<WebView>(null);

  const initialTechLat = techLat ?? targetLat;
  const initialTechLng = techLng ?? targetLng;

  const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <style>
    * {
      touch-action: manipulation;
      -webkit-tap-highlight-color: transparent;
      user-select: none;
    }
    html, body, #map {
      width: 100%;
      height: 100%;
      margin: 0;
      padding: 0;
      background-color: #f1f5f9;
      overflow: hidden;
    }
    .leaflet-control-attribution { display: none !important; }
    .home-pin {
      background: linear-gradient(135deg, #6d28d9, #4c1d95);
      border: 3px solid #ffffff;
      border-radius: 50%;
      width: 40px;
      height: 40px;
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 6px 12px rgba(109, 40, 217, 0.4);
      color: white;
      font-size: 20px;
    }
    .tech-pin {
      background: linear-gradient(135deg, #3b82f6, #1d4ed8);
      border: 3px solid #ffffff;
      border-radius: 50%;
      width: 44px;
      height: 44px;
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 6px 16px rgba(29, 78, 216, 0.5);
      color: white;
      font-size: 22px;
      transition: transform 0.3s ease-out;
    }
  </style>
</head>
<body>
  <div id="map"></div>
  <script>
    // Initialize map with high performance touch handling
    var map = L.map('map', {
      zoomControl: true,
      fadeAnimation: true,
      zoomAnimation: true,
      markerZoomAnimation: true,
      touchZoom: true,
      dragging: true,
      doubleClickZoom: true
    }).setView([${initialTechLat}, ${initialTechLng}], 15);
    
    // High Definition, Crisp Vector-Style Tile Layer (CartoDB Voyager)
    L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
      maxZoom: 20,
      maxNativeZoom: 19,
      subdomains: 'abcd',
      tileSize: 256,
      zoomOffset: 0
    }).addTo(map);

    // Custom Home Pin Icon
    var homeIcon = L.divIcon({
      className: 'custom-home-icon',
      html: '<div class="home-pin">🏠</div>',
      iconSize: [40, 40],
      iconAnchor: [20, 20]
    });

    // Custom Vehicle Pin Icon
    var techIcon = L.divIcon({
      className: 'custom-tech-icon',
      html: '<div id="tech-marker-inner" class="tech-pin">🚗</div>',
      iconSize: [44, 44],
      iconAnchor: [22, 22]
    });

    var homeMarker = L.marker([${targetLat}, ${targetLng}], { icon: homeIcon }).addTo(map)
      .bindPopup("<b>${serviceTitle.replace(/"/g, '\\"')}</b><br>Service Destination");

    var techMarker = null;
    var routePolyline = null;

    function drawRoute(tLat, tLng) {
      var coords = [[tLat, tLng], [${targetLat}, ${targetLng}]];
      if (!routePolyline) {
        routePolyline = L.polyline(coords, {
          color: '#6d28d9',
          weight: 4,
          opacity: 0.8,
          dashArray: '8, 8',
          lineCap: 'round'
        }).addTo(map);
      } else {
        routePolyline.setLatLngs(coords);
      }
    }

    ${techLat !== undefined && techLng !== undefined ? `
      techMarker = L.marker([${techLat}, ${techLng}], { icon: techIcon }).addTo(map)
        .bindPopup("<b>${techName.replace(/"/g, '\\"')}</b><br>Live Technician");
      drawRoute(${techLat}, ${techLng});
    ` : ''}

    // Auto-fit bounds
    if (techMarker) {
      var group = new L.featureGroup([homeMarker, techMarker]);
      map.fitBounds(group.getBounds().pad(0.25));
    }

    // Real-time location & marker rotation update
    window.addEventListener('message', function(event) {
      try {
        var data = JSON.parse(event.data);
        if (data.type === 'UPDATE_LOCATION' && data.lat && data.lng) {
          if (!techMarker) {
            techMarker = L.marker([data.lat, data.lng], { icon: techIcon }).addTo(map)
              .bindPopup("<b>${techName.replace(/"/g, '\\"')}</b><br>Live Technician");
          } else {
            techMarker.setLatLng([data.lat, data.lng]);
          }
          if (data.heading !== undefined) {
            var el = document.getElementById('tech-marker-inner');
            if (el) el.style.transform = 'rotate(' + data.heading + 'deg)';
          }
          drawRoute(data.lat, data.lng);
        }
      } catch(e) {}
    });
  </script>
</body>
</html>
  `;

  useEffect(() => {
    if (techLat !== undefined && techLng !== undefined && webViewRef.current) {
      const message = JSON.stringify({
        type: 'UPDATE_LOCATION',
        lat: techLat,
        lng: techLng,
        heading: techHeading,
      });
      webViewRef.current.postMessage(message);
    }
  }, [techLat, techLng, techHeading]);

  return (
    <View style={styles.container}>
      <WebView
        ref={webViewRef as any}
        originWhitelist={['*']}
        source={{ html: htmlContent }}
        style={styles.webview as any}
        javaScriptEnabled={true}
        domStorageEnabled={true}
        scrollEnabled={true}
        scalesPageToFit={false}
        showsVerticalScrollIndicator={false}
        showsHorizontalScrollIndicator={false}
        bounces={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
  },
  webview: {
    flex: 1,
    backgroundColor: '#f1f5f9',
  },
});
