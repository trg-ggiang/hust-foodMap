"use client";

import { MapPin, ForkKnife, MapTrifold, Heart, CalendarBlank, Moon, Sun, SignIn, GraduationCap } from "@phosphor-icons/react";

export type DiscoveryView = "explore" | "saved" | "plans";

export function Brand() {
  return <a href="/" className="brand" aria-label="HUST FoodMap trang chủ">
    <span className="brand-mark"><MapPin size={25} weight="fill" /><ForkKnife size={13} weight="bold" /></span>
    <span>HUST<span className="brand-light">FoodMap</span><small>Ăn ngon, gần Bách khoa</small></span>
  </a>;
}

interface NavigationProps {
  view: DiscoveryView;
  savedCount: number;
  planCount: number;
  onNavigate: (view: DiscoveryView) => void;
}
const destinations = [
  { view: "explore", label: "Khám phá", icon: MapTrifold },
  { view: "saved", label: "Đã lưu", icon: Heart },
  { view: "plans", label: "Kế hoạch", icon: CalendarBlank },
] as const;

function NavigationItems({ view, savedCount, planCount, onNavigate }: NavigationProps) {
  return destinations.map(({ view: destination, label, icon: Icon }) => {
    const count = destination === "saved" ? savedCount : destination === "plans" ? planCount : 0;
    return <button key={destination} className={view === destination ? "active" : ""} aria-pressed={view === destination} onClick={() => onNavigate(destination)}>
      <Icon size={20} /><span>{label}</span>{count > 0 ? <span className="nav-count">{count}</span> : null}
    </button>;
  });
}

export function DiscoveryHeader({ dark, signedIn, onTheme, onAccount, ...navigation }: NavigationProps & {
  dark: boolean; signedIn: boolean; onTheme: () => void; onAccount: () => void;
}) {
  return <header className="app-header">
    <Brand />
    <nav className="main-nav" aria-label="Điều hướng chính"><NavigationItems {...navigation} /></nav>
    <div className="header-actions">
      <span className="student-tag"><GraduationCap size={18} />Dành cho sinh viên HUST</span>
      <button className="icon-button theme-button" aria-label={dark ? "Chuyển giao diện sáng" : "Chuyển giao diện tối"} onClick={onTheme}>{dark ? <Sun /> : <Moon />}</button>
      <button className="account-button" onClick={onAccount}>{signedIn ? <span className="avatar">BK</span> : <SignIn size={18} />}<span>{signedIn ? "Sinh viên" : "Đăng nhập"}</span></button>
    </div>
  </header>;
}

