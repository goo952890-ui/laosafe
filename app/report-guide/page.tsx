import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import { getUserLocale } from "@/lib/user-locale";

export default async function ReportGuidePage() {
  const locale = await getUserLocale();
  const copy =
    locale === "lo"
      ? {
          title: "ຄູ່ມືການແຈ້ງ",
          subtitle: "ການແຈ້ງເບີໂທ ແລະ ເລກບັນຊີສາມາດເຮັດໄດ້ໂດຍບໍ່ຕ້ອງລັອກອິນ ແລະ ລະບົບຈະເກັບຂໍ້ມູນການເຂົ້າໃຊ້ຂັ້ນຕ່ຳເພື່ອກວດສອບ.",
          items: [
            ["ແຈ້ງແບບບໍ່ລະບຸຊື່", "ສາມາດຝາກຄຳເຫັນ ແລະ ເນື້ອຫາການແຈ້ງໄດ້ໂດຍບໍ່ຕ້ອງສະໝັກ."],
            ["ຈຳກັດການແຈ້ງເທັດ", "ຂໍ້ມູນທີ່ບໍ່ເປັນຈິງ ຫຼື ຂໍ້ມູນສ່ວນຕົວອາດຖືກລຶບຕາມນະໂຍບາຍ."],
            ["ບັນທຶກ IP", "IP ແລະ ຂໍ້ມູນການເຂົ້າໃຊ້ຈະຖືກບັນທຶກເພື່ອປ້ອງກັນການໃຊ້ຜິດ."],
            ["ສົ່ງຄຳຂໍລຶບໄດ້", "ຖ້າມີຂໍ້ມູນຜິດ ສາມາດສົ່ງຄຳຂໍໃຫ້ກວດສອບແລະລຶບໄດ້."],
          ],
        }
      : locale === "en"
        ? {
            title: "Reporting Guide",
            subtitle: "Phone and account reports can be submitted without login, and minimal access data is stored for review.",
            items: [
              ["Anonymous reports", "You can submit comments and report content without creating an account."],
              ["False-report control", "False information or personal data may be removed under the service policy."],
              ["IP logging", "IP address and access data are stored to prevent repetitive abuse."],
              ["Delete requests", "If incorrect information is registered, you can submit a delete request for review."],
            ],
          }
        : {
            title: "신고 안내",
            subtitle: "전화번호와 계좌번호는 로그인 없이 신고할 수 있으며, 내용 검토를 위해 최소한의 접속정보가 저장됩니다.",
            items: [
              ["익명 신고 가능", "별도의 회원가입 없이 의견과 신고 내용을 남길 수 있습니다."],
              ["허위 신고 제한", "허위 사실이나 타인의 개인정보를 등록하면 운영정책에 따라 삭제될 수 있습니다."],
              ["IP 주소 저장", "반복 신고와 악성 등록 방지를 위해 IP 주소와 접속정보를 저장합니다."],
              ["삭제 요청 가능", "잘못된 정보가 등록된 경우 별도 삭제 요청 페이지에서 검토를 요청할 수 있습니다."],
            ],
          };

  return (
    <main className="page-shell">
      <SiteHeader locale={locale} />
      <section className="subpage-section">
        <div className="subpage-heading">
          <h1 className="subpage-title">{copy.title}</h1>
          <p className="section-copy">{copy.subtitle}</p>
        </div>

        <div className="guide-grid">
          {copy.items.map(([title, body]) => (
            <div className="guide-panel" key={title}>
              <strong>{title}</strong>
              <p>{body}</p>
            </div>
          ))}
        </div>
      </section>
      <SiteFooter locale={locale} />
    </main>
  );
}
