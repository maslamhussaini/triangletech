import { Icon } from "@/components/icons";
import { RouteLink } from "@/components/navigation";
import { PageIntro, ContactCTA } from "@/components/page-parts";
import { CaseStudyCard } from "@/components/service-card";
import { portfolioProjects } from "@/lib/portfolio";
import { caseStudies, pageMetadata } from "@/lib/site";

export const metadata = pageMetadata("Case Studies", "The problems TriangleTech set out to solve — in our own products and in websites built for clients.", "/case-studies");

export default function CaseStudies() {
  return <>
    <PageIntro label="CASE STUDIES" title="What we set out to solve.">Each case study covers the problem, the approach we took and the screens or sections that came out of it.</PageIntro>

    <section className="section"><div className="container">
      <div className="section-heading"><div><span className="eyebrow">OUR PRODUCTS</span><h2>Platforms we built and maintain.</h2></div></div>
      <div className="case-grid case-grid-full">{caseStudies.map(item => <CaseStudyCard key={item.id} item={item} />)}</div>
    </div></section>

    <section className="section"><div className="container">
      <div className="section-heading"><div><span className="eyebrow">CLIENT WEBSITES</span><h2>Websites built for clients.</h2><p className="section-lead">Independent client businesses whose websites we designed and built — not TriangleTech products.</p></div></div>
      <div className="case-grid case-grid-full">{portfolioProjects.map(project => <article className="case-card" key={project.id}>
        <span className="eyebrow">{project.category}</span>
        <h3>{project.name}</h3>
        <span className="portfolio-badge">{project.badge}</span>
        <div className="case-block"><p>{project.description}</p></div>
        <div className="case-links">
          <RouteLink className="text-link" href={`/case-studies/${project.caseStudySlug}`}>Read the case study<Icon name="arrow" /></RouteLink>
          <a className="text-link" href={project.url} target="_blank" rel="noopener noreferrer" aria-label={`Visit the ${project.name} website (opens in a new tab)`}>Visit Live Website <span aria-hidden="true">↗</span></a>
        </div>
      </article>)}</div>
    </div></section>

    <ContactCTA />
  </>;
}
