import type { NativeScrollEvent, NativeSyntheticEvent } from 'react-native';

const PULL = 80;

/** ScrollView props that call `onPull` once dragged down past the top. */
export function pullToLeave(onPull?: () => void) {
  return {
    alwaysBounceVertical: true,
    onScrollEndDrag: (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      const { contentOffset, contentInset } = e.nativeEvent;
      if (contentOffset.y + (contentInset?.top ?? 0) < -PULL) onPull?.();
    },
  };
}
