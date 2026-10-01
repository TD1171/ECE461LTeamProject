import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";

import Checkout from "./components/Checkout";
import "./App.css";

function App() {
  return (
    <BrowserRouter>
      <main className="app-shell">
        <Routes>
          <Route path="/hardware" element={<Checkout />} />
          <Route path="/" element={<Navigate to="/hardware" replace />} />
          <Route path="*" element={<Navigate to="/hardware" replace />} />
        </Routes>
      </main>
    </BrowserRouter>
  );
}

export default App;
