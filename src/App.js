import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar';
import Home from './pages/Home';
import ResultsDashboard from './pages/ResultsDashboard';
import EditResult from './pages/EditResult';
import Metrics from "./pages/Metrics";


function App() {
  return (
    <Router>
      <div className="App">
        <Navbar />
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/dashboard" element={<ResultsDashboard />} />
          <Route path="/edit/:id" element={<EditResult />} />
          <Route path="/metrics" element={<Metrics />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
