import express from "express";
import { createUser,deleteUser,getAllUsers, getUserByEmail, getUserById, updateUser } from "../postgresql/Postgresql.js";

export const UserEntry = async (req, res) => {
  const body  = req.body;
  const {table }= req.body;

const keys = Object.keys(body); // e.g., ["username", "email", "age"]
const values = Object.values(body);

console.log(keys,values)

  if (keys.length === 0 && values.length===0) {
    return res.status(400).json({
      error: "invalid json body",
    });
}
let UserData = keys.map((key, i) => [key, values[i]]);
UserData = Object.fromEntries(UserData)
console.log(UserData)

  const gmailRegex = /^[a-z0-9](\.?[a-z0-9_-])*@gmail\.com$/;

  if (!gmailRegex.test(UserData.gmail)) {
      return res.status(400).json({
      error: "invalid Gmail",
    }); 
  } 


  try {
    const response = await createUser(UserData,table);  
    res.status(400).json({
        mssg: response
    })
}
     catch (error) {
        console.log(error)
    throw new Error("Failed to write data in database");
  }
};


export const Getallusers = async(req, res)=>{

 const limit = req.query.limit  || 10 

    try {
        const response = await getAllUsers(limit)
        res.status(200).json({
            status:'success',
            mssg:response
        })
    } catch (error) {
        res.status(400).json({

            status:'error while calling database api',
            mssg:error
        })
        
    }



};


export const GetUserbymail = async(req,res)=>{
const mail = req.query.mail;
    try {
        const response = await getUserByEmail(mail)
        res.status(200).json({
            status:'success',
            mssg:response
        })
    } catch (error) {
        res.status(400).json({

            status:'error while calling database api',
            mssg:error
        })
        
    }



};


export const GetUserbyid = async(req,res)=>{
const id = req.query.id;
    try {
        const response = await getUserById(id)
        res.status(200).json({
            status:'success',
            mssg:response
        })
    } catch (error) {
        res.status(400).json({

            status:'error while calling database api',
            mssg:error
        })
        
    }



};


export const Updateuser = async(req,res)=>{
    const data = req.body ;

        try {
        const response = await updateUser(id , data)
        res.status(200).json({
            status:'success',
            mssg:response
        })
    } catch (error) {
        res.status(400).json({

            status:'error while calling database api',
            mssg:error
        })
        
    }

}


export const Deleteuser = async(req,res)=>{
    const data = req.body ;

        try {
        const response = await deleteUser(id)
        res.status(200).json({
            status:'success',
            mssg:response
        })
    } catch (error) {
        res.status(400).json({

            status:'error while calling database api',
            mssg:error
        })
        
    }

}