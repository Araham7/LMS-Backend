import { model, Schema } from "mongoose";

const courseSchema = new Schema({
    title: { // Course ka title
        type: String,
        unique: [true, "Title must be unique!"], // To privent duplication of courses.
        required: [true, "Title is required!"],
        minLength: [8, "Title must be at least 8 characters!"],
        maxLength: [60, "Title should be less than 60 characters!"],
        trim: true // Text me aage aur piche wale spaces ko remove kardo.
    },
    description: { // Course ka discription
        type: String,
        required: [true, "Description is required!"],
        minLength: [8, "Description must be at least 8 characters!"],
        maxLength: [200, "Description should be less than 200 characters!"],
        trim: true // Text me aage aur piche wale spaces ko remove kardo.
    },
    category: { // Course ka category
        type: String,
        required: [true, "Category is required!"]
    },
    thumbnail: { // Course ka thubmnail(image)
        public_id: {
            type: String,
            // required: true,
            default: ""
        },
        secure_url: {
            type: String,
            // required: true,
            default: ""
        }
    },
    lectures: [ // "lectures" array for storing numbers of lectures.
        {
            title: { // title of the single lacture
                type: String,
            },
            description: { // discrptin of the single lecture
                type: String,
            },
            lecture: { // ImageOfLecture
                public_id: {
                    type: String,
                    default: "",
                },
                secure_url: {
                    type: String,
                    default: "",
                }
            }
        }
    ],
    numberOfLectures: { // Yanha par har ek course me kitna numbers of lactures hai use store karenge.
        type: Number,
        default: 0,
    },
    createdBy: { // Yanha par course ko kisne store kiya hai uska naam store hoga.
        type: String,
        required: [true, "CreatedBy is required!"]
    }
}, {
    timestamps: true // Yanha par humlog database ko bata rahen hai ki jab bhi db ke field me change ho to us samay ko note karna.
});

// "DataBase" me collection "course" ke naam se banega
const Course = model("Course", courseSchema);

export default Course; // exporting "Course".
