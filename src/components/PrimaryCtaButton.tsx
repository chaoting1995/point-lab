import { Link } from 'react-router-dom'
import type { ReactNode, ButtonHTMLAttributes } from 'react'

type BaseProps = {
  children: ReactNode
  className?: string
  size?: 'sm' | 'md'
  fullWidth?: boolean
  iconLeft?: ReactNode
}

type ButtonProps = BaseProps &
  Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'className' | 'children'> & {
    to?: undefined
  }

type LinkProps = BaseProps & {
  to: string
  onClick?: never
  type?: never
}

export default function PrimaryCtaButton(props: ButtonProps | LinkProps) {
  const { children, className, size = 'sm', fullWidth, iconLeft } = props
  const base = `header__cta btn btn-primary ${size === 'sm' ? 'btn-sm' : 'btn-md'} gap-2 ${
    fullWidth ? 'w-full justify-center' : ''
  } ${className ?? ''}`

  if ('to' in props && props.to) {
    const { to } = props
    return (
      <Link to={to} className={base}>
        {iconLeft}
        {children}
      </Link>
    )
  }

  const { onClick, type = 'button', disabled } = props as ButtonProps
  return (
    <button type={type} onClick={onClick} disabled={disabled} className={base}>
      {iconLeft}
      {children}
    </button>
  )
}

