import { NextResponse } from "next/server";
import config from "../../../../config.json"

type TemperatureHistory = {
  date: number;
  id: string;
  temperature: number;
}

export async function GET() {
  const res = await fetch(`https://api.${config.domainName}/app/read`);
  const data = await res.json() as unknown as TemperatureHistory
  return NextResponse.json(data, { status: 200 })
}