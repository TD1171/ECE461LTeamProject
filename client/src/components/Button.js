function Button({
  children,
  variant = "outline",
  block = false,
  className = "",
  type = "button",
  ...props
}) {
  const classes = [
    "button",
    `button-${variant}`,
    block ? "button-block" : "",
    className,
  ].filter(Boolean).join(" ");

  return <button type={type} className={classes} {...props}>{children}</button>;
}

export default Button;
