import Svg, { Circle, Path, Text as SvgText, Defs, LinearGradient, Stop } from 'react-native-svg';

interface LogoProps {
  size?: number;
}

export default function Logo({ size = 80 }: LogoProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 280 280">
      <Defs>
        <LinearGradient id="ringGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <Stop offset="0%" stopColor="#E8913A" />
          <Stop offset="60%" stopColor="#E8913A" />
          <Stop offset="100%" stopColor="#F5C563" />
        </LinearGradient>
      </Defs>
      <Circle cx="140" cy="136" r="80" fill="#E8913A" opacity={0.04} />
      <Path
        d="M 153 74 A 64 64 0 1 1 127 74"
        fill="none"
        stroke="url(#ringGrad)"
        strokeWidth="9"
        strokeLinecap="round"
      />
      <SvgText
        x="140"
        y="153"
        textAnchor="middle"
        fontFamily="Georgia"
        fontSize="72"
        fontWeight="700"
        fill="#2D2A26"
        opacity={0.88}
      >
        1
      </SvgText>
    </Svg>
  );
}
