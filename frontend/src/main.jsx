import React, { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import "./style.css";

function App() {
  const [status, setStatus] = useState("Đang kiểm tra API…");
  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/v1/health", { signal: controller.signal })
      .then(async (response) => {
        if (!response.ok || (await response.json()).status !== "ok") {
          throw new Error("API health check failed");
        }
        setStatus("API đang phản hồi");
      })
      .catch((error) => {
        if (error.name !== "AbortError") setStatus("Chưa kết nối được API");
      });
    return () => controller.abort();
  }, []);

  return (
    <main>
      <p className="label">Đồ án IoT</p>
      <h1>Giám sát không khí trong nhà</h1>
      <p role="status">{status}</p>
      <section aria-label="Phòng giám sát">
        <article><h2>Phòng A</h2><p>ESP32 vật lý</p></article>
        <article><h2>Phòng B</h2><p>Node Python mô phỏng</p></article>
      </section>
      <p>Đây là giao diện khởi đầu. Số đo sẽ hiển thị khi API telemetry được tích hợp.</p>
    </main>
  );
}

createRoot(document.getElementById("root")).render(<App />);

