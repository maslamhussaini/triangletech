import { PageIntro } from "@/components/page-parts";
import { business, pageMetadata } from "@/lib/site";

export const metadata = pageMetadata("Terms of Service", "The terms that apply to using the TriangleTech website and engaging TriangleTech for a project.", "/terms");

export default function Terms() {
  return <PageIntro label="LEGAL" title="Terms of Service">
    This website is provided for informational purposes. Project scope, pricing and delivery terms for any engagement are agreed separately in writing between TriangleTech and the client. For questions, contact us at {business.email}.
  </PageIntro>;
}
