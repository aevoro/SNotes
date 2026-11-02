import React from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import { isLoaded } from 'expo-font';

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

let VectorIonicons: any = null;
try {
  VectorIonicons = require('@expo/vector-icons').Ionicons;
} catch {
  VectorIonicons = null;
}

const IONICONS_MAP: Record<CupertinoIconName, string> = {
  settings: 'settings-sharp',
  trash: 'trash-outline',
  pin: 'pin-outline',
  'pin-filled': 'pin',
  document: 'document-text-outline',
  calendar: 'calendar-outline',
  moon: 'moon',
  sun: 'sunny-outline',
  add: 'add',
  checkmark: 'checkmark',
  folder: 'folder-outline',
  'folder-open': 'folder-open-outline',
  refresh: 'reload-outline',
  download: 'cloud-download-outline',
  bell: 'notifications-outline',
  close: 'close',
  drag: 'reorder-two-outline',
  time: 'time-outline',
  clock: 'time-outline',
  palette: 'color-palette-outline',
  chevron: 'chevron-forward',
  'chevron-right': 'chevron-forward',
  'chevron-down': 'chevron-down',
  info: 'information-circle-outline',
  book: 'book-outline',
  briefcase: 'briefcase-outline',
  home: 'home-outline',
  sport: 'fitness-outline',
  star: 'star-outline',
  code: 'code-slash-outline',
  heart: 'heart-outline',
  cart: 'cart-outline',
  bulb: 'bulb-outline',
  layers: 'layers-outline',
  edit: 'create-outline',
  pencil: 'pencil-outline',
};

export const CupertinoIcon: React.FC<CupertinoIconProps> = ({
  name,
  size = 20,
  color = '#007aff',
  style,
}) => {
  const canUseVector = VectorIonicons && (Platform.OS === 'web' || isLoaded('Ionicons'));

  if (canUseVector) {
    const ionName = IONICONS_MAP[name] || 'ellipse-outline';
    return (
      <View style={style} accessibilityElementsHidden aria-hidden={true}>
        <VectorIonicons name={ionName} size={size} color={color} />
      </View>
    );
  }

  return <FallbackVectorIcon name={name} size={size} color={color} style={style} />;
};

const FallbackVectorIcon: React.FC<CupertinoIconProps> = ({ name, size = 20, color = '#007aff', style }) => {
  const s = size;
  const stroke = Math.max(1.5, s * 0.09);

  switch (name) {
    case 'settings':
      return (
        <View
          style={[
            {
              width: s,
              height: s,
              borderRadius: s / 2,
              borderWidth: stroke * 1.5,
              borderColor: color,
              alignItems: 'center',
              justifyContent: 'center',
            },
            style,
          ]}
        >
          <View
            style={{
              width: s * 0.32,
              height: s * 0.32,
              borderRadius: s * 0.16,
              backgroundColor: color,
            }}
          />
        </View>
      );

    case 'chevron':
      return (
        <View style={[{ width: s * 0.6, height: s * 0.6, justifyContent: 'center', alignItems: 'center' }, style]}>
          <View
            style={{
              width: s * 0.35,
              height: s * 0.35,
              borderTopWidth: stroke * 1.3,
              borderRightWidth: stroke * 1.3,
              borderColor: color,
              transform: [{ rotate: '45deg' }, { translateX: -s * 0.05 }],
            }}
          />
        </View>
      );

    case 'palette':
      return (
        <View
          style={[
            {
              width: s,
              height: s,
              borderRadius: s / 2,
              borderWidth: stroke * 1.2,
              borderColor: color,
              alignItems: 'center',
              justifyContent: 'center',
            },
            style,
          ]}
        >
          <View style={{ width: s * 0.2, height: s * 0.2, borderRadius: s * 0.1, backgroundColor: color }} />
        </View>
      );

    case 'trash':
      return (
        <View style={[{ width: s, height: s, alignItems: 'center', justifyContent: 'center' }, style]}>
          <View
            style={{
              width: s * 0.7,
              height: stroke,
              backgroundColor: color,
              marginBottom: stroke,
              borderRadius: 1,
            }}
          />
          <View
            style={{
              width: s * 0.55,
              height: s * 0.6,
              borderWidth: stroke,
              borderColor: color,
              borderTopWidth: 0,
              borderBottomLeftRadius: 3,
              borderBottomRightRadius: 3,
            }}
          />
        </View>
      );

    case 'pin':
    case 'pin-filled':
      const isFilled = name === 'pin-filled';
      return (
        <View style={[{ width: s, height: s, alignItems: 'center', justifyContent: 'center' }, style]}>
          <View
            style={{
              width: s * 0.44,
              height: s * 0.44,
              borderRadius: s * 0.22,
              backgroundColor: isFilled ? color : 'transparent',
              borderWidth: stroke,
              borderColor: color,
            }}
          />
          <View
            style={{
              width: stroke,
              height: s * 0.38,
              backgroundColor: color,
              marginTop: 1,
            }}
          />
        </View>
      );

    case 'document':
      return (
        <View style={[{ width: s, height: s, alignItems: 'center', justifyContent: 'center' }, style]}>
          <View
            style={{
              width: s * 0.65,
              height: s * 0.8,
              borderWidth: stroke,
              borderColor: color,
              borderRadius: 3,
              padding: 2,
              justifyContent: 'space-around',
            }}
          >
            <View style={{ height: stroke, backgroundColor: color, width: '70%', borderRadius: 1 }} />
            <View style={{ height: stroke, backgroundColor: color, width: '90%', borderRadius: 1 }} />
            <View style={{ height: stroke, backgroundColor: color, width: '50%', borderRadius: 1 }} />
          </View>
        </View>
      );

    case 'calendar':
      return (
        <View style={[{ width: s, height: s, alignItems: 'center', justifyContent: 'center' }, style]}>
          <View
            style={{
              width: s * 0.75,
              height: s * 0.75,
              borderWidth: stroke,
              borderColor: color,
              borderRadius: 4,
            }}
          >
            <View style={{ height: s * 0.2, backgroundColor: color, width: '100%' }} />
          </View>
        </View>
      );

    case 'moon':
      return (
        <View style={[{ width: s, height: s, alignItems: 'center', justifyContent: 'center' }, style]}>
          <View
            style={{
              width: s * 0.65,
              height: s * 0.65,
              borderRadius: s * 0.33,
              borderWidth: stroke * 1.3,
              borderColor: color,
              borderRightColor: 'transparent',
              transform: [{ rotate: '-35deg' }],
            }}
          />
        </View>
      );

    case 'sun':
      return (
        <View style={[{ width: s, height: s, alignItems: 'center', justifyContent: 'center' }, style]}>
          <View
            style={{
              width: s * 0.5,
              height: s * 0.5,
              borderRadius: s * 0.25,
              borderWidth: stroke,
              borderColor: color,
            }}
          />
        </View>
      );

    case 'add':
      return (
        <View style={[{ width: s, height: s, alignItems: 'center', justifyContent: 'center' }, style]}>
          <View style={{ width: s * 0.7, height: stroke, backgroundColor: color, borderRadius: 1 }} />
          <View
            style={{
              position: 'absolute',
              width: stroke,
              height: s * 0.7,
              backgroundColor: color,
              borderRadius: 1,
            }}
          />
        </View>
      );

    case 'checkmark':
      return (
        <View style={[{ width: s, height: s, alignItems: 'center', justifyContent: 'center' }, style]}>
          <View
            style={{
              width: s * 0.45,
              height: s * 0.28,
              borderLeftWidth: stroke * 1.2,
              borderBottomWidth: stroke * 1.2,
              borderColor: color,
              transform: [{ rotate: '-45deg' }, { translateY: -s * 0.08 }],
            }}
          />
        </View>
      );

    case 'close':
      return (
        <View style={[{ width: s, height: s, alignItems: 'center', justifyContent: 'center' }, style]}>
          <View
            style={{
              width: s * 0.65,
              height: stroke,
              backgroundColor: color,
              transform: [{ rotate: '45deg' }],
              borderRadius: 1,
            }}
          />
          <View
            style={{
              position: 'absolute',
              width: s * 0.65,
              height: stroke,
              backgroundColor: color,
              transform: [{ rotate: '-45deg' }],
              borderRadius: 1,
            }}
          />
        </View>
      );

    case 'folder':
    case 'folder-open':
      return (
        <View style={[{ width: s, height: s, alignItems: 'center', justifyContent: 'center' }, style]}>
          <View
            style={{
              width: s * 0.75,
              height: s * 0.55,
              borderWidth: stroke,
              borderColor: color,
              borderRadius: 3,
            }}
          >
            <View
              style={{
                position: 'absolute',
                top: -stroke * 2,
                left: 0,
                width: s * 0.35,
                height: stroke * 2,
                backgroundColor: color,
                borderTopLeftRadius: 2,
                borderTopRightRadius: 2,
              }}
            />
          </View>
        </View>
      );

    case 'drag':
      return (
        <View style={[{ width: s, height: s, justifyContent: 'space-evenly', alignItems: 'center' }, style]}>
          <View style={{ width: s * 0.6, height: stroke, backgroundColor: color, borderRadius: 1 }} />
          <View style={{ width: s * 0.6, height: stroke, backgroundColor: color, borderRadius: 1 }} />
        </View>
      );

    case 'chevron':
    case 'chevron-right':
      return (
        <View style={[{ width: s, height: s, alignItems: 'center', justifyContent: 'center' }, style]}>
          <View
            style={{
              width: s * 0.35,
              height: s * 0.35,
              borderTopWidth: stroke * 1.2,
              borderRightWidth: stroke * 1.2,
              borderColor: color,
              transform: [{ rotate: '45deg' }, { translateX: -s * 0.05 }],
            }}
          />
        </View>
      );

    case 'chevron-down':
      return (
        <View style={[{ width: s, height: s, alignItems: 'center', justifyContent: 'center' }, style]}>
          <View
            style={{
              width: s * 0.35,
              height: s * 0.35,
              borderBottomWidth: stroke * 1.2,
              borderRightWidth: stroke * 1.2,
              borderColor: color,
              transform: [{ rotate: '45deg' }, { translateY: -s * 0.05 }],
            }}
          />
        </View>
      );

    case 'pencil':
    case 'edit':
      return (
        <View style={[{ width: s, height: s, alignItems: 'center', justifyContent: 'center' }, style]}>
          <View
            style={{
              width: s * 0.55,
              height: stroke * 1.5,
              backgroundColor: color,
              transform: [{ rotate: '-45deg' }],
              borderRadius: 1,
            }}
          />
        </View>
      );

    case 'layers':
      return (
        <View style={[{ width: s, height: s, alignItems: 'center', justifyContent: 'center' }, style]}>
          <View
            style={{
              width: s * 0.55,
              height: s * 0.55,
              borderWidth: stroke,
              borderColor: color,
              borderRadius: 2,
              transform: [{ rotate: '45deg' }],
            }}
          />
        </View>
      );

    case 'time':
    case 'clock':
    case 'bell':
    case 'info':
    case 'download':
    case 'refresh':
    default:
      return (
        <View
          style={[
            {
              width: s * 0.65,
              height: s * 0.65,
              borderRadius: (s * 0.65) / 2,
              borderWidth: stroke,
              borderColor: color,
              justifyContent: 'center',
              alignItems: 'center',
            },
            style,
          ]}
        >
          <View style={{ width: stroke, height: s * 0.22, backgroundColor: color }} />
        </View>
      );
  }
};
