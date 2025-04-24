import React, { useEffect, useState } from 'react';
import PopupConfirmation from '../components/PopupConfirmation';

const ResultsDashboard = () => {
  const [modalImage, setModalImage] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [results, setResults] = useState([]);
  const [showPopup, setShowPopup] = useState(false);
  const [showRetrainPopup, setShowRetrainPopup] = useState(false);
  const [accuracyText, setAccuracyText] = useState(null);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  useEffect(() => {
    const fetchResultsFromBackend = async () => {
      try {
        const response = await fetch("http://localhost:5050/dashboard/get_results");
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();

        console.log("Fetched results:", data);

        if (!data.samples || data.samples.length === 0) {
          console.warn("No samples received from backend.");
          setResults([]); // trigger empty table message
          return;
        }

        const formattedResults = data.samples.map((item, index) => ({
          id: item._id,
          imageData: `http://localhost:5050/images/${encodeURIComponent(item.image_name)}`,
          systemAnalysis: item.system_analysis,
          confidence: parseFloat(item.confidence_percentage),
          trueClass: item.image_class || '-',
        }));

        setResults(formattedResults);
        console.log(formattedResults);

      } catch (error) {
        console.error("Failed to fetch results from backend:", error);
        setResults([]);
      }
    };

    fetchResultsFromBackend();
  }, []);

  const handleAccuracy = async () => {
    if (accuracyText) {
      setAccuracyText(null); // Hide if already visible
      return;
    }
  
    try {
      const response = await fetch('http://localhost:5050/dashboard/calculate_accuracy');
      if (!response.ok) {
        throw new Error('Failed to calculate accuracy from backend');
      }
  
      const data = await response.json();
      const percent = data.accuracy.toFixed(2);
      console.log(data.accuracy)
      setAccuracyText(`📈 System Accuracy: ${percent}%`);
    } catch (error) {
      console.error('Error fetching accuracy:', error);
      setAccuracyText('Error fetching accuracy.');
    }
  };
  

  // Clear the saved data
  const handleClear = async () => {
    localStorage.removeItem('results');
    sessionStorage.removeItem('counter');
    const response = await fetch("http://localhost:5050/dashboard/samples", {method: "DELETE"});
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    setResults([]);
    setAccuracyText(null); // reset accuracy text
    alert('All results have been cleared.');
  };

  return (
    <div style={styles.container}>
      <h2 style={styles.title}>Results Dashboard</h2>

      {/* Action Buttons */}
      <div style={styles.buttonRow}>
        <button onClick={handleAccuracy} style={styles.accuracyButton}>📊 Model Accuracy</button>
        <div style={styles.menuContainer}>
          <button onClick={() => setIsMenuOpen(!isMenuOpen)} style={styles.menuButton}>⋮</button>
          {isMenuOpen && (
            <div style={styles.menuDropdown}>
              <button 
                onClick={() => {
                  setShowRetrainPopup(true);
                  setIsMenuOpen(false);
                }} 
                style={styles.menuItem}
              >
                Retrain
              </button>
              <button 
                onClick={() => {
                  setShowPopup(true);
                  setIsMenuOpen(false);
                }} 
                style={styles.menuItem}
              >
                Reset Model
              </button>
              <button 
                onClick={() => {
                  handleClear();
                  setIsMenuOpen(false);
                }} 
                style={styles.deleteMenuItem}
              >
                Delete All
              </button>
            </div>
          )}
        </div>
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
            {results.length === 0 ? (
              <tr>
                <td colSpan={6} style={{ textAlign: 'center', padding: '20px', fontStyle: 'italic', color: '#64748b' }}>
                  No results found.
                </td>
              </tr>
            ) : (
              results.map((entry) => (
                <tr key={entry.id} style={styles.tr}>
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
                      color: entry.confidence != null && entry.confidence >= 70 ? '#2e7d32' : '#d32f2f',
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
              ))
            )}
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
    color: '#1565c0',
    fontSize: '20px',
    fontWeight: 'bold',
    marginBottom: '25px',
  },
  accuracyButton: {
    backgroundColor: '#ffffff',
    color: '#0d47a1',
    border: '1px solid #bbdefb',
    padding: '10px 16px',
    fontSize: '15px',
    borderRadius: '6px',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  buttonRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '25px',
    flexWrap: 'wrap',
    gap: '12px',
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
    backgroundColor: '#ffffff',
    color: '#d32f2f',
    border: '2px solid #ef9a9a',
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
    borderCollapse: 'separate',
    borderSpacing: '0',
    backgroundColor: '#ffffff',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
    borderRadius: '8px',
    overflow: 'hidden',
  },
  th: {
    backgroundColor: '#f1f5f9',
    color: '#0d47a1',
    padding: '14px',
    borderBottom: '1px solid #e2e8f0',
    fontWeight: '600',
    fontSize: '14px',
    textTransform: 'none',
  },
  td: {
    padding: '12px 14px',
    borderBottom: '1px solid #e2e8f0',
    textAlign: 'center',
    fontSize: '14px',
    color: '#334155',
  },
  tr: {
    transition: 'background-color 0.2s ease',
    '&:hover': {
      backgroundColor: '#f8fafc',
    },
  },
  editLink: {
    color: '#1976d2',
    textDecoration: 'none',
    fontWeight: 'bold',
  },
  centerButton: {
    position: 'absolute',
    left: '50%',
    transform: 'translateX(-50%)',
  },
  menuContainer: {
    position: 'relative',
  },
  menuButton: {
    backgroundColor: '#ffffff',
    color: '#0d47a1',
    border: '1px solid #bbdefb',
    padding: '10px 16px',
    fontSize: '20px',
    borderRadius: '6px',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '40px',
    height: '40px',
  },
  menuDropdown: {
    position: 'absolute',
    right: 0,
    top: '100%',
    backgroundColor: '#ffffff',
    border: '1px solid #bbdefb',
    borderRadius: '6px',
    boxShadow: '0 2px 5px rgba(0,0,0,0.1)',
    minWidth: '150px',
    zIndex: 1000,
  },
  menuItem: {
    width: '100%',
    padding: '10px 16px',
    border: 'none',
    backgroundColor: 'transparent',
    color: '#0d47a1',
    textAlign: 'left',
    cursor: 'pointer',
    fontSize: '14px',
    transition: 'background-color 0.2s ease',
    '&:hover': {
      backgroundColor: '#e3f2fd',
    },
  },
  deleteMenuItem: {
    width: '100%',
    padding: '10px 16px',
    border: 'none',
    backgroundColor: 'transparent',
    color: '#d32f2f',
    textAlign: 'left',
    cursor: 'pointer',
    fontSize: '14px',
    transition: 'background-color 0.2s ease',
    '&:hover': {
      backgroundColor: '#ffebee',
    },
  },
};

export default ResultsDashboard;
