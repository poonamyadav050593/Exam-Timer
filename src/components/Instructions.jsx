// src/components/Instructions.jsx
import React from 'react';
import { useNavigate } from 'react-router-dom';
import '../styles/instructions.css';

export default function Instructions() {
  const navigate = useNavigate();

  return (
    <section className="instructions">
      <div className="instructions-card">
        <h2>Before you begin</h2>
        <p>
          Read these quick instructions to make sure your session runs smoothly:
        </p>
        <ul>
          <li>Test duration: <strong>6 minutes</strong>.</li>
          <li>Enable notifications and sound for critical alerts (recommended).</li>
          <li>Avoid switching tabs or opening prohibited apps during the test.</li>
          <li>Your session state is saved — refreshing the tab won’t lose progress.</li>
        </ul>

        <div className="controls">
          <button
            className="btn primary start-btn"
            onClick={() => navigate('/exam', { state: { autoStart: true } })}
          >
            Start Test
          </button>

          <button
            className="btn secondary"
            onClick={() => {
              alert('When you click Start Test the timer will begin. Use Pause to stop the timer and Exit Test to finish and view a summary.');
            }}
          >
            How it works
          </button>
        </div>

        <div className="note">
          Tip: If your browser blocks sound, click "Enable Sound" inside the timer when requested.
        </div>
      </div>
    </section>
  );
}
