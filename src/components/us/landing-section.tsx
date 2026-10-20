/**
 * LandingSection — one semantic <section> with the site's standard
 * container and heading rhythm (.section / .container / .section-heading),
 * matching the homepage's section composition. Server Component.
 */
export function LandingSection({
  id,
  eyebrow,
  title,
  description,
  children,
}: {
  id?: string;
  eyebrow?: string;
  title?: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="section" id={id}>
      <div className="container">
        {(eyebrow || title || description) && (
          <div className="section-heading">
            <div>
              {eyebrow && <span className="eyebrow">{eyebrow}</span>}
              {title && <h2>{title}</h2>}
              {description && <p className="section-lead">{description}</p>}
            </div>
          </div>
        )}
        {children}
      </div>
    </section>
  );
}
