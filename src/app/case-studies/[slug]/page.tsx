import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { Icon } from "@/components/icons";
import { RouteLink } from "@/components/navigation";
import { PageIntro, ContactCTA } from "@/components/page-parts";
import { ProjectPreviewFrame } from "@/components/portfolio-section";
import { portfolioCaseStudies, portfolioProjects } from "@/lib/portfolio";
import { caseStudies, pageMetadata } from "@/lib/site";

export function generateStaticParams() {
  return [
    ...Object.keys(portfolioCaseStudies).map(slug => ({ slug })),
    ...caseStudies.map(item => ({ slug: item.id })),
  ];
}

export const dynamicParams = false;

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const study = portfolioCaseStudies[slug];
  if (study) return pageMetadata(study.title, study.overview, `/case-studies/${study.slug}`);
  const product = caseStudies.find(item => item.id === slug);
  if (product) return pageMetadata(product.name, product.solution, `/case-studies/${product.id}`);
  return {};
}

export default async function CaseStudyDetail({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const study = portfolioCaseStudies[slug];
  const project = portfolioProjects.find(p => p.caseStudySlug === slug);

  if (study && project) {
    return <>
      <PageIntro label={`WEBSITE PROJECT · ${project.badge.toUpperCase()}`} title={study.title}>{study.overview}</PageIntro>
      <div className="container case-detail-grid">
        <div className="case-detail-visual"><ProjectPreviewFrame project={project} /></div>
        <article className="case-card case-article">
          <span className="eyebrow">{project.category}</span>
          <div className="case-block"><h2>The problem</h2><p>{study.problem}</p></div>
          <div className="case-block"><h2>Our approach</h2><p>{study.approach}</p></div>
          <div className="case-block"><h2>Main sections</h2><p>{study.sections.join(" · ")}</p></div>
          <div className="case-block"><h2>Responsive behavior</h2><p>{study.responsive}</p></div>
          {project.technologies.length > 0 && <ul className="tech-tags">{project.technologies.map(tech => <li key={tech}>{tech}</li>)}</ul>}
          <div className="case-links">
            <a className="text-link" href={project.url} target="_blank" rel="noopener noreferrer" aria-label={`Visit the ${project.name} website (opens in a new tab)`}>
              Visit Live Website <span aria-hidden="true">↗</span>
            </a>
            <RouteLink className="text-link" href="/case-studies">Back to all case studies<Icon name="arrow" /></RouteLink>
          </div>
        </article>
      </div>
      <ContactCTA />
    </>;
  }

  const product = caseStudies.find(item => item.id === slug);
  if (!product) notFound();

  return <>
    <PageIntro label={`CASE STUDY · ${product.category.toUpperCase()}`} title={product.name}>{product.solution}</PageIntro>
    <div className="container case-grid-full">
      <article className="case-card case-article">
        <span className="eyebrow">{product.category}</span>
        <div className="case-block"><h2>The problem</h2><p>{product.problem}</p></div>
        <div className="case-block"><h2>What we built</h2><p>{product.solution}</p></div>
        <ul className="tech-tags">{product.tags.map(tag => <li key={tag}>{tag}</li>)}</ul>
        <div className="case-links">
          <RouteLink className="text-link" href="/case-studies">Back to all case studies<Icon name="arrow" /></RouteLink>
        </div>
      </article>
    </div>
    <ContactCTA />
  </>;
}
