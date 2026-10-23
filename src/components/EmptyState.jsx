export default function EmptyState({ icon: Icon, title, message, action }) {
  return (
    <div className="empty-state">
      {Icon ? <Icon size={40} /> : null}
      <h3>{title}</h3>
      <p>{message}</p>
      {action}
    </div>
  );
}
