export function AppField({ as = 'input', className = '', children, ...props }) {
  const Control = as
  const fieldClass = `app-field ${as === 'textarea' ? 'is-textarea' : ''} ${as === 'select' ? 'is-select' : ''} ${className}`.trim()
  return <span className={fieldClass}><Control {...props}>{children}</Control></span>
}
