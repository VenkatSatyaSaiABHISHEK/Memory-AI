import { NextRequest, NextResponse } from "next/server";
import { v2 as cloudinary } from "cloudinary";

// Configure Cloudinary server-side
const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
const apiKey = process.env.CLOUDINARY_API_KEY;
const apiSecret = process.env.CLOUDINARY_API_SECRET;

const isCloudinaryConfigured = 
  !!cloudName && cloudName !== "your-cloudinary-cloud-name" &&
  !!apiKey && apiKey !== "your-cloudinary-api-key" &&
  !!apiSecret && apiSecret !== "your-cloudinary-api-secret";

if (isCloudinaryConfigured) {
  cloudinary.config({
    cloud_name: cloudName,
    api_key: apiKey,
    api_secret: apiSecret,
  });
}

export async function POST(request: NextRequest) {
  let file: File | null = null;
  try {
    const formData = await request.formData();
    file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json(
        { error: "No file provided in request." },
        { status: 400 }
      );
    }

    const fileName = file.name;
    const fileType = file.type;
    const fileSize = file.size;

    // Determine category based on file type
    let resourceCategory: "image" | "audio" | "document" = "document";
    if (fileType.startsWith("image/")) {
      resourceCategory = "image";
    } else if (fileType.startsWith("audio/") || fileType.endsWith(".mp3") || fileType.endsWith(".wav") || fileType.endsWith(".m4a")) {
      resourceCategory = "audio";
    }

    // Mock Upload Fallback if Cloudinary is not configured or in Demo Mode
    if (!isCloudinaryConfigured) {
      console.warn("Cloudinary is not fully configured. Using mock local fallback.");
      
      // Simulate network upload latency
      await new Promise((resolve) => setTimeout(resolve, 800));

      let mockUrl = "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf";
      if (resourceCategory === "image") {
        const randomId = Math.floor(Math.random() * 1000);
        mockUrl = `https://picsum.photos/id/${randomId % 150}/800/600`;
      } else if (resourceCategory === "audio") {
        mockUrl = "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3";
      }

      return NextResponse.json({
        url: mockUrl,
        publicId: `mock-id-${Date.now()}`,
        name: fileName,
        type: fileType,
        size: fileSize,
        category: resourceCategory,
        mocked: true,
      });
    }

    // Live Cloudinary Upload
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    const result = await new Promise<any>((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          resource_type: "auto",
          folder: "memory_ai_uploads",
        },
        (error, result) => {
          if (error) reject(error);
          else resolve(result);
        }
      );
      uploadStream.end(buffer);
    });

    return NextResponse.json({
      url: result.secure_url,
      publicId: result.public_id,
      name: fileName,
      type: fileType,
      size: fileSize,
      category: resourceCategory,
      mocked: false,
    });

  } catch (error: any) {
    console.error("Cloudinary upload API route failure, using mock fallback:", error);
    
    const fallbackId = `fallback-id-${Date.now()}`;
    const name = file ? file.name : "uploaded_file.bin";
    const type = file ? file.type : "application/octet-stream";
    const size = file ? file.size : 1024;
    
    // Determine category based on type/name
    let category: "image" | "audio" | "document" = "document";
    if (type.startsWith("image/") || name.endsWith(".png") || name.endsWith(".jpg") || name.endsWith(".jpeg") || name.endsWith(".webp") || name.endsWith(".gif")) {
      category = "image";
    } else if (type.startsWith("audio/") || name.endsWith(".mp3") || name.endsWith(".wav") || name.endsWith(".m4a")) {
      category = "audio";
    }

    let url = "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf";
    if (category === "image") {
      const randomId = Math.floor(Math.random() * 150);
      url = `https://picsum.photos/id/${randomId}/800/600`;
    } else if (category === "audio") {
      url = "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3";
    }

    return NextResponse.json({
      url,
      publicId: fallbackId,
      name,
      type,
      size,
      category,
      mocked: true,
      error: error.message || "Cloudinary failure, fallback activated."
    });
  }
}
