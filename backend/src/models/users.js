const mongoose = require('mongoose')
const validator = require('validator')
const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')
const Task = require('./tasks')

const userSchema = new mongoose.Schema({   
    name: {        
        type: String,
        required: true,
        trim: true
    },
    age: {
        type: Number,  
        default: 0,              
        validate(value) {       
            if(value < 0) {
                throw new Error('Age must be a number')
            }
        }
    },
    email: {
        type: String,
        required: true,
        unique: true,
        trim: true,
        lowercase: true,
        validate(value) {
            if(!validator.isEmail(value)) {
                throw new Error('Email is invalid')
            }
        }
    },
    password: {
        type: String,
        required: true,
        minlength: 7,
        trim: true,
        validate(value) {
            if (value.toLowerCase().includes("password")) {
                throw new Error('Password can not contain "Password"')
            }
        }
    },
    avatar: {
        type: Buffer   
    },
    tokens: [{    
        token: {
            type: String,
            required: true
        }
    }]
}, {
    timestamps: true
})


//vitual property -> not actual data in database but relationship between 2 entities
userSchema.virtual('tasks', {  //name of the field, object of the field
    ref: 'Task',        //will give all the related task once populated. Nothing is stored in real
    localField: '_id',
    foreignField: 'owner'
})

userSchema.methods.generateAuthToken = async function() {  //methods are accessible on model instances and static are accessible on model
    const user = this
    const token = jwt.sign({_id: user._id.toString()},process.env.JWT_KEY)
    //add token in model and save
    user.tokens = user.tokens.concat({token})
    await user.save()
    return token
}

userSchema.methods.toJSON = function() {  //res.send() method calls json.stringify. toJSON method is called right in between these two
                                            // so the object we will stringify can be modified using toJSON then stringify and sent
    const user = this
    const userObject = user.toObject() // toObject gives just the raw user data removing all the methods attached by mongoose like save etc
    // delete private data
    delete userObject.password
    delete userObject.tokens
    delete userObject.avatar
    return userObject
}
// statics provides the function to be used while accessing the model just like findById, etc
userSchema.statics.findByCredentials = async (email, password) => {
    const user = await User.findOne({email})

    if(!user) {
        throw new Error('Unable to login')
    }

    const isMatch = await bcrypt.compare(password, user.password)  //given password, database password
    if(!isMatch) {
        throw new Error('Unable to login')
    }

    return user
}

//hash plain text password
userSchema.pre('save', async function (next) { // pre for before the task // arg: taskname, normal function // this binding is req
    const user = this //this gives access to current object

    if(user.isModified('password')) {
        user.password = await bcrypt.hash(user.password, 8)
    }
    next() //called when the function is completed. Otherwise user will never be saved if next() is not called
})

// middleware to remove task data post deletion of user
userSchema.pre('deleteOne', { document: true }, async function(next) { //deleteOne used for both document and model
    const user = this
    await Task.deleteMany({owner: user._id})
    next()
})
const User = mongoose.model('User', userSchema)   // create a collection in db with name User // inside there will be object for name with different attributes


module.exports = User