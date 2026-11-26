import { useEffect, useState } from "react";

import Button from "./Button";

// One hardware set on the project page: availability, a quantity box, and
// Check Out / Check In buttons.
//
// The row checks the obvious mistakes itself (not a whole number, more than
// is available, more than this project holds) so the user gets an answer
// right away. The server still checks everything; its error, if any, comes
// back through onUpdateHardware and is shown here.
//
// Props:
//   hardware          { name, capacity, available } from the server
//   checkedOut        how many units this project currently holds
//   projectId         the project the units are checked out to
//   disabled          true while the page is busy (e.g. leaving the project)
//   onUpdateHardware  (projectId, hardwareName, change) => Promise;
//                     change > 0 checks out, change < 0 checks in
function HardwareSetRow({
  hardware,
  checkedOut,
  projectId,
  disabled = false,
  onUpdateHardware,
}) {
  const [quantity, setQuantity] = useState(1);
  // { type: "success" | "error", text } or null. Kept per row so each
  // hardware set shows its own result right under its buttons.
  const [message, setMessage] = useState(null);

  // Success messages fade after 2 seconds so old results don't linger.
  // Errors stay until the user changes the quantity or tries again.
  useEffect(() => {
    if (message?.type !== "success") return undefined;
    const timer = setTimeout(() => setMessage(null), 2000);
    return () => clearTimeout(timer);
  }, [message]);

  // Returns the quantity as a positive integer, or null after showing an
  // error. The input is type="number", but it can still be empty or "1.5".
  const readQuantity = () => {
    const amount = Number(quantity);
    if (!Number.isInteger(amount) || amount < 1) {
      setMessage({ type: "error", text: "Enter a positive whole number." });
      return null;
    }
    return amount;
  };

  const checkOut = async () => {
    const amount = readQuantity();
    if (amount === null) return;
    if (amount > hardware.available) {
      setMessage({
        type: "error",
        text: hardware.available === 0
          ? `${hardware.name} is out of stock.`
          : `Only ${hardware.available} unit(s) are available.`,
      });
      return;
    }

    try {
      await onUpdateHardware(projectId, hardware.name, amount);
      setMessage({ type: "success", text: `Checked out ${amount} unit(s).` });
    } catch (error) {
      setMessage({ type: "error", text: error.message });
    }
  };

  // Same as checkOut, but limited by what this project holds, not by stock.
  const checkIn = async () => {
    const amount = readQuantity();
    if (amount === null) return;
    if (amount > checkedOut) {
      setMessage({
        type: "error",
        text: checkedOut === 0
          ? `${hardware.name} is already full.`
          : `This project can only check in ${checkedOut} unit(s).`,
      });
      return;
    }

    try {
      await onUpdateHardware(projectId, hardware.name, -amount);
      setMessage({ type: "success", text: `Checked in ${amount} unit(s).` });
    } catch (error) {
      setMessage({ type: "error", text: error.message });
    }
  };

  return (
    <div className="project-hardware-row" aria-label={`${hardware.name} controls`}>
      <div className="project-hardware-status">
        <strong>{hardware.name}</strong>
        <span>Available: {hardware.available} / {hardware.capacity}</span>
      </div>

      <div className="project-hardware-actions">
        <label htmlFor={`${projectId}-${hardware.name}-quantity`}>Qty</label>
        <input
          id={`${projectId}-${hardware.name}-quantity`}
          aria-label={`Quantity for ${hardware.name} in ${projectId}`}
          type="number"
          min="1"
          value={quantity}
          disabled={disabled}
          onChange={(event) => {
            setQuantity(event.target.value);
            setMessage(null);
          }}
        />
        <Button onClick={checkOut} disabled={disabled}>Check Out</Button>
        <Button onClick={checkIn} disabled={disabled}>Check In</Button>
      </div>

      {message && (
        <p
          className={`hardware-action-message ${message.type}`}
          role={message.type === "error" ? "alert" : "status"}
        >
          {message.text}
        </p>
      )}
    </div>
  );
}

export default HardwareSetRow;