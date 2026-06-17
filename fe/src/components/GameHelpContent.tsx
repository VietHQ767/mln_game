export default function GameHelpContent() {
  return (
    <>
      <h2 className="mb-1 text-center text-2xl font-bold text-white">Hướng dẫn chơi</h2>
      <p className="mb-6 text-center text-sm text-slate-300">
        Football Classroom — bóng đá 2D kết hợp câu hỏi tri thức
      </p>

      <section className="mb-5">
        <h3 className="mb-2 text-lg font-semibold text-amber-300">Cách chơi</h3>
        <ul className="list-disc space-y-1.5 pl-5 text-sm leading-relaxed text-slate-200">
          <li>
            Bấm <strong>Start</strong> ở trang chủ, nhập tên cầu thủ và chọn chế độ <strong>6 vs 6</strong>.
          </li>
          <li>
            Chọn <strong>Đội Đỏ</strong> hoặc <strong>Đội Xanh</strong>, sau đó bấm <strong>Vào phòng</strong> để
            tham gia trận đấu.
          </li>
          <li>
            Dùng phím <strong>WASD</strong> hoặc <strong>mũi tên</strong> để di chuyển cầu thủ.
          </li>
          <li>
            Khi giữ bóng: bấm <strong>Space</strong> hoặc <strong>click chuột</strong> để sút;{" "}
            <strong>click vào đồng đội</strong> để chuyền bóng.
          </li>
          <li>
            Bấm <strong>Q</strong> để mở bảng nạp năng lượng khi cần thêm energy.
          </li>
          <li>Phối hợp với đồng đội, ghi bàn nhiều hơn đối thủ để chiến thắng.</li>
        </ul>
      </section>

      <section className="mb-2">
        <h3 className="mb-2 text-lg font-semibold text-amber-300">Luật chơi</h3>
        <ul className="list-disc space-y-1.5 pl-5 text-sm leading-relaxed text-slate-200">
          <li>
            Mỗi trận là đấu <strong>6 vs 6</strong>. Đội nào đạt <strong>15 bàn thắng</strong> trước sẽ thắng.
          </li>
          <li>
            Trước khi trận bắt đầu, đội phải trả lời câu hỏi <strong>tranh quyền giữ bóng</strong>.
          </li>
          <li>
            Khi đối thủ áp sát và tranh chấp bóng, xuất hiện <strong>câu hỏi duel</strong> — trả lời đúng và nhanh
            để giữ bóng; sai hoặc chậm sẽ bị đứng yên 3 giây.
          </li>
          <li>
            Sau khi sút trúng khung thành, cần trả lời đúng câu hỏi để <strong>xác nhận ghi bàn</strong>; sai sẽ mất
            bàn và đối thủ được phát bóng lên.
          </li>
          <li>
            Bóng ra biên: <strong>ném biên</strong>; ra biên cuối sân: <strong>phạt góc</strong>; ra biên sau khung
            thành: <strong>phát bóng lên</strong>.
          </li>
          <li>
            Mỗi hành động tiêu tốn năng lượng: chuyền bóng <strong>-15</strong>, sút bóng <strong>-25</strong>. Trả
            lời đúng câu hỏi nạp năng lượng để nhận <strong>+30 energy</strong>.
          </li>
        </ul>
      </section>
    </>
  );
}
