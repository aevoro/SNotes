import React, { useRef, useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Platform,
  Animated,
  PanResponder,
  useWindowDimensions,
  Image,
  BackHandler,
  ToastAndroid,
} from 'react-native';
import { useAppTheme } from '../../context/ThemeContext';
import { useConfig } from '../../context/ConfigContext';
import { InitialScreenType } from '../../src/types/config';
import { getInstalledAppVersion } from '../../src/services/updateService';
import { CupertinoIcon, CupertinoIconName } from '../../src/components/CupertinoIcon';

import NotesScreen from '.';
import ScheduleScreen from './schedule';
import CalendarScreen from './calendar';
import SettingsScreen from './settings';

const MemoizedNotesScreen = React.memo(NotesScreen);
const MemoizedScheduleScreen = React.memo(ScheduleScreen);
const MemoizedCalendarScreen = React.memo(CalendarScreen);
const MemoizedSettingsScreen = React.memo(SettingsScreen);

const appIcon = require('../../assets/images/snotes_icon.png');

interface TabItemConfig {
  key: string;
  icon: CupertinoIconName;
  label: string;
}

const TABS: TabItemConfig[] = [
  { key: 'notes', icon: 'layers', label: 'Заметки и Задачи' },
  { key: 'schedule', icon: 'clock', label: 'Расписание' },
  { key: 'calendar', icon: 'calendar', label: 'Календарь' },
  { key: 'settings', icon: 'settings', label: 'Настройки' },
];

const ISLAND_WIDTH = 264;
const PADDING = 5;
const INNER_WIDTH = ISLAND_WIDTH - PADDING * 2;
const TAB_WIDTH = INNER_WIDTH / TABS.length;
const SWIPE_THRESHOLD = 50;

export default function TabLayout() {
  const { theme } = useAppTheme();
  const { config } = useConfig();
  const { width: screenWidth } = useWindowDimensions();
  const screenWidthRef = useRef(screenWidth);
  screenWidthRef.current = screenWidth;

  const currentAppVersion = getInstalledAppVersion();

  const [activeIndex, setActiveIndex] = useState(0);
  const activeIndexRef = useRef(0);
  activeIndexRef.current = activeIndex;

  const goToTabRef = useRef<(idx: number) => void>(() => {});

  const pageTranslateX = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    pageTranslateX.setValue(-activeIndexRef.current * screenWidth);
  }, [screenWidth]);

  useEffect(() => {
    let initialIdx = 0;
    if (config.initialScreen === 'Schedule') initialIdx = 1;
    else if (config.initialScreen === 'Todo' || (config.initialScreen as any) === 'Calendar') initialIdx = 2;
    else if (config.initialScreen === 'Settings') initialIdx = 3;

    setActiveIndex(initialIdx);
    pageTranslateX.setValue(-initialIdx * screenWidth);
  }, [config.initialScreen]);

  const lastBackPressTime = useRef<number>(0);

  useEffect(() => {
    const onBackPress = () => {
      let initialIdx = 0;
      if (config.initialScreen === 'Schedule') initialIdx = 1;
      else if (config.initialScreen === 'Todo' || (config.initialScreen as any) === 'Calendar') initialIdx = 2;
      else if (config.initialScreen === 'Settings') initialIdx = 3;

      if (activeIndexRef.current !== initialIdx) {
        goToTab(initialIdx);
        return true;
      }

      const now = Date.now();
      if (now - lastBackPressTime.current < 2000) {
        return false;
      }
      lastBackPressTime.current = now;
      if (Platform.OS === 'android') {
        ToastAndroid.show('Нажмите «Назад» еще раз для выхода', ToastAndroid.SHORT);
      }
      return true;
    };

    const sub = BackHandler.addEventListener('hardwareBackPress', onBackPress);
    return () => sub.remove();
  }, [config.initialScreen]);

  const pillTranslateX = pageTranslateX.interpolate({
    inputRange: [-screenWidth * 3, -screenWidth * 2, -screenWidth, 0],
    outputRange: [TAB_WIDTH * 3, TAB_WIDTH * 2, TAB_WIDTH, 0],
    extrapolate: 'clamp',
  });

  const goToTab = (index: number) => {
    const sw = screenWidthRef.current;
    setActiveIndex(index);
    Animated.spring(pageTranslateX, {
      toValue: -index * sw,
      damping: 28,
      stiffness: 280,
      mass: 0.6,
      overshootClamping: true,
      restDisplacementThreshold: 0.5,
      restSpeedThreshold: 0.5,
      useNativeDriver: true,
    }).start();
  };
  goToTabRef.current = goToTab;

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gestureState) => {
        return Math.abs(gestureState.dx) > Math.abs(gestureState.dy) * 1.5 && Math.abs(gestureState.dx) > 12;
      },
      onPanResponderMove: (_, gestureState) => {
        const sw = screenWidthRef.current;
        const baseOffset = -activeIndexRef.current * sw;
        let nextOffset = baseOffset + gestureState.dx;

        if (nextOffset > 0) {
          nextOffset = gestureState.dx * 0.25;
        } else if (nextOffset < -3 * sw) {
          const over = nextOffset - (-3 * sw);
          nextOffset = -3 * sw + over * 0.25;
        }

        pageTranslateX.setValue(nextOffset);
      },
      onPanResponderRelease: (_, gestureState) => {
        const currentIdx = activeIndexRef.current;
        const dx = gestureState.dx;
        const vx = gestureState.vx;

        let nextIdx = currentIdx;
        if ((dx < -SWIPE_THRESHOLD || vx < -0.4) && currentIdx < 3) {
          nextIdx = currentIdx + 1;
        } else if ((dx > SWIPE_THRESHOLD || vx > 0.4) && currentIdx > 0) {
          nextIdx = currentIdx - 1;
        }

        goToTabRef.current(nextIdx);
      },
      onPanResponderTerminate: () => {
        goToTabRef.current(activeIndexRef.current);
      },
    })
  ).current;

  return (
    <View style={[styles.container, { backgroundColor: theme.bg }]}>
      {/* Cupertino Top Header */}
      <View style={[styles.header, { backgroundColor: theme.surface, borderBottomColor: theme.border }]}>
        <View style={styles.headerLeft}>
          <Image source={appIcon} style={styles.appIconLogo} resizeMode="contain" />
          <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 6 }}>
            <Text style={[styles.headerTitle, { color: theme.textPrimary }]}>SNotes</Text>
            <View style={[styles.versionPill, { backgroundColor: theme.pillBg, borderColor: theme.border }]}>
              <Text style={[styles.versionPillText, { color: theme.accent }]}>v{currentAppVersion}</Text>
            </View>
          </View>
        </View>
      </View>

      {/* Swipeable Screens Viewport */}
      <View style={styles.screensWrapper} {...panResponder.panHandlers}>
        <Animated.View
          style={[
            styles.screensTrack,
            {
              width: screenWidth * 4,
              transform: [{ translateX: pageTranslateX }],
            },
          ]}>
          <View style={{ width: screenWidth, flex: 1, overflow: 'hidden' }}>
            <MemoizedNotesScreen />
          </View>
          <View style={{ width: screenWidth, flex: 1, overflow: 'hidden' }}>
            <MemoizedScheduleScreen />
          </View>
          <View style={{ width: screenWidth, flex: 1, overflow: 'hidden' }}>
            <MemoizedCalendarScreen />
          </View>
          <View style={{ width: screenWidth, flex: 1, overflow: 'hidden' }}>
            <MemoizedSettingsScreen />
          </View>
        </Animated.View>
      </View>

      {/* Minimalist Cupertino Bottom Island with 4 Icons */}
      <View style={styles.floatingContainer} pointerEvents="box-none">
        <View style={[styles.island, { backgroundColor: theme.tabBarBg, borderColor: theme.border }]}>
          <Animated.View
            style={[
              styles.slidingPill,
              {
                width: TAB_WIDTH,
                backgroundColor: theme.pillBg,
                borderColor: theme.accent,
                transform: [{ translateX: pillTranslateX }],
              },
            ]}
          />

          {TABS.map((tab, index) => {
            const isFocused = activeIndex === index;
            const tabColor = isFocused ? theme.accent : theme.textSecondary;
            return (
              <TouchableOpacity
                key={tab.key}
                onPress={() => goToTab(index)}
                activeOpacity={0.7}
                style={styles.tabItem}
                accessibilityRole="tab"
                accessibilityLabel={tab.label}
                accessibilityState={{ selected: isFocused }}>
                <CupertinoIcon name={tab.icon} size={20} color={tabColor} />
              </TouchableOpacity>
            );
          })}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    overflow: 'hidden',
    height: Platform.OS === 'web' ? ('100vh' as any) : '100%',
    width: '100%',
  },
  header: {
    height: 56,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  appIconLogo: {
    width: 28,
    height: 28,
    borderRadius: 7,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  versionPill: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: StyleSheet.hairlineWidth,
  },
  versionPillText: {
    fontSize: 11,
    fontWeight: '700',
  },
  screensWrapper: {
    flex: 1,
    overflow: 'hidden',
  },
  screensTrack: {
    flex: 1,
    flexDirection: 'row',
  },
  floatingContainer: {
    position: 'absolute',
    bottom: Platform.OS === 'web' ? 18 : 24,
    left: 0,
    right: 0,
    alignItems: 'center',
    backgroundColor: 'transparent',
    zIndex: 10,
  },
  island: {
    position: 'relative',
    width: ISLAND_WIDTH,
    flexDirection: 'row',
    borderRadius: 28,
    padding: PADDING,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 16,
    elevation: 10,
    borderWidth: StyleSheet.hairlineWidth,
  },
  slidingPill: {
    position: 'absolute',
    left: PADDING,
    top: PADDING,
    bottom: PADDING,
    borderRadius: 23,
    borderWidth: 1,
  },
  tabItem: {
    flex: 1,
    height: 42,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 2,
  },
});
