import Svg, { Circle, Defs, G, LinearGradient, Path, Rect, Stop } from "react-native-svg";




export default function VerifiedBadge({ width = 20, height = 20 }: { width?: number, height?: number }) {

    return (
        <Svg viewBox="0 0 100 100" width={width} height={height}>
            <Defs>
                <LinearGradient id="solidBlueGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                    <Stop offset="0%" stopColor="#0066FF" />
                    <Stop offset="100%" stopColor="#0033CC" />
                </LinearGradient>

                <LinearGradient id="bevelLight" x1="0%" y1="0%" x2="0%" y2="100%">
                    <Stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.25" />
                    <Stop offset="100%" stopColor="#000000" stopOpacity="0.1" />
                </LinearGradient>
            </Defs>

            <G>
                <Rect x="22" y="22" width="56" height="56" rx="14" transform="rotate(0 50 50)" fill="url(#solidBlueGradient)" />
                <Rect x="22" y="22" width="56" height="56" rx="14" transform="rotate(30 50 50)" fill="url(#solidBlueGradient)" />
                <Rect x="22" y="22" width="56" height="56" rx="14" transform="rotate(60 50 50)" fill="url(#solidBlueGradient)" />

                <Rect x="22" y="22" width="56" height="56" rx="14" transform="rotate(0 50 50)" fill="url(#bevelLight)" />
            </G>

            <Circle cx="50" cy="50" r="30" fill="none" stroke="#FFFFFF" strokeWidth="1.2" strokeDasharray="3 3" opacity="0.3" />

            <Path d="M34 52 L45 63 L68 37" fill="none" stroke="#FFFFFF" strokeWidth="7" strokeLinecap="round" strokeLinejoin="round" />


        </Svg>
    );
}