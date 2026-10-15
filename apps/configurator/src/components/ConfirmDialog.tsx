import "./ConfirmDialog.css";

function ConfirmDialog({
  title = "Confirm",
  message,
  onConfirm,
  onCancel,
}: {
  title?: string;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="confirm-dialog-overlay" onClick={onCancel}>
      <div className="confirm-dialog" onClick={(e) => e.stopPropagation()}>
        <div className="confirm-dialog-titlebar">
          <span>{title}</span>
          <button
            type="button"
            className="confirm-dialog-close"
            onClick={onCancel}
          >
            {"×"}
          </button>
        </div>
        <div className="confirm-dialog-body">
          <span className="confirm-dialog-icon">{"⚠"}</span>
          <p>{message}</p>
        </div>
        <div className="confirm-dialog-actions">
          <button
            type="button"
            className="confirm-dialog-primary"
            onClick={onConfirm}
            autoFocus
          >
            Yes
          </button>
          <button type="button" onClick={onCancel}>
            No
          </button>
        </div>
      </div>
    </div>
  );
}

export default ConfirmDialog;
