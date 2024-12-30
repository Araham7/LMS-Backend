import fs from 'fs';

function deleteFile(filePath) {
    try {
        // Remove the file synchronously
        fs.unlinkSync(filePath);
        console.log('File deleted successfully from the server');
    } catch (err) {
        console.error('Error deleting the file from the server:', err);
    }
}

export default deleteFile;

