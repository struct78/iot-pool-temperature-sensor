import { NextResponse } from "next/server";
import config from "../../../../config.json"

export async function GET() {
  const res = await fetch(`https://api.${config.domainName}/app/read`);
  const data = await res.json()
  return NextResponse.json(data, { status: 200 })
}