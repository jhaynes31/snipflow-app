import { NavLink, useNavigate } from 'react-router-dom'
import type { ReactNode } from 'react'
import { BackIcon, BookIcon, ClockIcon, HeartIcon, HomeIcon, PeopleIcon, ShireIcon } from './Icons'

interface Props {
  title?: string
  subtitle?: string
  back?: string | true
  action?: ReactNode
  children: ReactNode
  hideNav?: boolean
}

export function Shell({ title, subtitle, back, action, children, hideNav }: Props) {
  const nav = useNavigate()
  return (
    <div className="shell">
      <header className="topbar">
        <div className="row">
          {back ? (
            <button
              className="btn btn-icon btn-ghost"
              aria-label="Go back"
              onClick={() => (back === true ? nav(-1) : nav(back))}
            >
              <BackIcon />
            </button>
          ) : (
            <span className="brand">Love &amp; Release</span>
          )}
        </div>
        <div>{action}</div>
      </header>
      <main className="fade">
        {title && <h1 className="page-title">{title}</h1>}
        {subtitle && <p className="subtitle">{subtitle}</p>}
        {children}
      </main>
      {!hideNav && (
        <nav className="nav" aria-label="Main">
          <NavLink to="/" end><HomeIcon />Home</NavLink>
          <NavLink to="/threads"><ClockIcon />Threads</NavLink>
          <NavLink to="/jesus"><BookIcon />Jesus</NavLink>
          <NavLink to="/me"><HeartIcon />Me</NavLink>
          <NavLink to="/more"><PeopleIcon />More</NavLink>
          <a href="/" aria-label="Back to The Shire"><ShireIcon />Shire</a>
        </nav>
      )}
    </div>
  )
}
