import React from "react";
import { View, Text, StyleSheet } from "react-native";
import Svg, { Rect, Line, Text as SvgText, G } from "react-native-svg";
import Colors from "../../../constants/Colors";

interface BarChartData {
  day: string;
  count: number;
}

interface DailyBookingsBarChartProps {
  data?: BarChartData[];
}

export default function DailyBookingsBarChart({
  data = [
    { day: "Mon", count: 8 },
    { day: "Tue", count: 12 },
    { day: "Wed", count: 6 },
    { day: "Thu", count: 15 },
    { day: "Fri", count: 10 },
    { day: "Sat", count: 18 },
    { day: "Sun", count: 5 },
  ],
}: DailyBookingsBarChartProps) {
  const width = 300;
  const height = 180;
  const padding = { top: 20, right: 20, bottom: 40, left: 50 };
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;

  const maxCount = Math.max(...data.map((d) => d.count), 1);
  const barWidth = (chartWidth / data.length) * 0.6;
  const barSpacing = chartWidth / data.length;

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Daily Bookings (This Week)</Text>
      <Svg width={width} height={height}>
        {[0, 0.25, 0.5, 0.75, 1].map((ratio, i) => {
          const y = padding.top + chartHeight * (1 - ratio);
          const value = Math.round(maxCount * ratio);
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
                {value}
              </SvgText>
            </G>
          );
        })}
        {data.map((d, i) => {
          const barHeight = (d.count / maxCount) * chartHeight;
          const x = padding.left + i * barSpacing + (barSpacing - barWidth) / 2;
          const y = padding.top + chartHeight - barHeight;
          return (
            <G key={i}>
              <Rect
                x={x}
                y={y}
                width={barWidth}
                height={barHeight}
                rx={4}
                fill={Colors.light.yellow400}
              />
              <SvgText
                x={x + barWidth / 2}
                y={height - 8}
                fontSize={10}
                fill={Colors.light.gray500}
                textAnchor="middle"
              >
                {d.day}
              </SvgText>
              <SvgText
                x={x + barWidth / 2}
                y={y - 6}
                fontSize={11}
                fontWeight="600"
                fill={Colors.light.blue900}
                textAnchor="middle"
              >
                {d.count}
              </SvgText>
            </G>
          );
        })}
      </Svg>
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
});
