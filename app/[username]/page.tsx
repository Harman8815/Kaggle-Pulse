"use client";

import { useState, useCallback } from "react";
import { getUserData } from "../utils/api";
import type { KaggleUserData, KaggleOptions } from "../utils/api";
import { Dashboard } from "../components/Dashboard";
import { Navbar } from "../components/Navbar";
import { Footer } from "../components/Footer";

export default function UsernamePage({
  params,
}: {
  params: Promise<{ username: string }>;
}) {
  const [username, setUsername] = useState("");
  const [resolvedUsername, setResolvedUsername] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSearch = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = username.trim();
    if (!trimmed) return;
    setError(null);
    setResolvedUsername(trimmed);
  }, [username]);

  return (
    <>
      <Navbar />
      <main className="dashboard-shell">
        <div className="dashboard-container">
          <section className="dashboard-heading">
            <div>
              <div className="eyebrow"><span className="status-dot" /> KAGGLE CREATOR SEARCH</div>
              <h1>Explore any Kaggle creator</h1>
              <p className="dashboard-subtitle">
                Enter a Kaggle username to view their public activity dashboard.
              </p>
            </div>
          </section>

          <section className="panel search-panel" style={{ maxWidth: "520px" }}>
            <form onSubmit={handleSearch} className="search-form">
              <label htmlFor="username-search" className="visually-hidden">
                Kaggle username
              </label>
              <div className="search-input-wrapper">
                <input
                  id="username-search"
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Enter Kaggle username"
                  className="search-input"
                  autoComplete="off"
                  disabled={loading}
                  autoFocus
                />
                <button
                  type="submit"
                  className="search-btn"
                  disabled={loading || !username.trim()}
                >
                  {loading ? "Loading…" : "View Dashboard"}
                </button>
              </div>
            </form>

            {error && (
              <div className="dashboard-alert" role="alert">
                <strong>Couldn't load dashboard.</strong>
                <span>{error}</span>
              </div>
            )}

            <div className="search-disclaimer">
              <h3>Disclaimer</h3>
              <ul>
                <li>This dashboard shows only <strong>public</strong> Kaggle activity (notebooks and datasets).</li>
                <li>Data is fetched via the <strong>official Kaggle API</strong> using server-side credentials.</li>
                <li>Private notebooks, drafts, and competition submissions are <strong>not</strong> included.</li>
                <li>Results are cached for <strong>5 minutes</strong> to reduce API load.</li>
                <li>If a user has no public activity, the dashboard will appear empty.</li>
                <li>Rate limits apply — excessive requests may be temporarily blocked.</li>
              </ul>
            </div>
          </section>

          {resolvedUsername && (
            <Dashboard username={resolvedUsername} />
          )}
        </div>
      </main>
      <Footer />
    </>
  );
}