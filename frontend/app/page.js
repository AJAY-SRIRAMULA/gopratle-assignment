import RequirementWizard from '../components/RequirementWizard';

export default function Home() {
  return (
    <div className="page">
      <header className="site-header">
        <span className="brand"><span className="brand-mark" aria-hidden="true">G</span> GoPratle <span className="brand-sub">Requirements</span></span>
        <span className="tag">Assignment build</span>
      </header>
      <main className="container">
        <section className="hero">
          <p className="eyebrow">Event requirement posting</p>
          <h1>Share your event requirements</h1>
          <p className="lead">
            Tell us about your event and who you need — a planner, a performer or a crew.
            Four short steps, tailored to what you are looking for.
          </p>
        </section>
        <RequirementWizard />
      </main>
      <footer className="site-footer">
        An independent assignment project, not an official GoPratle product.
      </footer>
    </div>
  );
}
