#!/bin/bash
# 로컬 개발 환경 초기 세팅 스크립트
set -e

echo "🐳 Docker PostgreSQL + Mailpit 시작..."
docker compose up -d

echo "⏳ PostgreSQL 준비 대기..."
until docker compose exec postgres pg_isready -U pingpong > /dev/null 2>&1; do
  sleep 1
done
echo "✅ PostgreSQL 준비 완료"

echo "🔄 Prisma 스키마 반영..."
npx prisma db push --skip-generate

echo ""
echo "✅ 로컬 환경 준비 완료!"
echo ""
echo "  앱 실행:   npm run dev"
echo "  DB 확인:   npx prisma studio"
echo "  이메일 UI: http://localhost:8025"
echo "  앱 주소:   http://localhost:3000"
echo "  관리자:    admin@pingpongzone.kr / admin1234"
echo "  데모 사용자 추가: npx prisma db seed -- --with-users --with-season --with-notice"
echo ""
