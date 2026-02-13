import React, { useEffect, useRef } from 'react';
import { Animated, Easing } from 'react-native';
import Svg, { Path, Circle } from 'react-native-svg';

const AnimatedPath = Animated.createAnimatedComponent(Path);

const CHECK_PATH = "M 250 540 L 420 720 L 780 280";
const PATH_LENGTH = 750;

interface OrganicCheckProps {
  size?: number;
  color?: string;
  strokeWidth?: number;
  animate?: boolean;
  animationDuration?: number;
  animationDelay?: number;
  opacity?: number;
  showCircle?: boolean;
}

export default function OrganicCheck({
  size = 120,
  color = '#E8913A',
  strokeWidth,
  animate = false,
  animationDuration = 800,
  animationDelay = 0,
  opacity = 1,
  showCircle = false,
}: OrganicCheckProps) {
  const dashOffset = useRef(new Animated.Value(animate ? PATH_LENGTH : 0)).current;
  const scaledStroke = strokeWidth ?? (80 * size) / 1024;

  useEffect(() => {
    if (animate) {
      dashOffset.setValue(PATH_LENGTH);
      const timer = setTimeout(() => {
        Animated.timing(dashOffset, {
          toValue: 0,
          duration: animationDuration,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }).start();
      }, animationDelay);
      return () => clearTimeout(timer);
    } else {
      dashOffset.setValue(0);
    }
  }, [animate, animationDelay, animationDuration, dashOffset]);

  return (
    <Svg
      width={size}
      height={size}
      viewBox="0 0 1024 1024"
      style={{ opacity }}
    >
      {showCircle && (
        <Circle
          cx={512}
          cy={512}
          r={440}
          stroke="none"
          strokeWidth={0}
          fill={color}
        />
      )}
      <AnimatedPath
        d={CHECK_PATH}
        stroke={showCircle ? '#FFFFFF' : color}
        strokeWidth={scaledStroke > 0 ? scaledStroke : 80}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
        strokeDasharray={`${PATH_LENGTH}`}
        strokeDashoffset={dashOffset}
      />
    </Svg>
  );
}
