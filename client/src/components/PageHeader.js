import { Link } from "react-router-dom";

import AccountActions from "./AccountActions";

// Shared top bar for signed-in pages: title (and optional subtitle) on the
// left, actions on the right. By default the right side has a link back to
// the dashboard plus "Signed in as" and Sign Out, so every page offers the
// same way out.
//
//   <PageHeader title="Create Project" />
//   <PageHeader title={name} subtitle={`Project ID: ${id}`} />
//   <PageHeader title="My Dashboard" actions={<AccountActions />} />
function PageHeader({ title, subtitle, actions }) {
  return (
    <header className="page-header">
      {subtitle ? (
        // Same markup ProjectPage used, so the existing CSS keeps the
        // subtitle tucked right under the title.
        <div className="project-heading">
          <h1 className="page-title">{title}</h1>
          <p className="project-id-line">{subtitle}</p>
        </div>
      ) : (
        <h1 className="page-title">{title}</h1>
      )}
      {actions ?? (
        <AccountActions>
          <Link className="page-header-link" to="/dashboard">
            Back to Dashboard
          </Link>
        </AccountActions>
      )}
    </header>
  );
}

export default PageHeader;
