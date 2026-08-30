export type Service = {
  slug: string;
  name: string;
  shortDescription: string;
  headline: string;
  description: string;
  outcomes: string[];
  capabilities: string[];
  process: string[];
};

export type Product = {
  slug: string;
  name: string;
  eyebrow: string;
  shortDescription: string;
  description: string;
  status: "planned" | "private-beta" | "available";
  statusLabel: string;
  version: string | null;
  pricingLabel: string;
  accent: "emerald" | "violet" | "blue";
  features: string[];
  requirements: string[];
  platforms: string[];
  licenseModel: string;
};

export const services: Service[] = [
  {
    slug: "web-design-development",
    name: "Web Design & Development",
    shortDescription: "High-performing websites that make your brand clear, credible, and easy to choose.",
    headline: "A website designed to earn attention and turn it into action.",
    description: "We bring strategy, visual design, content structure, engineering, accessibility, and launch support into one thoughtful process. The result is a fast, maintainable site built around the decisions your customers need to make.",
    outcomes: ["A clearer path from first visit to inquiry", "A polished experience on every screen", "A platform your team can maintain and grow"],
    capabilities: ["Brand-aligned product design", "Responsive front-end development", "Content architecture and conversion flow", "CMS and commerce integrations", "Accessibility and performance optimization", "Analytics, SEO, and launch support"],
    process: ["Discover the audience, offer, and business goal", "Shape the content, journeys, and visual direction", "Build, test, and connect the production system", "Launch with monitoring and a clear improvement path"],
  },
  {
    slug: "custom-software",
    name: "Custom Software",
    shortDescription: "Secure web applications and internal tools designed around your operations.",
    headline: "Software that fits the way your business actually works.",
    description: "When off-the-shelf software creates friction, we design and build a focused product around your team, customers, data, and workflows. We favor simple, durable architecture with room to evolve.",
    outcomes: ["Less work lost between disconnected tools", "A system tailored to real users and permissions", "A maintainable foundation for future features"],
    capabilities: ["Product discovery and technical planning", "Customer and internal web applications", "Dashboards, portals, and operations tools", "Secure APIs and database design", "Authentication and role-based access", "Testing, deployment, and ongoing support"],
    process: ["Map users, risks, and the highest-value workflow", "Prototype the experience and validate the data model", "Deliver in secure, testable increments", "Measure adoption and evolve the product"],
  },
  {
    slug: "automation-integrations",
    name: "Automation & Integrations",
    shortDescription: "Connected systems and reliable workflows that remove repetitive work.",
    headline: "Make the tools you already use work better together.",
    description: "We connect APIs, business platforms, and custom applications with automation that is observable, recoverable, and built for real operating conditions—not fragile demos.",
    outcomes: ["Fewer manual handoffs and duplicate entries", "More consistent data across systems", "Visible, recoverable workflow failures"],
    capabilities: ["API and webhook integrations", "Business process automation", "Data synchronization and migration", "Scheduled and event-driven workflows", "Error handling and operational dashboards", "Integration security and documentation"],
    process: ["Trace the workflow and identify failure points", "Define ownership, validation, and recovery rules", "Build and test against realistic scenarios", "Monitor performance and improve reliability"],
  },
  {
    slug: "ai-solutions",
    name: "AI Solutions",
    shortDescription: "Practical AI features and workflows grounded in your data, people, and goals.",
    headline: "AI that supports real work—not novelty for its own sake.",
    description: "We help teams identify where AI is useful, choose the right models and safeguards, and build experiences that stay understandable, reviewable, and aligned with the business.",
    outcomes: ["Faster work where judgment can be assisted", "Clear human review and escalation paths", "A measured approach to cost, privacy, and quality"],
    capabilities: ["AI opportunity and risk assessment", "Knowledge search and retrieval", "Document and workflow intelligence", "Agent and assistant experiences", "Model evaluation and observability", "Privacy, guardrails, and human review"],
    process: ["Select a valuable, bounded use case", "Define quality, safety, and evaluation criteria", "Prototype with representative data", "Launch with measurement and review controls"],
  },
  {
    slug: "support-maintenance",
    name: "Support & Maintenance",
    shortDescription: "Dependable care for the systems your business relies on.",
    headline: "Keep your digital products secure, healthy, and moving forward.",
    description: "We provide structured maintenance and product support so performance, dependencies, security, content, and small improvements do not become a backlog of avoidable risk.",
    outcomes: ["Faster response when something changes", "Predictable maintenance and dependency care", "A steady path for incremental improvements"],
    capabilities: ["Monitoring and incident response", "Security and dependency updates", "Performance and reliability work", "Content and feature improvements", "Technical documentation", "Release and rollback support"],
    process: ["Document the system and support boundaries", "Establish monitoring and response expectations", "Prioritize maintenance and improvement work", "Review trends and reduce recurring issues"],
  },
  {
    slug: "technology-consulting",
    name: "Technology Consulting",
    shortDescription: "Clear technical direction for consequential product and platform decisions.",
    headline: "Move forward with a technical plan you can defend.",
    description: "We translate business goals into practical architecture, delivery, vendor, security, and product decisions. The work is independent, plainly documented, and designed to reduce uncertainty.",
    outcomes: ["A shared understanding of options and tradeoffs", "Lower delivery and platform risk", "An actionable roadmap instead of a slide-only strategy"],
    capabilities: ["Architecture and platform reviews", "Product and delivery planning", "Vendor and build-versus-buy analysis", "Security and risk assessment", "Technical due diligence", "Recovery and modernization roadmaps"],
    process: ["Clarify the decision and constraints", "Inspect the current system and evidence", "Compare practical options and risks", "Deliver a prioritized recommendation and roadmap"],
  },
];

export const products: Product[] = [
  {
    slug: "ezebay-listing-manager",
    name: "EzeBay Listing Manager",
    eyebrow: "Marketplace workflow software",
    shortDescription: "A focused workspace for creating, reviewing, and managing marketplace listings with less repetitive work.",
    description: "EzeBay Listing Manager is being designed to help sellers prepare consistent listings, organize product information, and move through listing workflows with greater confidence. Product details and availability will be announced as development progresses.",
    status: "planned",
    statusLabel: "In development",
    version: null,
    pricingLabel: "Pricing to be announced",
    accent: "emerald",
    features: ["Structured listing workspace", "Reusable listing information", "Review and validation workflow", "Marketplace integration foundation", "Release and entitlement support", "Secure customer downloads"],
    requirements: ["Final supported systems to be announced", "Internet connection for account and license services"],
    platforms: ["Windows planned"],
    licenseModel: "Commercial license model to be announced",
  },
  {
    slug: "easy-file-editor",
    name: "Easy File Editor",
    eyebrow: "File productivity software",
    shortDescription: "A straightforward editing experience for common file tasks without unnecessary complexity.",
    description: "Easy File Editor is a planned Driftline product focused on making everyday file changes faster and easier to understand. The final feature set, platform support, and commercial terms are still in development.",
    status: "planned",
    statusLabel: "Planned",
    version: null,
    pricingLabel: "Pricing to be announced",
    accent: "violet",
    features: ["Focused editing workflows", "Clear change review", "Safe file handling foundation", "Version-aware update checks", "Account-based entitlements", "Product documentation framework"],
    requirements: ["Final supported systems to be announced", "Internet connection may be required for licensing and updates"],
    platforms: ["Desktop platforms under review"],
    licenseModel: "Commercial license model to be announced",
  },
  {
    slug: "viewsaic",
    name: "Viewsaic",
    eyebrow: "Visual organization software",
    shortDescription: "A planned workspace for viewing, organizing, and sharing image collections more clearly.",
    description: "Viewsaic is an early product concept for people and teams who need a cleaner way to work with image collections. Product scope is provisional and will be refined before release.",
    status: "planned",
    statusLabel: "Early concept",
    version: null,
    pricingLabel: "Pricing to be announced",
    accent: "blue",
    features: ["Fast collection browsing", "Flexible organization", "Sharing and export foundation", "Private customer access", "Secure release downloads", "Version and support lifecycle tracking"],
    requirements: ["Final supported systems to be announced", "Storage and sharing requirements are under review"],
    platforms: ["Platform support to be announced"],
    licenseModel: "Commercial terms to be announced",
  },
];

export const conceptProjects = [
  {
    title: "Service commerce concept",
    type: "Website & customer journey",
    description: "An illustrative concept for a service business that needs clearer offers, scheduling, and customer follow-through.",
  },
  {
    title: "Operations portal concept",
    type: "Custom web application",
    description: "An illustrative portal concept that brings requests, status, documents, and reporting into one secure workspace.",
  },
  {
    title: "Connected workflow concept",
    type: "Automation & integration",
    description: "An illustrative system that validates incoming work, synchronizes data, and provides a visible recovery queue.",
  },
  {
    title: "Product launch concept",
    type: "Software platform",
    description: "An illustrative launch system spanning product pages, customer access, licenses, releases, and support content.",
  },
];

export function getService(slug: string) {
  return services.find((service) => service.slug === slug);
}

export function getProduct(slug: string) {
  return products.find((product) => product.slug === slug);
}
