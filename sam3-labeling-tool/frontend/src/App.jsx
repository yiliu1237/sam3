import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import useStore from './store/useStore';
import Header from './components/Header';
import SingleMode from './pages/SingleMode';
import BatchMode from './pages/BatchMode';
import ToastContainer from './components/ToastContainer';

function App() {
  const theme = useStore((state) => state.theme);

  useEffect(() => {
    // Apply theme to document
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [theme]);

  return (
    <Router>
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors">
        <Header />
        <main className="container mx-auto px-4 py-6">
          <Routes>
            <Route path="/" element={<Navigate to="/single" replace />} />
            <Route path="/single" element={<SingleMode />} />
            <Route path="/batch" element={<BatchMode />} />
          </Routes>
        </main>
        <ToastContainer />
      </div>
    </Router>
  );
}

export default App;
