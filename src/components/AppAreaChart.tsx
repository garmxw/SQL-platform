"use client";

import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "./ui/chart";
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts";

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
    color: "#b0d0f7", //#b0d0f7
  },
} satisfies ChartConfig;

const chartData = [
  { month: "January", desktop: 186, mobile: 80, tablet: 10 },
  { month: "February", desktop: 305, mobile: 200, tablet: 20 },
  { month: "March", desktop: 237, mobile: 120, tablet: 300 },
  { month: "April", desktop: 73, mobile: 190, tablet: 20 },
  { month: "May", desktop: 209, mobile: 130, tablet: 45 },
  { month: "June", desktop: 214, mobile: 140, tablet: 32 },
];

function AppAreaChart() {
  return (
    <div className="">
      <h1 className="mb-[10] text-lg font-medium ">Total Revenue</h1>
      <p className="text-xs mb-6 text-gray-400">January - June 2024</p>
      <ChartContainer config={chartConfig}>
        <AreaChart
          accessibilityLayer
          data={chartData}
          margin={{
            left: 12,
            right: 12,
          }}
        >
          <CartesianGrid vertical={false} />
          <XAxis
            dataKey="month"
            tickLine={false}
            axisLine={false}
            tickMargin={8}
            tickFormatter={(value) => value.slice(0, 3)}
          />
          <YAxis tickLine={false} axisLine={false} tickMargin={8} />

          <ChartTooltip cursor={false} content={<ChartTooltipContent />} />
          <defs>
            <linearGradient id="fillDesktop" x1="0" y1="0" x2="0" y2="1">
              <stop
                offset="5%"
                stopColor="var(--color-desktop)"
                stopOpacity={0.8}
              />
              <stop
                offset="95%"
                stopColor="var(--color-desktop)"
                stopOpacity={0.1}
              />
            </linearGradient>
            <linearGradient id="fillMobile" x1="0" y1="0" x2="0" y2="1">
              <stop
                offset="5%"
                stopColor="var(--color-mobile)"
                stopOpacity={0.8}
              />
              <stop
                offset="95%"
                stopColor="var(--color-mobile)"
                stopOpacity={0.1}
              />
            </linearGradient>
            <linearGradient id="fillTablet" x1="0" y1="0" x2="0" y2="1">
              <stop
                offset="5%"
                stopColor="var(--color-tablet)"
                stopOpacity={0.8}
              />
              <stop
                offset="95%"
                stopColor="var(--color-tablet)"
                stopOpacity={0.1}
              />
            </linearGradient>
          </defs>

          <Area
            dataKey="mobile"
            type="natural"
            fill="url(#fillMobile)"
            fillOpacity={0.4}
            stroke="var(--color-mobile)"
            stackId="a"
          />
          <Area
            dataKey="desktop"
            type="natural"
            fill="url(#fillDesktop)"
            fillOpacity={0.4}
            stroke="var(--color-desktop)"
            stackId="a"
          />
          <Area
            dataKey="tablet"
            type="natural"
            fill="url(#fillTablet)"
            fillOpacity={0.4}
            stroke="var(--color-tablet)"
            stackId="a"
          />
        </AreaChart>
      </ChartContainer>
    </div>
  );
}

export default AppAreaChart;
