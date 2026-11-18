import { NavLink, useNavigate } from 'react-router-dom'
import type { ReactNode } from 'react'
import { BackIcon, BookIcon, ClockIcon, GearIcon, HeartIcon, HomeIcon, PeopleIcon, ShireIcon } from './Icons'
import { inShire } from '@/app/person'

interface Props {
  title?: string
  subtitle?: string
  back?: string | true
  action?: ReactNode
  children: ReactNode
  hideNav?: boolean
}

/**
 * Inside The Shire (the usual case since 2026-11-18) the toolbar above is
 * The Shire's, and this app's own sections sit in a row of pills like every
 * other place in the village. On its own (the hosted preview) it keeps the
 * bottom bar it was built with.
 */
export function Shell({ title, subtitle, back, action, children, hideNav }: Props) {
  const nav = useNavigate()
  const framed = inShire()
  return (
    <div className="shell">
      {framed && !hideNav && (
        <nav className="subnav" aria-label="Everyone, and me">
          <NavLink to="/" end><HomeIcon />Home</NavLink>
          <NavLink to="/threads"><ClockIcon />Threads</NavLink>
          <NavLink to="/jesus"><BookIcon />Jesus</NavLink>
          <NavLink to="/me"><HeartIcon />Me</NavLink>
          <NavLink to="/more"><PeopleIcon />Everything</NavLink>
          <NavLink to="/settings"><GearIcon />Settings</NavLink>
        </nav>
      )}
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
            <span className="brand">Re-Centered</span>
          )}
        </div>
        <div>{action}</div>
      </header>
      <main className="fade">
        {title && <h1 className="page-title">{title}</h1>}
        {subtitle && <p className="subtitle">{subtitle}</p>}
        {children}
      </main>
      {!hideNav && !framed && (
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
