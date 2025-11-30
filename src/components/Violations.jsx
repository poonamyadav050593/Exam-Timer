import React from 'react';

/**
 * Violation simulation component
 * Props:
 *  - onAdd(typeKey)
 *  - violations object
 */
export default function Violations({ onAdd, violations }) {
  // helper to format date
  const fmt = (d) => (new Date(d)).toLocaleString();

  return (
    <div className="violations">
      <div className="violation-buttons">
        <button className="btn primary" onClick={() => onAdd('multipleFaces')}>Multiple Faces Detected</button>
        <button className="btn primary" onClick={() => onAdd('tabSwitch')}>Tab Switch Detected</button>
        <button className="btn primary" onClick={() => onAdd('prohibitedApp')}>Prohibited Application Detected</button>
      </div>

      <div className="violation-log">
        <h4>Violation Log</h4>
        {Object.entries(violations).every(([, arr]) => arr.length === 0) ? (
          <div className="muted">No violations yet.</div>
        ) : (
          <ul>
            {Object.entries(violations).map(([key, arr]) => (
              arr.map((ts, idx) => (
                <li key={`${key}-${idx}`}><strong>{prettyKey(key)}:</strong> {fmt(ts)}</li>
              ))
            ))}
          </ul>
        )}
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
