import { firestore } from "../utils/firebase.js";
import { getNotebyid } from "./HelperApiFunction.js";
export const getallnotes = async (req, res) => {
  try {
    
 const notesCollection = firestore.collection("Notes");
 const notesSnapshot = await notesCollection.get();

    
const allNotes = notesSnapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  }));
  res.json({
    status: "success",
    data: {
      notes: allNotes
    }
  }
    ).status(200);
  } catch (error) {
    res.json(error.message);
    
  }
};

export const postnotes = async (req, res) => {
  try {
    console.log(1)
    const { title, content, user  } = req.body;
    if (!title || !content|| !user) {
      return res.status(400).json({  Error: "Invalid json body" });
    }
    console.log(1);
     
    const newNote = {
      title,
      content,
      Created_by  : user,
      Created_on: new Date().toISOString()
    };
    
const docRef = await firestore.collection("Notes").add(newNote);
    
    res.status(201).json({
      status: "success",
      data: {
        note: { id: docRef.id, ...newNote }
      }
    });
  } catch (error) {
    console.error("Error adding note:", error);
    res.status(500).json({ error: error.message });
  }
};

export  const DeleteNotebyTitle = async (req, res) => {  
try {
    const title = req.query.title || req.query.Title;
    
    if (!title) {
      return res.status(400).json({ error: "Title is required" });
    }   


  const Fetchdata =  await getNotebyid(req);

  const TitleandID=Fetchdata.map(data=>({
   id:data.id,
   title:data.title || data.Title

  }));

  const deletnote = TitleandID.filter(data => data.title === title);
  const docRef = firestore.collection('Notes').doc(deletnote[0].id);
    const doc = await docRef.get();

  
    if (!doc.exists) {
      return res.status(404).json({ message: "Note not found" });
    }

      await docRef.delete();


  res.json({
    status: "success",
    message: "Data deleted  successfully",
   
  })
  
} catch (error) {
  res.json({
    status: "error",
    message: error.message,
    
  }).status(500);
}

}

export const getNotebyTitle = async (req, res) => {
  try {
    
    const title = req.params.title || req.params.Title;
    
    if (!title) {
      return res.status(400).json({ error: "Title is required" });
    }

    const notesCollection = firestore.collection("Notes");
    const querySnapshot = await notesCollection.where("Title", "==", title).get();

    if (querySnapshot.empty) {
      return res.status(404).json({ message: "Note not found" });
    }

    const notes = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    res.json({
      status: "success",
      data: {
        notes
      }
    }).status(200);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

export const updateNote = async (req, res) => {
  try {
    const Title_for_update  = req.params.title || req.params.Title;

    console.log(Title_for_update)
    
     const updateData = {};
  if (req.body.title !== undefined) updateData.Title = req.body.title;
  if (req.body.content !== undefined) updateData.Content = req.body.content;
  if (Object.keys(updateData).length === 0) {
    return res.status(400).json({ message: 'No update fields provided' });
  }
    const noteRef = await firestore.collection("Notes").where("Title", "==", Title_for_update).limit(1).get();


      if (noteRef.empty) {
      return res.status(404).json({ message: 'Note not found' });
    }
    const docRef = noteRef.docs[0].ref;
    await docRef.update(updateData);

    

    res.json({
      status: "success",
      message: "Note updated successfully"
    }).status(200);
  } catch (error) {
    console.error("Error updating note:", error);
    res.status(500).json({ error: error.message });
  }
};