# Lao Safe

라오스 전화번호와 계좌번호를 검색하고, 공개 평가 기반 의견을 확인할 수 있도록 설계한
조회 서비스 프로토타입이다. `Sites`용 vinext 기반으로 구성되어 있으며, 초기 UI는 한국어로
작성되어 있다.

## Prerequisites

- Node.js `>=22.13.0`

## Quick Start

```bash
npm install
npm run dev
npm run build
```

## Included in this version

- 메인 검색 화면
- 전화번호 / 계좌번호 결과 화면
- QR 이미지 업로드 기반 계좌번호 추출 UI
- 최근 등록 화면
- 이용안내 화면
- 운영자용 관리자 미리보기 화면
- 검색/표시 규칙 유틸리티
- 빌드 후 렌더링 테스트

## Local Commands

- `npm run dev`
- `npm run build`
- `npm test`
- `npm run lint`
- `npm run cf:deploy`

## Cloudflare Git Deployment

Cloudflare Workers Git 자동배포로 운영하려면 아래 순서로 연결한다.

1. Cloudflare 대시보드에서 `Workers & Pages`로 이동한다.
2. `Create application` > `Import a repository`를 선택한다.
3. GitHub 계정을 연결하고 `goo952890-ui/laosafe` 저장소를 선택한다.
4. Production branch는 `main`으로 둔다.
5. Build command는 `npm run build`를 입력한다.
6. Deploy command는 비워 두거나 기본 자동 감지를 사용한다.
7. Root directory는 `/`를 사용한다.
8. 환경변수와 시크릿은 Cloudflare 대시보드 `Settings > Variables and Secrets`에 등록한다.

권장 변수 구성:

- 일반 변수
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
  - `ADMIN_USERNAME`
  - `TELEGRAM_REPORT_CHAT_ID`
  - `TELEGRAM_COMMENT_CHAT_ID`
  - `TELEGRAM_DELETION_CHAT_ID`
- 시크릿
  - `SUPABASE_SECRET_KEY`
  - `ADMIN_PASSWORD`
  - `ADMIN_SESSION_SECRET`
  - `TELEGRAM_REPORT_BOT_TOKEN`
  - `TELEGRAM_COMMENT_BOT_TOKEN`
  - `TELEGRAM_DELETION_BOT_TOKEN`

로컬에서 직접 배포할 때는 아래 명령을 사용한다.

```bash
npx wrangler login
npm run cf:deploy
```

## Notes

- 현재 버전은 배포 가능한 UI 프로토타입과 샘플 데이터 중심 흐름에 초점을 둔다.
- 전화번호/계좌번호 정규화, 수취인 이름 마스킹, QR payload 계좌번호 추출 규칙이 포함되어 있다.
- D1/R2를 붙이는 다음 단계에서는 `.openai/hosting.json`의 logical binding을 활성화하면 된다.
