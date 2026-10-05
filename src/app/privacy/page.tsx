import { PageIntro, ContactCTA } from "@/components/page-parts";
import { RouteLink } from "@/components/navigation";
import { Icon } from "@/components/icons";
import { business, pageMetadata } from "@/lib/site";

export const metadata = pageMetadata(
  "Privacy Policy",
  "How TriangleTech collects, uses, stores and protects information shared through our website, our products and any third-party service you choose to connect.",
  "/privacy",
);

const EFFECTIVE_DATE = "5 October 2026";

const sections = [
  { id: "who-we-are", label: "Who we are" },
  { id: "information-you-provide", label: "Information you provide" },
  { id: "website-and-technical-use", label: "Website and technical use" },
  { id: "third-party-connections", label: "Third-party connections" },
  { id: "publishing-and-authorization", label: "Publishing and authorization" },
  { id: "third-party-services", label: "Third-party services" },
  { id: "how-we-use-information", label: "How we use information" },
  { id: "cookies-and-storage", label: "Cookies and storage" },
  { id: "retention-and-disconnecting", label: "Retention and disconnecting" },
  { id: "deleting-your-data", label: "Deleting your data" },
  { id: "security", label: "Security" },
  { id: "childrens-privacy", label: "Children's privacy" },
  { id: "international-users", label: "International users" },
  { id: "changes-to-this-policy", label: "Changes to this policy" },
  { id: "contact", label: "Contact us" },
];

export default function Privacy() {
  return <><PageIntro label="LEGAL" title="Privacy Policy">
    This policy explains what information TriangleTech collects, why we collect it, and the choices you have. It applies to {business.url} and to the TriangleTech software products and services our customers use, including any third-party service you choose to connect.
  </PageIntro>

  <section className="section"><div className="container legal-layout">
    <article className="legal-doc">
      <p className="legal-meta">Effective date: {EFFECTIVE_DATE} &middot; Last updated: {EFFECTIVE_DATE}</p>

      <h2 id="who-we-are">1. Who we are</h2>
      <p>
        {business.name} (&ldquo;TriangleTech&rdquo;, &ldquo;we&rdquo;, &ldquo;us&rdquo;) operates this website and develops the business software products and services it offers, including OrderMate, FBR Digital, WaterFlow, Shopify Solutions and our content automation service. This policy describes how TriangleTech handles the information covered below.
      </p>
      <p>
        This policy covers information you share with us directly, technical information generated when you use our website or products, and information handled when you voluntarily connect a third-party service to a TriangleTech account.
      </p>

      <h2 id="information-you-provide">2. Information you voluntarily provide</h2>
      <p>We only receive the information you choose to give us. This typically includes:</p>
      <ul>
        <li><strong>Contact and account information</strong> you enter on our contact or demo request form or send by email or WhatsApp &mdash; for example your name, business name, email address, phone or WhatsApp number, business type, the product you are interested in, your preferred contact time, and anything you include in the message field.</li>
        <li><strong>Product assistant details</strong> you type into the assistant on this website &mdash; including your name, email address, phone number and business name if you choose to give them, together with the messages you send in that conversation.</li>
        <li><strong>Project and support information</strong> you send while evaluating or using a TriangleTech product, such as workflow descriptions, requirements, and files or records you submit for the work you have asked us to do.</li>
        <li><strong>Account information</strong> you provide when you create an account for a TriangleTech product or service, including a user name, email address and the permissions or access level you assign to other users of your workspace.</li>
      </ul>
      <p>
        Browsing this website does not require an account or sign-in, and nothing on this site asks you to create one. On the demo request form, your entries are prepared as an email draft in your own email application, and nothing is transmitted to TriangleTech until you press send. If you would rather talk to us first, WhatsApp and email details are shown throughout the site.
      </p>

      <h2 id="website-and-technical-use">3. Website use and necessary technical information</h2>
      <p>
        Like any web server, our hosting infrastructure necessarily records limited technical information in order to deliver pages to your device and to keep the service reliable. This can include your IP address, the date and time of the request, the page or resource requested, the referring page, and your browser type, version and language.
      </p>
      <p>
        We use this information to operate and troubleshoot the service &mdash; for example to serve pages, to investigate errors, to detect abuse such as automated or repeated requests, and to understand in broad terms which parts of the site are used. It is not used to build advertising profiles about you.
      </p>
      <p>
        The product assistant available on this site processes the messages you type into it. It sends your message and the short conversation context to our configured AI service provider in order to generate a reply, and it uses the network address of the request to limit automated abuse. No cookies are used to identify you.
      </p>

      <h2 id="third-party-connections">4. Data processed when you connect a third-party service</h2>
      <p>
        Some TriangleTech products let you voluntarily connect an external account so the product can work with content you already manage. Connecting a service is always your choice, and the connection can be removed at any time (see section 9).
      </p>
      <h3>Pinterest</h3>
      <p>
        If you choose to connect a Pinterest account to a TriangleTech product, you will authorize the connection yourself through the Pinterest authorization flow. You will grant permissions for the specific actions the product needs, and you may grant fewer permissions than requested. Once authorized, the product may access only the categories of information those permissions cover &mdash; for example permitted information about the authorized Pinterest account, the boards you have made available, and Pins and related information associated with them &mdash; and only to the extent required for the features you have chosen to use.
      </p>
      <ul>
        <li>The integration will access Pinterest data <strong>only through official Pinterest APIs</strong>, using the permissions you specifically grant.</li>
        <li><strong>We never ask you for your Pinterest password.</strong> Authorization happens on Pinterest&apos;s side, and we only receive the resulting access token.</li>
        <li><strong>We do not use unauthorized scraping or unofficial private APIs</strong> to reach Pinterest data.</li>
        <li>Authorization tokens and related credentials are handled <strong>server-side only</strong>. They are not sent to the browser, not embedded in pages, and not intentionally exposed publicly.</li>
        <li>You can revoke access at any time from your Pinterest account settings or from within the TriangleTech product, and this takes effect without us needing your password.</li>
      </ul>
      <p>
        Pinterest is a separate company with its own privacy policy and terms. Its processing of your data is governed by those documents, not by this policy. {business.name} is not affiliated with, endorsed by, sponsored by or operated by Pinterest.
      </p>

      <h2 id="publishing-and-authorization">5. Creating and publishing content</h2>
      <p>
        The service creates, schedules or publishes content to your connected accounts <strong>only when you have authorized that action</strong> &mdash; through the permissions you granted, the settings you chose, and the specific instruction or approval you gave in the product. Nothing is published to a connected account on its own initiative outside the approval workflow you have set up.
      </p>
      <p>
        You remain responsible for the content you submit for publication and for confirming it before it goes live. If a connected service imposes its own rate limits, review requirements or publishing rules, those apply to content published through the integration.
      </p>

      <h2 id="third-party-services">6. Third-party services have their own policies</h2>
      <p>
        Services you connect &mdash; including Pinterest and the hosting, communication and AI service providers we use to operate a feature &mdash; are independent third parties. Each has its own privacy policy, terms of service and data practices, and each collects and uses data under its own policy. We encourage you to read those policies before connecting an account or sharing information with any third party.
      </p>
      <p>
        We do not control and are not responsible for the content, privacy practices or data handling of third-party services, including information you choose to publish through them.
      </p>

      <h2 id="how-we-use-information">7. How we use information</h2>
      <ul>
        <li>To respond to your inquiries, book and deliver product demonstrations, and manage our relationship with you.</li>
        <li>To provide, operate, maintain and improve our products, and to develop the features our customers ask for.</li>
        <li>To perform the work covered by an agreement with you, such as configuring a workspace or supporting a project.</li>
        <li>To carry out the actions you authorize in a connected integration, within the permissions and approval workflow you set.</li>
        <li>To protect the security, availability and integrity of our services, and to enforce our terms.</li>
        <li>To comply with legal obligations that apply to us, or to establish, exercise or defend legal claims.</li>
      </ul>
      <p>
        We do not sell your personal information. We do not share it with third parties for their own advertising or marketing purposes.
      </p>

      <h2 id="cookies-and-storage">8. Cookies and storage used by this website</h2>
      <p>
        This website does not set tracking cookies, does not use advertising or cross-site tracking technology, and does not embed third-party analytics or advertising trackers. If you use the product assistant, the conversation you have with it stays in your browser session and is not used to build a profile of you.
      </p>
      <p>
        Where a TriangleTech product requires a cookie or similar browser storage, it does so to keep you signed in and to remember in-product preferences and workspace state. We will describe any additional storage a specific product uses in that product&apos;s own documentation when it is introduced.
      </p>

      <h2 id="retention-and-disconnecting">9. Retention and disconnecting integrations</h2>
      <p>
        We keep personal information only for as long as it is needed for the purposes described in this policy &mdash; typically while an account or customer relationship is active, and afterwards only as long as needed for legitimate business or legal reasons such as record-keeping, resolving disputes or meeting legal obligations. When information is no longer needed we delete it or reduce it to a form that cannot identify you.
      </p>
      <p>
        <strong>Disconnecting an integration.</strong> You can disconnect a connected third-party service at any time from within the product. Disconnecting revokes our access going forward and removes the authorization token we hold for that connection. Content that has already been published to the third-party service is controlled by that service and is not automatically removed &mdash; you manage that from your account there.
      </p>

      <h2 id="deleting-your-data">10. Deleting your account and data</h2>
      <p>
        You can ask us to delete your TriangleTech account and the personal information associated with it. To make a request, email us at the address in section 15 from the email address tied to the account where possible, and include enough detail for us to identify the account or integration. We will verify the request with you before deleting anything, then delete or anonymise the information we are able to remove.
      </p>
      <p>
        Some information cannot be deleted immediately, or at all &mdash; for example transaction and invoice records we are required to retain, or information we must keep to comply with a legal obligation or to defend a legal claim. We will tell you if that applies to your request.
      </p>

      <h2 id="security">11. Security</h2>
      <p>
        We take reasonable steps to protect the information we hold, including restricting access to the people who need it to do their job, keeping authorization credentials on our servers rather than in browsers, using HTTPS for data in transit, and maintaining appropriate technical and organisational controls over the systems that store customer data.
      </p>
      <p>
        No method of transmission or storage is completely secure, so we cannot guarantee absolute or uninterrupted security. Please choose a strong, unique password for any TriangleTech account, keep your own devices protected, and contact us promptly if you believe your account or a connected account has been compromised.
      </p>

      <h2 id="childrens-privacy">12. Children&apos;s privacy</h2>
      <p>
        Our website and services are intended for businesses and business users and are not directed to children. We do not knowingly collect personal information from children, and we do not knowingly permit children to create accounts or connect third-party services. If you believe a child has provided us with personal information, contact us at the address in section 15 and we will address it.
      </p>

      <h2 id="international-users">13. International users and data processing</h2>
      <p>
        TriangleTech works with clients in different countries, so information you give us may be processed in a country other than your own. Connected third-party services also process information in and from the country where they operate.
      </p>
      <p>
        Where we transfer information across borders, we do so with the appropriate safeguards for the transfer and in line with the purposes described in this policy. Different countries have different data protection laws, and the protections available to you depend on where you live. If you have questions about how information is handled across borders, contact us and we will explain what applies to you.
      </p>

      <h2 id="changes-to-this-policy">14. Changes to this policy</h2>
      <p>
        We may update this policy as our products, integrations and legal obligations change. The effective date and last updated date at the top of this page always show the current version. When a change materially affects how we handle information you have already provided, we will take reasonable steps to notify you &mdash; for example through the product or by email &mdash; before the change takes effect.
      </p>

      <h2 id="contact">15. Contact us</h2>
      <p>
        For any privacy question, to make a deletion request, or to disconnect an integration, contact us using the same official channels listed on this website:
      </p>
      <ul>
        <li>Email: <a href={`mailto:${business.email}`}>{business.email}</a></li>
        <li>WhatsApp: <a href={business.whatsappPrimary} target="_blank" rel="noopener noreferrer">{business.whatsappPrimaryLabel}</a></li>
        <li>Contact form: <RouteLink className="text-link" href="/contact">Contact TriangleTech<Icon name="arrow" /></RouteLink></li>
      </ul>
      <p>
        Please describe your request clearly and, if you are asking about a specific account, tell us which one so we can find it. We aim to acknowledge privacy requests promptly.
      </p>

      <p className="legal-note">
        TriangleTech provides software and services &ldquo;as is&rdquo;. This policy is a plain-language description of our actual practices, not a warranty or a representation of compliance with any particular legal framework, and it does not create obligations beyond those in the written agreement for a specific product or service.
      </p>
    </article>

    <aside className="legal-aside">
      <div className="legal-aside-card">
        <h2>On this page</h2>
        <ol>{sections.map(section => <li key={section.id}><a href={`#${section.id}`}>{section.label}</a></li>)}</ol>
      </div>
      <div className="legal-aside-card legal-aside-contact">
        <h2>Privacy question?</h2>
        <p>Email <a href={`mailto:${business.email}`}>{business.email}</a> or reach us on WhatsApp.</p>
        <RouteLink className="button-indigo-secondary" href="/contact">Contact TriangleTech<Icon name="arrow" /></RouteLink>
      </div>
    </aside>
  </div></section>

  <ContactCTA />
  </>;
}