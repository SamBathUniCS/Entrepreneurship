
# Environmental Implications of our venture

## Cloud Infrastructure and Energy Consumption

#### Storage

#### Compute

#### AI workloads

#### on-device inference

## Region and Architecture Choices

The plan commits to AWS eu-west-2 (London) for UK GDPR data residency. However, eu-west-2 has materially higher carbon intensity than AWS eu-north-1 (Stockholm), which operates o near-100% hydroelectric power.

Where non-personal compute workloads, such as reels rendering, image enhancement, analytics processing, could be routed to lower-carbon regions without breaching data residency requirements. This should be implemented as a deliberate architectural choice rather than an afterthought.

AWS's Custom Carbon Footprint Tool is free, enabling emissions reporting without additional Infrastructure investment.

## Social Sustainability

#### Memory preservation

Making high-quality shared photography accessible to communities without professional photography budgets (grassroots societies, cultural events, community celebrations) is a genuine social good that extends beyond commercial appropriation.

#### Digital inclusion
The platform requires a smartphone, app installation, and reliable data connectivity to participate fully. Attendees who are older, less digitally experienced, or in lower-connectivity environments are structurally disadvantaged by the current model.

A web-based fallback for photo access would significantly broaden accessibility at low development cost. Optimising the QR code joining flow for low-bandwidth connections is similarly low-effort and high impact.

#### Photography behaviour and lived experience

PhotoMe incentivises interaction through upload rewards, leaderboards, and contribution milestones, designed specifically to increase upload volume. There is a genuine risk that these mechanics intensify screen-mediated behaviour at events that people attend for in-person social connection.

This is not a reason to abandon the current model, but it is worth tracking: whether average photos taken per user increase after platform adoption, and designing rewards that encourage quality contribution over volume. This would help ensure that the platform enhances rather than displaces the experiences that it is meant to preserve.

## Summary

| Area | Current Position | Action |
| ---- | ---------------- | ------ |
| Emissions measurement | Not addressed | Adopt AWS Carbon Footprint Tool from launch; publish annual emissions report | 
| Storage energy | Indefinite hot storage, no tiering | Implement S3 Intelligent-Tiering; define 90-day archiving threshold |
| AI compute intensity | Always-on cloud processing assumed | Batch-schedule reel generation during low-carbon periods via Grid ESO API |
| Inference architecture | Cloud-only facial recognition | Adopt a hybrid on-device/cloud model using Core ML and ML Kit | 
| Region selection | eu-west-2 for all workloads | Route non-personal compute to eu-north-1 or equivalent lower-carbon region | 
| Idle compute waste | EC2 instances assumedUse Lambda for event-driven inference; spot instances for batch workloads | 
| Digital inclusion | App and connectivity required | Build web fallback for photo access; optimise joining flow for low bandwidth | 
| Behaviour rebound | Not monitored | Track photos-per-user trends post-adoption; reward quality over volume |
| Memory & community value | Strong stated case | Maintain as design principle; prioritise accessibility for under-resourced communities |

