"use client";

import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";

const chartConfig = {
  desktop: {
    label: "Desktop",
    color: "#2563eb",
  },
  mobile: {
    label: "Mobile",
    color: "#60a5fa",
  },
  tablet: {
    label: "Tablet",
    color: "var(--chart-1)", //#b0d0f7
  },
} satisfies ChartConfig;

const chartData = [
  { month: "January", desktop: 186, mobile: 80, tablet: 10 },
  { month: "February", desktop: 305, mobile: 200, tablet: 20 },
  { month: "March", desktop: 237, mobile: 120, tablet: 300 },
  { month: "April", desktop: 73, mobile: 190, tablet: 0 },
  { month: "May", desktop: 209, mobile: 130, tablet: 45 },
  { month: "June", desktop: 214, mobile: 140, tablet: 32 },
];

function AppBarChart() {
  return (
    <div className="">
      <h1 className="mb-[10] text-lg font-medium ">Total Revenue</h1>
      <p className="text-xs mb-6 text-gray-400">January - June 2024</p>

      <ChartContainer config={chartConfig} className="min-h-[200px] w-full">
        <BarChart accessibilityLayer data={chartData}>
          <CartesianGrid vertical={false} />
          <XAxis
            dataKey="month"
            tickLine={false}
            tickMargin={10}
            axisLine={false}
            tickFormatter={(value) => value.slice(0, 3)}
          />
          <YAxis tickLine={false} tickMargin={10} axisLine={false} />
          <ChartTooltip
            cursor={false}
            content={<ChartTooltipContent indicator="dot" />}
          />
          <ChartLegend content={<ChartLegendContent />} />
          <Bar dataKey="desktop" fill="var(--color-desktop)" radius={4} />
          <Bar dataKey="mobile" fill="var(--color-mobile)" radius={4} />
          <Bar dataKey="tablet" fill="var(--color-tablet)" radius={4} />
        </BarChart>
      </ChartContainer>
    </div>
  );
}

export default AppBarChart;
