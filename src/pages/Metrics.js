import React, { useEffect, useState } from "react";
import { Pie } from "react-chartjs-2";
import { Chart, ArcElement, Tooltip, Legend } from "chart.js";
Chart.register(ArcElement, Tooltip, Legend);

const classNames = ["paper", "plastic", "other"];

const classColors = {
  paper: "#4caf50",    // green
  plastic: "#2196f3",  // blue
  other: "#ff9800"     // orange
};

const Metrics = () => {
  const [metrics, setMetrics] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("http://localhost:5050/metrics/classification")
      .then((res) => res.json())
      .then((data) => {
        setMetrics(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  if (loading) return <div>Loading metrics...</div>;
  if (!metrics) return <div>No metrics available.</div>;

  // Example metrics structure:
  // metrics.classification = {
  //   paper: { correct: 10, wrong_as_plastic: 2, wrong_as_other: 3 },
  //   plastic: { correct: 8, wrong_as_paper: 1, wrong_as_other: 4 },
  //   other: { correct: 12, wrong_as_paper: 2, wrong_as_plastic: 1 }
  // }

  return (
    <div style={{ padding: 32 }}>
      <h2>📊 Metrics & Statistics</h2>
      <ul>
        <li>Total Samples: {metrics.total_samples}</li>
        <li>Model Accuracy: {metrics.accuracy}%</li>
        <li>Retrain Count: {metrics.retrain_count}</li>
      </ul>
      <div style={{ display: "flex", gap: "40px", marginTop: "40px" }}>
        {classNames.map((cls) => {
          const data = metrics.classification[cls];
          let labels, values, colors;
          if (cls === "paper") {
            labels = ["Correct (Paper)", "Wrong as Plastic", "Wrong as Other"];
            values = [data.correct, data.wrong_as_plastic, data.wrong_as_other];
            colors = ["#4caf50", "#2196f3", "#ff9800"];
          } else if (cls === "plastic") {
            labels = ["Correct (Plastic)", "Wrong as Paper", "Wrong as Other"];
            values = [data.correct, data.wrong_as_paper, data.wrong_as_other];
            colors = ["#2196f3", "#4caf50", "#ff9800"];
          } else {
            labels = ["Correct (Other)", "Wrong as Paper", "Wrong as Plastic"];
            values = [data.correct, data.wrong_as_paper, data.wrong_as_plastic];
            colors = ["#ff9800", "#4caf50", "#2196f3"];
          }
          return (
            <div key={cls} style={{ width: 300 }}>
              <h3 style={{ textTransform: "capitalize", textAlign: "center", color: classColors[cls]}}>{cls}</h3>
              <Pie
                data={{
                  labels,
                  datasets: [
                    {
                      data: values,
                      backgroundColor: colors,
                    },
                  ],
                }}
                options={{
                  plugins: {
                    legend: { position: "bottom" },
                  },
                }}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default Metrics;