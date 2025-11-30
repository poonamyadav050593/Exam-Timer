import React from 'react';
import { BrowserRouter, Routes, Route, Link, useLocation } from 'react-router-dom';
import ExamTimer from './components/ExamTimer.tsx';
import Instructions from './components/Instructions';
import './styles/instructions.css'; // instructions styles (see your styles file)

function Header() {
  const location = useLocation();
  return (
    <header className="app-header">
      <div className="header-inner">
        <h1 className="logo">Exam Timer</h1>
      </div>
    </header>
  );
}

/**
 * Wrapper to extract router state and pass autoStart to the timer.
 */
function ExamRouteWrapper() {
  const location = useLocation();
  const autoStart = location.state?.autoStart === true;
  return (
    <section className="exam-wrapper">
      <ExamTimer autoStart={autoStart} />
    </section>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <div className="app-root">
        <Header />

        <main className="app-main">
          <Routes>
            <Route path="/" element={<Instructions />} />
            <Route path="/exam" element={<ExamRouteWrapper />} />
          </Routes>
        </main>

        <footer className="app-footer">Built with ❤️ — JSX version</footer>

        {/* App-level layout styles (small) */}
        <style>{`
          .app-root {
            display: flex;
            flex-direction: column;
            min-height: 100vh;
            font-family: Inter, system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial;
            background: #f6f8fb;
            color: #0f1724;
          }
          .app-header {
            background: linear-gradient(90deg,#0b84ff, #3b82f6);
            color: white;
            padding: 16px;
            box-shadow: 0 2px 8px rgba(12, 19, 31, 0.08);
          }
          .header-inner {
            max-width: 980px;
            margin: 0 auto;
            display: flex;
            align-items: center;
            justify-content: space-between;
          }
          .logo {
            margin: 0;
            font-size: 18px;
            letter-spacing: 0.2px;
          }
          .link-btn {
            color: white;
            text-decoration: none;
            font-size: 14px;
            padding: 8px 10px;
          }

          .app-main {
            flex: 1;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 28px 16px;
          }

          .exam-wrapper {
            width: 100%;
            max-width: 980px;
          }

          .app-footer {
            text-align: center;
            padding: 12px 10px;
            font-size: 13px;
            color: #6b7280;
          }

          @media (max-width: 640px) {
            .header-inner { padding: 0 6px; }
            .logo { font-size: 16px; }
          }
        `}</style>
      </div>
    </BrowserRouter>
  );
}
