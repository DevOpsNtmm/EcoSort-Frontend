import React, { useEffect, useState, useContext} from 'react';
import { UNSAFE_NavigationContext } from 'react-router-dom';
import PopupConfirmation from '../components/PopupConfirmation';

const ResultsDashboard = () => {
  const [modalImage, setModalImage] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [results, setResults] = useState([]);
  const [showRetrainPopup, setShowRetrainPopup] = useState(false);
  const [isRetraining, setIsRetraining] = useState(false);
  const [accuracyText, setAccuracyText] = useState(null);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [blockMessageVisible, setBlockMessageVisible] = useState(false);
  const [availableModels, setAvailableModels] = useState([]);
  const [selectedModel, setSelectedModel] = useState("");

  useBlocker(() => {
    if (isRetraining) {
      setBlockMessageVisible(true);
      setTimeout(() => setBlockMessageVisible(false), 3000); // auto-hide after 3s
      return false; // prevent navigation
    }
    return true; // allow navigation
  }, true);

  useEffect(() => {
    const fetchModels = async () => {
      try {
        const response = await fetch("http://localhost:5050/dashboard/models");
        if (!response.ok) throw new Error("Failed to fetch models");
        const data = await response.json();
        setAvailableModels(data.models || []);
        if (data.models && data.models.length > 0) {
          setSelectedModel(data.models[0]); // default selection
        }
      } catch (error) {
        console.error("Error fetching models:", error);
      }
    };
    fetchModels();
  }, []);

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

      } catch (error) {
        console.error("Failed to fetch results from backend:", error);
        setResults([]);
      }
    };

    fetchResultsFromBackend();
  }, []);

  const handleSwitchModel = async (modelName) => {
    try {
      const response = await fetch("http://localhost:5050/dashboard/switch_model", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ model_name: modelName }),
      });
  
      if (!response.ok) throw new Error("Failed to switch model");
      const result = await response.json();
      alert(result.message || `Switched to ${modelName}`);
      setSelectedModel(modelName);
    } catch (error) {
      console.error("Error switching model:", error);
      alert("Could not switch model");
    }
  };
  
  const handleAccuracy = async () => {
    if (accuracyText) {
      setAccuracyText(null);
      return;
    }
  
    try {
      const response = await fetch('http://localhost:5050/dashboard/calculate_accuracy');
      if (!response.ok) {
        throw new Error('Failed to calculate accuracy from backend');
      }
  
      const data = await response.json();
      const percent = data.accuracy.toFixed(2);
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
      {/* Top bar: title (left) + dropdown & menu (right) */}
      <div style={styles.topBar}>
        <h2 style={styles.title}>Results Dashboard</h2>

        <div style={styles.controls}>
          {/* Accuracy Button */}
          <button onClick={handleAccuracy} style={styles.accuracyButton}>
            {accuracyText ? "Hide Accuracy" : "Show Accuracy"}
          </button>
          {/* Model Dropdown */}
          <select
            value={selectedModel}
            onChange={(e) => handleSwitchModel(e.target.value)}
            style={styles.dropdown}
          >
            {availableModels.map((model) => (
              <option key={model} value={model}>
                {model === "resnet50_recycling_adjusted.pth" ? "Original Model" : model}
              </option>
            ))}
          </select>
          {/* Menu */}
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
      </div>

      {/* Accuracy display (click toggle only, no X) */}
      {accuracyText && (
        <div style={styles.accuracyBox}>
          {accuracyText}
        </div>
      )}


      {/* Retrain confirmation popup */}
      {showRetrainPopup && (
        <PopupConfirmation
          title="Retrain Model"
          message={
            isRetraining
              ? "Retraining in progress. It takes approximately 2 minutes. Please wait..."
              : "This will retrain the model with the non-confident classified items. Continue?"
          }
          showButtons={!isRetraining} // Hide buttons while retraining
          onConfirm={async () => {
            setIsRetraining(true);
            try {
              console.log("Starting retrain request...");
              const response = await fetch("http://localhost:5050/dashboard/retrain", {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                },
              });

              const result = await response.json();
              console.log("Retrain response:", response.status, result);

              if (!response.ok) {
                throw new Error(result.message || "Retraining failed");
              }

              // Prefer backend-provided new_model name if available
              const newModelName = result && result.output_weights_path.new_model ? result.output_weights_path.new_model : null;
              // Fetch updated model list from backend
              console.log("Fetching updated models list...");
              const modelsResp = await fetch("http://localhost:5050/dashboard/models");
              let modelsList = [];
              if (modelsResp.ok) {
                const modelsJson = await modelsResp.json();
                modelsList = modelsJson.models || [];
                console.log("Updated models from server:", modelsList);
                setAvailableModels(modelsList);
              } else {
                console.warn("Failed to fetch models list after retrain.", modelsResp.status);
              }

              // Decide which model to select:
              if (newModelName) {
                // If backend returned the new model name, select it (and add if missing)
                setAvailableModels(prev => {
                  const merged = Array.from(new Set([...(prev || []), newModelName]));
                  return merged;
                });
                setSelectedModel(newModelName);
                console.log("Selected new model (from retrain response):", newModelName);
              } else if (modelsList.length > 0) {
                // Otherwise pick the first model from the refreshed list (or keep current)
                setSelectedModel(modelsList[0]);
                console.log("Selected model from refreshed list:", modelsList[0]);
              }

              alert(
                newModelName
                  ? `Model retraining completed. Now using: ${newModelName}`
                  : "Model retraining completed. Model list refreshed."
              );
            } catch (error) {
              console.error("Retrain error:", error);

              if (error.message && error.message.includes("No new uncertain images found. Retraining aborted.")) {
                alert("No low-confidence images available for retraining.");
              } else {
                alert("Internal server error during retraining. Please try again.");
              }
            } finally {
              setIsRetraining(false);
              setShowRetrainPopup(false);
            }
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
      {blockMessageVisible && (
        <div style={styles.blockBanner}>
          ⚠️ Please wait until the retrain ends.
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
    marginBottom: '0px',
  },

  /* NEW: header layout */
  topBar: {
    display: 'flex',
    justifyContent: 'space-between', // title left, controls right
    alignItems: 'center',
    marginBottom: '25px',
  },
  controls: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
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
  blockBanner: {
    position: 'fixed',
    top: '20px',
    left: '50%',
    transform: 'translateX(-50%)',
    backgroundColor: '#ff9800',
    color: '#000',
    padding: '10px 20px',
    borderRadius: '8px',
    boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
    zIndex: 1000,
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
  dropdown: {
    marginRight: "10px",
    padding: "6px 10px",
    border: "1px solid #bbdefb",
    borderRadius: "6px",
    backgroundColor: "#ffffff",
    color: "#0d47a1",
    fontSize: "14px",
    cursor: "pointer",
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

export default ResultsDashboard;
