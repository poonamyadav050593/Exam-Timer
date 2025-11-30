export type ViolationKey = 'multipleFaces' | 'tabSwitch' | 'prohibitedApp';

export interface ViolationMap {
  multipleFaces: Date[];
  tabSwitch: Date[];
  prohibitedApp: Date[];
}

export interface TimerState {
  remainingMs: number;
  running: boolean;
  ended: boolean;
}