-- Supabase SQL Editor에서 실행하세요

CREATE TABLE scores (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  score integer NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- RLS 활성화
ALTER TABLE scores ENABLE ROW LEVEL SECURITY;

-- 누구나 읽기 가능 (랭킹 조회)
CREATE POLICY "누구나 점수 조회 가능"
  ON scores FOR SELECT
  USING (true);

-- 누구나 쓰기 가능 (점수 저장) - 서버에서 service_role 키로 호출하므로 RLS 우회됨
-- 혹시 직접 API 호출도 허용하려면 아래 주석 해제
-- CREATE POLICY "누구나 점수 저장 가능"
--   ON scores FOR INSERT
--   WITH CHECK (true);
