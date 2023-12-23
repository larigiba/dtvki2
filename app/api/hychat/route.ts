import { NextResponse } from "next/server";
import axios from "axios";

export async function POST(request: Request) {
  // use node-fetch
  const res = await fetch("http://localhost:8080/api/home");
  const data = await res.json();
  return NextResponse.json({ chatResponse: data });
  //   try {
  //     const res = await axios.get("http://localhost:8080/api/home");
  //     return NextResponse.json({ chatResponse: res });
  //   } catch (error) {
  //     console.error(error);
  //     return NextResponse.json({ error: "Error fetching data" }, { status: 500 });
  //   }
}
