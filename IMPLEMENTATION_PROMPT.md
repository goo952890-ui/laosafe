# Lao Safe Implementation Prompt

아래 프롬프트를 그대로 `Codex`, `Claude Code`, 또는 유사한 코딩 에이전트에 입력해 `Lao Safe` MVP를 구현한다.

## Prompt

```text
Build a production-oriented MVP web service named "Lao Safe".

This service is a public lookup and reporting service for Laos phone numbers and bank account numbers, similar in product shape to Korea's "TheCall", but adapted for Laos and extended to bank account lookup and QR-based account extraction.

The initial user-facing UI must be in Korean. However, the app structure must support future localization for Lao and English through an i18n-ready architecture. Do not fully translate Lao or English content now; just design the codebase so translation can be added cleanly later.

Use this default stack unless there is a strong implementation reason to adjust within the same architecture:
- Next.js (App Router)
- TypeScript
- PostgreSQL
- Prisma
- Server-side admin authentication
- Object storage for temporary QR image upload handling

The project should contain both:
1. A public user-facing site
2. An admin console in the same codebase, separated by routes and access control

The design direction must feel like a trustworthy, search-first public information service:
- Clean, information-dense, clear hierarchy
- Strong legal/notice copy where needed
- Calm, credible interface
- Avoid playful startup styling
- Mobile and desktop responsive

Follow the requirements below exactly.

====================
1. Product Definition
====================

Lao Safe allows users to:
- Search Laos phone numbers
- Search bank account numbers without choosing a bank first
- Upload a Laos transfer QR image and extract an account number from it
- Read anonymous user evaluations and comments
- Submit an anonymous evaluation as spam or safe
- Submit deletion requests for phone or bank account entries

The service must NOT officially certify any phone number or bank account as safe or fraudulent.
All visible judgments are user-submitted evaluations only.

The UI must clearly communicate:
- Lack of results does not mean the target is safe
- Recipient name data may come from QR or user-submitted/admin-managed information and may not be officially verified by a bank

====================
2. Core Principles
====================

Implement these constraints:
- General users do not sign up or log in
- Anyone can search
- Anyone can submit anonymous spam/safe evaluations
- Users do not choose spam subtype
- Evaluation input only includes:
  - spam or safe selection
  - optional text comment
- Numbers with no prior result can still be evaluated immediately
- IP and access metadata are stored for abuse prevention
- Every phone/account result page has a deletion request entry point
- Bank account lookup must not require bank selection
- QR flow must extract only the account number for lookup purposes
- Recipient name must be masked before public display
- The service must not label an item as officially fraudulent or officially safe

====================
3. Main User Flows
====================

Implement these public flows:

A. Phone number search
- User enters a Laos phone number
- Normalize it server-side
- Search existing record
- If found, show aggregates and recent visible comments
- If not found, show "등록된 정보가 없습니다" style empty state and allow first evaluation immediately

B. Bank account search
- User enters only the account number
- Remove spaces/hyphens and normalize
- Do not require bank selection
- If found, show aggregates, masked recipient name if available, bank name if available, recent visible comments
- If not found, show empty state and allow first evaluation immediately

C. QR image search
- User uploads JPG, JPEG, PNG, or WEBP
- Validate file type and size
- Remove metadata where applicable
- Scan QR
- Parse the raw QR payload
- Extract an actual account number only when clearly present
- If extracted, show the extracted account number and automatically continue to lookup
- If the QR is readable but the account number is not clearly identifiable, do not guess and do not search
- Show a clear failure message asking the user to try another image or enter the account number manually
- Delete the uploaded image after processing

D. Anonymous evaluation submission
- Available for both phone numbers and bank accounts
- User chooses one of:
  - 스팸이에요
  - 안전해요
- User may optionally add a text comment
- Show notice that IP address and access information are stored to prevent malicious or false reports
- Include a required confirmation checkbox affirming the user is not intentionally submitting false content
- After submit, show a completion message and return the user to the result page with updated stats/comments

E. Deletion request submission
- Available on all result pages
- No login required
- Input fields:
  - deletion reason
  - detailed description
  - contact email or phone number
- Show notice that IP/access metadata is stored to prevent abuse
- Submission creates an admin-reviewable request

====================
4. Public Pages
====================

Implement these routes/pages:

- Home page
  - service logo/name
  - top navigation
  - search tabs:
    - phone number search
    - bank account search
    - QR code search
  - recent registrations preview
  - service notice / disclaimer summary

- Phone result page
  - display phone number
  - total evaluation count
  - spam count
  - safe count
  - spam ratio
  - safe ratio
  - recent visible user comments
  - evaluation CTA
  - deletion request CTA
  - disclaimer that no result or low result volume is not a guarantee

- Bank account result page
  - display account number
  - masked recipient name if available
  - bank name if available
  - total evaluation count
  - spam count
  - safe count
  - spam ratio
  - safe ratio
  - recent visible user comments
  - evaluation CTA
  - deletion request CTA
  - disclaimer that no result or low result volume is not a guarantee

- Recent registrations page
  - latest phone/account targets with recent visible activity

- Service guide page
  - explain how evaluation works
  - explain what the service does and does not guarantee
  - explain deletion requests
  - explain IP/access metadata collection at a policy summary level

====================
5. Admin MVP
====================

Implement an admin console with login and route protection.

Include these admin capabilities:
- Search phone numbers
- Search bank accounts
- View target detail with all evaluations including hidden/deleted state where permitted
- Hide evaluation
- Delete evaluation
- Review deletion requests
- Change deletion request status
- Leave admin notes on deletion requests
- Inspect abuse indicators by IP hash / device fingerprint / user agent patterns
- Block abusive sources
- View QR scan logs and failure reasons

Do not overbuild beyond MVP moderation needs. Keep the admin focused on safe operations and content review.

====================
6. Data Model
====================

Use Prisma schema with these core models or equivalent structures:

1. phone_numbers
- id
- normalized_number
- display_number
- country_code
- created_at
- updated_at

2. bank_accounts
- id
- normalized_account_number
- display_account_number
- bank_name (nullable)
- masked_recipient_name (nullable)
- created_at
- updated_at

3. evaluations
- id
- target_type
- target_id
- evaluation
- comment (nullable)
- ip_hash
- encrypted_ip
- user_agent
- device_fingerprint
- status
- created_at
- updated_at

Where:
- target_type = phone | bank_account
- evaluation = spam | safe
- status = visible | hidden | deleted

4. deletion_requests
- id
- target_type
- target_id
- reason
- description
- contact
- requester_ip_hash
- encrypted_requester_ip
- status
- admin_note (nullable)
- created_at
- updated_at

Where:
- status = submitted | reviewing | resolved | rejected

5. qr_scans
- id
- extracted_account_number (nullable)
- scan_status
- error_code (nullable)
- created_at

Where:
- scan_status = success | no_account_found | unreadable | invalid_image

You may add supporting tables for:
- admins
- rate-limit tracking
- moderation audit log
- blocklist rules

But do not change the core meaning of the above domain models.

====================
7. Normalization Rules
====================

Phone numbers:
- Support examples like:
  - 020xxxxxxxx
  - 030xxxxxxxx
  - +85620xxxxxxxx
  - +85630xxxxxxxx
  - values with spaces or hyphens
- Normalize all equivalent Laos phone formats into one canonical stored value
- The following should resolve to the same target when equivalent:
  - 02055551234
  - 020 5555 1234
  - +8562055551234

Bank account numbers:
- Remove spaces and hyphens for normalized storage and search
- The following should resolve to the same target when equivalent:
  - 010123456789
  - 010-123-456789
  - 010 123 456789

Display values:
- Preserve or generate a readable display format for UI
- But use normalized values for identity and lookup

====================
8. Recipient Name Masking
====================

Public UI must never show the full recipient name.

Implement a masking utility that produces results like:
- SOMPHONE -> SOM*****
- SOMPHONE SHOP -> SOM***** S***
- NAKHONE SUP -> NAK**** S**
- AN -> A*
- KAI -> K**

For Lao names, also mask partially while keeping a recognizable prefix.

Add a UI note below the masked recipient name:
"수취인 이름은 QR코드 또는 사용자 제출 정보에서 확인된 값이며, 은행이 공식적으로 확인한 정보가 아닐 수 있습니다."

====================
9. Abuse Prevention
====================

Since users do not log in, implement abuse prevention using:
- IP address
- IP hash
- encrypted original IP
- user agent
- device fingerprint
- cookies or local identifier
- request timing/patterns

Default enforcement rules:
- Same source cannot repeatedly evaluate the same target within 24 hours
- Same IP: max 10 evaluations per hour
- Same IP: max 30 evaluations per day
- Repeated identical comment text should be blocked or flagged
- Suspicious automation should trigger CAPTCHA or equivalent challenge architecture hook

Design the code so thresholds are configurable.

====================
10. QR Processing Policy
====================

QR handling requirements:
- Accept only JPG, JPEG, PNG, WEBP
- Enforce image size limits
- Never auto-open links embedded in QR payloads
- Parse raw QR content only for extraction purposes
- Use the account number only if clearly identifiable
- Never guess account numbers
- If QR is readable but account number is ambiguous, return a failure state without searching
- Delete uploaded image after analysis
- Do not publicly expose uploaded image
- Prefer storing only extraction result metadata and errors, not the full raw QR payload unless absolutely needed for secured debugging

====================
11. Public API Surface
====================

Implement server-side endpoints or route handlers for:
- Search API
  - search phone
  - search bank account
- Evaluation create API
- Deletion request create API
- Recent registrations API
- QR upload/analyze API
- Admin moderation APIs

Use strong validation with Zod or equivalent.
Return structured error messages suitable for UI handling.

====================
12. UI Copy Direction
====================

Use Korean copy for the initial MVP.

Key public messages should include patterns like:
- "전화번호를 입력하세요."
- "계좌번호를 입력하세요."
- "송금 QR코드 이미지를 업로드하면 계좌번호를 확인합니다."
- "해당 전화번호에 등록된 정보가 없습니다."
- "해당 계좌번호에 등록된 정보가 없습니다."
- "등록된 정보가 없다고 해서 반드시 안전한 번호라는 의미는 아닙니다."
- "등록된 정보가 없다고 해서 반드시 안전한 계좌라는 의미는 아닙니다."
- "허위 신고와 반복적인 악성 신고를 방지하기 위해 IP 주소 및 접속정보가 저장됩니다."
- "사실과 다른 내용을 고의로 등록하거나 타인에게 피해를 주기 위해 이용하는 경우 해당 내용이 삭제되고 서비스 이용이 제한될 수 있습니다."
- "허위 내용을 고의로 등록하지 않았습니다."
- "익명으로 등록하기"
- "평가가 등록되었습니다."
- "QR코드에서 계좌번호를 확인하지 못했습니다. 다른 이미지를 업로드하거나 계좌번호를 직접 입력해 주세요."

Maintain a trustworthy and policy-aware tone.

====================
13. Engineering Requirements
====================

Implement with clear separation of concerns:
- domain utilities for normalization/masking
- database layer
- API validation layer
- UI components
- admin authorization layer
- abuse-prevention services

Add seed data for local development:
- at least one known phone number with mixed spam/safe evaluations
- at least one known bank account with masked recipient name and mixed evaluations
- at least one deletion request
- at least one QR scan success log and one failure log

Provide:
- README with local setup
- environment variable example file
- Prisma migration or schema setup
- basic empty/loading/error states

====================
14. Acceptance Tests
====================

Implement automated tests for at least these scenarios:
- different phone input formats normalize to one target
- different bank account input formats normalize to one target
- empty result pages allow first evaluation flow
- evaluation submission updates counts and visible comments
- duplicate evaluation within the restricted window is blocked
- QR extraction success can continue into account lookup
- QR readable but no clear account number returns failure without guessing
- recipient masking never exposes full name
- deletion request is created and visible in admin
- admin hide/delete/block actions affect public/admin behavior correctly

Use appropriate unit/integration coverage for utilities, route handlers, and critical domain logic.

====================
15. Implementation Constraints
====================

Do not add:
- user signup/login for public users
- spam subtype selection
- incident amount fields
- SNS/contact metadata fields for reports
- evidence image attachments for evaluations
- bank selection in account search
- official fraud/safe certification language
- mobile native app code
- telecom API integration
- bank API integration
- AI-generated fraud verdicts

====================
16. Delivery Expectations
====================

Deliver a complete runnable repository, not just mockups.

Include:
- working public pages
- working admin routes
- database schema
- API routes
- seed data
- tests

Prefer practical, maintainable implementation over speculative complexity.
If a detail is ambiguous, choose the simpler MVP interpretation as long as it preserves the requirements above.
```

## Intended Use

- 이 문서는 구현용 입력 프롬프트다.
- UI 카피 초안이 아니라, 실제 코드 생성 지시를 목표로 한다.
- 다음 단계에서는 이 프롬프트를 코딩 에이전트에 넣고 전체 저장소를 생성하면 된다.
