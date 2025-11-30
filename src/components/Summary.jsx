import React from 'react';

export default function Summary({ startedAt, endedAt, violations = {} }) {
  const durationSec = startedAt ? Math.round((endedAt - startedAt) / 1000) : null;
  const formatDur = (s) => {
    if (s === null) return 'N/A';
    const mm = Math.floor(s/60).toString().padStart(2,'0');
    const ss = (s%60).toString().padStart(2,'0');
    return `${mm}:${ss}`;
  };

  const counts = Object.fromEntries(Object.entries(violations).map(([k, arr]) => [k, arr.length]));

  return (
    <div className="summary">
      <div className="summary-row"><strong>Total Time Taken:</strong> {durationSec ? formatDur(durationSec) : 'N/A'}</div>
      <div className="summary-row"><strong>Violations:</strong>
        <ul>
          <li>Multiple Faces: {counts.multipleFaces || 0}</li>
          <li>Tab Switch: {counts.tabSwitch || 0}</li>
          <li>Prohibited App: {counts.prohibitedApp || 0}</li>
        </ul>
      </div>

      <div className="summary-row">
        <strong>Timeline:</strong>
        <ol>
          {Object.entries(violations).flatMap(([k, arr]) => (
            arr.map((ts, i) => (
              <li key={`${k}-${i}`}>{(new Date(ts)).toLocaleString()} — {prettyKey(k)}</li>
            ))
          ))}
        </ol>
      </div>
    </div>
  );
}

function prettyKey(k) {
  if (k === 'multipleFaces') return 'Multiple Faces Detected';
  if (k === 'tabSwitch') return 'Tab Switch Detected';
  if (k === 'prohibitedApp') return 'Prohibited Application Detected';
  return k;
}
