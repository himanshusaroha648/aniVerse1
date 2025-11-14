import { Link } from 'react-router-dom';

function Collections() {
  return (
    <section className="py-20 text-center">
      <div className="mx-auto max-w-2xl px-4">
        <h1 className="text-4xl font-bold text-white mb-4">Collections</h1>
        <p className="text-muted text-lg mb-8">
          Explore curated collections of your favorite anime series
        </p>
        <div className="glass-surface rounded-3xl p-8 border border-white/10">
          <p className="text-muted mb-6">
            Collections feature is coming soon! Browse our anime library for now.
          </p>
          <Link
            to="/"
            className="inline-flex rounded-full bg-primary px-6 py-3 text-white font-semibold transition hover:bg-primary/90"
          >
            Browse Anime
          </Link>
        </div>
      </div>
    </section>
  );
}

export default Collections;
