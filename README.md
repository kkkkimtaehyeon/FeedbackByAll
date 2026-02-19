<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/2ab71194-549e-486f-88d7-a52ff8ecb8d6

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key
3. Run the app:
   `npm run dev`

## Troubleshooting

### 로그인 후 새로고침 시 로그인 상태가 풀리는 문제

**증상**: 로그인 후 페이지를 새로고침하면 로그인 상태가 초기화되어 데이터 조회 및 모든 기능이 작동하지 않음.

**원인**: `AuthContext`에서 `getSession()`과 `onAuthStateChange()`를 동시에 호출하면서 **레이스 컨디션(Race Condition)**이 발생. 새로고침 시 두 호출이 서로 다른 타이밍에 `setUser`를 호출하여 세션 정보가 덮어씌워지거나, `loading` 상태가 제대로 `false`로 전환되지 않아 UI가 멈추는 현상 발생.

**해결**:
- `getSession()` 호출을 제거하고 `onAuthStateChange`만 사용하도록 변경
- Supabase v2에서는 `onAuthStateChange`가 마운트 시 `INITIAL_SESSION` 이벤트를 자동으로 발생시키므로 별도의 `getSession()` 호출이 불필요
- `supabase.ts`에서 `persistSession: true`, `autoRefreshToken: true` 명시적 설정

**수정 파일**:
- `src/contexts/AuthContext.tsx` — 세션 관리 로직 전면 재작성
- `src/lib/supabase.ts` — 세션 지속 및 토큰 자동 갱신 옵션 추가
- `src/vite-env.d.ts` — Vite 타입 선언 추가
- `tsconfig.json` — `include: ["src"]` 추가
