import React from 'react';
import { View } from 'react-native';
import Svg, { Path, Circle, Rect, Line, Polyline, Polygon } from 'react-native-svg';

export type CupertinoIconName =
  | 'settings'
  | 'trash'
  | 'pin'
  | 'pin-filled'
  | 'document'
  | 'calendar'
  | 'moon'
  | 'sun'
  | 'add'
  | 'checkmark'
  | 'folder'
  | 'folder-open'
  | 'folder-add'
  | 'folder-edit'
  | 'refresh'
  | 'download'
  | 'bell'
  | 'close'
  | 'drag'
  | 'time'
  | 'clock'
  | 'palette'
  | 'chevron'
  | 'chevron-right'
  | 'chevron-down'
  | 'info'
  | 'book'
  | 'briefcase'
  | 'home'
  | 'sport'
  | 'star'
  | 'code'
  | 'heart'
  | 'cart'
  | 'bulb'
  | 'layers'
  | 'edit'
  | 'pencil';

interface CupertinoIconProps {
  name: CupertinoIconName;
  size?: number;
  color?: string;
  style?: any;
}

export const CupertinoIcon: React.FC<CupertinoIconProps> = ({
  name,
  size = 20,
  color = '#007aff',
  style,
}) => {
  const stroke = 2;

  const renderSvgContent = () => {
    switch (name) {
      case 'settings':
        return (
          <>
            <Circle cx="12" cy="12" r="3" stroke={color} strokeWidth={stroke} fill="none" />
            <Path
              d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"
              stroke={color}
              strokeWidth={stroke}
              strokeLinecap="round"
              strokeLinejoin="round"
              fill="none"
            />
          </>
        );

      case 'trash':
        return (
          <>
            <Polyline points="3 6 5 6 21 6" stroke={color} strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round" fill="none" />
            <Path
              d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"
              stroke={color}
              strokeWidth={stroke}
              strokeLinecap="round"
              strokeLinejoin="round"
              fill="none"
            />
            <Line x1="10" y1="11" x2="10" y2="17" stroke={color} strokeWidth={stroke} strokeLinecap="round" />
            <Line x1="14" y1="11" x2="14" y2="17" stroke={color} strokeWidth={stroke} strokeLinecap="round" />
          </>
        );

      case 'pin':
        return (
          <Path
            d="M16 3l5 5-4 4v5l-3-3-4 4-1-1 4-4-3-3h5l4-4z"
            stroke={color}
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
          />
        );

      case 'pin-filled':
        return (
          <Path
            d="M16 3l5 5-4 4v5l-3-3-4 4-1-1 4-4-3-3h5l4-4z"
            stroke={color}
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeLinejoin="round"
            fill={color}
          />
        );

      case 'document':
        return (
          <>
            <Path
              d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"
              stroke={color}
              strokeWidth={stroke}
              strokeLinecap="round"
              strokeLinejoin="round"
              fill="none"
            />
            <Polyline points="14 2 14 8 20 8" stroke={color} strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round" fill="none" />
            <Line x1="16" y1="13" x2="8" y2="13" stroke={color} strokeWidth={stroke} strokeLinecap="round" />
            <Line x1="16" y1="17" x2="8" y2="17" stroke={color} strokeWidth={stroke} strokeLinecap="round" />
            <Line x1="10" y1="9" x2="8" y2="9" stroke={color} strokeWidth={stroke} strokeLinecap="round" />
          </>
        );

      case 'calendar':
        return (
          <>
            <Rect
              x="3"
              y="4"
              width="18"
              height="18"
              rx="2"
              ry="2"
              stroke={color}
              strokeWidth={stroke}
              strokeLinecap="round"
              strokeLinejoin="round"
              fill="none"
            />
            <Line x1="16" y1="2" x2="16" y2="6" stroke={color} strokeWidth={stroke} strokeLinecap="round" />
            <Line x1="8" y1="2" x2="8" y2="6" stroke={color} strokeWidth={stroke} strokeLinecap="round" />
            <Line x1="3" y1="10" x2="21" y2="10" stroke={color} strokeWidth={stroke} strokeLinecap="round" />
          </>
        );

      case 'moon':
        return (
          <Path
            d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"
            stroke={color}
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
          />
        );

      case 'sun':
        return (
          <>
            <Circle cx="12" cy="12" r="5" stroke={color} strokeWidth={stroke} fill="none" />
            <Line x1="12" y1="1" x2="12" y2="3" stroke={color} strokeWidth={stroke} strokeLinecap="round" />
            <Line x1="12" y1="21" x2="12" y2="23" stroke={color} strokeWidth={stroke} strokeLinecap="round" />
            <Line x1="4.22" y1="4.22" x2="5.64" y2="5.64" stroke={color} strokeWidth={stroke} strokeLinecap="round" />
            <Line x1="18.36" y1="18.36" x2="19.78" y2="19.78" stroke={color} strokeWidth={stroke} strokeLinecap="round" />
            <Line x1="1" y1="12" x2="3" y2="12" stroke={color} strokeWidth={stroke} strokeLinecap="round" />
            <Line x1="21" y1="12" x2="23" y2="12" stroke={color} strokeWidth={stroke} strokeLinecap="round" />
            <Line x1="4.22" y1="19.78" x2="5.64" y2="18.36" stroke={color} strokeWidth={stroke} strokeLinecap="round" />
            <Line x1="18.36" y1="5.64" x2="19.78" y2="4.22" stroke={color} strokeWidth={stroke} strokeLinecap="round" />
          </>
        );

      case 'add':
        return (
          <>
            <Line x1="12" y1="5" x2="12" y2="19" stroke={color} strokeWidth={stroke} strokeLinecap="round" />
            <Line x1="5" y1="12" x2="19" y2="12" stroke={color} strokeWidth={stroke} strokeLinecap="round" />
          </>
        );

      case 'checkmark':
        return (
          <Polyline
            points="20 6 9 17 4 12"
            stroke={color}
            strokeWidth={stroke * 1.2}
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
          />
        );

      case 'folder':
        return (
          <Path
            d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"
            stroke={color}
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
          />
        );

      case 'folder-open':
        return (
          <>
            <Path
              d="M2 5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2v2H2z"
              stroke={color}
              strokeWidth={stroke}
              strokeLinecap="round"
              strokeLinejoin="round"
              fill="none"
            />
            <Path
              d="M2 19l3-9h17l-3 9H2z"
              stroke={color}
              strokeWidth={stroke}
              strokeLinecap="round"
              strokeLinejoin="round"
              fill="none"
            />
          </>
        );

      case 'folder-add':
        return (
          <>
            <Path
              d="M12 19H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2v3"
              stroke={color}
              strokeWidth={stroke}
              strokeLinecap="round"
              strokeLinejoin="round"
              fill="none"
            />
            <Line x1="18" y1="14" x2="18" y2="20" stroke={color} strokeWidth={stroke * 1.1} strokeLinecap="round" />
            <Line x1="15" y1="17" x2="21" y2="17" stroke={color} strokeWidth={stroke * 1.1} strokeLinecap="round" />
          </>
        );

      case 'folder-edit':
        return (
          <>
            <Path
              d="M11 19H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2v2"
              stroke={color}
              strokeWidth={stroke}
              strokeLinecap="round"
              strokeLinejoin="round"
              fill="none"
            />
            <Path
              d="M15.5 19.5l4-4 2 2-4 4h-2v-2z"
              stroke={color}
              strokeWidth={stroke * 0.9}
              strokeLinecap="round"
              strokeLinejoin="round"
              fill="none"
            />
            <Line x1="18.5" y1="16.5" x2="20.5" y2="18.5" stroke={color} strokeWidth={stroke * 0.9} strokeLinecap="round" />
          </>
        );

      case 'refresh':
        return (
          <>
            <Polyline points="23 4 23 10 17 10" stroke={color} strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round" fill="none" />
            <Path
              d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"
              stroke={color}
              strokeWidth={stroke}
              strokeLinecap="round"
              strokeLinejoin="round"
              fill="none"
            />
          </>
        );

      case 'download':
        return (
          <>
            <Path
              d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"
              stroke={color}
              strokeWidth={stroke}
              strokeLinecap="round"
              strokeLinejoin="round"
              fill="none"
            />
            <Polyline points="7 10 12 15 17 10" stroke={color} strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round" fill="none" />
            <Line x1="12" y1="15" x2="12" y2="3" stroke={color} strokeWidth={stroke} strokeLinecap="round" />
          </>
        );

      case 'bell':
        return (
          <>
            <Path
              d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"
              stroke={color}
              strokeWidth={stroke}
              strokeLinecap="round"
              strokeLinejoin="round"
              fill="none"
            />
            <Path d="M13.73 21a2 2 0 0 1-3.46 0" stroke={color} strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round" fill="none" />
          </>
        );

      case 'close':
        return (
          <>
            <Line x1="18" y1="6" x2="6" y2="18" stroke={color} strokeWidth={stroke * 1.1} strokeLinecap="round" />
            <Line x1="6" y1="6" x2="18" y2="18" stroke={color} strokeWidth={stroke * 1.1} strokeLinecap="round" />
          </>
        );

      case 'drag':
        return (
          <>
            <Line x1="4" y1="9" x2="20" y2="9" stroke={color} strokeWidth={stroke} strokeLinecap="round" />
            <Line x1="4" y1="15" x2="20" y2="15" stroke={color} strokeWidth={stroke} strokeLinecap="round" />
          </>
        );

      case 'time':
      case 'clock':
        return (
          <>
            <Circle cx="12" cy="12" r="10" stroke={color} strokeWidth={stroke} fill="none" />
            <Polyline points="12 6 12 12 16 14" stroke={color} strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round" fill="none" />
          </>
        );

      case 'palette':
        return (
          <>
            <Path
              d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.93 0 1.65-.75 1.65-1.69 0-.44-.18-.84-.44-1.13-.29-.29-.44-.65-.44-1.12a1.64 1.64 0 0 1 1.67-1.67h2c3.05 0 5.56-2.5 5.56-5.55C22 6.01 17.46 2 12 2z"
              stroke={color}
              strokeWidth={stroke}
              strokeLinecap="round"
              strokeLinejoin="round"
              fill="none"
            />
            <Circle cx="7.5" cy="10" r="1.4" fill={color} />
            <Circle cx="12" cy="6.8" r="1.4" fill={color} />
            <Circle cx="16.5" cy="10" r="1.4" fill={color} />
            <Circle cx="17.5" cy="14.2" r="1.4" fill={color} />
          </>
        );

      case 'chevron':
      case 'chevron-right':
        return (
          <Polyline
            points="9 18 15 12 9 6"
            stroke={color}
            strokeWidth={stroke * 1.1}
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
          />
        );

      case 'chevron-down':
        return (
          <Polyline
            points="6 9 12 15 18 9"
            stroke={color}
            strokeWidth={stroke * 1.1}
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
          />
        );

      case 'info':
        return (
          <>
            <Circle cx="12" cy="12" r="10" stroke={color} strokeWidth={stroke} fill="none" />
            <Line x1="12" y1="16" x2="12" y2="12" stroke={color} strokeWidth={stroke} strokeLinecap="round" />
            <Line x1="12" y1="8" x2="12.01" y2="8" stroke={color} strokeWidth={stroke * 1.3} strokeLinecap="round" />
          </>
        );

      case 'book':
        return (
          <>
            <Path
              d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"
              stroke={color}
              strokeWidth={stroke}
              strokeLinecap="round"
              strokeLinejoin="round"
              fill="none"
            />
            <Path
              d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"
              stroke={color}
              strokeWidth={stroke}
              strokeLinecap="round"
              strokeLinejoin="round"
              fill="none"
            />
          </>
        );

      case 'briefcase':
        return (
          <>
            <Rect
              x="2"
              y="7"
              width="20"
              height="14"
              rx="2"
              ry="2"
              stroke={color}
              strokeWidth={stroke}
              strokeLinecap="round"
              strokeLinejoin="round"
              fill="none"
            />
            <Path
              d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"
              stroke={color}
              strokeWidth={stroke}
              strokeLinecap="round"
              strokeLinejoin="round"
              fill="none"
            />
          </>
        );

      case 'home':
        return (
          <>
            <Path
              d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"
              stroke={color}
              strokeWidth={stroke}
              strokeLinecap="round"
              strokeLinejoin="round"
              fill="none"
            />
            <Polyline points="9 22 9 12 15 12 15 22" stroke={color} strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round" fill="none" />
          </>
        );

      case 'sport':
        return (
          <Polyline
            points="22 12 18 12 15 21 9 3 6 12 2 12"
            stroke={color}
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
          />
        );

      case 'star':
        return (
          <Polygon
            points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"
            stroke={color}
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
          />
        );

      case 'code':
        return (
          <>
            <Polyline points="16 18 22 12 16 6" stroke={color} strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round" fill="none" />
            <Polyline points="8 6 2 12 8 18" stroke={color} strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round" fill="none" />
          </>
        );

      case 'heart':
        return (
          <Path
            d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"
            stroke={color}
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
          />
        );

      case 'cart':
        return (
          <>
            <Circle cx="9" cy="21" r="1" stroke={color} strokeWidth={stroke} fill={color} />
            <Circle cx="20" cy="21" r="1" stroke={color} strokeWidth={stroke} fill={color} />
            <Path
              d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"
              stroke={color}
              strokeWidth={stroke}
              strokeLinecap="round"
              strokeLinejoin="round"
              fill="none"
            />
          </>
        );

      case 'bulb':
        return (
          <>
            <Path
              d="M9 18h6m-5 3h4m-7-9a6 6 0 1 1 10 0c-1 1.5-2 2.5-2 4H9c0-1.5-1-2.5-2-4z"
              stroke={color}
              strokeWidth={stroke}
              strokeLinecap="round"
              strokeLinejoin="round"
              fill="none"
            />
          </>
        );

      case 'layers':
        return (
          <>
            <Polygon
              points="12 2 2 7 12 12 22 7 12 2"
              stroke={color}
              strokeWidth={stroke}
              strokeLinecap="round"
              strokeLinejoin="round"
              fill="none"
            />
            <Polyline
              points="2 17 12 22 22 17"
              stroke={color}
              strokeWidth={stroke}
              strokeLinecap="round"
              strokeLinejoin="round"
              fill="none"
            />
            <Polyline
              points="2 12 12 17 22 12"
              stroke={color}
              strokeWidth={stroke}
              strokeLinecap="round"
              strokeLinejoin="round"
              fill="none"
            />
          </>
        );

      case 'edit':
      case 'pencil':
        return (
          <>
            <Path
              d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"
              stroke={color}
              strokeWidth={stroke}
              strokeLinecap="round"
              strokeLinejoin="round"
              fill="none"
            />
            <Path
              d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"
              stroke={color}
              strokeWidth={stroke}
              strokeLinecap="round"
              strokeLinejoin="round"
              fill="none"
            />
          </>
        );

      default:
        return (
          <Circle cx="12" cy="12" r="8" stroke={color} strokeWidth={stroke} fill="none" />
        );
    }
  };

  return (
    <View style={[{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }, style]}>
      <Svg width={size} height={size} viewBox="0 0 24 24">
        {renderSvgContent()}
      </Svg>
    </View>
  );
};
