
# Environmental Implications of our venture

## Cloud Infrastructure and Energy Consumption

PhotoMe's core value proposition -- high-resolution photo storage, real-time face recognition, and AI reel/montage generation -- is GPU-intensive and scales non-linearly. A single 500-person Business Tier event, where attendees upload 20 photos at 3MB each, generates 60 GB from one event. Multiply this across dozens of concurrent events and the long-term archiving proposition, and data volume becomes substantial quickly. 

#### Storage
The plan defaults to standard S3 storage with no tiering policy. Implementing S3 Intelligent-Tiering automatically moves infrequently accessed objects to lower-energy storage classes with no penalty for retrieval; older event galleries are an ideal candidate for this. Defining explicit achievement thresholds would reduce both cost and energy consumption simultaneously.

#### Compute
Always-on EC2 instances for facial recognition are wasteful at early-stage user volumes, particularly when the demand is event-driven and spiky. AWS Lambda (serverless) scales to zero between events, consuming no resources when it's idle. As user volume grows and events run concurrently, auto-scaling with spot instances provides a lower-carbon, lower-cost alternative to reserved capacity.

#### AI workloads
Reel generation, montage creation, and image enhancement are the most energy-intensive operations on the platform. These do not happen in real time, scheduling them as batch jobs during periods of low UK grid carbon intensity is achievable using the National Grid ESO Carbon Intensity API at no additional cost. Offering user-controlled quality tools would also reduce compute demand proportionally, since most social media sharing sites do not require maximum resolution output.

#### on-device inference
Apple Core ML and Google ML Kit both support lightweight facial detection and matching on modern smartphones, removing these operations from the cloud entirely. A hybrid model where on-device is used for initial detection and cloud only for cross-gallery matching would meaningfully reduce inference costs at scale.

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
| Idle compute waste | EC2 instances assumed | Use Lambda for event-driven inference; spot instances for batch workloads | 
| Digital inclusion | App and connectivity required | Build web fallback for photo access; optimise joining flow for low bandwidth | 
| Behaviour rebound | Not monitored | Track photos-per-user trends post-adoption; reward quality over volume |
| Memory & community value | Strong stated case | Maintain as design principle; prioritise accessibility for under-resourced communities |
