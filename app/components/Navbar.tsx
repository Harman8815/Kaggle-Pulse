import Link from "next/link";

export const Navbar = () => (
    <nav className="topbar">
        <div className="topbar-inner">
            <Link className="brand" href="/" aria-label="Kaggle Pulse home">
                <span className="brand-mark" aria-hidden="true">K</span>
                <span>Kaggle<span className="brand-light">Pulse</span></span>
            </Link>
            <div className="topbar-links">
                <Link href="/compare">Compare</Link>
                <Link href="/history">History</Link>
                <Link href="/cohorts">Cohorts</Link>
                <Link href="/pulse">Pulse</Link>
                <Link href="/network">Network</Link>
                <Link href="/atlas">Atlas</Link>
            </div>
            <span className="topbar-caption">CREATOR DASHBOARD</span>
        </div>
    </nav>
);
