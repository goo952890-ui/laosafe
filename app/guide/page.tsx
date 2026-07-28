import { SiteHeader } from "@/components/SiteHeader";

export default function GuidePage() {
  return (
    <main className="page-shell">
      <SiteHeader />
      <section className="surface-card">
        <div className="eyebrow">이용안내</div>
        <h1 className="section-title">Lao Safe 이용 방법</h1>
        <div className="split-grid">
          <article className="record-card">
            <strong>1. 검색</strong>
            <p className="body-copy">
              전화번호와 계좌번호는 입력 형식을 정리해 하나의 표준 값으로 검색합니다. 계좌번호
              검색 시 은행 선택은 필요하지 않습니다.
            </p>
          </article>
          <article className="record-card">
            <strong>2. QR코드 조회</strong>
            <p className="body-copy">
              송금 QR 이미지를 업로드하면 이미지에서 QR을 읽고 계좌번호가 명확할 때만 자동
              검색합니다. 계좌번호가 불명확하면 임의 추정 없이 직접 입력을 안내합니다.
            </p>
          </article>
          <article className="record-card">
            <strong>3. 익명 평가</strong>
            <p className="body-copy">
              사용자는 스팸 또는 안전 평가와 텍스트 의견만 입력합니다. 스팸 유형, 피해 금액,
              SNS 주소, 증빙 이미지는 받지 않습니다.
            </p>
          </article>
          <article className="record-card">
            <strong>4. 삭제 요청</strong>
            <p className="body-copy">
              잘못된 정보, 소유자 변경, 허위 의견 등이 있을 때 삭제 요청을 제출할 수 있습니다.
              요청은 관리자 검토 후 처리됩니다.
            </p>
          </article>
        </div>
        <div className="alert" style={{ marginTop: 18 }}>
          허위 신고와 반복적인 악성 신고를 방지하기 위해 평가 및 삭제 요청 시 IP 주소와
          접속정보가 저장됩니다. 서비스는 특정 번호의 안전성을 공식 보증하지 않습니다.
        </div>
      </section>
    </main>
  );
}
