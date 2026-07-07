import { NavLink } from 'react-router-dom'

/** Explore ↔ 내 위젯 전환용 상단 네비게이션 — 두 페이지 공용 */
export default function NavBar() {
  return (
    <nav className="top-nav" aria-label="주요 메뉴">
      <NavLink
        to="/"
        end
        className={({ isActive }) => `top-nav__link${isActive ? ' top-nav__link--active' : ''}`}
      >
        Explore
      </NavLink>
      <NavLink
        to="/my"
        className={({ isActive }) => `top-nav__link${isActive ? ' top-nav__link--active' : ''}`}
      >
        내 위젯
      </NavLink>
    </nav>
  )
}
