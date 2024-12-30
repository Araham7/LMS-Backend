import 'dotenv/config';
import cloudinary from 'cloudinary';
import Razorpay from 'razorpay';

import app from "./app.js";


// Cloudinary configuration :
cloudinary.v2.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
});


// Razorpay configuration :
export const razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET,
  });


const PORT = process.env.PORT || 9658;

app.listen(PORT , ()=>{
    console.log(`Server is running at > http://localhost:${PORT}`);
})