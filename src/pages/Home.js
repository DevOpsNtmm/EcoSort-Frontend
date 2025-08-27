import React, { useState, useRef, useEffect, useContext } from 'react';
import { UNSAFE_NavigationContext } from 'react-router-dom';
import './Home.css';

function Home() {
  const [counter, setCounter] = useState(() => {
    const stored = localStorage.getItem('counter');
    return stored ? parseInt(stored, 10) : 1;
  });

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
  const [fileName, setFileName] = useState('');

  // Block navigation if the system is running
  useBlocker(() => {
    if (isRunning) {
      setBlockMessageVisible(true);
      setTimeout(() => setBlockMessageVisible(false), 3000); // auto-hide after 3s
      return false; // prevent navigation
    }
    return true; // allow navigation
  }, true);

  // Prevent page refresh or close when the system is running
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
    if (stoppedRef.current) return; // Prevent running if stopped
    await captureAndPredict();
  };

  const handleStart = async (isRunning) => {
    stoppedRef.current = false;
    if (!isRunning) {
      try {
        const response = await fetch('http://localhost:5050/home/system_start', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
        });

        if (!response.ok) {
          throw new Error('Failed to notify backend.');
        }

        console.log('System start notified successfully.');
      } catch (error) {
        console.error('Error starting system:', error);
      }

      setIsRunning(true);
      setTrueClass('');
      await sleep(PREDICTION_INTERVAL_MS);
      if (stoppedRef.current) return;  // Prevent running if stopped during sleep
      runPredictionLoop();
    }
  };

  const captureAndPredict = async () => {
    if (stoppedRef.current) return; // Prevent running if stopped

    console.log('Running prediction...');
    try {
      const response = await fetch('http://localhost:5050/home/evaluate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(`Backend error: ${data.error || 'Unknown error'}`);
      }
      setSystemAnalysis(data.label);
      setFileName(data.image_name);
      const confidenceValue = parseFloat(data.confidence);
      setConfidence(confidenceValue);
      setItemNumber(data.inserted_id || null);
      setCapturedImage(`http://localhost:5050/images/${encodeURIComponent(data.image_name)}`);

      console.log(`Label: ${data.label}, Confidence: ${confidenceValue}`)
      if (confidenceValue < 70 && data.label !== "Track") {
          pausePrediction();
      }
      else {
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
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          trueClass,
          systemAnalysis,
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to update: ${response.statusText}`);
      }

    } catch (error) {
      console.error('Error updating true class:', error);
    }

    setDropdownDisabled(true);
    setShowSavedMessage(true);
    handleStart(false);
    setTimeout(() => setShowSavedMessage(false), 1000);

    try {
      const response = await fetch(`http://localhost:5050/home/servo_push`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          trueClass,
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to call servo: ${response.statusText}`);
      }

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
          headers: {
            'Content-Type': 'application/json',
          },
        });

        if (!response.ok) {
          throw new Error('Failed to notify backend.');
        }

        console.log('System stop notified successfully.');
      } catch (error) {
        console.error('Error stopping system:', error);
      }

      if (!paused) {
        setIsRunning(false);
      }
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
        <p style={styles.subtitle}>Smart Waste Classification System</p>
      </div>

      {/* Main Content */}
      <div style={styles.mainContent}>
        {!isRunning ? (
          /* Start State */
          <div style={styles.startCard} className="start-card">
            <h2 style={styles.startTitle}>Ready to Start Classification</h2>
            <button 
              onClick={() => handleStart(false)} 
              style={styles.startButton}
              className="start-button"
            >
              ▶ Start Classification
            </button>
          </div>
        ) : (
          /* Running State */
          <div style={styles.runningSection}>
            {/* Status Card */}
            <div style={styles.statusCard} className="status-card">
              <div style={styles.statusHeader}>
                <div style={styles.statusInfo}>
                  <h3 style={styles.statusTitle}>System Running</h3>
                  <p style={styles.statusText}>Analyzing waste items...</p>
                </div>
              </div>
            </div>

            {/* Results Card */}
            {itemNumber !== null && (
              <div style={styles.resultsCard} className="results-card">
                <h3 style={styles.resultsTitle}>Latest Classification</h3>
                
                {/* Image Section */}
                {capturedImage && (
                  <div style={styles.imageSection}>
                    <img
                      src={capturedImage}
                      alt="Captured item"
                      style={styles.capturedImage}
                      className="captured-image"
                    />
                  </div>
                )}

                {/* Prediction Details */}
                <div style={styles.predictionDetails}>
                  <div style={styles.predictionRow}>
                    <span style={styles.predictionLabel}>Prediction:</span>
                    <span style={styles.predictionValue}>{systemAnalysis}</span>
                  </div>
                  
                  <div style={styles.predictionRow}>
                    <span style={styles.predictionLabel}>Confidence:</span>
                    <div style={styles.confidenceDisplay}>
                      <div style={{
                        ...styles.confidenceBar,
                        width: `${confidence || 0}%`,
                        backgroundColor: (confidence || 0) >= 70 ? '#10b981' : '#f59e0b'
                      }}></div>
                      <span style={styles.confidenceText}>
                        {confidence !== null ? `${confidence.toFixed(1)}%` : '—'}
                      </span>
                    </div>
                  </div>

                  {/* Success Message */}
                  {showSavedMessage && (
                    <div style={styles.successMessage}>
                      <span style={styles.successIcon}>✅</span>
                      <span>Saved successfully!</span>
                    </div>
                  )}

                  {/* Low Confidence Section */}
                  {confidence !== null && confidence < 70 && (
                    <div style={styles.lowConfidenceSection}>
                      <div style={styles.warningHeader}>
                        <span style={styles.warningIcon}>⚠️</span>
                        <span style={styles.warningText}>Low Confidence - Manual Classification Required</span>
                      </div>
                      
                      <div style={styles.classificationForm}>
                        <label style={styles.formLabel}>Select Correct Classification:</label>
                        <select
                          value={trueClass}
                          onChange={(e) => setTrueClass(e.target.value)}
                          disabled={dropdownDisabled}
                          style={styles.classificationDropdown}
                          className="classification-dropdown"
                        >
                          <option value="">-- Select Type --</option>
                          <option value="Paper">Paper</option>
                          <option value="Plastic">Plastic</option>
                          <option value="Other">Other</option>
                          <option value="Track">None</option>
                        </select>
                        
                        <button 
                          onClick={handleManualSave} 
                          style={styles.manualSaveButton}
                          className="manual-save-button"
                          disabled={!trueClass}
                        >
                          💾 Save Manual Classification
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Waiting State */}
            {itemNumber === null && (
              <div style={styles.waitingCard} className="waiting-card">
                <div style={styles.waitingIcon}>⏳</div>
                <h3 style={styles.waitingTitle}>Waiting for Next Prediction</h3>
                <p style={styles.waitingText}>The system is actively monitoring for new items...</p>
              </div>
            )}

            {/* Stop Button */}
            <button 
              onClick={() => handleStop(true, false)} 
              style={styles.stopButton}
              className="stop-button"
            >
              ⏹ Stop & Save
            </button>
          </div>
        )}
      </div>

      {/* Navigation Warning Banner */}
      {blockMessageVisible && (
        <div style={styles.blockBanner} className="block-banner">
          <span style={styles.bannerIcon}>⚠️</span>
          <span>Please stop the classification before navigating away.</span>
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
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
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
  startCard: {
    backgroundColor: '#ffffff',
    borderRadius: '20px',
    padding: '48px',
    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
    border: '1px solid rgba(0, 0, 0, 0.05)',
    textAlign: 'center',
    maxWidth: '500px',
    width: '100%'
  },

  startTitle: {
    fontSize: '1.75rem',
    fontWeight: '600',
    color: '#1e293b',
    margin: '0 0 16px 0'
  },

  startButton: {
    backgroundColor: '#10b981',
    color: '#ffffff',
    border: 'none',
    padding: '16px 32px',
    fontSize: '1.125rem',
    fontWeight: '600',
    borderRadius: '12px',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    margin: '32px auto 0 auto'
  },
  runningSection: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '24px',
    width: '100%'
  },
  statusCard: {
    backgroundColor: '#ffffff',
    borderRadius: '16px',
    padding: '24px',
    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
    border: '1px solid rgba(0, 0, 0, 0.05)',
    width: '100%',
    maxWidth: '600px'
  },
  statusHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px'
  },

  statusInfo: {
    flex: 1
  },
  statusTitle: {
    fontSize: '1.25rem',
    fontWeight: '600',
    color: '#1e293b',
    margin: '0 0 4px 0'
  },
  statusText: {
    fontSize: '1rem',
    color: '#64748b',
    margin: '0'
  },
  resultsCard: {
    backgroundColor: '#ffffff',
    borderRadius: '16px',
    padding: '32px',
    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
    border: '1px solid rgba(0, 0, 0, 0.05)',
    width: '100%',
    maxWidth: '600px'
  },
  resultsTitle: {
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
  capturedImage: {
    maxWidth: '100%',
    maxHeight: '300px',
    height: 'auto',
    borderRadius: '12px',
    boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
    transition: 'transform 0.2s ease'
  },
  predictionDetails: {
    display: 'flex',
    flexDirection: 'column',
    gap: '20px'
  },
  predictionRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '16px',
    backgroundColor: '#f8fafc',
    borderRadius: '8px',
    border: '1px solid #e2e8f0'
  },
  predictionLabel: {
    fontSize: '1rem',
    fontWeight: '600',
    color: '#374151'
  },
  predictionValue: {
    fontSize: '1rem',
    fontWeight: '500',
    color: '#1e293b'
  },
  confidenceDisplay: {
    position: 'relative',
    width: '120px',
    height: '24px',
    backgroundColor: '#f1f5f9',
    borderRadius: '12px',
    overflow: 'hidden'
  },
  confidenceBar: {
    height: '100%',
    borderRadius: '12px',
    transition: 'width 0.3s ease'
  },
  confidenceText: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    fontSize: '12px',
    fontWeight: '600',
    color: '#ffffff',
    textShadow: '0 1px 2px rgba(0, 0, 0, 0.3)'
  },
  successMessage: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '12px 16px',
    backgroundColor: '#dcfce7',
    color: '#166534',
    borderRadius: '8px',
    border: '1px solid #bbf7d0',
    fontSize: '1rem',
    fontWeight: '500'
  },
  successIcon: {
    fontSize: '1.125rem'
  },
  lowConfidenceSection: {
    padding: '20px',
    backgroundColor: '#fef3c7',
    borderRadius: '12px',
    border: '1px solid #fde68a'
  },
  warningHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    marginBottom: '16px'
  },
  warningIcon: {
    fontSize: '1.25rem'
  },
  warningText: {
    fontSize: '1rem',
    fontWeight: '600',
    color: '#92400e'
  },
  classificationForm: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px'
  },
  formLabel: {
    fontSize: '1rem',
    fontWeight: '600',
    color: '#374151'
  },
  classificationDropdown: {
    padding: '12px 16px',
    border: '2px solid #e5e7eb',
    borderRadius: '8px',
    backgroundColor: '#ffffff',
    color: '#374151',
    fontSize: '1rem',
    cursor: 'pointer',
    transition: 'all 0.2s ease'
  },
  manualSaveButton: {
    backgroundColor: '#3b82f6',
    color: '#ffffff',
    border: 'none',
    padding: '12px 24px',
    fontSize: '1rem',
    fontWeight: '600',
    borderRadius: '8px',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    justifyContent: 'center'
  },
  waitingCard: {
    backgroundColor: '#ffffff',
    borderRadius: '16px',
    padding: '32px',
    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
    border: '1px solid rgba(0, 0, 0, 0.05)',
    textAlign: 'center',
    width: '100%',
    maxWidth: '600px'
  },
  waitingIcon: {
    fontSize: '3rem',
    marginBottom: '16px',
    opacity: '0.7'
  },
  waitingTitle: {
    fontSize: '1.25rem',
    fontWeight: '600',
    color: '#1e293b',
    margin: '0 0 8px 0'
  },
  waitingText: {
    fontSize: '1rem',
    color: '#64748b',
    margin: '0'
  },
  stopButton: {
    backgroundColor: '#ef4444',
    color: '#ffffff',
    border: 'none',
    padding: '14px 28px',
    fontSize: '1rem',
    fontWeight: '600',
    borderRadius: '8px',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    display: 'flex',
    alignItems: 'center',
    gap: '8px'
  },
  blockBanner: {
    position: 'fixed',
    top: '24px',
    left: '50%',
    transform: 'translateX(-50%)',
    backgroundColor: '#fef3c7',
    color: '#92400e',
    padding: '16px 24px',
    borderRadius: '12px',
    boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
    zIndex: 1000,
    fontWeight: '600',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    border: '1px solid #fde68a'
  },
  bannerIcon: {
    fontSize: '1.25rem'
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