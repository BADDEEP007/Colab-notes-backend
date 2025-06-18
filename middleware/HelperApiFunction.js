
import { firestore } from "../utils/firebase.js";
export const setHeaders = (method) => {
  return (req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", `${method}`);
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization"); 
  res.setHeader("Content-Type", "application/json");
next()};
};

export const Note_id = async(Collection_name) => {
    const notes=firestore.collection(Collection_name).get(); ;
    const notes_id = notes.docs.map((doc) =>  doc.id);
    return notes_id;
};



export const getNotebyid = async(req,res) =>{
  try {
    const notes =  firestore.collection("Notes").get();
    
   
    const allNotes = notes.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    return allNotes;
   
  
 
  
  
  } catch (error) {
    res.json({
      status: "error",
      message: error.message
    }).status(500);
  }
}

