# NexusCounter

Node.js 웹 애플리케이션용 페이지·포스트 조회수 카운터 모듈입니다.

[WordPress Post Views Counter](https://wordpress.org/plugins/post-views-counter/)를 참고했습니다.

## 패키지

| 패키지 | 설명 |
|--------|------|
| `@nexuscounter/core` | 추적 엔진, 엔티티 분류, Redis + PostgreSQL 저장소 |
| `@nexuscounter/react` | React Provider, hooks, 위젯, 대시보드 |
| `@nexuscounter/vercel` | Vercel Serverless handler factory |
| `@nexuscounter/next` | Next.js App Router route factory |

## 빠른 시작

```bash
npm install
npm run build
```

## TitanTrail 통합

[examples/titantrail-integration.md](examples/titantrail-integration.md)를 참고하세요.

## 환경 변수

| 변수 | 기본값 | 설명 |
|------|--------|------|
| `NEXUS_ENABLED` | `true` | 추적 활성화 |
| `NEXUS_DISPLAY_MODE` | `landing` | `off` \| `landing` \| `header` \| `footer` |
| `NEXUS_CLASSIFY_ENTITIES` | `false` | User-Agent 기반 엔티티 분류 |
| `NEXUS_EXCLUDE_BOTS` | `true` | 주요 집계에서 봇 제외 |
| `NEXUS_COUNT_INTERVAL_MINUTES` | `0` | 서버 측 중복 방지 간격(분) |

클라이언트(Vite): `VITE_NEXUS_DISPLAY_MODE`, `VITE_NEXUS_ENABLED`, `VITE_NEXUS_STATS_PERIOD`.

## API

- `POST /api/nexus/track` — 페이지/콘텐츠 조회 기록
- `GET /api/nexus/stats?period=7` — 공개 통계 + 트렌드
- `GET /api/nexus/admin?period=30` — Editor 대시보드 데이터
- `PATCH /api/nexus/admin` — 조회수 수동 조정
- `GET /api/nexus/admin?export=1&format=csv` — 데이터 내보내기
- `GET /api/nexus/ranked?limit=20` — 조회수 기준 상위 콘텐츠
