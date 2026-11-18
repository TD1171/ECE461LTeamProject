import { useEffect, useState } from "react";

import Button from "./Button";
import Panel from "./Panel";
import StatusMessage from "./StatusMessage";

const projects = [
  { id: "SDP-461", label: "Senior Design Prototype (SDP-461)" },
  { id: "LAB-204", label: "Embedded Systems Lab (LAB-204)" },
];

function CheckoutForm({ hardware }) {
  const [quantity, setQuantity] = useState(1);
  const [projectId, setProjectId] = useState(projects[0].id);
  // Kept separate so validation errors look like errors, not like the preview.
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    setQuantity(1);
    setError("");
    setMessage("");
  }, [hardware?.name]);

  const confirmCheckout = (event) => {
    event.preventDefault();
    if (!hardware) return;

    const amount = Number(quantity);
    if (!Number.isInteger(amount) || amount < 1 || amount > hardware.available) {
      setMessage("");
      setError(`Enter a whole number between 1 and ${hardware.available}.`);
      return;
    }

    setError("");
    setMessage(`Checkout preview: ${amount} unit(s) of ${hardware.name} for ${projectId}.`);
  };

  return (
    <Panel title={`Request: ${hardware?.name || "Select hardware"}`}>
      <form onSubmit={confirmCheckout}>
        <div className="field-row">
          <label htmlFor="checkout-quantity">Quantity:</label>
          <input
            id="checkout-quantity"
            className="quantity-input"
            type="number"
            min="1"
            max={hardware?.available || 1}
            value={quantity}
            onChange={(event) => setQuantity(event.target.value)}
            disabled={!hardware}
          />
        </div>
        <div className="field-row">
          <label htmlFor="checkout-project">Project:</label>
          <select id="checkout-project" value={projectId} onChange={(event) => setProjectId(event.target.value)}>
            {projects.map((project) => <option key={project.id} value={project.id}>{project.label}</option>)}
          </select>
        </div>
        <Button type="submit" variant="primary" block disabled={!hardware}>
          Confirm Checkout
        </Button>
        <StatusMessage type="error">{error}</StatusMessage>
        <StatusMessage type="success">{message}</StatusMessage>
      </form>
    </Panel>
  );
}

export default CheckoutForm;
