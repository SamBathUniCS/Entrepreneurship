# Key Operational Decisions

## Partnerships

#### Cloud Infrastructure

All three cloud providers (AWS, Azure, Google Cloud) offer UK data centres, facial recognition APIs, and comparable storage pricing. The decisive factors for PhotoMe specifically are:

- AWS Rekognition is a mature, production-tested facial recognition service with well-documented accuracy benchmarks and straightforward GDPR-compliant configuration, compared to building Azure Face API or Google Vision.
- AWS ecosystem depth (S3, RDS, Lambda, Cloudfront) means PhotoMe can operate its entire cloud infrastructure within a single provider, reducing integration complexity and vendor management overhead
- AWS eu-west-2 (London) satisfies UK GDPR data residency without requiring cross-border transfer mechanisms

Single-provider dependency is a genuine operational risk. If AWS experiences a regional outage, the platform goes down entirely. As the platform matures, a multi-region failover strategy within AWS is more practical, and should be planned from the outset if not implemented at launch.

The plan notes that compute cost, not storage, will dominate cloud spend as user numbers grow. Architectural decisions at the MVP stage, such as caching results, could have high cost and performance implications at scale, and should be designed in from the start.

#### Payment Processing

The plan is currently to use Stripe, as it provides lower transaction fees and better suitability for subscription-based digital services. Additional operation considerations include:

- Trials, Upgrades, Downgrades, and failed payment retries are out of the box.
- Stripes webhook system enables real-time tier provisioning
- Stripe is PCI DSS Level 1 compliant, meaning PhotoMe never handles raw card data and inherits Stripe's compliance certification.
- The 20p fixed fee per transaction is disproportionately costly for the £2.99 Pro Subscription. As the service grows, so does the need for negotiating volume-based rates with Stripe.

#### University Societies & Event Organisers

University societies operate on annual committee cycles with high turnover; a society president who champions PhotoMe may not be present in the next year. Partnerships must be institutionalised at the society or university level, not dependent on individual relationships. We should establish:

- Formal partnership agreements with society treasures or university student unions
- Incentive structures for societies themselves (free Business tier access for affiliated societies, commission on member Pro upgrades) rather than solely for individual users

Event organiser relationships require a different structure. These are commercial B2B relationships where the organiser needs clear SLA (uptime guarantees, support response times, data handling commitments) before integrating PhotoMe with their event. The operational question is whether PhotoMe positions itself as a low-cost consumer tool that organisers happen to use, or as a professional event technology platform, as these require different sales, support, and reliability commitments.

#### Marketing Partners — Instagram & TikTok

##### Paid acquisition vs. organic growth

At an early stage with a limited budget, organic and earned media are a more capital-efficient acquisition channel than paid advertising. Paid campaigns should be concentrated on specific high-leverage moments, for example, Freshers' Week in September/October, end-of-year events in May/June.

##### Creator partnerships

A structured ambassador program with defined incentives (free Pro access, commission on referrals) is more operationally tractable than managing multiple paid media relationships simultaneously.

## Key Resources

#### Technology Stack Decisions

##### Database Architecture

The plan specifies PostgreSQL on Amazon RDS, beginning with a `db.t3.mirco` instance. This works for the early stage. However, a photo platform with complex permission queries places meaningful demand on the relational query performance as data volume grows. Investing early in a well-designed database indexing and query optimisation is significantly cheaper than migrating to a different architecture later under load.

##### CDN Strategy

Serving high-resolution photos directly from S3 to users across the UK introduces latency and egress costs. AWS CloudFront, configured as a CDN layer in front of S3, reduces both costs and time. This should be in the initial architecture, not added later.

#### Team Composition

##### Data protection officer (DPO)

A designated Data Protection Officer (DPO) may be legally required under UK GDPR Article 37. Organisations that process special category data at scale on a systematic basis are required to appoint a DPO. The DPO does not need to be a full-time hire at an early stage, but the role must be formally designated before processing beings.

##### Customer support cannot be deferred

Customer support can be operationally risky for a platform handling biometric data and financial subscriptions. Users who experience a misidentification, a failed payment, or a privacy concern need a responsive, knowledgeable response. This cannot be a developer context switching from another task.

A basic support function, even a well-structured FAQ or monitored inbox with SLA, should be in place at launch.

## Delivery Model

#### MVP Scope

The plan estimates a 6-month development time to MVP. This is only realistically achievable with a tightly scoped MVP that defers non-essential features. A practical MVP hierarchy for PhotoMe would be:

Must have at launch:

- Event creation and QR code joining
- Photo upload and gallery viewing
- Basic tier upload-to-unlock access model
- Facial recognition matching via AWS Rekognition
- Stripe subscription billing for Pro tier
- GDPR-compliant consent flows, privacy controls, and data deletion

Should defer post-launch:

- AI highlight reel and montage generation
- Business tier analytics dashboard
- Leaderboards and gamification features
- Social features (friends list, peer tagging)
- Anniversary compilations and long-term archive features

The sequencing focuses on the core value proposition and avoids the common startup failure of launching with broad but shallow functionality.

#### Go-to-Market Sequencing

**Phase 1 (Months 1–6): University societies**.
Single geography, student societies only, Basic and Pro tiers. This generates a contained, high-frequency user base that produces rapid feedback cycles, stress-tests the upload-to-unlock mechanic, and builds the social proof needed for wider adoption. The network effects are strongest in dense, geographically concentrated communities, exactly what a university campus provides.

**Phase 2 (Months 7–12): Expand university coverage and introduce Business tier**.
With a validated product and case studies from phase 1, approach student unions and university events teams with formal partnership agreements. Launch business tier to event organiser partners who have been identified and briefed during Phase 1.

**Phase 3 (Year 2+): General public events**.  
Weddings, festivals, corporate events. By this stage, the platform has proven reliability, a track record of GDPR compliance, and the support infrastructure to handle B2B clients with higher service expectations.

## Summary of Key Decisions

| Decision                | Recommendation                                                          | Rationale                                                                          |
| ----------------------- | ----------------------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| Cloud provider          | AWS, single-region at launch with failover plan                         | Ecosystem depth, Rekognition maturity, GDPR compliance                             |
| Facial recognition      | AWS Rekognition at MVP; proprietary model post-Series A                 | Speed to market vs. long-term cost and accuracy control                            |
| Payment processing      | Stripe with webhook-driven tier provisioning                            | Subscription lifecycle management, PCI compliance, lower fixed fee                 |
| University partnerships | Formalise at student union level, not individual committee members      | Resilience to annual committee turnover                                            |
| DPO appointment         | External DPO service from day one                                       | UK GDPR Article 37 likely requires formal designation for biometric processing     |
| MVP scope               | Core gallery, upload-to-unlock, facial recognition, Stripe billing only | Concentration of effort on core value proposition                                  |
| Go-to-market            | Phase 1 university only; Phase 2 Business tier; Phase 3 public events   | Network effects strongest in dense communities; avoid premature scaling            |
| Customer support        | Structured FAQ and monitored inbox with defined SLA at launch           | Biometric data and financial subscriptions require responsive support from day one |
