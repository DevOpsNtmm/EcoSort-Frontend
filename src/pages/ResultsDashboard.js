import React, { useEffect, useState, useContext} from 'react';
import { UNSAFE_NavigationContext } from 'react-router-dom';
import PopupConfirmation from '../components/PopupConfirmation';
import './ResultsDashboard.css';

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
      setAccuracyText(`System Accuracy :      ${percent}%`);
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
      {/* Header Section */}
      <div style={styles.header}>
        <h1 style={styles.title}>
          <span style={styles.emoji}>📋</span>
          <span style={styles.gradientText}>Results Dashboard</span>
        </h1>
        <p style={styles.subtitle}>Monitor and manage your waste classification results</p>
      </div>



      {/* Controls Section */}
      <div style={styles.controlsSection}>
        <div style={styles.controlsCard}>
          <div style={styles.controlsRow}>
            <div style={styles.controlGroup}>
              <label style={styles.controlLabel}>Model Selection:</label>
              <select
                value={selectedModel}
                onChange={(e) => handleSwitchModel(e.target.value)}
                style={styles.modelDropdown}
                className="model-dropdown"
              >
                {availableModels.map((model) => (
                  <option key={model} value={model}>
                    {model === "resnet50_recycling_adjusted.pth" ? "Original Model" : model}
                  </option>
                ))}
              </select>
            </div>
            
            <div style={styles.rightControls}>
              <button onClick={handleAccuracy} style={styles.accuracyButton} className="accuracy-button">
                {accuracyText ? "Hide Accuracy" : "Show Accuracy"}
              </button>
              
              <div style={styles.menuContainer}>
                <button onClick={() => setIsMenuOpen(!isMenuOpen)} style={styles.menuButton} className="menu-button">
                  ⚙️ Actions
                </button>
                {isMenuOpen && (
                  <div style={styles.menuDropdown} className="menu-dropdown">
                    <button 
                      onClick={() => {
                        setShowRetrainPopup(true);
                        setIsMenuOpen(false);
                      }} 
                      style={styles.menuItem}
                      className="menu-item"
                    >
                      🔄 Retrain Model
                    </button>
                    <button 
                      onClick={() => {
                        handleClear();
                        setIsMenuOpen(false);
                      }} 
                      style={styles.deleteMenuItem}
                      className="delete-menu-item"
                    >
                      🗑️ Delete All Results
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Accuracy Display */}  
      {accuracyText && (
        <div style={styles.accuracyBox} className="accuracy-box">
          <div style={styles.accuracyContent}>
            <p style={styles.accuracyText}>{accuracyText}</p>
          </div>
        </div>
      )}

      {/* Results Table Section */}
      <div style={styles.tableSection}>
        <div style={styles.tableContainer} className="table-container">
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>Waste Item</th>
                <th style={styles.th}>System Analysis</th>
                <th style={styles.th}>Confidence</th>
                <th style={styles.th}>True Class</th>
                <th style={styles.th}>Status</th>
                <th style={styles.th}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {results.length === 0 ? (
                <tr>
                  <td colSpan={6} style={styles.emptyState}>
                    <div style={styles.emptyStateContent}>
                      <div style={styles.emptyStateIcon}>📭</div>
                      <h3 style={styles.emptyStateTitle}>No Results Found</h3>
                      <p style={styles.emptyStateText}>Start classifying waste items to see results here.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                results.map((entry) => (
                  <tr key={entry.id} style={styles.tr} className="table-row">
                    <td style={styles.td}>
                      {entry.imageData ? (
                        <img
                          src={entry.imageData}
                          alt={`Item ${entry.id}`}
                          style={styles.imageThumb}
                          className="image-thumb"
                          onClick={() => {
                            setModalImage(entry.imageData);
                            setIsModalOpen(true);
                          }}
                        />
                      ) : (
                        <div style={styles.noImagePlaceholder}>📷</div>
                      )}
                    </td>
                    <td style={styles.td}>
                      <span style={styles.classificationText}>{entry.systemAnalysis}</span>
                    </td>
                    <td style={styles.td}>
                      <div style={{
                        ...styles.confidenceBadge,
                        backgroundColor: entry.confidence >= 70 ? '#dcfce7' : '#fef2f2',
                        color: entry.confidence >= 70 ? '#166534' : '#dc2626',
                        borderColor: entry.confidence >= 70 ? '#bbf7d0' : '#fecaca'
                      }}>
                        {entry.confidence != null ? `${entry.confidence.toFixed(1)}%` : '—'}
                      </div>
                    </td>
                    <td style={styles.td}>
                      <span style={styles.trueClassText}>{entry.trueClass}</span>
                    </td>
                    <td style={styles.td}>
                      <div style={{
                        ...styles.statusBadge,
                        backgroundColor: entry.systemAnalysis === entry.trueClass ? '#dcfce7' : 
                                       entry.trueClass === '-' ? '#f1f5f9' : '#fef2f2',
                        color: entry.systemAnalysis === entry.trueClass ? '#166534' : 
                               entry.trueClass === '-' ? '#64748b' : '#dc2626',
                        borderColor: entry.systemAnalysis === entry.trueClass ? '#bbf7d0' : 
                                   entry.trueClass === '-' ? '#e2e8f0' : '#fecaca'
                      }}>
                        {entry.systemAnalysis === entry.trueClass
                          ? '✅ Correct'
                          : entry.trueClass === '-'
                            ? "—"
                            : '❌ Incorrect'}
                      </div>
                    </td>
                    <td style={styles.td}>
                      <a href={`/edit/${entry.id}`} style={styles.editButton} className="edit-button">
                        ✏️ Edit
                      </a>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

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

      {/* Image Modal */}
      {isModalOpen && (
        <div style={styles.modalOverlay} onClick={() => setIsModalOpen(false)} className="modal-overlay">
          <div style={styles.modalContent} onClick={(e) => e.stopPropagation()} className="modal-content">
            <div style={styles.modalHeader}>
              <h3 style={styles.modalTitle}>Image Preview</h3>
              <button 
                onClick={() => setIsModalOpen(false)} 
                style={styles.modalCloseButton}
                className="modal-close-button"
              >
                ✕
              </button>
            </div>
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
    padding: '32px',
    maxWidth: '1400px',
    margin: '0 auto',
    backgroundColor: '#f8fafc',
    minHeight: '100vh'
  },
  header: {
    textAlign: 'center',
    marginBottom: '48px'
  },
  title: {
    fontSize: '2.5rem',
    fontWeight: '700',
    margin: '0 0 16px 0',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '16px'
  },
  emoji: {
    fontSize: '2.5rem',
    filter: 'none'
  },
  gradientText: {
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    backgroundClip: 'text'
  },
  subtitle: {
    fontSize: '1.125rem',
    color: '#64748b',
    margin: '0',
    fontWeight: '500'
  },

  controlsSection: {
    marginBottom: '32px'
  },
  controlsCard: {
    backgroundColor: '#ffffff',
    borderRadius: '16px',
    padding: '24px',
    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
    border: '1px solid rgba(0, 0, 0, 0.05)'
  },
  controlsRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap'
  },
  rightControls: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px'
  },
  controlGroup: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px'
  },
  controlLabel: {
    fontSize: '1rem',
    fontWeight: '600',
    color: '#374151',
    minWidth: '120px'
  },
  modelDropdown: {
    padding: '12px 16px',
    border: '2px solid #e5e7eb',
    borderRadius: '8px',
    backgroundColor: '#ffffff',
    color: '#374151',
    fontSize: '14px',
    cursor: 'pointer',
    minWidth: '200px',
    transition: 'all 0.2s ease'
  },
  accuracyButton: {
    backgroundColor: '#3b82f6',
    color: '#ffffff',
    border: 'none',
    padding: '12px 20px',
    fontSize: '14px',
    fontWeight: '600',
    borderRadius: '8px',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    display: 'flex',
    alignItems: 'center',
    gap: '8px'
  },
  menuContainer: {
    position: 'relative'
  },
  menuButton: {
    backgroundColor: '#ffffff',
    color: '#374151',
    border: '2px solid #e5e7eb',
    padding: '12px 20px',
    fontSize: '14px',
    fontWeight: '600',
    borderRadius: '8px',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    display: 'flex',
    alignItems: 'center',
    gap: '8px'
  },
  menuDropdown: {
    position: 'absolute',
    right: 0,
    top: '100%',
    backgroundColor: '#ffffff',
    border: '2px solid #e5e7eb',
    borderRadius: '8px',
    boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
    minWidth: '180px',
    zIndex: 1000,
    marginTop: '8px'
  },
  menuItem: {
    width: '100%',
    padding: '12px 16px',
    border: 'none',
    backgroundColor: 'transparent',
    color: '#374151',
    textAlign: 'left',
    cursor: 'pointer',
    fontSize: '14px',
    transition: 'background-color 0.2s ease',
    display: 'flex',
    alignItems: 'center',
    gap: '8px'
  },
  deleteMenuItem: {
    width: '100%',
    padding: '12px 16px',
    border: 'none',
    backgroundColor: 'transparent',
    color: '#dc2626',
    textAlign: 'left',
    cursor: 'pointer',
    fontSize: '14px',
    transition: 'background-color 0.2s ease',
    display: 'flex',
    alignItems: 'center',
    gap: '8px'
  },
  accuracyBox: {
    backgroundColor: '#ffffff',
    borderRadius: '16px',
    padding: '24px',
    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
    border: '1px solid rgba(0, 0, 0, 0.05)',
    margin: '0 auto 32px',
    maxWidth: '500px',
    display: 'flex',
    alignItems: 'center',
    gap: '20px'
  },

  accuracyContent: {
    flex: 1
  },

  accuracyText: {
    fontSize: '1.125rem',
    color: '#374151',
    margin: '0',
    fontWeight: '500',
    textAlign: 'center',
    letterSpacing: '0.25px'
  },
  tableSection: {
    marginBottom: '32px'
  },
  sectionTitle: {
    fontSize: '1.75rem',
    fontWeight: '600',
    color: '#1e293b',
    margin: '0 0 24px 0',
    textAlign: 'center'
  },
  tableContainer: {
    backgroundColor: '#ffffff',
    borderRadius: '16px',
    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
    border: '1px solid rgba(0, 0, 0, 0.05)',
    overflow: 'hidden'
  },
  table: {
    width: '100%',
    borderCollapse: 'separate',
    borderSpacing: '0'
  },
  th: {
    backgroundColor: '#f8fafc',
    color: '#374151',
    padding: '16px',
    borderBottom: '1px solid #e2e8f0',
    fontWeight: '600',
    fontSize: '14px',
    textAlign: 'center'
  },
  td: {
    padding: '16px',
    borderBottom: '1px solid #f1f5f9',
    textAlign: 'center',
    fontSize: '14px',
    color: '#374151'
  },
  tr: {
    transition: 'background-color 0.2s ease'
  },
  emptyState: {
    padding: '60px 20px'
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
  emptyStateContent: {
    textAlign: 'center'
  },
  emptyStateIcon: {
    fontSize: '3rem',
    marginBottom: '16px',
    opacity: '0.5'
  },
  emptyStateTitle: {
    fontSize: '1.25rem',
    fontWeight: '600',
    color: '#374151',
    margin: '0 0 8px 0'
  },
  emptyStateText: {
    fontSize: '1rem',
    color: '#64748b',
    margin: '0'
  },
  imageThumb: {
    width: '80px',
    height: '60px',
    objectFit: 'cover',
    borderRadius: '8px',
    cursor: 'pointer',
    transition: 'transform 0.2s ease'
  },
  noImagePlaceholder: {
    width: '80px',
    height: '60px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f1f5f9',
    borderRadius: '8px',
    fontSize: '1.5rem',
    color: '#94a3b8'
  },
  classificationText: {
    fontWeight: '500',
    color: '#1e293b'
  },
  confidenceBadge: {
    padding: '6px 12px',
    borderRadius: '20px',
    fontSize: '12px',
    fontWeight: '600',
    border: '1px solid',
    display: 'inline-block'
  },
  trueClassText: {
    fontWeight: '500',
    color: '#1e293b'
  },
  statusBadge: {
    padding: '6px 12px',
    borderRadius: '20px',
    fontSize: '12px',
    fontWeight: '600',
    border: '1px solid',
    display: 'inline-block'
  },
  editButton: {
    backgroundColor: '#3b82f6',
    color: '#ffffff',
    textDecoration: 'none',
    padding: '8px 16px',
    borderRadius: '6px',
    fontSize: '12px',
    fontWeight: '600',
    transition: 'all 0.2s ease',
    display: 'inline-block'
  },
  modalOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    width: '100vw',
    height: '100vh',
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000
  },
  modalContent: {
    backgroundColor: '#ffffff',
    borderRadius: '16px',
    boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
    maxWidth: '90%',
    maxHeight: '90%',
    overflow: 'hidden'
  },
  modalHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '20px 24px',
    borderBottom: '1px solid #e5e7eb'
  },
  modalTitle: {
    fontSize: '1.25rem',
    fontWeight: '600',
    color: '#1e293b',
    margin: '0'
  },
  modalCloseButton: {
    backgroundColor: 'transparent',
    border: 'none',
    fontSize: '1.5rem',
    color: '#6b7280',
    cursor: 'pointer',
    padding: '4px',
    borderRadius: '4px',
    transition: 'all 0.2s ease'
  },
  fullImage: {
    maxWidth: '100%',
    maxHeight: '70vh',
    display: 'block'
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

export default ResultsDashboard;
