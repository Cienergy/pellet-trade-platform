export default function PaymentModal({ open, onClose, children }) {
    if (!open) return null;
  
    return (
      <div
        style={{
          position: "fixed",
          inset: 0,
          background: "rgba(0,0,0,0.5)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 1000
        }}
        onClick={onClose}
      >
        <div
          style={{
            background: "#fff",
            padding: "20px",
            borderRadius: "8px",
            minWidth: "300px"
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {children || "Payment"}
        </div>
      </div>
    );
  }
  