/**
 * 版本信息接口
 * 返回前端容器的构建版本号
 */
import { NextResponse } from "next/server";

export function GET() {
  return NextResponse.json({
    version: process.env.NEXT_PUBLIC_BUILD_VERSION || "dev",
  });
}
