export type EvaluationTone = "spam" | "safe";
export type LookupKind = "phone" | "account";

export interface CommentRecord {
  id: string;
  tone: EvaluationTone;
  text: string;
  createdAt: string;
  nickname?: string | null;
  isAdmin?: boolean;
  qrPayload?: string | null;
  isPrimary?: boolean;
  isVoteOnly?: boolean;
}

interface BaseTarget {
  normalized: string;
  display: string;
  comments: CommentRecord[];
  spamVotes?: number;
  safeVotes?: number;
}

export interface PhoneTarget extends BaseTarget {
  kind: "phone";
}

export interface AccountTarget extends BaseTarget {
  kind: "account";
  bankName?: string;
  recipientName?: string;
  qrPayload?: string;
}

export type SearchTarget = PhoneTarget | AccountTarget;

export interface DeletionRequestSeed {
  id: string;
  targetLabel: string;
  reason: string;
  detail: string;
  contact: string;
  status: "접수됨" | "검토 중";
}

export const phoneTargets: PhoneTarget[] = [
  {
    kind: "phone",
    normalized: "02055551234",
    display: "020 5555 1234",
    comments: [
      {
        id: "p1",
        tone: "spam",
        text: "대출 광고와 투자 권유 전화가 하루에 여러 번 왔습니다.",
        createdAt: "2026-07-28",
      },
      {
        id: "p2",
        tone: "spam",
        text: "메신저로 송금을 유도한 뒤 계속 다른 번호로 연락했습니다.",
        createdAt: "2026-07-27",
      },
      {
        id: "p3",
        tone: "safe",
        text: "한 번은 실제 배달 기사님 번호였지만 이후 광고성 연락도 있었습니다.",
        createdAt: "2026-07-25",
      },
    ],
  },
  {
    kind: "phone",
    normalized: "03077881234",
    display: "030 7788 1234",
    comments: [
      {
        id: "p4",
        tone: "safe",
        text: "예약한 숙소 프런트에서 체크인 확인용으로 연락했습니다.",
        createdAt: "2026-07-28",
      },
      {
        id: "p5",
        tone: "safe",
        text: "제가 주문한 물품 배송 관련 정상 연락이었습니다.",
        createdAt: "2026-07-24",
      },
    ],
  },
];

export const accountTargets: AccountTarget[] = [
  {
    kind: "account",
    normalized: "010123456789",
    display: "010 123 456789",
    bankName: "BCEL",
    recipientName: "SOMPHONE SHOP",
    comments: [
      {
        id: "a1",
        tone: "spam",
        text: "상품 결제 후 판매자와 연락이 끊겼습니다.",
        createdAt: "2026-07-28",
      },
      {
        id: "a2",
        tone: "spam",
        text: "같은 계좌로 선입금을 요구하는 게시글이 반복적으로 올라왔습니다.",
        createdAt: "2026-07-26",
      },
      {
        id: "a3",
        tone: "safe",
        text: "오프라인 매장에서 정상 결제했던 계좌로 확인됩니다.",
        createdAt: "2026-07-22",
      },
    ],
  },
  {
    kind: "account",
    normalized: "200998877665",
    display: "200 998 877665",
    bankName: "JDB",
    recipientName: "NAKHONE SUP",
    comments: [
      {
        id: "a4",
        tone: "safe",
        text: "소규모 도매 거래에서 여러 번 정상 송금했습니다.",
        createdAt: "2026-07-27",
      },
      {
        id: "a5",
        tone: "safe",
        text: "실매장 결제 계좌로 안내받았고 문제 없이 확인되었습니다.",
        createdAt: "2026-07-21",
      },
    ],
  },
];

export const deletionRequests: DeletionRequestSeed[] = [
  {
    id: "d1",
    targetLabel: "020 5555 1234",
    reason: "전화번호 소유자가 변경됨",
    detail: "기존 평가가 과거 소유자 기준일 수 있어 검토가 필요합니다.",
    contact: "owner@example.com",
    status: "검토 중",
  },
  {
    id: "d2",
    targetLabel: "010 123 456789",
    reason: "허위 의견이 등록됨",
    detail: "실제 거래와 무관한 동일 문구가 반복 등록되었습니다.",
    contact: "review@laosafe.app",
    status: "접수됨",
  },
];

export const abuseSignals = [
  {
    label: "IP 해시 41a2••••",
    detail: "1시간 내 9건 평가, 동일 문구 3회 반복",
  },
  {
    label: "Fingerprint 6fc9••••",
    detail: "동일 전화번호에 24시간 내 재평가 시도",
  },
  {
    label: "UA Chrome 138 / Android",
    detail: "QR 업로드 실패 후 연속 계좌 신고 6건",
  },
];
