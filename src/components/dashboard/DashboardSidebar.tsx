"use client";

import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import DatasetUploader from "@/components/dashboard/DatasetUploader";
import TimeSlider from "@/components/dashboard/TimeSlider";
import AlertsList from "@/components/dashboard/AlertsList";
import RiskList from "@/components/dashboard/RiskList";
import { useTimeline } from "@/contexts/TimelineContext";

const DashboardSidebar = () => {
  const { minTimestamp, maxTimestamp, handleTimeRangeChange } = useTimeline();

  return (
    <Accordion type="multiple" className="w-full space-y-2 p-2">
      <AccordionItem value="dataset">
        <AccordionTrigger>Dataset Management</AccordionTrigger>
        <AccordionContent>
          <DatasetUploader />
        </AccordionContent>
      </AccordionItem>
      <AccordionItem value="timeline">
        <AccordionTrigger>Timeline View</AccordionTrigger>
        <AccordionContent>
          <TimeSlider
            minTimestamp={minTimestamp}
            maxTimestamp={maxTimestamp}
            onTimeRangeChange={handleTimeRangeChange}
          />
        </AccordionContent>
      </AccordionItem>
      <AccordionItem value="alerts">
        <AccordionTrigger>Automated Alerts</AccordionTrigger>
        <AccordionContent>
          <AlertsList />
        </AccordionContent>
      </AccordionItem>
      <AccordionItem value="risk">
        <AccordionTrigger>Risk Prioritization</AccordionTrigger>
        <AccordionContent>
          <RiskList />
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  );
};

export default DashboardSidebar;
