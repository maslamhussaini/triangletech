import { PageIntro } from "@/components/page-parts";
import { business, pageMetadata } from "@/lib/site";

export const metadata = pageMetadata("Privacy Policy", "How TriangleTech collects, uses and protects information shared through our website.", "/privacy");

export default function Privacy() {
  return <PageIntro label="LEGAL" title="Privacy Policy">
    We collect only the information you choose to share with us through our contact form or email, such as your name, email address and project details, to respond to your inquiry. We do not sell your information to third parties. For questions about this policy, contact us at {business.email}.
  </PageIntro>;
}
