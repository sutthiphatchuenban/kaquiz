import { createUploadthing, type FileRouter } from "uploadthing/next";

const f = createUploadthing();

// FileRouter for your app, can contain multiple FileRoutes
export const ourFileRouter = {
    // Define as many FileRoutes as you like
    questionImage: f({ image: { maxFileSize: "4MB", maxFileCount: 1 } })
        .middleware(async () => {
            // This code runs on your server before upload
            // You can use this to check auth, etc.
            return { uploadedBy: "user" };
        })
        .onUploadComplete(async ({ metadata, file }) => {
            console.log("Upload complete for userId:", metadata.uploadedBy);
            console.log("file url", file.ufsUrl);
            return { url: file.ufsUrl };
        }),

    quizCover: f({ image: { maxFileSize: "4MB", maxFileCount: 1 } })
        .middleware(async () => {
            return { uploadedBy: "user" };
        })
        .onUploadComplete(async ({ file }) => {
            return { url: file.ufsUrl };
        }),
} satisfies FileRouter;

export type OurFileRouter = typeof ourFileRouter;
