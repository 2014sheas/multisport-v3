import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  console.log("🔍 DEBUG GET Request:");
  console.log("  Method:", request.method);
  console.log("  URL:", request.url);
  console.log("  Headers:", Object.fromEntries(request.headers.entries()));
  
  return NextResponse.json({
    message: "GET request received",
    method: request.method,
    url: request.url,
    headers: Object.fromEntries(request.headers.entries()),
  });
}

export async function POST(request: NextRequest) {
  console.log("🔍 DEBUG POST Request:");
  console.log("  Method:", request.method);
  console.log("  URL:", request.url);
  console.log("  Headers:", Object.fromEntries(request.headers.entries()));
  
  return NextResponse.json({
    message: "POST request received",
    method: request.method,
    url: request.url,
    headers: Object.fromEntries(request.headers.entries()),
  });
}

export async function PUT(request: NextRequest) {
  console.log("🔍 DEBUG PUT Request:");
  console.log("  Method:", request.method);
  console.log("  URL:", request.url);
  console.log("  Headers:", Object.fromEntries(request.headers.entries()));
  
  return NextResponse.json({
    message: "PUT request received",
    method: request.method,
    url: request.url,
    headers: Object.fromEntries(request.headers.entries()),
  });
}

export async function DELETE(request: NextRequest) {
  console.log("🔍 DEBUG DELETE Request:");
  console.log("  Method:", request.method);
  console.log("  URL:", request.url);
  console.log("  Headers:", Object.fromEntries(request.headers.entries()));
  
  return NextResponse.json({
    message: "DELETE request received",
    method: request.method,
    url: request.url,
    headers: Object.fromEntries(request.headers.entries()),
  });
} 