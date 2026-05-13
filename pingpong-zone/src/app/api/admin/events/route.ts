import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { EVENT_TYPES, EventType } from "@/lib/events";

async function guard() {
  const s = await getSession();
  if (!s || s.role !== "admin") return null;
  return s;
}

export async function GET() {
  if (!(await guard())) return NextResponse.json({ error: "권한 없음" }, { status: 403 });
  const events = await prisma.event.findMany({ orderBy: { startDate: "desc" } });
  return NextResponse.json(events);
}

export async function POST(req: NextRequest) {
  if (!(await guard())) return NextResponse.json({ error: "권한 없음" }, { status: 403 });

  const { name, description, type, config, startDate, endDate } = await req.json();

  if (!name || !type || !config || !startDate || !endDate) {
    return NextResponse.json({ error: "필수 항목을 입력해주세요." }, { status: 400 });
  }

  if (!EVENT_TYPES.includes(type as EventType)) {
    return NextResponse.json({ error: "유효하지 않은 이벤트 타입입니다." }, { status: 400 });
  }

  const start = new Date(startDate);
  const end = new Date(endDate);

  if (isNaN(start.getTime()) || isNaN(end.getTime())) {
    return NextResponse.json({ error: "날짜 형식이 올바르지 않습니다." }, { status: 400 });
  }

  if (end <= start) {
    return NextResponse.json({ error: "종료일은 시작일보다 늦어야 합니다." }, { status: 400 });
  }

  // 같은 타입의 겹치는 이벤트 검사
  const overlapping = await prisma.event.findFirst({
    where: {
      type,
      isActive: true,
      startDate: { lt: end },
      endDate: { gt: start },
    },
  });
  if (overlapping) {
    return NextResponse.json(
      { error: `같은 타입의 활성 이벤트(${overlapping.name})와 기간이 겹칩니다.` },
      { status: 409 }
    );
  }

  const event = await prisma.event.create({
    data: {
      name,
      description: description || null,
      type,
      config,
      startDate: start,
      endDate: end,
    },
  });

  return NextResponse.json(event, { status: 201 });
}
