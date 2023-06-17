const express = require('express')
const router = new express.Router()
const auth = require('../middleware/authentication')
const Task = require('../models/tasks')

router.post('/tasks', auth, async (req,res) => {
    const task = new Task({
        ...req.body,  
        owner: req.user._id
    })
    try {
        await task.save()
        res.status(201).send(task)
    } catch(e) {
        res.status(400).send(e)
    }
})

router.get('/tasks', auth, async (req, res) => {
    const match = {}
    const sort = {}
    if(req.query.status) {
        match.status = req.query.status === 'true'
    }
    if(req.query.sortBy) {
        const parts = req.query.sortBy.split(':') 
        sort[parts[0]] = parts[1] === 'desc' ? -1 : 1  
    }
    try {
        await req.user.populate({
            path: 'tasks',
            match,    
            options: {  
                limit:parseInt(req.query.limit),  
                skip: parseInt(req.query.skip),
                sort
            }
        }) 
        res.status(200).send(req.user.tasks)
    } catch (e) {
        res.status(500).send(e)
    }
})

router.get('/tasks/:id', auth, async (req, res) => {
    const _id = req.params.id
    
    try {
        const task = await Task.findOne({_id, owner: req.user._id}) 
        if(!task) {
            return res.status(404).send('No task')
        }
        res.send(task)
    } catch (e) {
        res.status(500).send(e)
    }
})


router.patch('/tasks/:id', auth, async (req, res) => {
    const updates = Object.keys(req.body)
    const allowedUpdates = ['desc','status']
    const isValidOperation = updates.every((update) => allowedUpdates.includes(update))

    if(!isValidOperation) {
        return res.status(400).send({error: 'Invalid Request'})
    }
    try {
        
        const task = await Task.findOne({_id: req.params.id, owner: req.user._id})

        if(!task) {
            return res.status(404).send('Task not found')
        }
        updates.forEach((update) => {
            task[update] = req.body[update] 
        })

        await task.save()
        
        res.send(task)
    } catch (e) {
        res.status(400).send(e)
    }
})



router.delete('/tasks/:id', auth, async (req, res) => {
    try {
        const task = await Task.findOneAndDelete({_id:req.params.id, owner: req.user._id})
        if(!task) {
            return res.status(404).send()
        }
        res.send(task)
    } catch (e) {
        res.status(500).send(e)
    }
})

module.exports = router