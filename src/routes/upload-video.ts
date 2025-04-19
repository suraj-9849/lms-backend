import express from "express";
import multer from "multer";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { fromEnv } from "@aws-sdk/credential-providers";
import { PrismaClient } from "@prisma/client";

const router = express.Router();
const prisma = new PrismaClient();

const s3 = new S3Client({
  region: "auto",
  endpoint: process.env.ENDPOINT,
  credentials: fromEnv(),
});

const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

router.post(
  "/upload",
  upload.single("video"),
  async (
    req: express.Request & {
      file?: Express.Multer.File;
      body: { title: string; courseId: string; uploaderId: string };
    },
    res: express.Response
  ): Promise<void> => {
    try {
      const video = req.file;
      const { title, courseId, uploaderId } = req.body;

      if (!video || !title || !courseId || !uploaderId) {
        res.status(400).json({ error: "Missing required fields!" });
        return;
      }
      const { nanoid } = await import("nanoid");
      const fileName = `${nanoid(12)}.mp4`;

      try {
        const command = new PutObjectCommand({
          Bucket: process.env.BUCKET_NAME as string,
          Key: `videos/${fileName}`,
          Body: video.buffer,
          ContentType: video.mimetype,
        });

        await s3.send(command);
      } catch (s3Error) {
        console.error("Error uploading to S3:", s3Error);
        res.status(500).json({
          error: "Failed to upload to storage. Please try again.",
        });
        return;
      }

      try {
        const newVideo = await prisma.video.create({
          data: {
            title,
            filename: fileName,
            size: video.size,
            course_id: parseInt(courseId),
            uploader_id: uploaderId,
          },
        });

        const updatedCourse = await prisma.course.update({
          where: { course_id: parseInt(courseId) },
          data: { video_count: { increment: 1 } },
        });

        res.json({
          message: "Video uploaded successfully",
          video: newVideo,
          course: updatedCourse,
        });
        return;
      } catch (dbError) {
        console.error("Error saving to database:", dbError);
        res.status(500).json({
          error: "Failed to save video details to the database.",
        });
        return;
      }
    } catch (error) {
      console.error("Unexpected error:", error);
      res.status(500).json({
        error: "An unexpected error occurred. Please try again.",
      });
      return;
    }
  }
);

export default router;
