import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Violations from './Violations';
import Summary from './Summary';
import type { ViolationMap, ViolationKey } from '../types';

const INITIAL_DURATION_MS = 45 * 60 * 1000;
const STORAGE_KEY = 'exam_timer_state_v1';

function formatTime(ms: number): string {
  const totalSeconds = Math.max(0, Math.round(ms / 1000));
  const m = Math.floor(totalSeconds / 60).toString().padStart(2, '0');
  const s = (totalSeconds % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}

type Persisted = {
  remainingMs: number;
  running: boolean;
  ended: boolean;
  startedAt: number | null;
  soundOn: boolean;
  violations: ViolationMap;
};


export default function ExamTimer({ autoStart }: { autoStart?: boolean }): JSX.Element {
  const navigate = useNavigate();

  // timer state
  const [remainingMs, setRemainingMs] = useState<number>(INITIAL_DURATION_MS);
  const [running, setRunning] = useState<boolean>(false);
  const [ended, setEnded] = useState<boolean>(false);
  const [soundOn, setSoundOn] = useState<boolean>(true);
  const [violations, setViolations] = useState<ViolationMap>({
    multipleFaces: [],
    tabSwitch: [],
    prohibitedApp: []
  });

  // audio / beep (Web Audio API)
  const audioCtxRef = useRef<AudioContext | null>(null);
  const oscillatorRef = useRef<OscillatorNode | null>(null);
  const gainRef = useRef<GainNode | null>(null);

  // track if audio is unlocked (user gesture or autoplay allowed)
  const [audioUnlocked, setAudioUnlocked] = useState<boolean>(false);
  const autoplayAttemptedRef = useRef<boolean>(false);

  // hidden title ticker and core interval
  const hiddenTitleIntervalRef = useRef<number | null>(null);
  const intervalRef = useRef<number | null>(null);
  const startedAtRef = useRef<number | null>(null);

  // notification ref for critical alert
  const criticalNotifRef = useRef<Notification | null>(null);
  const prevRemainingRef = useRef<number>(Math.max(0, Math.round(remainingMs / 1000)));

  function saveStateToStorage(state?: Partial<Persisted>) {
    try {
      const toPersist: Persisted = {
        remainingMs: state?.remainingMs ?? remainingMs,
        running: state?.running ?? running,
        ended: state?.ended ?? ended,
        startedAt: state?.startedAt ?? startedAtRef.current ?? null,
        soundOn: state?.soundOn ?? soundOn,
        violations: state?.violations ?? violations
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(toPersist));
    } catch {}
  }

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed: Persisted = JSON.parse(raw);
        setRemainingMs(parsed.remainingMs ?? INITIAL_DURATION_MS);
        setRunning(Boolean(parsed.running));
        setEnded(Boolean(parsed.ended));
        setSoundOn(Boolean(parsed.soundOn ?? true));
        setViolations(parsed.violations ?? { multipleFaces: [], tabSwitch: [], prohibitedApp: [] });
        startedAtRef.current = parsed.startedAt ?? null;
      }
    } catch {}
  }, []);

  useEffect(() => {
    saveStateToStorage();
  }, [remainingMs, running, ended, soundOn, violations]);

  // --- AudioContext helpers (built-in beep) ---
  function ensureAudioContext() {
    if (!audioCtxRef.current) {
      try {
        const C = (window.AudioContext || (window as any).webkitAudioContext);
        if (!C) return null;
        audioCtxRef.current = new C();
      } catch {
        audioCtxRef.current = null;
      }
    }
    return audioCtxRef.current;
  }

  function startCriticalBeep() {
    if (!soundOn) return;
    try {
      const ctx = ensureAudioContext();
      if (!ctx) return;
      if (ctx.state === 'suspended') {
        void ctx.resume().catch(() => {});
      }
      if (oscillatorRef.current) return;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = 880;
      gain.gain.value = 0.08;
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      oscillatorRef.current = osc;
      gainRef.current = gain;
    } catch {
      // nothing
    }
  }

  function stopCriticalBeep() {
    try {
      if (oscillatorRef.current) {
        try { oscillatorRef.current.stop(); } catch {}
        try { oscillatorRef.current.disconnect(); } catch {}
        oscillatorRef.current = null;
      }
      if (gainRef.current) {
        try { gainRef.current.disconnect(); } catch {}
        gainRef.current = null;
      }
    } catch {}
  }

  // Request Notification permission on mount if default
  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission().catch(() => {});
    }
  }, []);

  // --- attempt autoplay/resume audio automatically on mount (best-effort) ---
  useEffect(() => {
    if (autoplayAttemptedRef.current) return;
    autoplayAttemptedRef.current = true;

    (async function tryAutoUnlock() {
      try {
        const ctx = ensureAudioContext();
        if (!ctx) {
          setAudioUnlocked(false);
          return;
        }
        await ctx.resume();
        setAudioUnlocked(true);
      } catch {
        setAudioUnlocked(false);
      }
    })();
  }, []);

  function unlockAudioWithUserGesture() {
    try {
      const ctx = ensureAudioContext();
      if (!ctx) {
        setAudioUnlocked(false);
        return;
      }
      void ctx.resume()
        .then(() => {
          setAudioUnlocked(true);
          try {
            const osc = ctx.createOscillator();
            const g = ctx.createGain();
            osc.type = 'sine';
            osc.frequency.value = 880;
            g.gain.value = 0.06;
            osc.connect(g); g.connect(ctx.destination);
            osc.start();
            setTimeout(() => {
              try { osc.stop(); } catch {}
              try { osc.disconnect(); } catch {}
              try { g.disconnect(); } catch {}
            }, 200);
          } catch {}
        })
        .catch(() => {
          setAudioUnlocked(false);
        });
    } catch {
      setAudioUnlocked(false);
    }
  }

  // --- warn user when closing tab while timer is running ---
  useEffect(() => {
    function onBeforeUnload(e: BeforeUnloadEvent) {
      if (running && !ended) {
        e.preventDefault();
        e.returnValue = "";
      }
    }
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [running, ended]);

  useEffect(() => {
    if (intervalRef.current) {
      window.clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    function recomputeAndSetRemaining() {
      if (running && !ended && startedAtRef.current) {
        const elapsed = Date.now() - startedAtRef.current;
        const newRemaining = Math.max(0, INITIAL_DURATION_MS - elapsed);
        setRemainingMs((prev) => (prev !== newRemaining ? newRemaining : prev));
        if (newRemaining === 0) {
          setRunning(false);
          setEnded(true);
        }
      }
    }
    if (running && !ended) {
      recomputeAndSetRemaining();
      intervalRef.current = window.setInterval(recomputeAndSetRemaining, 500);
    } else {
      recomputeAndSetRemaining();
    }
    return () => {
      if (intervalRef.current) {
        window.clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [running, ended]);

  // --- visibility change: update UI and (hidden) title ticker handling ---
  useEffect(() => {
    function clearHiddenTicker() {
      if (hiddenTitleIntervalRef.current) {
        window.clearInterval(hiddenTitleIntervalRef.current);
        hiddenTitleIntervalRef.current = null;
      }
    }
    function computeMsForTitle() {
      if (running && startedAtRef.current) {
        const elapsed = Date.now() - startedAtRef.current;
        return Math.max(0, INITIAL_DURATION_MS - elapsed);
      }
      return remainingMs;
    }
    function updateHiddenTitleTick() {
      const ms = computeMsForTitle();
      document.title = `${formatTime(ms)} — Exam Timer`;
    }
    function onVisibilityChangeSetTitle() {
      if (document.hidden) {
        updateHiddenTitleTick();
        clearHiddenTicker();
        hiddenTitleIntervalRef.current = window.setInterval(updateHiddenTitleTick, 1000);
      } else {
        clearHiddenTicker();
        if (ended) document.title = 'Session Complete';
        else document.title = 'Exam Timer';
      }
    }
    document.addEventListener('visibilitychange', onVisibilityChangeSetTitle);
    onVisibilityChangeSetTitle();
    return () => {
      document.removeEventListener('visibilitychange', onVisibilityChangeSetTitle);
      clearHiddenTicker();
    };
  }, [remainingMs, running, ended]);

  // --- storage event sync across tabs ---
  useEffect(() => {
    function onStorage(e: StorageEvent) {
      if (e.key !== STORAGE_KEY) return;
      if (!e.newValue) return;
      try {
        const parsed: Persisted = JSON.parse(e.newValue);
        setRemainingMs(parsed.remainingMs ?? INITIAL_DURATION_MS);
        setRunning(Boolean(parsed.running));
        setEnded(Boolean(parsed.ended));
        setSoundOn(Boolean(parsed.soundOn ?? true));
        setViolations(parsed.violations ?? { multipleFaces: [], tabSwitch: [], prohibitedApp: [] });
        startedAtRef.current = parsed.startedAt ?? null;
      } catch {}
    }
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  function startCriticalAlert() {
    try {
      if ('Notification' in window && Notification.permission === 'granted') {
        // close any existing one first and clean handlers
        if (criticalNotifRef.current) {
          try {
            try { criticalNotifRef.current.removeEventListener?.('close', stopCriticalBeep); } catch {}
            criticalNotifRef.current.onclose = null;
            criticalNotifRef.current.onclick = null;
            criticalNotifRef.current.close();
          } catch {}
          criticalNotifRef.current = null;
        }

        const notif = new Notification('Exam Timer — 1 minute remaining', {
          body: 'Critical: 1 minute left. Please wrap up.',
          tag: 'exam-timer-critical',
          requireInteraction: true,
        });

        criticalNotifRef.current = notif;

        // when user closes the notification, stop the beep
        try {
          notif.onclose = () => {
            stopCriticalBeep();
          };
          // some browsers fire 'close' as an event
          notif.addEventListener?.('close', () => stopCriticalBeep());
        } catch {
          // ignore if not supported
        }

        // clicking notification focuses the tab and also stop the beep
        try {
          notif.onclick = (ev) => {
            try { window.focus(); } catch {}
            stopCriticalBeep();
            try { notif.close(); } catch {}
          };
        } catch {
          // ignore
        }
      }
    } catch {}
  }

  function stopCriticalAlert() {
    try {
      if (criticalNotifRef.current) {
        try {
          try { criticalNotifRef.current.removeEventListener?.('close', stopCriticalBeep); } catch {}
          criticalNotifRef.current.onclose = null;
          criticalNotifRef.current.onclick = null;
        } catch {}
        try { criticalNotifRef.current.close(); } catch {}
        criticalNotifRef.current = null;
      }
    } catch {}
    finally {
      stopCriticalBeep();
    }
  }

  useEffect(() => {
    const prev = prevRemainingRef.current;
    const remainingSec = Math.max(0, Math.round(remainingMs / 1000));

    if (prev > 300 && remainingSec <= 300 && remainingSec > 60) {
      try { if ('Notification' in window && Notification.permission === 'granted') new Notification('Exam Timer', { body: '5 minutes remaining', tag: 'exam-timer' }); } catch {}
    }

    if (prev > 60 && remainingSec <= 60 && remainingSec > 0) {
      try {
        if ('Notification' in window && Notification.permission === 'granted') {
          // start critical notification (with handlers attached)
          startCriticalAlert();
        }
      } catch {}

      // If audio unlocked, start beep. Otherwise attempt best-effort resume and start beep.
      if (audioUnlocked) {
        startCriticalBeep();
      } else {
        try {
          const ctx = ensureAudioContext();
          if (ctx) void ctx.resume().catch(() => {});
          startCriticalBeep();
        } catch {}
      }
    }

    if (prev <= 60 && remainingSec > 60) {
      stopCriticalAlert();
    }
    if (remainingSec === 0) {
      stopCriticalAlert();
    }

    prevRemainingRef.current = remainingSec;
  }, [remainingMs, audioUnlocked, soundOn]);

  // --- critical alert cleanup on unmount ---
  useEffect(() => {
    return () => {
      try { if (criticalNotifRef.current) criticalNotifRef.current.close(); } catch {}
      stopCriticalBeep();
    };
  }, []);

  // --- control handlers ---
  function handleStart() {
    if (!running && !ended) {
      try {
        const ctx = ensureAudioContext();
        if (ctx && ctx.state === 'suspended') {
          void ctx.resume().then(() => setAudioUnlocked(true)).catch(() => {});
        } else if (ctx) {
          setAudioUnlocked(true);
        }
      } catch {}
      const computedStartedAt = Date.now() - (INITIAL_DURATION_MS - remainingMs);
      startedAtRef.current = computedStartedAt;
      setRunning(true);
      saveStateToStorage({ startedAt: computedStartedAt, running: true });
      const remainingSec = Math.max(0, Math.round(remainingMs / 1000));
      if (remainingSec <= 60) {
        startCriticalAlert();
        startCriticalBeep();
      }
    }
  }

  function handlePause() {
    if (running) {
      const elapsed = startedAtRef.current ? Date.now() - startedAtRef.current : 0;
      const newRemaining = Math.max(0, INITIAL_DURATION_MS - elapsed);
      setRemainingMs(newRemaining);
      setRunning(false);
      saveStateToStorage({ remainingMs: newRemaining, running: false });
      try { if (criticalNotifRef.current) criticalNotifRef.current.close(); } catch {}
      stopCriticalBeep();
    }
  }

  // UPDATED: handleReset uses react-router navigation to go back to Instructions page
  function handleReset() {
    setRunning(false);
    setEnded(false);
    setRemainingMs(INITIAL_DURATION_MS);
    startedAtRef.current = null;
    const empty = { multipleFaces: [], tabSwitch: [], prohibitedApp: [] };
    setViolations(empty);
    document.title = 'Exam Timer';
    try { localStorage.removeItem(STORAGE_KEY); } catch {}
    try { if (criticalNotifRef.current) criticalNotifRef.current.close(); } catch {}
    stopCriticalBeep();

    // Navigate back to instructions (router-native)
    try {
      navigate('/', { replace: true });
    } catch (e) {
      // fallback to hash navigation if navigate fails
      try {
        window.history.replaceState(null, '', '#/');
        if (window.location.hash !== '#/') window.location.hash = '#/';
      } catch {}
    }
  }

  function handleExitTest() {
    setRunning(false);
    if (!startedAtRef.current) {
      if (remainingMs < INITIAL_DURATION_MS) {
        const elapsed = INITIAL_DURATION_MS - remainingMs;
        startedAtRef.current = Date.now() - elapsed;
      } else {
        startedAtRef.current = Date.now();
      }
    }
    setEnded(true);
    saveStateToStorage({ ended: true, running: false });
    try { if (criticalNotifRef.current) criticalNotifRef.current.close(); } catch {}
    stopCriticalBeep();
  }

  function addViolation(type: ViolationKey) {
    const timestamp = new Date();
    setViolations((prev) => {
      const next = { ...prev, [type]: [...prev[type], timestamp] };
      saveStateToStorage({ violations: next });
      return next;
    });
  }

  // Auto-start if the route passed autoStart flag
  useEffect(() => {
    if (autoStart && !running && !ended) {
      handleStart();
    }
  }, [autoStart]);

  // compute UI values
  const totalViolations = Object.values(violations).reduce((acc, arr) => acc + arr.length, 0);
  const totalSeconds = Math.max(0, Math.round(remainingMs / 1000));

  // --- render ---
  return (
    <div className="exam-timer">
      {/* Enable-sound CTA (visible when autoplay blocked and user hasn't unlocked audio) */}
      {!audioUnlocked && soundOn && (
        <div style={{
          position: 'fixed', right: 16, bottom: 16, zIndex: 9999,
          background: '#111', color: 'white', padding: '10px 14px', borderRadius: 8, boxShadow: '0 6px 18px rgba(0,0,0,0.3)'
        }}>
          <div style={{ marginBottom: 6, fontSize: 13 }}>Enable sound for alerts</div>
          <button
            onClick={() => unlockAudioWithUserGesture()}
            style={{ padding: '8px 12px', borderRadius: 6, border: 'none', background: '#0b84ff', color: 'white', cursor: 'pointer' }}
          >
            Enable Sound
          </button>
        </div>
      )}

      <div className="top-strip">
        <div className="violation-strip">Violations: <span className="badge">{totalViolations}</span></div>
        <div className="controls-right">
          <label className="sound-toggle" style={{ marginRight: 12 }}>
            <input type="checkbox" checked={soundOn} onChange={(e) => { setSoundOn(e.target.checked); saveStateToStorage({ soundOn: e.target.checked }); if (!e.target.checked) stopCriticalBeep(); }} /> Sound @1min
          </label>
          <button className="reset-btn" onClick={handleReset}>Reset</button>
        </div>
      </div>

      <div className={`timer-card ${totalSeconds <= 60 ? 'critical' : totalSeconds <= 300 ? 'warning' : ''}`}>
        <div className={`timer-display ${totalSeconds <= 60 ? 'blink' : ''}`}>{formatTime(remainingMs)}</div>

        <div className="timer-actions">
          {!running && !ended && <button onClick={handleStart} className="btn primary">Start</button>}
          {running && <button onClick={handlePause} className="btn">Pause</button>}
          {!running && !ended && totalSeconds !== Math.round(INITIAL_DURATION_MS / 1000) && <button onClick={() => handleStart()} className="btn">Resume</button>}
          {!ended && <button onClick={handleExitTest} className="btn" title="Exit and show session summary">Exit Test</button>}
        </div>

        <Violations onAdd={addViolation} violations={violations} />
      </div>

      {ended && (
        <div className="overlay">
          <div className="overlay-card">
            <h2>Session Summary</h2>
            <Summary
              startedAt={startedAtRef.current}
              endedAt={Date.now()}
              violations={violations}
            />
            <div className="overlay-actions">
              <button className="btn primary" onClick={handleReset}>New Session</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
