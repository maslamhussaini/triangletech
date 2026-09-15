import { Icon } from "./icons";
import { RouteLink } from "./navigation";
import { portfolioProjects, type PortfolioProject } from "@/lib/portfolio";

/**
 * Original, abstract preview mockups built with inline SVG — not screenshots
 * of the live sites. Each theme gives a business-flavored hero illustration
 * (fake nav line, fake headline bar, fake CTA block, abstract shapes).
 */
export function ProjectPreviewMockup({ theme }: { theme: PortfolioProject["mockupTheme"] }) {
  const palette = theme === "business"
    ? { a: "var(--violet)", b: "var(--blue)" }
    : theme === "water-transport"
      ? { a: "var(--cyan)", b: "var(--blue)" }
      : { a: "var(--blue)", b: "var(--cyan)" };

  return <svg className="portfolio-mockup" viewBox="0 0 480 300" role="img" aria-label={`Abstract preview mockup representing the ${theme === "business" ? "business" : "transport"}-style layout of this website`}>
    <defs>
      <linearGradient id={`grad-${theme}`} x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stopColor={palette.a} stopOpacity=".9" />
        <stop offset="100%" stopColor={palette.b} stopOpacity=".55" />
      </linearGradient>
    </defs>
    <rect width="480" height="300" fill="#0a1526" />
    <rect x="0" y="0" width="480" height="34" fill="#0e1c38" />
    <circle cx="20" cy="17" r="4" fill={palette.a} />
    <rect x="36" y="13" width="60" height="8" rx="4" fill="#2a3a5c" />
    <rect x="340" y="12" width="24" height="10" rx="3" fill="#2a3a5c" />
    <rect x="372" y="12" width="24" height="10" rx="3" fill="#2a3a5c" />
    <rect x="404" y="12" width="24" height="10" rx="3" fill="#2a3a5c" />
    <rect x="0" y="34" width="480" height="140" fill={`url(#grad-${theme})`} opacity=".22" />
    {theme !== "business" ? <>
      <path d="M0 150 L480 150" stroke={palette.a} strokeWidth="3" strokeDasharray="14 10" opacity=".55" />
      <path d="M0 170 L480 170" stroke={palette.b} strokeWidth="2" strokeDasharray="8 8" opacity=".35" />
      <rect x="60" y="90" width="120" height="46" rx="8" fill={palette.a} opacity=".5" />
      <rect x="200" y="70" width="90" height="66" rx="8" fill={palette.b} opacity=".4" />
      <rect x="310" y="100" width="90" height="36" rx="18" fill={palette.a} opacity=".65" />
    </> : <>
      <circle cx="120" cy="105" r="46" fill={palette.a} opacity=".45" />
      <rect x="200" y="70" width="150" height="24" rx="6" fill="#dfe6fb" opacity=".8" />
      <rect x="200" y="104" width="110" height="12" rx="6" fill="#9fb0dd" opacity=".7" />
      <rect x="200" y="124" width="130" height="12" rx="6" fill="#9fb0dd" opacity=".5" />
    </>}
    <rect x="40" y="52" width="180" height="16" rx="4" fill="#dfe6fb" opacity=".85" />
    <rect x="40" y="76" width="130" height="10" rx="4" fill="#9fb0dd" opacity=".6" />
    <rect x="40" y="150" width="96" height="26" rx="6" fill={palette.a} />
    <rect x="0" y="190" width="480" height="110" fill="#0d1a33" />
    <rect x="40" y="212" width="130" height="12" rx="4" fill="#2a3a5c" />
    <rect x="40" y="234" width="400" height="8" rx="4" fill="#1c2b4c" />
    <rect x="40" y="250" width="360" height="8" rx="4" fill="#1c2b4c" />
    <rect x="40" y="266" width="200" height="8" rx="4" fill="#1c2b4c" />
  </svg>;
}

export function ProjectPreviewFrame({ project }: { project: PortfolioProject }) {
  return <div className="browser-frame portfolio-preview-frame">
    <div className="browser-chrome"><span className="chrome-dot" /><span className="chrome-dot" /><span className="chrome-dot" /><span className="chrome-url">{project.url.replace(/^https?:\/\//, "").replace(/\/$/, "")}</span></div>
    <div className="browser-body portfolio-preview-body"><ProjectPreviewMockup theme={project.mockupTheme} /></div>
  </div>;
}

function ProjectCard({ project }: { project: PortfolioProject }) {
  return <article className={`portfolio-card ${project.featured ? "portfolio-card-featured" : ""}`}>
    <ProjectPreviewFrame project={project} />
    <div className="portfolio-card-body">
      <div className="portfolio-card-heading">
        <span className="portfolio-badge">{project.badge}</span>
        <span className="eyebrow">{project.category}</span>
      </div>
      <h3>{project.name}</h3>
      <p>{project.description}</p>
      {project.technologies.length > 0 && <ul className="tech-tags">{project.technologies.map(tech => <li key={tech}>{tech}</li>)}</ul>}
      <div className="portfolio-card-actions">
        <a className="button button-accent" href={project.url} target="_blank" rel="noopener noreferrer" aria-label={`Visit ${project.name} website (opens in a new tab)`}>
          Visit Live Website <span aria-hidden="true">↗</span><Icon name="external" />
        </a>
        <RouteLink className="text-link" href={`/case-studies/${project.caseStudySlug}`}>View Case Study<Icon name="arrow" /></RouteLink>
      </div>
    </div>
  </article>;
}

export function PortfolioSection() {
  return <section id="selected-work" className="section portfolio-section" data-reveal><div className="container">
    <div className="section-heading"><div><span className="eyebrow">SELECTED WORK</span><h2>Websites we&apos;ve built for clients.</h2><p>Three live client sites, each with a short case study covering the problem and the approach. The previews below are original illustrations of each layout, not screenshots.</p></div></div>
    <div className="portfolio-grid">
      {portfolioProjects.map(project => <ProjectCard key={project.id} project={project} />)}
    </div>
  </div></section>;
}
