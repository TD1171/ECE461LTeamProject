import { Link } from "react-router-dom";

import JoinProjectForm from "../components/JoinProjectForm";

// Stand-alone Join page. The dashboard's Join Project tab uses the same form.
function JoinProjectPage() {
  return (
    <section className="checkout-page">
      <header className="page-header">
        <h1 className="page-title">Join Project</h1>
        <Link className="page-header-link" to="/dashboard">Back to Dashboard</Link>
      </header>

      <div className="checkout-content">
        <JoinProjectForm />
      </div>
    </section>
  );
}

export default JoinProjectPage;