// We use this file to upload handal image uploaded by the user :---

import path from 'path';
import multer from 'multer';

// Function to upload image extract image and upload to the server.
const upload = multer({ 
    dest: 'uploads/', // 'dest' sets the directory for temporary storage.
    limits: { fileSize: 50 * 1024 * 1024 }, // allows uploading files up to 50 MB.
    storage: multer.diskStorage({
        destination: 'uploads/', /* Ye root directory me ek "uploads" naam ka folder banayega, jisme uploaded file (image) ko temporarily store karega. */
        filename: (_req, file, cb) => {
            cb(null, file.originalname); /* Ye uploaded image ka naam uska "origional-naam" se set kardega. */
        }
    }),
    fileFilter: (_req, file, cb) => {
        let ext = path.extname(file.originalname); /* Extracting "extention" of the uploaded file. */

        // Only allow files with the following extensions
        if (
            ext !== '.jpg' &&
            ext !== '.jpeg' &&
            ext !== '.webp' &&
            ext !== '.png' &&
            ext !== '.mp4'
        ) {
            cb(new Error(`Unsupported file type: ${ext}`), false); // Pass error and `false` to reject file
            return;
        }
        cb(null, true);
    },
});

export default upload;
