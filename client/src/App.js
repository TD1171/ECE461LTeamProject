import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";

import RedirectIfSignedIn from "./components/RedirectIfSignedIn";
import RequireSignIn from "./components/RequireSignIn";
import CreateAccountPage from "./pages/CreateAccountPage";
import CreateProjectPage from "./pages/CreateProjectPage";
import HomePage from "./pages/HomePage";
import JoinProjectPage from "./pages/JoinProjectPage";
import LoginPage from "./pages/LoginPage";
import ProjectPage from "./pages/ProjectPage";
import "./App.css";

function App() {
  return (
    <BrowserRouter>
      <main className="app-shell">
        <Routes>
          {/* Signed-out pages. Signed-in users skip to the dashboard. */}
          <Route element={<RedirectIfSignedIn />}>
            <Route path="/" element={<LoginPage />} />
            <Route path="/create-account" element={<CreateAccountPage />} />
          </Route>

          {/* Everything here needs a signed-in user. Add new app pages here. */}
          <Route element={<RequireSignIn />}>
            <Route path="/dashboard" element={<HomePage />} />
            <Route path="/projects/new" element={<CreateProjectPage />} />
            <Route path="/projects/join" element={<JoinProjectPage />} />
            <Route path="/projects/:projectId" element={<ProjectPage />} />
          </Route>

          {/* Unknown URLs go to Sign In (which forwards signed-in users on). */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </BrowserRouter>
  );
}

export default App;
