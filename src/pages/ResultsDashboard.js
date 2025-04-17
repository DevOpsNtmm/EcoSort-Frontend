import React, { useEffect, useState } from 'react';
import PopupConfirmation from '../components/PopupConfirmation';

const ResultsDashboard = () => {
  const [modalImage, setModalImage] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [results, setResults] = useState([]);
  const [showPopup, setShowPopup] = useState(false);
  const [showRetrainPopup, setShowRetrainPopup] = useState(false);
  const [accuracyText, setAccuracyText] = useState(null);

  // Load saved results from localStorage on mount
  useEffect(() => {
    const storedResults = JSON.parse(localStorage.getItem('results') || '[]');
    setResults(storedResults);
  }, []);
console.log(results);

const handleAccuracy = () => {
  if (accuracyText) {
    setAccuracyText(null); // hide if already visible
    return;
  }

  if (results.length === 0) {
    setAccuracyText('No results available.');
    return;
  }

  // Filter only entries that have a real trueClass (not '-')
  const relevantResults = results.filter(r => r.trueClass !== '-');

  if (relevantResults.length === 0) {
    setAccuracyText('No labeled results to calculate accuracy.');
    return;
  }

  // Count how many of those are correct
  const correctCount = relevantResults.filter(r => r.systemAnalysis === r.trueClass).length;

  const percent = ((correctCount / relevantResults.length) * 100).toFixed(2);
  setAccuracyText(`📈 System Accuracy: ${percent}%`);
};


  // Clear the saved data
  const handleClear = () => {
    localStorage.removeItem('results');
    sessionStorage.removeItem('counter');
    setResults([]);
    setAccuracyText(null); // reset accuracy text
    alert('All results have been cleared.');
  };

  return (
    <div style={styles.container}>
      <h2 style={styles.title}> EcoSort Results Dashboard</h2>

      {/* Action Buttons */}
      <div style={styles.buttonRow}>
        <button onClick={() => setShowPopup(true)} style={styles.actionButton}>🔄 Reset</button>
        <button onClick={() => setShowRetrainPopup(true)} style={styles.actionButton}>🧠 Retrain</button>
        <button onClick={handleAccuracy} style={styles.actionButton}>📏 Accuracy</button>
        <button onClick={handleClear} style={styles.clearButton}>🗑️ Clear</button>
      </div>

      {/* Accuracy display (click toggle only, no X) */}
      {accuracyText && (
        <div style={styles.accuracyBox}>
          {accuracyText}
        </div>
      )}

      {/* Reset confirmation popup */}
      {showPopup && (
        <PopupConfirmation
          title="Reset Model"
          message="Are you sure you want to reset the model to default?"
          onConfirm={() => {
            alert("Model reset to default (simulated).");
            setShowPopup(false);
          }}
          onCancel={() => setShowPopup(false)}
        />
      )}

      {/* Retrain confirmation popup */}
      {showRetrainPopup && (
        <PopupConfirmation
          title="Retrain Model"
          message="This will add failed items to the training set and retrain. Continue?"
          onConfirm={() => {
            alert("Model retraining simulated.");
            setShowRetrainPopup(false);
          }}
          onCancel={() => setShowRetrainPopup(false)}
        />
      )}

      {/* Results Table */}
      <div style={{ overflowX: 'auto' }}>
        <table style={styles.table}>
          <thead>
            <tr>
              {/* <th style={styles.th}>ID</th> */}
              <th style={styles.th}>Waste Item</th>
              <th style={styles.th}>System Analysis</th>
              <th style={styles.th}>Confidence</th>
              <th style={styles.th}>True Class</th>
              <th style={styles.th}>Status</th>
              <th style={styles.th}>Edit</th>
            </tr>
          </thead>
          <tbody>
            {results.map((entry) => (
              <tr key={entry.id}>
                <td style={styles.td}>
                  {entry.imageData ? (
                    <img
                      src={entry.imageData}
                      alt={`Item ${entry.id}`}
                      style={styles.imageThumb}
                      onClick={() => {
                        setModalImage(entry.imageData);
                        setIsModalOpen(true);
                      }}
                    />
                  ) : (
                    'No Image'
                  )}
                </td>
                <td style={styles.td}>{entry.systemAnalysis}</td>
                <td
                  style={{
                    ...styles.td,
                    color:
                      entry.confidence != null && entry.confidence >= 50 ? '#2e7d32' : '#d32f2f',
                    fontWeight: 'bold',
                  }}
              >
                {entry.confidence != null ? `${entry.confidence.toFixed(1)}%` : '—'}
              </td>

                <td style={styles.td}>{entry.trueClass}</td>
                <td style={styles.td}>
                  {entry.systemAnalysis === entry.trueClass
                    ? '✅'
                    : entry.trueClass === '-'
                    ? "-"
                    : '❌'}
                </td>
                <td style={styles.td}>
                  <a href={`/edit/${entry.id}`} style={styles.editLink}>Edit</a>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {isModalOpen && (
        <div style={styles.modalOverlay} onClick={() => setIsModalOpen(false)}>
          <div style={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <img src={modalImage} alt="Full Preview" style={styles.fullImage} />
          </div>
        </div>
      )}
    </div>  
  );
};

const styles = {
  container: {
    padding: '30px',
    backgroundColor: '#f8fafc',
    minHeight: '100vh',
    fontFamily: 'Arial, sans-serif',
  },
  imageThumb: {
    width: '80px',
    height: '50px',
    objectFit: 'cover',
    borderRadius: '4px',
    boxShadow: '0 1px 4px rgba(0, 0, 0, 0.1)',
  },
  modalOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    width: '100vw',
    height: '100vh',
    backgroundColor: 'rgba(0,0,0,0.7)',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  modalContent: {
    backgroundColor: '#fff',
    padding: '10px',
    borderRadius: '8px',
    boxShadow: '0 2px 10px rgba(0,0,0,0.3)',
    maxWidth: '90%',
    maxHeight: '90%',
  },
  fullImage: {
    maxWidth: '100%',
    maxHeight: '80vh',
    borderRadius: '4px',
  },  
  title: {
    textAlign: 'center',
    color: '#1565c0',
    fontSize: '28px',
    fontWeight: 'bold',
    marginBottom: '25px',
  },
  buttonRow: {
    display: 'flex',
    justifyContent: 'center',
    gap: '12px',
    marginBottom: '25px',
    flexWrap: 'wrap',
  },
  actionButton: {
    backgroundColor: '#1976d2',
    color: '#fff',
    border: 'none',
    padding: '10px 16px',
    fontSize: '15px',
    borderRadius: '6px',
    cursor: 'pointer',
  },
  clearButton: {
    backgroundColor: '#d32f2f',
    color: '#fff',
    border: 'none',
    padding: '10px 16px',
    fontSize: '15px',
    borderRadius: '6px',
    cursor: 'pointer',
  },
  accuracyBox: {
    backgroundColor: '#fffde7',
    color: '#33691e',
    fontSize: '16px',
    fontWeight: 'bold',
    padding: '12px 20px',
    borderRadius: '8px',
    width: 'fit-content',
    margin: '0 auto 25px',
    border: '1px solid #cddc39',
    boxShadow: '0 2px 6px rgba(0,0,0,0.1)',
    textAlign: 'center',
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    backgroundColor: '#ffffff',
    boxShadow: '0 2px 5px rgba(0,0,0,0.05)',
  },
  th: {
    backgroundColor: '#e3f2fd',
    color: '#0d47a1',
    padding: '12px',
    border: '1px solid #ccc',
    fontWeight: 'bold',
  },
  td: {
    padding: '10px',
    border: '1px solid #eee',
    textAlign: 'center',
    fontSize: '15px',
  },
  editLink: {
    color: '#1976d2',
    textDecoration: 'none',
    fontWeight: 'bold',
  }
};

export default ResultsDashboard;
