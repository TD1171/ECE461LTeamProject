import Button from "./Button";
import Panel from "./Panel";

const currentHardware = [
  { name: "HWSet1", quantity: 20 },
  { name: "HWSet2", quantity: 10 },
];

function QuantityOptions({ max }) {
  const options = Array.from({ length: max }, (_, index) => index + 1);
  return options.map((quantity) => <option key={quantity} value={quantity}>{quantity}</option>);
}

function CurrentHardware() {
  return (
    <Panel title="Current Hardware for Project">
      <div className="inventory-list">
        {currentHardware.map((item) => (
          <div className="inventory-row" key={item.name}>
            <p>{item.name} × {item.quantity}</p>
            <label htmlFor={`checkin-${item.name}`}>Qty:</label>
            <select id={`checkin-${item.name}`} defaultValue={item.quantity}>
              <QuantityOptions max={item.quantity} />
            </select>
            <Button>Check In</Button>
          </div>
        ))}
      </div>
      <p className="inventory-note">Hardware is held by the project until a member checks it in.</p>
    </Panel>
  );
}

export default CurrentHardware;
