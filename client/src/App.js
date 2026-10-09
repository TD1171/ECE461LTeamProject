import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";

import Checkout from "./components/Checkout";
import HomePage from "./pages/HomePage";
import CreateAccountPage from "./pages/CreateAccountPage";
import CreateProjectPage from "./pages/CreateProjectPage";
import "./App.css";

function App() {
  return (
    <BrowserRouter>
      <main className="app-shell">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/hardware" element={<Checkout />} />
          <Route path="/projects/new" element={<CreateProjectPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
          <Route path="/create-account" element={<CreateAccountPage />} />
        </Routes>
      </main>
    </BrowserRouter>
  );
}

export default App;
