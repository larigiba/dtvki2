import { NextResponse } from "next/server";
import axios from "axios";

export async function POST(request: Request) {
  const body = await request.json();
  const url: string = body.url;

  try {
    const res = await axios.get(url, { responseType: "arraybuffer" });
    const base64 = Buffer.from(res.data, "binary").toString("base64");
    return NextResponse.json({ pdfData: base64 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Error fetching data" }, { status: 500 });
  }
}
