
# Key Operational Decisions

## Partnerships

#### Cloud Infrastructure — AWS

All three cloud providers (AWS, Azure, Google Cloud) offer UK data centres, facial recognition APIs, and comparable storage pricing. The decisive factors for PhotoMe specifically are:
 - AWS Rekognition is a mature, production-tested facial recognition service with well-documented accuracy benchmarks and straightforward GDPR-compliant configuration, compared to building Azure Face API or Google Vision.
 - AWS ecosystem depth (S3, RDS, Lambda, Cloudfront) means PhotoMe can operate its entire cloud infrastructure within a single provider, reducing integration complexity and vendor management overhead
 - AWS eu-west-2 (London) satisfies UK GDPR data residency without requiring cross-border transfer mechanisms

Single-provider dependency is a genuine operational risk. If AWS experiences a regional outage, the platform goes down entirely. As the platform matures, a multi-region failover strategy within AWS is more practical, and should be planned from the outset if not implemented at launch.

The plan notes that compute cost, not storage, will dominate cloud spend as user numbers grow. Architectural decisions at the MVP stage, such as caching results, could have high cost and performance implications at scale, and should be designed in from the start.

#### Payment Processing

The plan is currently to use Stipe, as it provides lower transaction fees and better suitability for subscription-based digital services. Additional operation considerations:
 - Trails, Upgrades, Downgrades, and failed payment retries are out of the box.
 - Stripes webhook system enables real-time tier provisioning
 - Stripe is PCI DSS Level 1 compliant, meaning PhotoMe never handles raw card data and inherits Stripe's compliance certification.
 - The 20p fixed fee per transaction is disproportionately costly for the £2.99 Pro Subscription. As the service grows, so does the need for negotiating volume-based rates with Stripe.

#### University Societies & Event Organisers

University societies operate on annual committee cycles with high turnover; a society president who champions PhotoMe may not be present in the next year. Partnerships must be institutionalised at the society or university level, not dependent on individual relationships. This means:
 - Formal partnership agreements with society treasures or university student unions
 - Incentive structures for societies themselves (free Business tier access for affiliated societies, commission on member Pro upgrades) rather than solely for individual users

Event organiser relationships require a different structure. These are commercial B2B relationships where the organiser needs clear SLA (uptime guarantees, support response times, data handling commitments) before integrating PhotoMe with their event. The operational question is whether PhotoMe positions itself as a low-cost consumer tool that organisers happen to use, or as a professional event technology platform, as these require different sales, support, and reliability commitments.

#### Marketing Partners — Instagram & TikTok

##### Paid acquisition vs. organic growth

At an early stage with a limited budget, organic and earned media are a more capital-efficient acquisition channel than paid advertising. Paid campaigns should be concentrated on specific high-leverage moments, for example, Freshers' Week in September/October, end-of-year events in May/June

##### Creator partnerships

A structured ambassador program with defined incentives (free Pro access, commission on referrals) is more operationally tractable than managing multiple paid media relationships simultaneously.

## Key Resources

## Delivery Model

## Summary of Key decisions

| Decision | Recommendation | Rationale |
|---|---|---|
| Cloud provider | AWS, single-region at launch with failover plan | Ecosystem depth, Rekognition maturity, GDPR compliance |
| Facial recognition | AWS Rekognition at MVP; proprietary model post-Series A | Speed to market vs. long-term cost and accuracy control |
| Payment processing | Stripe with webhook-driven tier provisioning | Subscription lifecycle management, PCI compliance, lower fixed fee |
| Cross-platform framework | React Native or Flutter based on team skills | Cost efficiency; defer native apps until post-PMF |
| University partnerships | Formalise at student union level, not individual committee members | Resilience to annual committee turnover |
| DPO appointment | External DPO service from day one | UK GDPR Article 37 likely requires formal designation for biometric processing |
| MVP scope | Core gallery, upload-to-unlock, facial recognition, Stripe billing only | Concentration of effort on core value proposition |
| Go-to-market | Phase 1 university only; Phase 2 Business tier; Phase 3 public events | Network effects strongest in dense communities; avoid premature scaling |
| Cold start | Seed events with partner-supplied photos; launch at Freshers' Week | Gallery must have content at first user touchpoint |
| Customer support | Structured FAQ and monitored inbox with defined SLA at launch | Biometric data and financial subscriptions require responsive support from day one |y Operational Decisions
