import React, { useRef, useState, forwardRef, useImperativeHandle } from 'react';
import {
  View,
  ScrollView,
  ScrollViewProps,
  Animated,
  StyleSheet,
  LayoutChangeEvent,
  ViewStyle,
  StyleProp,
} from 'react-native';

export interface ScrollableWithBarProps extends ScrollViewProps {
  indicatorColor?: string;
  trackColor?: string;
  thumbWidth?: number;
  containerStyle?: StyleProp<ViewStyle>;
  trackTopOffset?: number;
  trackBottomOffset?: number;
  trackRightOffset?: number;
}

export const ScrollableWithBar = forwardRef<ScrollView, ScrollableWithBarProps>(
  (
    {
      children,
      style,
      contentContainerStyle,
      containerStyle,
      indicatorColor = '#3b82f6',
      trackColor,
      thumbWidth = 4,
      trackTopOffset = 4,
      trackBottomOffset = 4,
      trackRightOffset = 0,
      onScroll,
      onLayout,
      onContentSizeChange,
      ...rest
    },
    ref
  ) => {
    const scrollViewRef = useRef<ScrollView>(null);
    useImperativeHandle(ref, () => scrollViewRef.current as ScrollView);

    const scrollY = useRef(new Animated.Value(0)).current;
    const [contentHeight, setContentHeight] = useState(1);
    const [visibleHeight, setVisibleHeight] = useState(1);

    const handleLayout = (e: LayoutChangeEvent) => {
      setVisibleHeight(e.nativeEvent.layout.height);
      onLayout?.(e);
    };

    const handleContentSizeChange = (w: number, h: number) => {
      setContentHeight(h);
      onContentSizeChange?.(w, h);
    };

    const hasScroll = contentHeight > visibleHeight + 4;

    const trackHeight = Math.max(0, visibleHeight - trackTopOffset - trackBottomOffset);
    const rawThumbHeight =
      visibleHeight > 0 && contentHeight > 0
        ? (visibleHeight / contentHeight) * trackHeight
        : 28;
    const thumbHeight = Math.min(trackHeight, Math.max(24, rawThumbHeight));
    const maxThumbTranslate = Math.max(0, trackHeight - thumbHeight);
    const scrollRange = Math.max(1, contentHeight - visibleHeight);

    const translateY = scrollY.interpolate({
      inputRange: [0, scrollRange],
      outputRange: [0, maxThumbTranslate],
      extrapolate: 'clamp',
    });

    return (
      <View style={[styles.container, containerStyle]}>
        <Animated.ScrollView
          ref={scrollViewRef as any}
          style={[styles.scrollView, style]}
          contentContainerStyle={contentContainerStyle}
          showsVerticalScrollIndicator={false}
          onLayout={handleLayout}
          onContentSizeChange={handleContentSizeChange}
          scrollEventThrottle={16}
          onScroll={Animated.event(
            [{ nativeEvent: { contentOffset: { y: scrollY } } }],
            { useNativeDriver: true, listener: onScroll }
          )}
          {...rest}>
          {children}
        </Animated.ScrollView>

        {hasScroll && trackHeight > 20 && (
          <View
            pointerEvents="none"
            style={[
              styles.track,
              {
                right: trackRightOffset,
                top: trackTopOffset,
                bottom: trackBottomOffset,
                width: thumbWidth,
                backgroundColor: trackColor || 'rgba(150, 150, 150, 0.15)',
              },
            ]}>
            <Animated.View
              style={[
                styles.thumb,
                {
                  width: thumbWidth,
                  height: thumbHeight,
                  backgroundColor: indicatorColor,
                  transform: [{ translateY }],
                },
              ]}
            />
          </View>
        )}
      </View>
    );
  }
);

ScrollableWithBar.displayName = 'ScrollableWithBar';

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    flexShrink: 1,
  },
  scrollView: {
    flexGrow: 0,
    flexShrink: 1,
  },
  track: {
    position: 'absolute',
    borderRadius: 999,
  },
  thumb: {
    borderRadius: 999,
  },
});
