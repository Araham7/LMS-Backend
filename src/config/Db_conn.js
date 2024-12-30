import { connect } from "mongoose";
import 'dotenv/config';

const connectToDb = async () => {
  try {
    if (!process.env.DB_URL) {
      console.log(`Db url is undefined!`);
      process.exit(1);
    }

    const conn = await connect(process.env.DB_URL);
    console.log(`Db connected successfully! > ${conn.connection.host}`);
  } catch (error) {
    console.error(`Error during Db connection > ${error.message}`);
    process.exit(1);
  }
};


export default connectToDb;