import { Fragment } from "react";

import Button from "./Button";

function HardwareDetail({ hardware, loading }) {
  if (loading) {
    return <p>Loading hardware details…</p>;
  }

  const specifications = hardware.specifications || {};

  return (
    <div className="hardware-detail">
      <p>{hardware.description || "No description is available for this hardware set."}</p>
      <dl className="detail-list">
        {hardware.location && <><dt>Location</dt><dd>{hardware.location}</dd></>}
        {Object.entries(specifications).map(([label, value]) => (
          <div key={label} style={{ display: "contents" }}>
            <dt>{label}</dt>
            <dd>{String(value)}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

function HardwareTable({
  hardware,
  expandedName,
  detail,
  detailLoading,
  onRequest,
  onToggleDetail,
}) {
  return (
    <div className="hardware-table-wrap">
      <table className="hardware-table">
        <thead>
          <tr>
            <th scope="col">Hardware Set</th>
            <th scope="col">Capacity</th>
            <th scope="col">Available</th>
            <th scope="col">Request</th>
          </tr>
        </thead>
        <tbody>
          {hardware.map((item) => {
            const expanded = expandedName === item.name;
            return (
              <Fragment key={item.name}>
                <tr>
                  <td>
                    <div className="hardware-name">
                      <span>{item.name}</span>
                      <Button
                        variant="link"
                        aria-expanded={expanded}
                        onClick={() => onToggleDetail(item)}
                      >
                        {expanded ? "Hide details" : "View details"}
                      </Button>
                    </div>
                  </td>
                  <td>{item.capacity}</td>
                  <td>{item.available}</td>
                  <td>
                    <Button onClick={() => onRequest(item)}>Request</Button>
                  </td>
                </tr>
                {expanded && (
                  <tr className="detail-row" key={`${item.name}-details`}>
                    <td colSpan="4">
                      <HardwareDetail hardware={detail || item} loading={detailLoading} />
                    </td>
                  </tr>
                )}
              </Fragment>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export default HardwareTable;
