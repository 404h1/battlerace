-- Supabase SQL Editor에서 실행하세요
-- 기존 테이블 있으면 아래 주석 해제 후 먼저 실행
-- DROP TABLE IF EXISTS scores;

CREATE TABLE scores (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL UNIQUE,
  score integer NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- RLS 활성화
ALTER TABLE scores ENABLE ROW LEVEL SECURITY;

-- 누구나 읽기 가능
CREATE POLICY "누구나 점수 조회 가능"
  ON scores FOR SELECT
  USING (true);

-- 기존 테이블에 UNIQUE 제약만 추가하려면:
-- ALTER TABLE scores ADD CONSTRAINT scores_name_unique UNIQUE (name);
