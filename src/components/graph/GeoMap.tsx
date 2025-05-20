"use client";

import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import { useEffect, useState } from "react";
import L from "leaflet";

interface GraphNode {
  id: string;
  label?: string;
  type?: string;
  icon?: string;
  latitude: number;
  longitude: number;
}

const boundingBoxes = [
  { lat: [24.396308, 49.384358], lon: [-125, -66.93457] }, // US
  { lat: [36, 71], lon: [-10, 40] }, // EU
  { lat: [-35, 37], lon: [-17, 51] }, // Africa
];

function randomCoords() {
  const box = boundingBoxes[Math.floor(Math.random() * boundingBoxes.length)];
  const lat = box.lat[0] + Math.random() * (box.lat[1] - box.lat[0]);
  const lon = box.lon[0] + Math.random() * (box.lon[1] - box.lon[0]);
  return { latitude: lat, longitude: lon };
}

export default function GeoMap() {
  const [nodes, setNodes] = useState<GraphNode[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await fetch("/api/graph-data?all=true");
        if (!res.ok) throw new Error("Failed to fetch graph data");
        const data = await res.json();

        const rawNodes = Array.isArray(data.elements)
          ? data.elements.filter((el: any) => el.group === "nodes")
          : [];

        const mapped: GraphNode[] = rawNodes.map((n: any) => {
          const lat = parseFloat(n.data?.latitude ?? n.data?.lat);
          const lon = parseFloat(n.data?.longitude ?? n.data?.lon);
          const type = n.data?.type as string | undefined;
          const icon = `/icons/${type ? type.toLowerCase() : 'unknown'}.png`;
          if (isNaN(lat) || isNaN(lon)) {
            const coords = randomCoords();
            return { id: String(n.data?.id), label: n.data?.label, type, icon, ...coords };
          }
          return { id: String(n.data?.id), label: n.data?.label, type, icon, latitude: lat, longitude: lon };
        });

        setNodes(mapped);
      } catch (err) {
        console.error("GeoMap fetch error", err);
      }
    };

    fetchData();
  }, []);

  return (
    <MapContainer center={[20, 0]} zoom={2} style={{ height: "600px", width: "100%" }}>
      <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
      {nodes.map((n) => {
        const icon = L.icon({
          iconUrl: n.icon || '/icons/unknown.png',
          iconSize: [24, 24],
          iconAnchor: [12, 24],
          popupAnchor: [0, -24],
        });
        return (
          <Marker key={n.id} position={[n.latitude, n.longitude]} icon={icon}>
            <Popup>{n.label || n.id}</Popup>
          </Marker>
        );
      })}
    </MapContainer>
  );
}
