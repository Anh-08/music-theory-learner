import { useSearchParams } from 'react-router'
import { JamPlayer } from './JamPlayer'

export function JamRoomPage() {
  const [params] = useSearchParams()
  const tempo = Number(params.get('tempo'))
  return (
    <div className="space-y-4">
      <header className="max-w-3xl">
        <h1 className="text-3xl font-bold tracking-tight">Jam Room</h1>
        <p className="mt-2 text-stone-600 dark:text-stone-400">
          Nhập một tiến trình hợp âm, bấm phát và chơi theo. Trên đàn ảo, các nốt của hợp âm đang vang được tô màu theo thời gian thực — nhắm vào chúng ở phách mạnh, dùng các nốt xám
          của scale để đi qua. Tắt phần "Hợp âm" nếu bạn muốn tự đệm.
        </p>
      </header>
      <JamPlayer
        // Đổi link (ví dụ từ bài học) thì tạo lại trình phát với cấu hình mới.
        key={params.toString()}
        editable
        progression={params.get('p') ?? 'C G Am F'}
        songKey={params.get('key') ?? undefined}
        groove={params.get('groove') ?? 'pop'}
        tempo={Number.isFinite(tempo) && tempo >= 40 && tempo <= 200 ? tempo : undefined}
      />
    </div>
  )
}
