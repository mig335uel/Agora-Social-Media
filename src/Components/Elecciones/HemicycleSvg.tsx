import React from 'react';
import { View } from 'react-native';
import { PieChart, pieDataItem } from 'react-native-gifted-charts';

export interface HemicycleSlice {
  label: string;
  value: number;
  color: string;
  showLabel?: boolean;
}

interface HemicycleSvgProps {
  outerSlices: HemicycleSlice[];
  innerSlices?: HemicycleSlice[];
  width?: number;
  height?: number;
  isDark?: boolean;
  showMajorityLine?: boolean;
  majorityReached?: boolean;
}

export default function HemicycleSvg({
  outerSlices,
  innerSlices,
  width = 300,
  height = 170,
  isDark = true,
  showMajorityLine = false,
  majorityReached = false,
}: HemicycleSvgProps) {
  const positiveOuter = outerSlices.filter((s) => s.value > 0);
  const totalOuter = positiveOuter.reduce((acc, s) => acc + s.value, 0);

  const positiveInner = (innerSlices || []).filter((s) => s.value > 0);
  const totalInner = positiveInner.reduce((acc, s) => acc + s.value, 0);
  const hasInner = positiveInner.length > 0 && totalInner > 0;

  const radius = Math.min(Math.floor(width / 2) - 10, height - 18);
  const outerInnerRadius = hasInner
    ? Math.floor(radius * 0.72)
    : Math.floor(radius * 0.6);

  const innerChartRadius = outerInnerRadius - 4;
  const innerChartInnerRadius = Math.floor(radius * 0.48);

  const cardSurfaceColor = isDark ? '#0b1120' : '#ffffff';
  const strokeColor = isDark ? '#0f172a' : '#ffffff';

  const outerPieData: pieDataItem[] = positiveOuter.map((s) => {
    const share = totalOuter > 0 ? s.value / totalOuter : 0;
    const canFitLabel = (s.showLabel ?? true) && share >= 0.045;
    return {
      value: s.value,
      color: s.color,
      text: canFitLabel ? `${s.value}` : '',
      textColor: '#ffffff',
      textSize: share >= 0.08 ? 11 : 9,
      fontWeight: 'bold',
      labelPosition: 'mid',
    };
  });

  const innerPieData: pieDataItem[] = hasInner
    ? positiveInner.map((s) => ({
        value: s.value,
        color: s.color,
        text: '',
      }))
    : [];

  if (outerPieData.length === 0) {
    return null;
  }

  return (
    <View
      style={{
        width,
        height,
        alignItems: 'center',
        justifyContent: 'flex-end',
        position: 'relative',
      }}
    >
      {/* Anillo exterior (2026 o Pactómetro) con react-native-gifted-charts */}
      <PieChart
        donut
        semiCircle
        data={outerPieData}
        radius={radius}
        innerRadius={outerInnerRadius}
        innerCircleColor={cardSurfaceColor}
        strokeWidth={2}
        strokeColor={strokeColor}
        showText
        labelsPosition="mid"
        isAnimated
        animationDuration={450}
      />

      {/* Anillo interior concéntrico (Histórico 2023 al 55% de opacidad) */}
      {hasInner && innerChartRadius > innerChartInnerRadius && (
        <View
          pointerEvents="none"
          style={{
            position: 'absolute',
            bottom: 0,
            alignItems: 'center',
            justifyContent: 'flex-end',
            opacity: 0.58,
          }}
        >
          <PieChart
            donut
            semiCircle
            data={innerPieData}
            radius={innerChartRadius}
            innerRadius={innerChartInnerRadius}
            innerCircleColor={cardSurfaceColor}
            strokeWidth={1.5}
            strokeColor={strokeColor}
          />
        </View>
      )}

      {/* Indicador vertical del 50% (Mayoría absoluta en el Pactómetro) */}
      {showMajorityLine && (
        <View
          pointerEvents="none"
          style={{
            position: 'absolute',
            top: Math.max(0, height - radius - 8),
            height: radius - outerInnerRadius + 16,
            borderLeftWidth: 2,
            borderStyle: 'dashed',
            borderColor: majorityReached
              ? '#10b981'
              : isDark
              ? '#94a3b8'
              : '#475569',
          }}
        />
      )}
    </View>
  );
}
