import { PageIntro, ContactCTA } from "@/components/page-parts";
import { CaseStudyCard } from "@/components/service-card";
import { caseStudies, pageMetadata } from "@/lib/site";

export const metadata = pageMetadata("Case Studies", "Projects TriangleTech has designed and built, from business management platforms to digital invoicing and ecommerce stores.", "/case-studies");

export default function CaseStudies() {
  return <><PageIntro label="CASE STUDIES" title="Projects we&apos;ve delivered.">A look at the problems we&apos;ve solved and the solutions we built to solve them.</PageIntro>
    <div className="container case-grid case-grid-full">{caseStudies.map(item => <CaseStudyCard key={item.id} item={item} />)}</div>
    <ContactCTA />
  </>;
}
