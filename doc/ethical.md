
# Ethical Implications of our venture

## Facial Recognition & Surveillance Ethics

Facial recognition has a high ethical risk affecting the value proposition.

There are two avenues:
 - **Demographic bias** - This was acknowledged and must be acted upon. PhotoMe should publish regular bias audits disaggregated by skin tone, gender, and age; set minimum accuracy thresholds per demographic group before commercial deployment; and provide an accessible misidentification reporting process.
 - **Opt-in default** - The current system (all events / friends-only / complete opt-out) is ethically correct. It must ensure that consent is easy to withdraw as it is to give.

## Non-Consenting Individuals in Photos

When any user uploads a photo, it must certainly contain other people, some of whom may have never heard of PhotoMe. The platform's privacy controls only govern what registered users have configured as their visibility, but nothing about individuals who appear in photos without their consent to any processing.

The ethical minimum is clear: PhotoMe should not run facial recognition on any individual unless that individual has actively opted in. In practice, this would mean processing faces only when there is a registered, consenting profile to be matched against, and never building or retaining embeddings for unrecognised faces.

Any architecture that stores embeddings for unidentified individuals to be matched against future registrations would be ethically and legally indefensible.

## Consent Architecture

#### Blanket vs. contextual consent

A user comfortable with facial recognition in a close friend's private gallery may be far less comfortable with the same processing at a large public festival where the Business tier organiser is accessing demographic analytics.

A reasonable middle ground would be surfacing a brief privacy reminder when a user joins an event, allowing them to confirm or adjust their settings without requiring a configuration every time.

#### The upload-to-unlock model

The mechanics of the upload-to-unlock model ask users to labour in exchange for accessing records of their own likeness, which creates tension for people who are regularly photographed but not themselves photographers, whether due to disability, social role, or personal preference. 

The paid bypass addresses this partially, but also introduces a secondary barrier to those who can't afford it. PhotoMe should consider whether alternative contribution types, such as event check-in, tagging, and moderation, could count towards the unlock thresholds.

## Advertising Ethics

The basic tier is ad-funded, estimated at -£500/month for 1,000 users. Three constraints will apply:
 - **No biometric-informed targeting**. PhotoMe must not use facial recognition outputs to inform ad selection. This would constitute secondary processing of biometric data incompatible with the original consent, violating UK GDPR and crossing a clear ethical line. This should be explicit in the privacy policy and in advertising partners.
 - **Upfront discloure**. Users should understand at onboarding that the free tier is ad-supported.
 - **Age-appropriate filtering**. If under-18s are on the platform, the ad-serving system must apply ASA CAP code restrictions on alcohol, gambling, and HFSS products to minors

## Photographer & Organiser Ethics

#### Organiser analytics
The Business tier grants organisers access to engagement metrics and demographic insights. The privacy policy must clearly disclose what is shared, with whom, and confirm that the analytics are genuinely aggregated and anonymous, not any individualised profiles.

#### Photographer equity
Photographers contribute the highest-quality content, yet the revenue model primarily benefits PhotoMe. The current idea mentions monetisation opportunities for photographers, but does not detail any revenue-sharing terms. Participation terms should be transparent and fair, not exploiting the network that the platform creates for photographers' labour.

## Summary: Ethical Strengths & Gaps

| Area      | Strength    | Gap / Action Needed |
| --------- | ----------- | ------------------- |
| Facial recognition design | Opt-in with granular controls | Operationalise bias audits; enforce clean consent UI   |
| Non-registered individuals—Commit explicitly to no embedding storage for unidentified faces | Consent architecture | Three-tier privacy settings |
| Add event-level consent prompts for contextual integrity | Upload-to-unlock | User-validated as fair exchange | 
| Advertising | Non-intrusive commitment | Explicitly prohibit biometric-informed targeting; disclose at onboarding | 
| Organiser analytics | Commercially valuable  | Confirm aggregated-only data sharing; disclose clearly to users
| Photographer equity | Attribution watermarks | Publish fair, transparent revenue-sharing terms
