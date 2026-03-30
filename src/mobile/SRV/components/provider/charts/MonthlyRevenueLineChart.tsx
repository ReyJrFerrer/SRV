import React from "react";
import { View, Text, StyleSheet } from "react-native";
import Svg, {
  Path,
  Line,
  Text as SvgText,
  Circle,
  G,
  Rect,
} from "react-native-svg";
import Colors from "../../../constants/Colors";

interface LineChartData {
  month: string;
  revenue: number;
}

interface MonthlyRevenueLineChartProps {
  data?: LineChartData[];
}

export default function MonthlyRevenueLineChart({
  data = [
    { month: "Jan", revenue: 8500 },
    { month: "Feb", revenue: 9200 },
    { month: "Mar", revenue: 7800 },
    { month: "Apr", revenue: 11000 },
    { month: "May", revenue: 12500 },
    { month: "Jun", revenue: 14200 },
    { month: "Jul", revenue: 13800 },
    { month: "Aug", revenue: 11500 },
    { month: "Sep", revenue: 9800 },
    { month: "Oct", revenue: 13200 },
    { month: "Nov", revenue: 14500 },
    { month: "Dec", revenue: 15800 },
  ],
}: MonthlyRevenueLineChartProps) {
  const width = 300;
  const height = 180;
  const padding = { top: 20, right: 20, bottom: 40, left: 50 };
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;

  const maxRevenue = Math.max(...data.map((d) => d.revenue));
  const minRevenue = 0;
  const range = maxRevenue - minRevenue;

  const points = data.map((d, i) => ({
    x: padding.left + (i / (data.length - 1)) * chartWidth,
    y:
      padding.top +
      chartHeight -
      ((d.revenue - minRevenue) / range) * chartHeight,
    ...d,
  }));

  const linePath = points
    .map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`)
    .join(" ");

  const areaPath = [
    `M ${points[0].x} ${padding.top + chartHeight}`,
    ...points.map((p) => `L ${p.x} ${p.y}`),
    `L ${points[points.length - 1].x} ${padding.top + chartHeight}`,
    "Z",
  ].join(" ");

  const formatY = (value: number) => {
    if (value >= 1000) return `₱${(value / 1000).toFixed(0)}k`;
    return `₱${value}`;
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Monthly Revenue</Text>
      <Svg width={width} height={height}>
        <Rect
          x={padding.left}
          y={padding.top}
          width={chartWidth}
          height={chartHeight}
          fill={Colors.light.blue50}
        />
        {[0, 0.25, 0.5, 0.75, 1].map((ratio, i) => {
          const y = padding.top + chartHeight * (1 - ratio);
          const value = minRevenue + range * ratio;
          return (
            <G key={i}>
              <Line
                x1={padding.left}
                y1={y}
                x2={padding.left + chartWidth}
                y2={y}
                stroke={Colors.light.gray200}
                strokeWidth={1}
              />
              <SvgText
                x={padding.left - 8}
                y={y + 4}
                fontSize={10}
                fill={Colors.light.gray500}
                textAnchor="end"
              >
                {formatY(value)}
              </SvgText>
            </G>
          );
        })}
        <Path d={areaPath} fill={`${Colors.light.blue600}20`} />
        <Path
          d={linePath}
          fill="none"
          stroke={Colors.light.blue600}
          strokeWidth={2.5}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {points.map((p, i) => (
          <Circle
            key={i}
            cx={p.x}
            cy={p.y}
            r={4}
            fill={Colors.light.white}
            stroke={Colors.light.blue600}
            strokeWidth={2}
          />
        ))}
        {points.map((p, i) => (
          <SvgText
            key={`label-${i}`}
            x={p.x}
            y={height - 8}
            fontSize={10}
            fill={Colors.light.gray500}
            textAnchor="middle"
          >
            {p.month}
          </SvgText>
        ))}
      </Svg>
      <Text style={styles.subtitle}>12-month revenue trend</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    paddingVertical: 8,
  },
  title: {
    fontSize: 16,
    fontWeight: "700",
    color: Colors.light.blue900,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 12,
    color: Colors.light.gray500,
    marginTop: 8,
  },
});
