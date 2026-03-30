import React from "react";
import { View, Text, StyleSheet } from "react-native";
import Svg, { Path, G, Text as SvgText, Circle } from "react-native-svg";
import Colors from "../../../constants/Colors";

interface PieChartData {
  status: string;
  count: number;
  color: string;
}

interface BookingStatusPieChartProps {
  data?: PieChartData[];
}

function generateArcPath(
  startAngle: number,
  endAngle: number,
  radius: number,
  innerRadius: number,
): string {
  const startOuter = polarToCartesian(radius, startAngle);
  const endOuter = polarToCartesian(radius, endAngle);
  const startInner = polarToCartesian(innerRadius, endAngle);
  const endInner = polarToCartesian(innerRadius, startAngle);
  const largeArc = endAngle - startAngle > 180 ? 1 : 0;

  return [
    `M ${startOuter.x} ${startOuter.y}`,
    `A ${radius} ${radius} 0 ${largeArc} 1 ${endOuter.x} ${endOuter.y}`,
    `L ${startInner.x} ${startInner.y}`,
    `A ${innerRadius} ${innerRadius} 0 ${largeArc} 0 ${endInner.x} ${endInner.y}`,
    "Z",
  ].join(" ");
}

function polarToCartesian(radius: number, angle: number) {
  const rad = ((angle - 90) * Math.PI) / 180;
  return {
    x: radius + radius * Math.cos(rad),
    y: radius + radius * Math.sin(rad),
  };
}

export default function BookingStatusPieChart({
  data = [
    { status: "Accepted", count: 45, color: "#22c55e" },
    { status: "Completed", count: 120, color: "#3b82f6" },
    { status: "Pending", count: 15, color: "#facc15" },
    { status: "Cancelled", count: 8, color: "#ef4444" },
  ],
}: BookingStatusPieChartProps) {
  const total = data.reduce((sum, d) => sum + d.count, 0);
  const radius = 70;
  const innerRadius = 40;
  const size = radius * 2 + 20;

  let currentAngle = 0;

  const slices = data.map((item, index) => {
    const sliceAngle = (item.count / total) * 360;
    const startAngle = currentAngle;
    const endAngle = currentAngle + sliceAngle;
    currentAngle = endAngle;

    return { ...item, startAngle, endAngle, sliceAngle };
  });

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Booking Status</Text>
      <View style={styles.chartContainer}>
        <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
          <G transform={`translate(${radius + 10}, ${radius + 10})`}>
            {slices.map((slice, index) => {
              if (slice.count === 0) return null;
              const path = generateArcPath(
                slice.startAngle,
                slice.endAngle - 0.5,
                radius,
                innerRadius,
              );
              return <Path key={index} d={path} fill={slice.color} />;
            })}
            <Circle
              cx={0}
              cy={0}
              r={innerRadius - 2}
              fill={Colors.light.white}
            />
          </G>
        </Svg>
        <Text style={styles.centerText}>{total}</Text>
      </View>
      <View style={styles.legend}>
        {data.map((item, index) => (
          <View key={index} style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: item.color }]} />
            <Text style={styles.legendText}>{item.status}</Text>
            <Text style={styles.legendCount}>{item.count}</Text>
          </View>
        ))}
      </View>
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
    marginBottom: 12,
  },
  chartContainer: {
    position: "relative",
    alignItems: "center",
    justifyContent: "center",
  },
  centerText: {
    position: "absolute",
    fontSize: 22,
    fontWeight: "800",
    color: Colors.light.blue900,
  },
  legend: {
    marginTop: 12,
    width: "100%",
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 6,
    paddingHorizontal: 8,
  },
  legendDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 8,
  },
  legendText: {
    flex: 1,
    fontSize: 13,
    color: Colors.light.gray600,
  },
  legendCount: {
    fontSize: 13,
    fontWeight: "700",
    color: Colors.light.blue900,
  },
});
