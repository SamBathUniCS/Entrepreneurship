# Legal and regulatory issues

## UK GDPR & Biometric Data

#### Lawful basis for processing
For facial recognition, PhotoMe must rely on *explicit consent* (Article 9(2)(a)), meaning consent that is freely given, specific, informed, and unambiguous. A clause in terms and conditions may not suffice for this.

#### Data Protection Impact Assessment (DPIA)
Processing biometric data at scale is a mandatory DPIA trigger under Article 35. Failure to do so itself is a reportable compliance breach to the ICO.

#### Right to erasure
Users must be able to delete their biometric profile, face embeddings, and associated photos at any time.

#### Data retention
UK GDPR's storage limitation principle requires data to be kept no longer than necessary. PhotoMe should define explicit, minimal retention windows that are communicated to users.

#### Cross-border transfer
If the architecture setup means that data leaves the UK/EU, Standard Contractual Clauses or another transfer mechanism would be required under Chapter V of UK GDPR.

#### Data breach notification
A breach involving biometric data must be reported to the ICO within 72 hours, as well as notifying affected users without undue delay. A breach plan must be in place from day one.

## Intellectual Property

#### Copyright of uploaded photos
Under the Copyright, Designs and Patents Act 1988, copyright in a photograph belongs automatically to the person who took it. Uploading a photo to PhotoMe does not transfer this. PhotoMe's Terms of Service require obtaining a clear, explicit consent from uploading users permitting the platform to: display, store, process, and distribute images. Without this, PhotoMe's operation is an infringement of users' own copyright.

#### AI-generated compilations
Under section 9(3) CDPA 1988, computer-generated works have limited protection and no human author. The Terms of Service must clearly state who owns these inputs.

#### Watermarking and moral rights.
UK GDPR's moral rights provisions (sections 77–85 CDPA) give photographers the right of integrity, meaning their work cannot be subjected to derogatory treatment. The Terms of Service must address this, by obtaining a waiver from photographers who upload to the platform.

#### Trademark registration
Relevant classes to PhotoMe include: 
 - Class 42 (software as a service, AI services, facial recognition)
 - Class 38 (transmission of images and data)
 - Class 41 (entertainment, event services). 

The base cost is £170, but each additional class costs £50. Failing to protect relevant classes leaves the brand exposed to third-party registration.

#### Trade secrets
The proprietary face recognition pipeline, gamification system, and upload-to-unlock mechanism are described as competitive differentiators. To maintain trade secret protection under the Trade Secrets (Enforcement, etc.) Regulations 2018, PhotoMe must take active, documented steps to maintain confidentiality.

## Photography, Consent & Event Law

#### Consent for non-registered attendees
Individuals who attend events but have not downloaded PhotoMe may still appear in photos uploaded by other attendees and would be subject to facial recognition processing. Under UK GDPR, this requires a lawful basis and explicit consent. Event organisers using the Business tier should be contractually required to display clear notes at event entry points informing attendees that photos will be collected and processed by PhotoMe.

#### Children at Events
UK GDPR requires parental or guardian consent for biometric data processing of Individuals under 13, and special care for those under 18. Before offering the Business tier for any event type that may include under-18s, PhotoMe needs a child-specific consent framework and potentially age verification for facial recognition opt-in.

#### Photographer employment status
UK law distinguishes between employees, workers, and independent contractors for tax obligations (IR35 rules for off-payroll workers), liability for photographers' actions, and copyright ownership. PhotoMe must clarify this from the outset.

## Consumer Protection & Subscription Law

#### Consumer Contracts Regulations 2013
All subscription tiers are distance contracts for digital services. Users must be clearly informed of: total price; billing frequency; auto-renewals; how to cancel; and a 14-day cooling-off period. This must be addressed before launch.

#### Consumer Rights Act 2015
Digital content supplied under subscription must be of satisfactory quality, fit for purpose, and as described. If the facial recognition feature fails to work accurately at a paid event, this would constitute a breach of statutory quality obligation, giving users the right to a remedy.


## Summary of Priority Legal Actions

| Priority      | Action      | Timing   |
| ------------- | ----------- | -------- |
| Critical   | Complete DPIA before any biometric data processing | Pre-launch |
| Critical   | Draft explicit, standalone biometric consent flows (not buried in T&Cs) | Pre-launch | 
| Critical   | Obtain copyright licence from users via T&S covering AI processing and derivative works | Pre-launch |
| High       | Define and publish biometric data retention schedules | Pre-launch | 
| High       | Register trademarks across Classes 38, 41, and 42 | Early stage | 
| High       | event organiser contracts covering data processor obligations and child safeguarding | Pre-Business tier launch | 
| Medium     | Establish IR35-compliant contracts for commissioned photographers | Before commissioning | 
| Medium     | Add consumer subscription disclosures to Tier Selection screen | Pre-launch | 
| Ongoing    | Monitor ICO guidance on AI and facial recognition as the regulatory landscape evolves | Post-launch |

