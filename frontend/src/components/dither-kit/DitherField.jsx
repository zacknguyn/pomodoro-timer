import { DitherGradient } from './DitherGradient'

export function DitherField({ as = 'input', className = '', color = 'grey', children, ...props }) {
  const Control = as
  const fieldClass = `dither-field ${as === 'textarea' ? 'is-textarea' : ''} ${as === 'select' ? 'is-select' : ''} ${className}`.trim()
  return <span className={fieldClass}>
    <DitherGradient from={color} direction="down" cell={2} opacity={color === 'grey' ? 0.13 : 0.2} />
    <Control {...props}>{children}</Control>
  </span>
}
