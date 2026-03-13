import { useState } from "react";

function App() {
  const [count, setCount] = useState(0);

  return (
    <main className="min-h-screen bg-base-200 text-base-content">
      <section className="hero min-h-screen px-6 py-12">
        <div className="hero-content w-full max-w-6xl flex-col gap-8 lg:flex-row lg:items-stretch lg:justify-between">
          <div className="max-w-2xl">
            <span className="badge badge-primary badge-outline mb-4">daisyUI dark</span>
            <h1 className="text-5xl font-black tracking-tight sm:text-6xl">
              Fitness app starter, now with Tailwind CSS and DaisyUI
            </h1>
            <p className="mt-6 max-w-xl text-lg text-base-content/75">
              Tailwind v4 is wired in through Vite, DaisyUI is installed, and the built-in dark
              theme is the default theme for the whole app.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <button className="btn btn-primary" onClick={() => setCount((value) => value + 1)}>
                Track reps: {count}
              </button>
              <button className="btn btn-ghost" onClick={() => setCount(0)}>
                Reset
              </button>
            </div>
          </div>

          <div className="card w-full max-w-md bg-base-100 shadow-2xl">
            <div className="card-body gap-6">
              <div>
                <p className="text-sm uppercase tracking-[0.3em] text-base-content/50">
                  Ready to build
                </p>
                <h2 className="card-title mt-2 text-2xl">Theme check</h2>
              </div>

              <div className="stats stats-vertical bg-base-200 shadow sm:stats-horizontal">
                <div className="stat">
                  <div className="stat-title">Theme</div>
                  <div className="stat-value text-primary">dark</div>
                  <div className="stat-desc">Powered by DaisyUI</div>
                </div>
                <div className="stat">
                  <div className="stat-title">Styling</div>
                  <div className="stat-value text-secondary">Tailwind</div>
                  <div className="stat-desc">V4 + Vite plugin</div>
                </div>
              </div>

              <div className="card-actions justify-end">
                <button className="btn btn-secondary">Start designing</button>
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}

export default App;
