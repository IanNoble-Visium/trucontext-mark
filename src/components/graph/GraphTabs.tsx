"use client";
import { useState } from "react";
import GraphVisualization from "./GraphVisualization";
import GeoMap from "./GeoMap";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

interface GraphTabsProps {
  startTime: number;
  endTime: number;
  onDataRangeChange?: (min: number, max: number) => void;
}

export default function GraphTabs({ startTime, endTime, onDataRangeChange }: GraphTabsProps) {
  const [view, setView] = useState<string>("graph");
  return (
    <Tabs value={view} onValueChange={setView} className="w-full">
      <TabsList>
        <TabsTrigger value="graph">Graph</TabsTrigger>
        <TabsTrigger value="map">Geo Map</TabsTrigger>
      </TabsList>
      <TabsContent value="graph">
        <GraphVisualization startTime={startTime} endTime={endTime} onDataRangeChange={onDataRangeChange} />
      </TabsContent>
      <TabsContent value="map">
        <GeoMap />
      </TabsContent>
    </Tabs>
  );
}
