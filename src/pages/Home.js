import React, { useState, useRef, useEffect, useContext } from 'react';
import { UNSAFE_NavigationContext } from 'react-router-dom';
import './Home.css';

function Home() {
  const intervalRef = useRef(null);
  const stoppedRef = useRef(false);
  const PREDICTION_INTERVAL_MS = 250;
  const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

  const [blockMessageVisible, setBlockMessageVisible] = useState(false);
  const [dropdownDisabled, setDropdownDisabled] = useState(false);
  const [showSavedMessage, setShowSavedMessage] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const [itemNumber, setItemNumber] = useState(null);
  const [systemAnalysis, setSystemAnalysis] = useState('');
  const [confidence, setConfidence] = useState(null);
  const [trueClass, setTrueClass] = useState('');
  const [capturedImage, setCapturedImage] = useState(null);

  useBlocker(() => {
    if (isRunning) {
      setBlockMessageVisible(true);
      setTimeout(() => setBlockMessageVisible(false), 3000);
      return false;
    }
    return true;
  }, true);

  useEffect(() => {
    const handleBeforeUnload = (event) => {
      if (isRunning) {
        const message = '⚠️ Are you sure you want to leave? Your classification is still running.';
        event.returnValue = message;
        return message;
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [isRunning]);

  const runPredictionLoop = async () => {
    if (stoppedRef.current) return;
    await captureAndPredict();
  };

  const handleStart = async (isRunning) => {
    stoppedRef.current = false;
    if (!isRunning) {
      try {
        const response = await fetch('http://localhost:5050/home/system_start', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
        });
        if (!response.ok) throw new Error('Failed to notify backend.');
        console.log('System start notified successfully.');
      } catch (error) {
        console.error('Error starting system:', error);
      }
      setIsRunning(true);
      setTrueClass('');
      await sleep(PREDICTION_INTERVAL_MS);
      if (stoppedRef.current) return;
      runPredictionLoop();
    }
  };

  const captureAndPredict = async () => {
    if (stoppedRef.current) return;
    console.log('Running prediction...');
    try {
      const response = await fetch('http://localhost:5050/home/evaluate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      const data = await response.json();
      if (!response.ok) throw new Error(`Backend error: ${data.error || 'Unknown error'}`);
      setSystemAnalysis(data.label);
      const confidenceValue = parseFloat(data.confidence);
      setConfidence(confidenceValue);
      setItemNumber(data.inserted_id || null);
      setCapturedImage(`http://localhost:5050/images/${encodeURIComponent(data.image_name)}`);
      console.log(`Label: ${data.label}, Confidence: ${confidenceValue}`);
      if (confidenceValue < 70 && data.label !== "Track") {
        pausePrediction();
      } else {
        if (!stoppedRef.current) {
          const timeoutId = setTimeout(captureAndPredict, PREDICTION_INTERVAL_MS);
          intervalRef.current = timeoutId;
        }
      }
    } catch (error) {
      console.error('Error capturing and predicting:', error);
    }
  };

  const pausePrediction = () => {
    clearTimeout(intervalRef.current);
    intervalRef.current = null;
    handleStop(true, true);
    setDropdownDisabled(false);
    console.log('🛑 Prediction paused due to low confidence.');
  };

  const handleManualSave = async () => {
    if (!trueClass) {
      alert('⚠️ Please select a classification before saving.');
      return;
    }
    try {
      const response = await fetch(`http://localhost:5050/dashboard/results/${itemNumber}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ trueClass, systemAnalysis }),
      });
      if (!response.ok) throw new Error(`Failed to update: ${response.statusText}`);
    } catch (error) {
      console.error('Error updating true class:', error);
    }
    setDropdownDisabled(true);
    setShowSavedMessage(true);
    
    // Add delay before starting new classification to show results longer
    setTimeout(() => {
      handleStart(false);
      setShowSavedMessage(false);
    }, 2000); // 2 seconds delay instead of immediate
    
    try {
      const response = await fetch(`http://localhost:5050/home/servo_push`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ trueClass }),
      });
      if (!response.ok) throw new Error(`Failed to call servo: ${response.statusText}`);
    } catch (error) {
      console.error('Error calling servo endpoint:', error);
    }
    await fetch(`http://localhost:5050/dashboard/copy_uncertain/${itemNumber}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ trueClass }),
    });
    setTrueClass('');
  };

  const handleStop = async (isRunning, paused) => {
    stoppedRef.current = true;
    if (intervalRef.current) {
      clearTimeout(intervalRef.current);
      intervalRef.current = null;
    }
    if (isRunning) {
      try {
        const response = await fetch('http://localhost:5050/home/system_stop', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
        });
        if (!response.ok) throw new Error('Failed to notify backend.');
        console.log('System stop notified successfully.');
      } catch (error) {
        console.error('Error stopping system:', error);
      }
      if (!paused) setIsRunning(false);
    }
  };

  return (
    <div style={styles.container}>
      {/* Header Section */}
      <div style={styles.header}>
        <h1 style={styles.title}>
          <span style={styles.emoji}>♻️</span>
          <span style={styles.gradientText}>EcoSort</span>
        </h1>
        <p style={styles.subtitle}>Smart Trash Classification System</p>
      </div>

      {/* Main Content */}
      <div style={styles.mainContent}>
        {!isRunning ? (
          <div style={styles.startSection}>
            <div style={styles.startCard} className="start-card">
              <h2 style={styles.startTitle}>Ready to Start</h2>
              <p style={styles.startDescription}>
                Click the button below to begin automatic waste classification
              </p>
              <button onClick={() => handleStart(false)} style={styles.startButton} className="start-button">
                ▶ Start Classification
              </button>
            </div>
          </div>
        ) : (
          <div style={styles.resultSection}>
            <div style={styles.resultCard} className="result-card">
              
              {/* Image Display */}
              {capturedImage && (
                <div style={styles.imageSection}>
                  <img
                    src={capturedImage}
                    alt="Captured item"
                    style={styles.image}
                    className="captured-image"
                  />
                </div>
              )}

              {/* Prediction Results */}
              {itemNumber !== null ? (
                <div style={styles.predictionSection}>
                  <div style={styles.predictionRow}>
                    <div style={styles.predictionItem}>
                      <span style={styles.predictionLabel}>🎯 Prediction:</span>
                      <span style={styles.predictionValue}>
                        {systemAnalysis === "Track" ? "—" : systemAnalysis}
                      </span>
                    </div>
                    <div style={styles.predictionItem}>
                      <span style={styles.predictionLabel}>📊 Confidence:</span>
                      <span style={styles.confidenceValue}>
                        {confidence !== null ? `${confidence}%` : "—"}
                      </span>
                    </div>
                  </div>

                  {/* Success Message */}
                  {showSavedMessage && (
                    <div style={styles.successMessage}>
                      <span style={styles.successIcon}>✅</span>
                      <span style={styles.successText}>Classification saved successfully!</span>
                    </div>
                  )}

                  {/* Low Confidence Handling */}
                  {confidence !== null && confidence < 70 && (
                    <div style={styles.lowConfidenceSection}>
                      <div style={styles.warningHeader}>
                        <span style={styles.warningIcon}>⚠️</span>
                        <span style={styles.warningText}>Low confidence detected</span>
                      </div>
                      <p style={styles.warningDescription}>
                        Please classify this item manually to improve accuracy
                      </p>
                      
                      {/* Confidence Level Indicator */}
                      <div style={styles.confidenceIndicator}>
                        <span style={styles.confidenceLabel}>Current Confidence:</span>
                        <span style={styles.lowConfidenceValue}>{confidence}%</span>
                      </div>
                      
                      <div style={styles.manualClassification}>
                        <select
                          value={trueClass}
                          onChange={(e) => setTrueClass(e.target.value)}
                          disabled={dropdownDisabled}
                          style={styles.dropdown}
                          className="classification-dropdown"
                        >
                          <option value="">-- Select Classification --</option>
                          <option value="Paper">Paper</option>
                          <option value="Plastic">Plastic</option>
                          <option value="Other">Other</option>
                          <option value="Track">None</option>
                        </select>
                        
                        <button onClick={handleManualSave} style={styles.manualSaveButton} className="manual-save-button">
                          Save Manual Classification
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div style={styles.waitingSection}>
                  <div style={styles.waitingIcon}>⏳</div>
                  <p style={styles.waitingText}>Waiting for next prediction...</p>
                </div>
              )}
            </div>

            <button onClick={() => handleStop(true, false)} style={styles.stopButton} className="stop-button">
              ⏹ Stop & Save
            </button>
          </div>
        )}
      </div>

      {/* Navigation Warning Banner */}
      {blockMessageVisible && (
        <div style={styles.blockBanner} className="block-banner">
          <span style={styles.bannerIcon}>⚠️</span>
          <span style={styles.bannerText}>Please stop the classification before navigating away.</span>
        </div>
      )}
    </div>
  );
}

const styles = {
  container: {
    padding: '32px',
    maxWidth: '1000px',
    margin: '0 auto',
    backgroundColor: '#f8fafc',
    minHeight: '100vh'
  },
  header: {
    textAlign: 'center',
    marginBottom: '48px'
  },
  title: {
    fontSize: '3rem',
    fontWeight: '700',
    margin: '0 0 16px 0',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '16px'
  },
  emoji: {
    fontSize: '3rem',
    filter: 'none'
  },
  gradientText: {
    background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    backgroundClip: 'text'
  },
  subtitle: {
    fontSize: '1.25rem',
    color: '#64748b',
    margin: '0',
    fontWeight: '500'
  },
  mainContent: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '32px'
  },
  startSection: {
    width: '100%',
    maxWidth: '500px'
  },
  startCard: {
    backgroundColor: '#ffffff',
    borderRadius: '20px',
    padding: '48px 32px',
    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
    border: '1px solid rgba(0, 0, 0, 0.05)',
    textAlign: 'center',
    transition: 'all 0.3s ease'
  },
  startIcon: {
    fontSize: '4rem',
    marginBottom: '24px',
    display: 'block'
  },
  startTitle: {
    fontSize: '1.75rem',
    fontWeight: '600',
    color: '#1e293b',
    margin: '0 0 16px 0'
  },
  startDescription: {
    fontSize: '1.125rem',
    color: '#64748b',
    margin: '0 0 32px 0',
    lineHeight: '1.6'
  },
  startButton: {
    backgroundColor: '#10b981',
    color: '#ffffff',
    border: 'none',
    padding: '18px 40px',
    fontSize: '1.125rem',
    fontWeight: '600',
    borderRadius: '12px',
    cursor: 'pointer',
    transition: 'all 0.3s ease',
    display: 'inline-flex',
    alignItems: 'center',
    gap: '8px'
  },
  resultSection: {
    width: '100%',
    maxWidth: '600px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '24px'
  },
  resultCard: {
    backgroundColor: '#ffffff',
    borderRadius: '20px',
    padding: '32px',
    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
    border: '1px solid rgba(0, 0, 0, 0.05)',
    width: '100%'
  },
  resultTitle: {
    fontSize: '1.5rem',
    fontWeight: '600',
    color: '#1e293b',
    margin: '0 0 24px 0',
    textAlign: 'center'
  },
  imageSection: {
    textAlign: 'center',
    marginBottom: '24px'
  },
  image: {
    maxWidth: '100%',
    maxHeight: '300px',
    height: 'auto',
    borderRadius: '16px',
    boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
    transition: 'transform 0.2s ease'
  },
  predictionSection: {
    marginBottom: '24px'
  },
  predictionRow: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '20px',
    marginBottom: '24px'
  },
  predictionItem: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px'
  },
  predictionLabel: {
    fontSize: '0.875rem',
    fontWeight: '600',
    color: '#64748b',
    textTransform: 'uppercase',
    letterSpacing: '0.05em'
  },
  predictionValue: {
    fontSize: '1.25rem',
    fontWeight: '700',
    color: '#1e293b'
  },
  confidenceValue: {
    fontSize: '1.25rem',
    fontWeight: '700',
    color: '#10b981'
  },
  successMessage: {
    backgroundColor: '#dcfce7',
    border: '1px solid #bbf7d0',
    borderRadius: '12px',
    padding: '16px',
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    marginBottom: '24px'
  },
  successIcon: {
    fontSize: '1.25rem'
  },
  successText: {
    fontSize: '1rem',
    fontWeight: '600',
    color: '#166534'
  },
  lowConfidenceSection: {
    backgroundColor: '#fef2f2',
    border: '2px solid #fca5a5',
    borderRadius: '16px',
    padding: '24px',
    marginTop: '24px',
    boxShadow: '0 4px 6px -1px rgba(239, 68, 68, 0.1)'
  },
  warningHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    marginBottom: '12px'
  },
  warningIcon: {
    fontSize: '1.5rem'
  },
  warningText: {
    fontSize: '1.125rem',
    fontWeight: '600',
    color: '#dc2626'
  },
  warningDescription: {
    fontSize: '1rem',
    color: '#7f1d1d',
    margin: '0 0 20px 0',
    lineHeight: '1.5'
  },
  confidenceIndicator: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    marginBottom: '20px',
    padding: '12px 16px',
    backgroundColor: '#ffffff',
    borderRadius: '8px',
    border: '1px solid #fecaca'
  },
  confidenceLabel: {
    fontSize: '1rem',
    fontWeight: '500',
    color: '#374151'
  },
  lowConfidenceValue: {
    fontSize: '1.25rem',
    fontWeight: '700',
    color: '#dc2626'
  },
  manualClassification: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px'
  },
  dropdown: {
    width: '100%',
    padding: '14px 16px',
    fontSize: '16px',
    borderRadius: '8px',
    border: '2px solid #e5e7eb',
    backgroundColor: '#ffffff',
    color: '#374151',
    cursor: 'pointer',
    transition: 'all 0.2s ease'
  },
  manualSaveButton: {
    backgroundColor: '#3b82f6',
    color: '#ffffff',
    border: 'none',
    padding: '14px 24px',
    fontSize: '16px',
    fontWeight: '600',
    borderRadius: '8px',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px'
  },
  waitingSection: {
    textAlign: 'center',
    padding: '40px 20px'
  },
  waitingIcon: {
    fontSize: '3rem',
    marginBottom: '16px',
    opacity: '0.6'
  },
  waitingText: {
    fontSize: '1.125rem',
    color: '#64748b',
    margin: '0',
    fontWeight: '500'
  },
  stopButton: {
    backgroundColor: '#ef4444',
    color: '#ffffff',
    border: 'none',
    padding: '16px 32px',
    fontSize: '16px',
    fontWeight: '600',
    borderRadius: '12px',
    cursor: 'pointer',
    transition: 'all 0.3s ease',
    display: 'flex',
    alignItems: 'center',
    gap: '8px'
  },
  blockBanner: {
    position: 'fixed',
    top: '24px',
    left: '50%',
    transform: 'translateX(-50%)',
    backgroundColor: '#f59e0b',
    color: '#92400e',
    padding: '16px 24px',
    borderRadius: '12px',
    boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
    zIndex: 1000,
    fontWeight: '600',
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    maxWidth: '90vw',
    textAlign: 'center'
  },
  bannerIcon: {
    fontSize: '1.25rem'
  },
  bannerText: {
    fontSize: '1rem'
  }
};

function useBlocker(blocker, when = true) {
  const navigator = useContext(UNSAFE_NavigationContext).navigator;
  useEffect(() => {
    if (!when) return;
    const push = navigator.push;
    navigator.push = (...args) => {
      const result = blocker();
      if (result !== false) {
        push.apply(navigator, args);
      }
    };
    return () => {
      navigator.push = push;
    };
  }, [blocker, when, navigator]);
}

export default Home;  