import mongoose from "mongoose";

const connectDB = async() => {
    try{
        await mongoose.connect(process.env.DB);
       console.log('Connected to ToOseA database');
    }catch(error){
        console.log(`Database Connection failed: ${error.message}`);
        process.exit(1)
    }
}

export default connectDB;