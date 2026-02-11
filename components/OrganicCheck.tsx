import React, { useEffect, useRef } from 'react';
import { Animated, Easing } from 'react-native';
import Svg, { Path } from 'react-native-svg';

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
}

export default function OrganicCheck({
  size = 120,
  color = '#E8913A',
  strokeWidth,
  animate = false,
  animationDuration = 800,
  animationDelay = 0,
  opacity = 1,
}: OrganicCheckProps) {
  const dashOffset = useRef(new Animated.Value(animate ? PATH_LENGTH : 0)).current;
  const scaledStroke = strokeWidth ?? (56 * size) / 1024;

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
  }, [animate]);

  return (
    <Svg
      width={size}
      height={size}
      viewBox="0 0 1024 1024"
      style={{ opacity }}
    >
      <AnimatedPath
        d={CHECK_PATH}
        stroke={color}
        strokeWidth={scaledStroke > 0 ? scaledStroke : 56}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
        strokeDasharray={`${PATH_LENGTH}`}
        strokeDashoffset={dashOffset}
      />
    </Svg>
  );
}
