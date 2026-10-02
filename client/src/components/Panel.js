function Panel({ title, children, className = "" }) {
  return (
    <section className={`panel ${className}`.trim()}>
      <h2 className="panel-title">{title}</h2>
      {children}
    </section>
  );
}

export default Panel;
